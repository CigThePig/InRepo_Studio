/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Detect local changes and resolve deploy conflicts.
 *
 * Defines:
 * - FileChangeSchema — deploy file change shape (type: schema)
 * - ConflictSchema — conflict metadata (type: schema)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: not exported
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (computed during deploy)
 *
 * Verification (minimum):
 * - [ ] Detects modified project.json and scene files
 * - [ ] Ignores unchanged files (content hash match)
 */

import type { WorkspaceContent } from '@/types/workspace';
import type { ShaStore } from './shaManager';
import type { AssetRegistryState } from '@/editor/assets';
import type { AssetGroupType } from '@/editor/assets/assetGroup';
import { ASSET_GROUP_PATHS } from '@/editor/assets/assetGroup';
import { PROJECT_JSON_PATH, SCENE_INDEX_JSON_PATH, SCENES_DIR } from '@/shared/paths';
import { buildProjectPack } from '@/pack/buildProjectPack';
import { hashContent } from './utils';
import { parseDataUrl, slugifyFileName, buildUniqueFileName, MIME_EXTENSION_MAP } from './assetUpload';

export type FileChangeStatus = 'added' | 'modified' | 'deleted';

export interface FileChange {
  path: string;
  status: FileChangeStatus;
  content: string | null;
  contentHash: string | null;
  localSha: string | null;
  encoding?: 'utf-8' | 'base64';
}

export interface ChangeDetectorConfig {
  getWorkspace: () => Promise<WorkspaceContent>;
  getShaStore: () => Promise<ShaStore>;
  getAssetRegistryState?: () => AssetRegistryState | null;
}

export interface ChangeDetector {
  detectChanges(): Promise<FileChange[]>;
}

export interface ConflictInfo {
  path: string;
  localSha: string | null;
  remoteSha: string | null;
  hasConflict: boolean;
}

export interface ConflictResult {
  safe: FileChange[];
  conflicts: (FileChange & ConflictInfo)[];
}

function detectContentChange(
  previousHash: string | null,
  currentHash: string
): boolean {
  if (!previousHash) {
    return true;
  }
  return previousHash !== currentHash;
}

/**
 * Build the deploy path for a local asset within a group.
 * Mirrors the path structure used by assetUpload.ts so that SHA tracking
 * remains consistent across both upload mechanisms.
 */
function buildAssetDeployPath(
  groupType: AssetGroupType,
  groupSlug: string,
  fileName: string
): string {
  const basePath = ASSET_GROUP_PATHS[groupType];
  return `${basePath}/${groupSlug}/${fileName}`;
}

export function createChangeDetector(config: ChangeDetectorConfig): ChangeDetector {
  const { getWorkspace, getShaStore, getAssetRegistryState } = config;

  return {
    async detectChanges() {
      const shaStore = await getShaStore();
      const changes: FileChange[] = [];
      const currentPaths = new Set<string>();

      // --- Phase 1: Detect image asset changes ---
      // Process assets before project.json so we can inject spriteAtlases
      // metadata into the deployed project content.
      const registryState = getAssetRegistryState?.() ?? null;
      const parentDeployPaths = new Map<string, string>();

      if (registryState) {
        // Upload only parent/standalone assets (skip slice assets that
        // reference a parent via sourceAssetId — they share the same
        // full-sheet dataUrl and would be uploaded redundantly).
        for (const group of registryState.groups) {
          const usedNames = new Set<string>();
          for (const asset of group.assets) {
            if (asset.source !== 'local') continue;
            if (asset.sourceAssetId) continue;

            const parsed = parseDataUrl(asset.dataUrl);
            if (!parsed) continue;

            const extension = MIME_EXTENSION_MAP[parsed.mimeType];
            if (!extension) continue;

            const fileName = buildUniqueFileName(
              slugifyFileName(asset.name),
              extension,
              usedNames
            );
            const assetPath = buildAssetDeployPath(group.type, group.slug, fileName);
            const contentHash = await hashContent(parsed.base64);
            const entry = shaStore.get(assetPath);

            currentPaths.add(assetPath);
            parentDeployPaths.set(asset.id, assetPath);

            if (detectContentChange(entry?.contentHash ?? null, contentHash)) {
              changes.push({
                path: assetPath,
                status: entry ? 'modified' : 'added',
                content: parsed.base64,
                contentHash,
                localSha: entry?.sha ?? null,
                encoding: 'base64',
              });
            }
          }
        }

        // Atlas metadata is now built by buildProjectPack(workspace).
      }

      // --- Phase 2: Detect project.json changes ---
      // Build deterministic runtime pack and deploy from that same derived source.
      const workspace = await getWorkspace();
      const pack = buildProjectPack(workspace, {
        resolveAssetPathForDeploy(assetId) {
          return parentDeployPaths.get(assetId) ?? null;
        },
      });

      const projectPath = PROJECT_JSON_PATH;
      const projectContent = JSON.stringify(pack.project, null, 2);
      const contentHash = await hashContent(projectContent);
      const entry = shaStore.get(projectPath);

      currentPaths.add(projectPath);

      if (detectContentChange(entry?.contentHash ?? null, contentHash)) {
        changes.push({
          path: projectPath,
          status: entry ? 'modified' : 'added',
          content: projectContent,
          contentHash,
          localSha: entry?.sha ?? null,
        });
      }

      // --- Phase 3: Detect scene changes ---
      const scenes = Object.values(pack.scenes);
      for (const scene of scenes) {
        const scenePath = `${SCENES_DIR}/${scene.id}.json`;
        const sceneContent = JSON.stringify(scene, null, 2);
        const contentHash = await hashContent(sceneContent);
        const entry = shaStore.get(scenePath);

        currentPaths.add(scenePath);

        if (detectContentChange(entry?.contentHash ?? null, contentHash)) {
          changes.push({
            path: scenePath,
            status: entry ? 'modified' : 'added',
            content: sceneContent,
            contentHash,
            localSha: entry?.sha ?? null,
          });
        }
      }

      const sceneIndexIds = scenes.map((scene) => scene.id);
      const sceneIndexContent = JSON.stringify(sceneIndexIds, null, 2);
      const sceneIndexHash = await hashContent(sceneIndexContent);
      const indexEntry = shaStore.get(SCENE_INDEX_JSON_PATH);

      currentPaths.add(SCENE_INDEX_JSON_PATH);

      if (detectContentChange(indexEntry?.contentHash ?? null, sceneIndexHash)) {
        changes.push({
          path: SCENE_INDEX_JSON_PATH,
          status: indexEntry ? 'modified' : 'added',
          content: sceneIndexContent,
          contentHash: sceneIndexHash,
          localSha: indexEntry?.sha ?? null,
        });
      }

      // --- Phase 4: Detect deleted files ---
      const storedEntries = shaStore.getAll();
      Object.keys(storedEntries).forEach((path) => {
        if (!currentPaths.has(path)) {
          changes.push({
            path,
            status: 'deleted',
            content: null,
            contentHash: null,
            localSha: storedEntries[path]?.sha ?? null,
          });
        }
      });

      return changes;
    },
  };
}

export function detectConflicts(
  changes: FileChange[],
  remoteShas: Record<string, string | null>
): ConflictResult {
  const safe: FileChange[] = [];
  const conflicts: (FileChange & ConflictInfo)[] = [];

  for (const change of changes) {
    const remoteSha = remoteShas[change.path] ?? null;
    const hasConflict = (() => {
      // Safety rules:
      // - If remote changed since last deploy (SHA differs), require user choice.
      // - Remote deletion is also a change: if we previously deployed a file (localSha)
      //   but it is now missing remotely, treat as a conflict for add/modify.
      if (change.status === 'deleted') {
        // If remote is already missing, deletion is a no-op (safe).
        // If remote exists and SHA differs, someone changed it since last deploy.
        return remoteSha !== null && change.localSha !== remoteSha;
      }

      // added/modified
      if (remoteSha === null) {
        // Remote missing but we have a localSha means it was deleted remotely.
        return change.localSha !== null;
      }

      // Remote exists.
      return change.localSha !== remoteSha;
    })();

    if (hasConflict) {
      conflicts.push({
        ...change,
        remoteSha,
        hasConflict: true,
      });
    } else {
      safe.push(change);
    }
  }

  return { safe, conflicts };
}
