import type { AuthManager } from './auth';
import type { FileChange } from './changeDetector';
import { createCommitter } from './commit';
import { createShaManager } from './shaManager';

export type AssetUploadGroupType = 'tilesets' | 'props' | 'entities';

export interface AssetUploadGroup {
  type: AssetUploadGroupType;
  slug: string;
  name: string;
}

export interface AssetUploadItem {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface AssetUploadProgress {
  current: number;
  total: number;
  currentFile: string;
}

export interface AssetUploadFileResult {
  assetId: string;
  fileName: string;
  path: string;
  success: boolean;
  error?: string;
}

export interface AssetUploadResult {
  group: AssetUploadGroup;
  results: AssetUploadFileResult[];
  error?: string;
}

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/svg+xml': 'svg',
};

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64: match[2],
  };
}

function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function slugifyFileName(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned : 'asset';
}

function buildUniqueFileName(base: string, extension: string, used: Set<string>): string {
  let candidate = `${base}.${extension}`;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${index}.${extension}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function createResult(
  asset: AssetUploadItem,
  fileName: string,
  path: string,
  error?: string
): AssetUploadFileResult {
  return {
    assetId: asset.id,
    fileName,
    path,
    success: !error,
    error,
  };
}

export async function uploadAssetGroup(options: {
  authManager: AuthManager;
  repoOwner: string;
  repoName: string;
  group: AssetUploadGroup;
  assets: AssetUploadItem[];
  assetPaths: Record<AssetUploadGroupType, string>;
  onProgress?: (progress: AssetUploadProgress) => void;
}): Promise<AssetUploadResult> {
  const { authManager, repoOwner, repoName, group, assets, assetPaths, onProgress } = options;

  if (assets.length === 0) {
    return { group, results: [], error: 'No assets to upload.' };
  }

  const basePath = assetPaths[group.type];
  if (!basePath) {
    return {
      group,
      results: [],
      error: 'Unknown asset group path.',
    };
  }

  const usedNames = new Set<string>();
  const uploadPlans: Array<{
    asset: AssetUploadItem;
    fileName: string;
    path: string;
    base64: string;
  }> = [];
  const results: AssetUploadFileResult[] = [];

  for (const asset of assets) {
    const parsed = parseDataUrl(asset.dataUrl);
    if (!parsed) {
      results.push(createResult(asset, asset.name, '', 'Unsupported asset format.'));
      continue;
    }

    const extension = MIME_EXTENSION_MAP[parsed.mimeType];
    if (!extension) {
      results.push(createResult(asset, asset.name, '', 'Unsupported image type.'));
      continue;
    }

    const sizeBytes = estimateBase64Bytes(parsed.base64);
    if (sizeBytes > MAX_UPLOAD_BYTES) {
      results.push(
        createResult(
          asset,
          asset.name,
          '',
          `Asset too large (${Math.round(sizeBytes / 1024)}KB). Limit is ${Math.round(
            MAX_UPLOAD_BYTES / 1024
          )}KB.`
        )
      );
      continue;
    }

    const fileName = buildUniqueFileName(slugifyFileName(asset.name), extension, usedNames);
    const path = `${basePath}/${group.slug}/${fileName}`;

    uploadPlans.push({
      asset,
      fileName,
      path,
      base64: parsed.base64,
    });
  }

  if (uploadPlans.length === 0) {
    return {
      group,
      results,
      error: 'No valid assets to upload.',
    };
  }

  let remoteShas: Record<string, string | null> = {};
  try {
    const shaManager = createShaManager({ authManager, repoOwner, repoName });
    remoteShas = await shaManager.fetchRemoteShas(uploadPlans.map((plan) => plan.path));
  } catch (error) {
    return {
      group,
      results,
      error: error instanceof Error ? error.message : 'Failed to check repo state.',
    };
  }

  const changes: FileChange[] = [];
  const pathToAsset = new Map<string, { asset: AssetUploadItem; fileName: string }>();

  for (const plan of uploadPlans) {
    const remoteSha = remoteShas[plan.path] ?? null;
    if (remoteSha) {
      results.push(createResult(plan.asset, plan.fileName, plan.path, 'Remote file already exists.'));
      continue;
    }

    changes.push({
      path: plan.path,
      status: 'added',
      content: plan.base64,
      contentHash: null,
      localSha: null,
      encoding: 'base64',
    });
    pathToAsset.set(plan.path, { asset: plan.asset, fileName: plan.fileName });
  }

  if (changes.length === 0) {
    return {
      group,
      results,
      error: 'No assets were eligible for upload.',
    };
  }

  const committer = createCommitter({ authManager, repoOwner, repoName });
  const commitResults = await committer.commitFiles(changes, remoteShas, (progress) => {
    const fileMeta = pathToAsset.get(progress.currentFile);
    onProgress?.({
      current: progress.current,
      total: progress.total,
      currentFile: fileMeta?.fileName ?? progress.currentFile,
    });
  });

  commitResults.forEach((result) => {
    const meta = pathToAsset.get(result.path);
    if (!meta) return;
    results.push(
      createResult(
        meta.asset,
        meta.fileName,
        result.path,
        result.success ? undefined : result.error ?? 'Upload failed.'
      )
    );
  });

  return { group, results };
}
