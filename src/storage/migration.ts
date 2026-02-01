/**
 * Cold-to-Hot Migration
 *
 * Handles the initial load process that populates IndexedDB from
 * the repository files on first run or when hot storage is empty.
 */

import type { Scene } from '@/types';
import { createDefaultProject, createScene, ensureSceneTilesets } from '@/types';
import * as hot from './hot';
import * as cold from './cold';

const LOG_PREFIX = '[Storage/Migration]';


export interface UpdateCheckResult {
  /** True if the published (cold) project.json appears newer/different than the current hot snapshot. */
  needsUpdate: boolean;
  /** True if we were able to contact cold storage for a freshness check. */
  canCheckRemote: boolean;
  /** Human-readable reason for the result. */
  reason:
    | 'no-hot-data'
    | 'baseline-missing'
    | 'baseline-initialized'
    | 'etag-changed'
    | 'last-modified-changed'
    | 'project-diff'
    | 'remote-unreachable'
    | 'remote-unknown';
  remote: cold.FreshnessCheck | null;
  baseline: {
    etag: string | null;
    lastModified: string | null;
  } | null;
  /** Cache-bust token derived from the latest known cold fingerprint (etag/lastModified). */
  cacheBust: string | null;
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const stringify = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[Circular]';
    seen.add(v);

    if (Array.isArray(v)) return v.map(stringify);

    const out: Record<string, any> = {};
    const keys = Object.keys(v).sort();
    for (const k of keys) {
      out[k] = stringify(v[k]);
    }
    return out;
  };

  return JSON.stringify(stringify(value));
}

export interface MigrationResult {
  success: boolean;
  projectLoaded: boolean;
  scenesLoaded: string[];
  errors: string[];
}

/**
 * Check if migration is needed (no hot data exists)
 */
export async function needsMigration(): Promise<boolean> {
  return !(await hot.hasHotData());
}

/**
 * Migrate data from cold storage (repository) to hot storage (IndexedDB)
 */
export async function migrateFromCold(): Promise<MigrationResult> {
  console.log(`${LOG_PREFIX} Starting cold-to-hot migration...`);

  const result: MigrationResult = {
    success: false,
    projectLoaded: false,
    scenesLoaded: [],
    errors: [],
  };

  try {
    // Load project from repository
    let project = await cold.fetchProject();

    if (!project) {
      console.log(`${LOG_PREFIX} No project found in repository, creating default`);
      project = createDefaultProject('New Project');
    }

    // Save project to hot storage
    await hot.saveProject(project);
    result.projectLoaded = true;

    // Record the cold baseline fingerprint so we can detect future repo changes without
    // silently overwriting local edits.
    const projectFreshness = await cold.checkFreshness('project.json');
    await hot.setColdBaseline({
      project: {
        etag: projectFreshness.etag,
        lastModified: projectFreshness.lastModified,
      },
      checkedAt: Date.now(),
    });

    // Load scenes
    const sceneIds = await cold.discoverScenes(project);

    for (const sceneId of sceneIds) {
      try {
        let scene = await cold.fetchScene(sceneId);

        if (!scene) {
          console.log(`${LOG_PREFIX} Creating default scene for "${sceneId}"`);
          scene = createScene(
            sceneId,
            sceneId === project.defaultScene ? 'Main Scene' : sceneId,
            project.settings.defaultGridWidth,
            project.settings.defaultGridHeight,
            project.settings.defaultTileSize,
            project
          );
        }

        // Normalize tilesets to avoid ambiguous GID mapping.
        const ensured = ensureSceneTilesets(scene, project);
        scene = ensured.scene;
        if (ensured.warnings.length > 0) {
          for (const w of ensured.warnings) {
            console.warn(`${LOG_PREFIX} ${w}`);
          }
        }

        await hot.saveScene(scene);
        result.scenesLoaded.push(sceneId);
      } catch (error) {
        const msg = `Failed to load scene "${sceneId}": ${error}`;
        console.error(`${LOG_PREFIX} ${msg}`);
        result.errors.push(msg);
      }
    }

    // If no scenes were loaded/discovered, create a default one
    if (result.scenesLoaded.length === 0) {
      console.log(`${LOG_PREFIX} No scenes found, creating default scene`);
      const defaultScene = createScene(
        project.defaultScene || 'main',
        'Main Scene',
        project.settings.defaultGridWidth,
        project.settings.defaultGridHeight,
        project.settings.defaultTileSize,
        project
      );
      const ensured = ensureSceneTilesets(defaultScene, project);
      const normalized = ensured.scene;
      if (ensured.warnings.length > 0) {
        for (const w of ensured.warnings) {
          console.warn(`${LOG_PREFIX} ${w}`);
        }
      }
      await hot.saveScene(normalized);
      result.scenesLoaded.push(defaultScene.id);
    }

    result.success = true;
    console.log(
      `${LOG_PREFIX} Migration complete: ${result.scenesLoaded.length} scenes loaded`
    );
  } catch (error) {
    const msg = `Migration failed: ${error}`;
    console.error(`${LOG_PREFIX} ${msg}`);
    result.errors.push(msg);
  }

  return result;
}

/**
 * Force refresh from cold storage (overwrites hot data)
 */
export async function forceRefreshFromCold(): Promise<MigrationResult> {
  console.log(`${LOG_PREFIX} Force refreshing from cold storage...`);

  // Clear existing hot data
  await hot.clearAllData();

  // Re-run migration
  return migrateFromCold();
}

/**
 * Sync specific scenes from cold to hot (for conflict resolution)
 */
export async function syncSceneFromCold(sceneId: string): Promise<Scene | null> {
  console.log(`${LOG_PREFIX} Syncing scene "${sceneId}" from cold storage...`);

  const scene = await cold.fetchScene(sceneId);

  if (scene) {
    await hot.saveScene(scene);
    console.log(`${LOG_PREFIX} Scene "${sceneId}" synced`);
  }

  return scene;
}

/**
 * Check if cold storage (repo) appears to have changed since hot storage was seeded.
 *
 * Philosophy:
 * - Never overwrite hot edits automatically.
 * - Detect and surface a "published version changed" signal so the editor can offer a safe refresh.
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const hotProject = await hot.getHotProject();

  if (!hotProject) {
    return {
      needsUpdate: true,
      canCheckRemote: true,
      reason: 'no-hot-data',
      remote: null,
      baseline: null,
      cacheBust: null,
    };
  }

  const baseline = hotProject.coldBaseline?.project ?? null;

  // HEAD check for freshness (no-store so we don't trust stale caches)
  const remote = await cold.checkFreshness('project.json');

  const canCheckRemote = !!(remote.etag || remote.lastModified);
  const cacheBust = remote.etag ?? remote.lastModified ?? baseline?.etag ?? baseline?.lastModified ?? null;

  if (!canCheckRemote) {
    return {
      needsUpdate: false,
      canCheckRemote: false,
      reason: 'remote-unreachable',
      remote,
      baseline,
      cacheBust,
    };
  }

  // If we have a baseline, compare it.
  if (baseline) {
    if (baseline.etag && remote.etag && baseline.etag !== remote.etag) {
      return {
        needsUpdate: true,
        canCheckRemote: true,
        reason: 'etag-changed',
        remote,
        baseline,
        cacheBust,
      };
    }

    if (baseline.lastModified && remote.lastModified && baseline.lastModified !== remote.lastModified) {
      return {
        needsUpdate: true,
        canCheckRemote: true,
        reason: 'last-modified-changed',
        remote,
        baseline,
        cacheBust,
      };
    }

    return {
      needsUpdate: false,
      canCheckRemote: true,
      reason: 'remote-unknown',
      remote,
      baseline,
      cacheBust,
    };
  }

  // No baseline exists (older hot data). Compare cold project.json content to hot project record.
  try {
    const url = cold.resolveGamePath('project.json');
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) {
      const coldProject = await response.json();
      const hotStr = stableStringify(hotProject.project);
      const coldStr = stableStringify(coldProject);
      if (hotStr !== coldStr) {
        return {
          needsUpdate: true,
          canCheckRemote: true,
          reason: 'project-diff',
          remote,
          baseline: null,
          cacheBust,
        };
      }
    }
  } catch (e) {
    console.warn(`${LOG_PREFIX} Unable to compare cold vs hot project.json:`, e);
  }

  // Baseline missing but no diff detected; initialize baseline to current remote fingerprint.
  await hot.setColdBaseline({
    project: { etag: remote.etag, lastModified: remote.lastModified },
    checkedAt: Date.now(),
  });

  return {
    needsUpdate: false,
    canCheckRemote: true,
    reason: 'baseline-initialized',
    remote,
    baseline: { etag: remote.etag, lastModified: remote.lastModified },
    cacheBust,
  };
}
