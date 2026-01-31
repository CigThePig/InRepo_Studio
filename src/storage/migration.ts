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
 * Check if remote has newer data than local
 */
export async function checkForUpdates(): Promise<boolean> {
  // For now, just check if project.json has changed
  const hotProject = await hot.getHotProject();

  if (!hotProject) {
    return true; // No local data, need update
  }

  // TODO: Implement proper freshness checking using ETags or SHAs
  // This would require storing the last known ETag/SHA in hot storage
  // For now, return false (assume no updates)
  return false;
}
