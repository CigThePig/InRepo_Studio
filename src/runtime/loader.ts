/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Runtime data source selection for hot/cold loading.
 *
 * Defines:
 * - DataSourceMode — data source selection (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: not applicable (runtime-only)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (runtime init)
 * - Apply hook: createUnifiedLoader(mode)
 *
 * Excluded / not exposed:
 * - none
 *
 * Verification (minimum):
 * - [ ] Hot mode loads from IndexedDB
 * - [ ] Cold mode loads from fetch
 */

import type { Project, Scene } from '@/types';
import { loadProject, loadScene, fetchProject, fetchScene } from '@/storage';

const LOG_PREFIX = '[Runtime/Loader]';

export type DataSourceMode = 'hot' | 'cold';

export interface UnifiedLoader {
  loadProject(): Promise<Project>;
  loadScene(sceneId: string): Promise<Scene>;
  getMode(): DataSourceMode;
}

export function createUnifiedLoader(mode: DataSourceMode): UnifiedLoader {
  return {
    getMode() {
      return mode;
    },

    async loadProject() {
      if (mode === 'hot') {
        const project = await loadProject();
        if (!project) {
          throw new Error(`${LOG_PREFIX} No project data in hot storage`);
        }
        return project;
      }

      const project = await fetchProject();
      if (!project) {
        throw new Error(`${LOG_PREFIX} No project data in cold storage`);
      }
      return project;
    },

    async loadScene(sceneId: string) {
      if (mode === 'hot') {
        const scene = await loadScene(sceneId);
        if (!scene) {
          throw new Error(`${LOG_PREFIX} Scene "${sceneId}" not found in hot storage`);
        }
        return scene;
      }

      const scene = await fetchScene(sceneId);
      if (!scene) {
        throw new Error(`${LOG_PREFIX} Scene "${sceneId}" not found in cold storage`);
      }
      return scene;
    },
  };
}
