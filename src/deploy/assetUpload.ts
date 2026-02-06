import type { AuthManager } from './auth';
import type { FileChange } from './changeDetector';
import { commitFilesAtomically, type CommitResult } from './commit';
import { createShaManager } from './shaManager';
import { validateProject, type Project } from '@/types';
import {
  ensureTileCategoryConfigured,
  appendTileFileIfMissing,
  ensureEntityType,
} from '@/shared/projectManifest';
import { PROJECT_JSON_PATH, TILESETS_PATH, PROPS_PATH, ENTITIES_PATH } from '@/shared/paths';

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
  commitSha?: string;
  updatedProject?: Project;
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

async function hashContent(content: string): Promise<string> {
  if (crypto?.subtle) {
    const data = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 0;
  for (let i = 0; i < content.length; i += 1) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return `fallback-${hash}`;
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

  if (results.length > 0) {
    return {
      group,
      results,
      error: 'Asset validation failed. Fix the errors and retry.',
    };
  }

  let remoteShas: Record<string, string | null> = {};
  try {
    const shaManager = createShaManager({ authManager, repoOwner, repoName });
    remoteShas = await shaManager.fetchRemoteShas([
      PROJECT_JSON_PATH,
      ...uploadPlans.map((plan) => plan.path),
    ]);
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

  if (results.length > 0) {
    return {
      group,
      results,
      error: 'Remote conflicts detected. Resolve them before retrying.',
    };
  }

  const shaManager = createShaManager({ authManager, repoOwner, repoName });
  const remoteProject = await shaManager.fetchRemoteContent(PROJECT_JSON_PATH);
  if (!remoteProject?.content) {
    return {
      group,
      results,
      error: 'project.json is missing in the repository.',
    };
  }
  const expectedProjectSha = remoteShas[PROJECT_JSON_PATH] ?? null;
  if (expectedProjectSha && remoteProject.sha !== expectedProjectSha) {
    return {
      group,
      results,
      error: 'project.json changed on GitHub. Refresh and retry the upload.',
    };
  }
  if (!expectedProjectSha) {
    remoteShas[PROJECT_JSON_PATH] = remoteProject.sha;
  }

  let project: Project;
  try {
    const parsed = JSON.parse(remoteProject.content) as Project;
    if (!validateProject(parsed)) {
      return {
        group,
        results,
        error: 'Remote project.json failed validation.',
      };
    }
    project = parsed;
  } catch (error) {
    return {
      group,
      results,
      error: error instanceof Error ? error.message : 'Failed to parse project.json.',
    };
  }

  if (group.type === 'tilesets') {
    ensureTileCategoryConfigured(project, 'terrain', TILESETS_PATH);
    for (const plan of uploadPlans) {
      const relFile = `${group.slug}/${plan.fileName}`;
      appendTileFileIfMissing(project, 'terrain', relFile);
    }
  } else if (group.type === 'props') {
    ensureTileCategoryConfigured(project, 'props', PROPS_PATH);
    for (const plan of uploadPlans) {
      const relFile = `${group.slug}/${plan.fileName}`;
      appendTileFileIfMissing(project, 'props', relFile);
    }
  } else {
    for (const plan of uploadPlans) {
      const baseName = plan.fileName.replace(/\.[^/.]+$/, '');
      const spritePath = `${ENTITIES_PATH}/${group.slug}/${plan.fileName}`;
      ensureEntityType(project, baseName, spritePath);
    }
  }

  const projectContent = JSON.stringify(project, null, 2);
  changes.push({
    path: PROJECT_JSON_PATH,
    status: remoteShas[PROJECT_JSON_PATH] ? 'modified' : 'added',
    content: projectContent,
    contentHash: await hashContent(projectContent),
    localSha: remoteShas[PROJECT_JSON_PATH] ?? null,
  });

  let commitResults: { results: CommitResult[]; commitSha: string | null };
  try {
    commitResults = await commitFilesAtomically({
      authManager,
      repoOwner,
      repoName,
      changes,
      expectedShas: remoteShas,
      onProgress: (progress) => {
        const fileMeta = pathToAsset.get(progress.currentFile);
        onProgress?.({
          current: progress.current,
          total: progress.total,
          currentFile: fileMeta?.fileName ?? progress.currentFile,
        });
      },
    });
  } catch (error) {
    return {
      group,
      results,
      error: error instanceof Error ? error.message : 'Upload failed.',
    };
  }

  commitResults.results.forEach((result) => {
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

  if (commitResults.commitSha) {
    const shaStore = await shaManager.createStore();
    for (const change of changes) {
      if (!change.content) continue;
      const newSha =
        commitResults.results.find((result) => result.path === change.path)?.newSha ?? null;
      if (!newSha) continue;
      const contentHash =
        change.contentHash ??
        (await hashContent(change.encoding === 'base64' ? change.content : change.content));
      shaStore.set(change.path, {
        sha: newSha,
        contentHash,
        updatedAt: new Date().toISOString(),
      });
    }
    await shaStore.save();
  }

  return {
    group,
    results,
    commitSha: commitResults.commitSha ?? undefined,
    updatedProject: project,
  };
}
