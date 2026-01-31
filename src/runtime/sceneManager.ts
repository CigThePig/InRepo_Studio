import type { UnifiedLoader } from '@/runtime/loader';
import type { ProjectRuntime } from '@/runtime/projectLoader';
import type { SceneRuntime } from '@/runtime/sceneLoader';
import { loadScene } from '@/runtime/sceneLoader';
import { createTileMap, type TileMapResult } from '@/runtime/tileMapFactory';
import { createEntityRegistry } from '@/runtime/entityRegistry';
import { spawnEntities, type SpawnedEntity } from '@/runtime/entitySpawner';
import type Phaser from 'phaser';

const LOG_PREFIX = '[Runtime/SceneManager]';

export interface SceneManagerConfig {
  loader: UnifiedLoader;
  projectRuntime: ProjectRuntime;
  phaserScene: Phaser.Scene;
  onSceneLoad?: (sceneId: string) => void;
}

export interface SceneManager {
  currentSceneId: string | null;
  goTo(sceneId: string, options?: { x?: number; y?: number }): Promise<void>;
  reload(): Promise<void>;
  getCurrentScene(): SceneRuntime | null;
  destroy(): void;
}

export function createSceneManager(config: SceneManagerConfig): SceneManager {
  const { loader, projectRuntime, phaserScene, onSceneLoad } = config;
  const entityRegistry = createEntityRegistry(Array.from(projectRuntime.entityTypes.values()));

  let currentSceneRuntime: SceneRuntime | null = null;
  let currentTilemap: TileMapResult | null = null;
  let currentEntities: SpawnedEntity[] = [];

  const cleanup = (): void => {
    for (const entity of currentEntities) {
      entity.destroy();
    }
    currentEntities = [];

    if (currentTilemap) {
      currentTilemap.destroy();
      currentTilemap = null;
    }

    currentSceneRuntime = null;
  };

  const applyCameraBounds = (sceneRuntime: SceneRuntime, options?: { x?: number; y?: number }) => {
    const camera = phaserScene.cameras.main;
    camera.setBounds(0, 0, sceneRuntime.widthPx, sceneRuntime.heightPx);

    if (options?.x !== undefined || options?.y !== undefined) {
      camera.centerOn(options?.x ?? sceneRuntime.widthPx / 2, options?.y ?? sceneRuntime.heightPx / 2);
    } else {
      camera.centerOn(sceneRuntime.widthPx / 2, sceneRuntime.heightPx / 2);
    }
  };

  return {
    currentSceneId: null,

    async goTo(sceneId, options) {
      console.log(`${LOG_PREFIX} Transitioning to scene: ${sceneId}`);
      cleanup();

      currentSceneRuntime = await loadScene({ loader, projectRuntime }, sceneId);
      currentTilemap = createTileMap({
        phaserScene,
        sceneRuntime: currentSceneRuntime,
        projectRuntime,
      });

      currentEntities = spawnEntities(
        { phaserScene, entityRegistry, projectRuntime },
        currentSceneRuntime.scene.entities
      );

      applyCameraBounds(currentSceneRuntime, options);

      this.currentSceneId = sceneId;
      onSceneLoad?.(sceneId);
    },

    async reload() {
      if (!this.currentSceneId) return;
      await this.goTo(this.currentSceneId);
    },

    getCurrentScene() {
      return currentSceneRuntime;
    },

    destroy() {
      cleanup();
    },
  };
}
