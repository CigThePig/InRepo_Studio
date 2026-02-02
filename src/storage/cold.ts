/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Fetch operations for cold storage (read from repository)
 *
 * Defines:
 * - FreshnessCheckSchema — remote file state (type: schema)
 * - RepoAssetManifest — repo asset folder scan results (type: schema)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: not applicable (read-only)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: migration triggers on first load
 *
 * Verification (minimum):
 * - [ ] Can load project from /game/project.json
 * - [ ] Migration populates IndexedDB on first run
 * - [ ] Freshness check detects remote changes
 */

import type { Project, Scene } from '@/types';
import type { AssetGroupType } from '@/editor/assets/assetGroup';
import { validateProject, validateScene } from '@/types';

const LOG_PREFIX = '[Storage/Cold]';

// --- Freshness Check Schema ---

export interface FreshnessCheck {
  etag: string | null;
  lastModified: string | null;
  sha: string | null;
}

export interface RepoGroupEntry {
  type: AssetGroupType;
  slug: string;
  path: string;
  files: string[];
}

export interface RepoAssetManifest {
  scannedAt: number;
  groups: RepoGroupEntry[];
}

// --- Base Path ---

/**
 * Get the base path for the application.
 * This handles GitHub Pages deployment where the app runs under /<repo>/
 */
function getBasePath(): string {
  // In production, use the current path as base
  // Vite sets import.meta.env.BASE_URL during build
  if (import.meta.env.BASE_URL) {
    return import.meta.env.BASE_URL;
  }
  return './';
}

/**
 * Resolve a path relative to the game folder
 */
export function resolveGamePath(path: string): string {
  const base = getBasePath();
  // Ensure path doesn't start with /
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // Ensure base ends with /
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}game/${cleanPath}`;
}

/**
 * Resolve an asset path
 */
export function resolveAssetPath(assetPath: string): string {
  return resolveGamePath(assetPath);
}

// --- Project Loading ---

export async function fetchProject(): Promise<Project | null> {
  const url = resolveGamePath('project.json');
  console.log(`${LOG_PREFIX} Fetching project from ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`${LOG_PREFIX} No project.json found (404)`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!validateProject(data)) {
      console.error(`${LOG_PREFIX} project.json failed validation`);
      return null;
    }

    console.log(`${LOG_PREFIX} Project loaded: "${data.name}"`);
    return data;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to fetch project:`, error);
    return null;
  }
}

// --- Scene Loading ---

export async function fetchScene(sceneId: string): Promise<Scene | null> {
  const url = resolveGamePath(`scenes/${sceneId}.json`);
  console.log(`${LOG_PREFIX} Fetching scene from ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`${LOG_PREFIX} Scene "${sceneId}" not found (404)`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!validateScene(data)) {
      console.error(`${LOG_PREFIX} Scene "${sceneId}" failed validation`);
      return null;
    }

    console.log(`${LOG_PREFIX} Scene loaded: "${data.name}"`);
    return data;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to fetch scene "${sceneId}":`, error);
    return null;
  }
}

// --- Freshness Check ---

export async function checkFreshness(path: string): Promise<FreshnessCheck> {
  const url = resolveGamePath(path);

  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });

    if (!response.ok) {
      return { etag: null, lastModified: null, sha: null };
    }

    return {
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      sha: null, // SHA is obtained via GitHub API, not fetch
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to check freshness for "${path}":`, error);
    return { etag: null, lastModified: null, sha: null };
  }
}

export async function hasRemoteChanges(
  path: string,
  knownEtag: string | null
): Promise<boolean> {
  if (!knownEtag) return true; // Assume changed if we don't have etag

  const freshness = await checkFreshness(path);
  if (!freshness.etag) return true; // Assume changed if we can't check

  return freshness.etag !== knownEtag;
}

// --- Asset Folder Scanning ---

interface GitHubContentItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
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

async function fetchRepoContents(options: {
  repoOwner: string;
  repoName: string;
  path: string;
  token?: string | null;
}): Promise<GitHubContentItem[] | null> {
  const { repoOwner, repoName, path, token } = options;
  const cleanPath = path.replace(/^\/+/, '');
  const response = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${cleanPath}`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  const rateLimitError = parseRateLimitError(response);
  if (rateLimitError) {
    throw new Error(rateLimitError);
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return null;
  }
  return data as GitHubContentItem[];
}

export async function scanAssetFolders(options: {
  repoOwner: string;
  repoName: string;
  token?: string | null;
  assetPaths: Record<AssetGroupType, string>;
}): Promise<RepoAssetManifest> {
  const { repoOwner, repoName, token, assetPaths } = options;
  const groups: RepoGroupEntry[] = [];

  for (const [type, basePath] of Object.entries(assetPaths) as [AssetGroupType, string][]) {
    const rootContents = await fetchRepoContents({
      repoOwner,
      repoName,
      path: basePath,
      token,
    });
    if (!rootContents) {
      continue;
    }

    const directories = rootContents.filter((entry) => entry.type === 'dir');
    for (const dir of directories) {
      const groupContents = await fetchRepoContents({
        repoOwner,
        repoName,
        path: dir.path,
        token,
      });

      const files = (groupContents ?? [])
        .filter((entry) => entry.type === 'file')
        .map((entry) => entry.name);

      groups.push({
        type,
        slug: dir.name,
        path: dir.path,
        files,
      });
    }
  }

  return {
    scannedAt: Date.now(),
    groups,
  };
}

// --- Scene List Discovery ---

/**
 * Attempt to discover available scenes from the project.
 * This loads the project and returns scene IDs based on the defaultScene
 * and any scene references found.
 */
export async function discoverScenes(project: Project): Promise<string[]> {
  const sceneIds = new Set<string>();

  const addSceneId = (id: unknown): void => {
    if (typeof id !== 'string') return;
    const trimmed = id.trim();
    if (!trimmed) return;
    // Keep IDs conservative: avoid path traversal and file extensions.
    // Scene files are expected at `game/scenes/<id>.json`.
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) return;
    sceneIds.add(trimmed);
  };

  // Always include the project's default scene
  addSceneId(project.defaultScene);

  /**
   * GitHub Pages cannot provide directory listings. To support multi-scene projects
   * (and offline-after-load), we optionally read a manifest if the game provides one.
   *
   * Supported optional manifests (first one found wins):
   * - `game/scenes/index.json` (recommended)
   * - `game/scenes/manifest.json`
   * - `game/scenes.json`
   *
   * Accepted JSON shapes:
   * - string[]: ["main", "town", ...]
   * - { scenes: string[] }
   * - { scenes: { id: string }[] }
   * - { ids: string[] }
   *
   * If none exist, we fall back to just the default scene.
   */
  const candidates = ['scenes/index.json', 'scenes/manifest.json', 'scenes.json'];

  for (const manifestPath of candidates) {
    const url = resolveGamePath(manifestPath);
    const before = sceneIds.size;

    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;

      const data = await response.json();

      let list: unknown[] | null = null;
      if (Array.isArray(data)) {
        list = data;
      } else if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.scenes)) list = obj.scenes as unknown[];
        else if (Array.isArray(obj.ids)) list = obj.ids as unknown[];
      }

      if (!list) continue;

      for (const entry of list) {
        if (typeof entry === 'string') addSceneId(entry);
        else if (entry && typeof entry === 'object') {
          addSceneId((entry as any).id);
        }
      }

      if (sceneIds.size > before) {
        console.log(`${LOG_PREFIX} Discovered ${sceneIds.size} scenes via ${manifestPath}`);
        break;
      }
    } catch (error) {
      // Non-fatal: we can still run with the default scene.
      console.warn(`${LOG_PREFIX} Failed to read scene manifest ${manifestPath}:`, error);
    }
  }

  return Array.from(sceneIds);
}


// --- Preload Assets ---

export interface AssetPreloadResult {
  loaded: string[];
  failed: string[];
}

/**
 * Preload tile images for faster rendering
 */
export async function preloadTileAssets(
  project: Project
): Promise<AssetPreloadResult> {
  const loaded: string[] = [];
  const failed: string[] = [];

  for (const category of project.tileCategories) {
    for (const file of category.files) {
      const assetPath = `${category.path}/${file}`;
      const url = resolveAssetPath(assetPath);

      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load ${url}`));
          img.src = url;
        });
        loaded.push(assetPath);
      } catch {
        console.warn(`${LOG_PREFIX} Failed to preload: ${assetPath}`);
        failed.push(assetPath);
      }
    }
  }

  console.log(`${LOG_PREFIX} Asset preload: ${loaded.length} loaded, ${failed.length} failed`);
  return { loaded, failed };
}
