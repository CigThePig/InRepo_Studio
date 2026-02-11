import type { UnifiedLoader } from '@/runtime/loader';
import type { ProjectRuntime } from '@/runtime/projectLoader';
import type { SceneRuntime } from '@/runtime/sceneLoader';
import { loadScene } from '@/runtime/sceneLoader';
import { createTileMap, type TileMapResult } from '@/runtime/tileMapFactory';
import { createEntityRegistry } from '@/runtime/entityRegistry';
import { spawnEntities, type SpawnedEntity } from '@/runtime/entitySpawner';
import { setRuntimeEnv, clearRuntimeEnv } from '@/runtime/presets/runtimeEnv';
import Phaser from 'phaser';

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
  let currentPlayerSprite: Phaser.GameObjects.Sprite | null = null;
  let fallbackPlayerTextureKey: string | null = null;

  const ensureFallbackPlayerSprite = (): Phaser.GameObjects.Sprite => {
    if (!fallbackPlayerTextureKey || !phaserScene.textures.exists(fallbackPlayerTextureKey)) {
      fallbackPlayerTextureKey = '__inrepo_placeholder_player';
      if (!phaserScene.textures.exists(fallbackPlayerTextureKey)) {
        const g = phaserScene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 32, 32);
        g.generateTexture(fallbackPlayerTextureKey, 32, 32);
        g.destroy();
      }
    }

    const sprite = phaserScene.add.sprite(0, 0, fallbackPlayerTextureKey);
    sprite.setName('__inrepo_placeholder_player');
    return sprite;
  };

  const resolvePlayerSprite = (): Phaser.GameObjects.Sprite | null => {
    const preferred = currentEntities.find((entity) => {
      const entityType = entity.instance.type;
      return /player/i.test(entityType) && entity.gameObject instanceof Phaser.GameObjects.Sprite;
    });

    if (preferred && preferred.gameObject instanceof Phaser.GameObjects.Sprite) {
      return preferred.gameObject;
    }

    const firstSprite = currentEntities.find(
      (entity) => entity.gameObject instanceof Phaser.GameObjects.Sprite,
    );
    if (firstSprite && firstSprite.gameObject instanceof Phaser.GameObjects.Sprite) {
      return firstSprite.gameObject;
    }

    return null;
  };

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
    if (currentPlayerSprite && currentPlayerSprite.active) {
      const isFallback = currentPlayerSprite.name === '__inrepo_placeholder_player';
      if (isFallback) {
        currentPlayerSprite.destroy();
      }
    }
    currentPlayerSprite = null;
    clearRuntimeEnv();
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

      const playerSprite = resolvePlayerSprite() ?? ensureFallbackPlayerSprite();
      currentPlayerSprite = playerSprite;
      setRuntimeEnv({
        scene: phaserScene,
        getPlayerSprite: () => playerSprite.active ? playerSprite : null,
        getMainCamera: () => phaserScene.cameras.main,
      });

      phaserScene.events.once('shutdown', () => {
        clearRuntimeEnv();
      });
      phaserScene.events.once('destroy', () => {
        clearRuntimeEnv();
      });

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
