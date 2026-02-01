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

import type { HotProject } from '@/storage';
import type { Scene } from '@/types';
import type { ShaStore } from './shaManager';

export type FileChangeStatus = 'added' | 'modified' | 'deleted';

export interface FileChange {
  path: string;
  status: FileChangeStatus;
  content: string | null;
  contentHash: string | null;
  localSha: string | null;
}

export interface ChangeDetectorConfig {
  getProject: () => Promise<HotProject | null>;
  getScenes: () => Promise<Scene[]>;
  getShaStore: () => Promise<ShaStore>;
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

function detectContentChange(
  previousHash: string | null,
  currentHash: string
): boolean {
  if (!previousHash) {
    return true;
  }
  return previousHash !== currentHash;
}

export function createChangeDetector(config: ChangeDetectorConfig): ChangeDetector {
  const { getProject, getScenes, getShaStore } = config;

  return {
    async detectChanges() {
      const shaStore = await getShaStore();
      const changes: FileChange[] = [];
      const currentPaths = new Set<string>();

      const hotProject = await getProject();
      if (hotProject) {
        const projectPath = 'game/project.json';
        const projectContent = JSON.stringify(hotProject.project, null, 2);
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
      }

      const scenes = await getScenes();
      for (const scene of scenes) {
        const scenePath = `game/scenes/${scene.id}.json`;
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
