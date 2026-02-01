/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Commit changes to GitHub and orchestrate deploy flow.
 *
 * Defines:
 * - CommitResultSchema — per-file commit result (type: schema)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: not exported
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (deploy updates SHA store immediately)
 * - Apply hook: deployChanges()
 *
 * Verification (minimum):
 * - [ ] Commit handles add/modify/delete
 * - [ ] Deploy updates SHA store on success
 */

import type { AuthManager } from './auth';
import type { ChangeDetector, FileChange } from './changeDetector';
import { detectConflicts } from './changeDetector';
import type { ShaManager, ShaStore } from './shaManager';
import type { DeployUI } from './deployUI';
import type { ConflictResult } from './changeDetector';
import type { ResolvedConflict } from './conflictResolver';
import type { Project, Scene } from '@/types';
import { validateProject, validateScene } from '@/types';
import { saveProject, saveScene } from '@/storage';

const LOG_PREFIX = '[Deploy/Commit]';

export interface CommitConfig {
  authManager: AuthManager;
  repoOwner: string;
  repoName: string;
  branch?: string;
}

export interface CommitResult {
  success: boolean;
  path: string;
  newSha?: string;
  error?: string;
}

export interface CommitProgress {
  current: number;
  total: number;
  currentFile: string;
}

export interface Committer {
  commitFile(change: FileChange, message: string, remoteSha: string | null): Promise<CommitResult>;
  commitFiles(
    changes: FileChange[],
    remoteShas: Record<string, string | null>,
    onProgress?: (progress: CommitProgress) => void
  ): Promise<CommitResult[]>;
}

export interface DeployOrchestratorConfig {
  authManager: AuthManager;
  changeDetector: ChangeDetector;
  shaManager: ShaManager;
  committer: Committer;
  deployUI: DeployUI;
}

function encodeContent(content: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  let binary = '';
  data.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
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

function formatCommitMessage(): string {
  const timestamp = new Date().toISOString();
  return `Update via InRepo Studio - ${timestamp}`;
}

function parseRateLimitError(response: Response): string | null {
  if (response.status !== 403) {
    return null;
  }
  const remaining = response.headers.get('X-RateLimit-Remaining');
  if (remaining === '0') {
    return 'GitHub API rate limit exceeded. Please try again later.';
  }
  return null;
}

export function createCommitter(config: CommitConfig): Committer {
  const { authManager, repoOwner, repoName, branch } = config;

  async function commitFile(change: FileChange, message: string, remoteSha: string | null): Promise<CommitResult> {
    const token = await authManager.getToken();
    if (!token) {
      return { success: false, path: change.path, error: 'Not authenticated' };
    }

    try {
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${change.path}`;

      if (change.status === 'deleted') {
        // If the file is already missing remotely, the delete is effectively a no-op.
        // Treat this as success so deploy can still advance the local SHA store.
        if (!remoteSha) {
          return { success: true, path: change.path };
        }

        const deleteResponse = await fetch(url, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({ message, sha: remoteSha, branch }),
        });

        const rateLimitError = parseRateLimitError(deleteResponse);
        if (rateLimitError) {
          return { success: false, path: change.path, error: rateLimitError };
        }

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json().catch(() => ({}));
          return {
            success: false,
            path: change.path,
            error: errorData.message || `API error: ${deleteResponse.status}`,
          };
        }

        return { success: true, path: change.path };
      }

      const content = change.content ?? '';
      const body: Record<string, unknown> = {
        message,
        content: encodeContent(content),
      };

      if (remoteSha) {
        body.sha = remoteSha;
      }

      if (branch) {
        body.branch = branch;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify(body),
      });

      const rateLimitError = parseRateLimitError(response);
      if (rateLimitError) {
        return { success: false, path: change.path, error: rateLimitError };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          path: change.path,
          error: errorData.message || `API error: ${response.status}`,
        };
      }

      const data = (await response.json()) as { content?: { sha?: string } };
      return {
        success: true,
        path: change.path,
        newSha: data.content?.sha,
      };
    } catch (error) {
      return {
        success: false,
        path: change.path,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  return {
    async commitFile(change, message, remoteSha) {
      return commitFile(change, message, remoteSha);
    },

    async commitFiles(changes, remoteShas, onProgress) {
      const results: CommitResult[] = [];
      const message = formatCommitMessage();

      for (let i = 0; i < changes.length; i += 1) {
        const change = changes[i];
        onProgress?.({
          current: i + 1,
          total: changes.length,
          currentFile: change.path,
        });

        const result = await commitFile(change, message, remoteShas[change.path] ?? null);
        results.push(result);
      }

      return results;
    },
  };
}

async function applyRemoteContent(path: string, content: string): Promise<void> {
  if (path === 'game/project.json') {
    const data = JSON.parse(content) as Project;
    if (!validateProject(data)) {
      throw new Error('Remote project.json failed validation');
    }
    await saveProject(data);
    return;
  }

  if (path.startsWith('game/scenes/')) {
    const data = JSON.parse(content) as Scene;
    if (!validateScene(data)) {
      throw new Error(`Remote scene ${path} failed validation`);
    }
    await saveScene(data);
    return;
  }

  throw new Error(`Unsupported remote path: ${path}`);
}

async function resolveConflicts(
  conflictResult: ConflictResult,
  resolutions: ResolvedConflict[],
  shaManager: ShaManager,
  shaStore: ShaStore
): Promise<FileChange[]> {
  const filesToCommit = [...conflictResult.safe];

  for (const resolution of resolutions) {
    const conflict = conflictResult.conflicts.find((item) => item.path === resolution.path);
    if (!conflict) {
      continue;
    }

    if (resolution.resolution === 'overwrite') {
      filesToCommit.push(conflict);
      continue;
    }

    if (resolution.resolution === 'pull') {
      const remote = await shaManager.fetchRemoteContent(conflict.path);
      if (!remote) {
        throw new Error(`Remote file missing for ${conflict.path}`);
      }
      await applyRemoteContent(conflict.path, remote.content);
      const contentHash = await hashContent(remote.content);
      shaStore.set(conflict.path, {
        sha: remote.sha,
        contentHash,
        updatedAt: new Date().toISOString(),
      });
      continue;
    }
  }

  return filesToCommit;
}


function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepEqualJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqualJson(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i += 1) {
      if (aKeys[i] !== bKeys[i]) return false;
      const key = aKeys[i]!;
      if (!deepEqualJson(a[key], b[key])) return false;
    }
    return true;
  }

  // primitives / mismatched types
  return false;
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

/**
 * If SHA tracking is missing (new device / cleared storage) but local hot content
 * matches the current remote file, we can safely "baseline" the SHA store without
 * forcing the user through conflict resolution.
 *
 * This protects against accidental overwrites while still making first-run deploy UX sane.
 */
async function pruneBaselineNoops(
  changes: FileChange[],
  remoteShas: Record<string, string | null>,
  shaManager: ShaManager,
  shaStore: ShaStore
): Promise<{ remaining: FileChange[]; baselined: number }> {
  let baselined = 0;
  const remaining: FileChange[] = [];

  for (const change of changes) {
    const remoteSha = remoteShas[change.path] ?? null;

    // Only consider "added" files that exist remotely (store missing localSha).
    if (
      change.status === 'added' &&
      change.localSha === null &&
      remoteSha !== null &&
      typeof change.content === 'string' &&
      typeof change.contentHash === 'string'
    ) {
      const remote = await shaManager.fetchRemoteContent(change.path);
      if (remote?.content) {
        const localJson = tryParseJson(change.content);
        const remoteJson = tryParseJson(remote.content);

        const equivalent =
          localJson !== null && remoteJson !== null
            ? deepEqualJson(localJson, remoteJson)
            : change.content.trim() === remote.content.trim();

        if (equivalent) {
          shaStore.set(change.path, {
            sha: remote.sha,
            contentHash: change.contentHash,
            updatedAt: new Date().toISOString(),
          });
          baselined += 1;
          continue; // Drop from deploy list (no-op).
        }
      }
    }

    remaining.push(change);
  }

  return { remaining, baselined };
}

export async function deployChanges(config: DeployOrchestratorConfig): Promise<void> {
  const { authManager, changeDetector, shaManager, committer, deployUI } = config;

  try {
    const authState = await authManager.getState();
    if (!authState.isAuthenticated) {
      deployUI.setStatus({
        phase: 'error',
        message: 'Not authenticated',
        error: 'Please connect to GitHub first.',
      });
      return;
    }

    deployUI.setStatus({ phase: 'detecting', message: 'Checking for changes...' });

    const changes = await changeDetector.detectChanges();
    if (changes.length === 0) {
      deployUI.setStatus({ phase: 'done', message: 'No changes to deploy.' });
      return;
    }

    deployUI.setStatus({ phase: 'fetching', message: 'Checking remote files...' });

    const paths = changes.map((change) => change.path);
    const remoteShas = await shaManager.fetchRemoteShas(paths);

    // Create a working SHA store once for this deploy attempt.
    const shaStore = await shaManager.createStore();

    // If the user is on a fresh device / cleared storage, we may have "added" files
    // that already exist remotely. When local content matches remote content, we can
    // baseline the SHA store and drop those files from the deploy list.
    const { remaining: effectiveChanges, baselined } = await pruneBaselineNoops(
      changes,
      remoteShas,
      shaManager,
      shaStore
    );

    if (baselined > 0) {
      await shaStore.save();
    }

    if (effectiveChanges.length === 0) {
      deployUI.setStatus({ phase: 'done', message: 'No changes to deploy.' });
      return;
    }

    const conflictResult = detectConflicts(effectiveChanges, remoteShas);

    let filesToCommit = conflictResult.safe;
    if (conflictResult.conflicts.length > 0) {
      deployUI.setStatus({
        phase: 'resolving',
        message: `${conflictResult.conflicts.length} file(s) need attention.`,
      });

      const resolutions = await deployUI.showConflicts(conflictResult.conflicts);
      if (!resolutions) {
        deployUI.setStatus({ phase: 'done', message: 'Deploy cancelled.' });
        return;
      }

      filesToCommit = await resolveConflicts(conflictResult, resolutions, shaManager, shaStore);
      await shaStore.save();
    }

    if (filesToCommit.length === 0) {
      deployUI.setStatus({ phase: 'done', message: 'No files selected for deploy.' });
      return;
    }

    deployUI.setStatus({
      phase: 'committing',
      message: `Deploying ${filesToCommit.length} file(s)...`,
    });

    const results = await committer.commitFiles(
      filesToCommit,
      remoteShas,
      (progress) => {
        deployUI.setStatus({
          phase: 'committing',
          message: `Deploying ${progress.current}/${progress.total}...`,
          progress,
        });
      }
    );

    const resultStore = await shaManager.createStore();
    for (const result of results) {
      if (result.success) {
        const change = filesToCommit.find((item) => item.path === result.path);
        if (!change) {
          continue;
        }
        if (change.status === 'deleted') {
          resultStore.remove(result.path);
          continue;
        }
        if (result.newSha && change.contentHash) {
          resultStore.set(result.path, {
            sha: result.newSha,
            contentHash: change.contentHash,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
    await resultStore.save();

    const successCount = results.filter((result) => result.success).length;
    const failCount = results.filter((result) => !result.success).length;

    if (failCount === 0) {
      deployUI.setStatus({
        phase: 'done',
        message: `Successfully deployed ${successCount} file(s).`,
        results,
      });
    } else {
      const firstError = results.find((result) => !result.success)?.error ?? 'Deploy failed.';
      deployUI.setStatus({
        phase: 'error',
        message: `Deployed ${successCount} file(s), ${failCount} failed.`,
        results,
        error: firstError,
      });
    }
  } catch (error) {
    console.warn(`${LOG_PREFIX} Deploy failed`, error);
    deployUI.setStatus({
      phase: 'error',
      message: 'Deploy failed.',
      error: error instanceof Error ? error.message : 'Unknown error.',
    });
  }
}
