/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Fetch operations for cold storage (read from repository)
 *
 * Defines:
 * - FreshnessCheckSchema — remote file state (type: schema)
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
import { validateProject, validateScene } from '@/types';

const LOG_PREFIX = '[Storage/Cold]';

// --- Freshness Check Schema ---

export interface FreshnessCheck {
  etag: string | null;
  lastModified: string | null;
  sha: string | null;
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
    const response = await fetch(url, { method: 'HEAD' });

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

// --- Scene List Discovery ---

/**
 * Attempt to discover available scenes from the project.
 * This loads the project and returns scene IDs based on the defaultScene
 * and any scene references found.
 */
export async function discoverScenes(project: Project): Promise<string[]> {
  const sceneIds = new Set<string>();

  // Add default scene
  if (project.defaultScene) {
    sceneIds.add(project.defaultScene);
  }

  // Try to find scenes by checking for scene files
  // In a real scenario, we'd need a manifest or directory listing
  // For now, just return the default scene
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
