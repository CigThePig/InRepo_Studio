import type { UnifiedLoader } from '@/runtime/loader';
import type { ProjectRuntime } from '@/runtime/projectLoader';
import type { SceneRuntime } from '@/runtime/sceneLoader';
import { loadScene } from '@/runtime/sceneLoader';
import { createTileMap, type TileMapResult } from '@/runtime/tileMapFactory';
import { createEntityRegistry } from '@/runtime/entityRegistry';
import { spawnEntities, type SpawnedEntity } from '@/runtime/entitySpawner';
import { setRuntimeEnv, clearRuntimeEnv } from '@/runtime/presets/runtimeEnv';
import { getAtlasCategoryName } from '@/shared/atlasNaming';
import { resolveAtlasSliceByLocalId } from '@/shared/atlasTileIds';
import Phaser from 'phaser';
import { DEPTH_ENTITIES_BASE, DEPTH_PROPS } from '@/runtime/depthBands';

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
  let currentPropSprites: Phaser.GameObjects.Image[] = [];
  let currentPlayerSprite: Phaser.GameObjects.Sprite | null = null;
  let fallbackPlayerTextureKey: string | null = null;
  let depthSyncHandler: (() => void) | null = null;

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
    sprite.setDepth(DEPTH_ENTITIES_BASE);
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

  const syncEntityDepth = (): void => {
    for (const entity of currentEntities) {
      const gameObject = entity.gameObject as Phaser.GameObjects.GameObject & {
        y?: number;
        setDepth?: (depth: number) => unknown;
      };
      if (typeof gameObject.setDepth !== 'function') continue;
      const y = typeof gameObject.y === 'number' ? gameObject.y : 0;
      gameObject.setDepth(DEPTH_ENTITIES_BASE + y);
    }

    if (currentPlayerSprite?.active) {
      currentPlayerSprite.setDepth(DEPTH_ENTITIES_BASE + currentPlayerSprite.y);
    }
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

    for (const sprite of currentPropSprites) sprite.destroy();
    currentPropSprites = [];

    if (depthSyncHandler) {
      phaserScene.events.off('postupdate', depthSyncHandler);
      depthSyncHandler = null;
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


  const spawnPropSprites = (): void => {
    if (!currentSceneRuntime) return;
    const propSprites = currentSceneRuntime.scene.propSprites ?? [];
    currentPropSprites = propSprites.flatMap((propSprite) => {
      if (propSprite.sprite.category.startsWith('atlas:')) {
        const atlas = (projectRuntime.project.spriteAtlases ?? []).find((entry) => getAtlasCategoryName(entry.path) === propSprite.sprite.category);
        const slice = resolveAtlasSliceByLocalId(atlas, propSprite.sprite.index);
        const textureKey = projectRuntime.getAtlasTextureKey(propSprite.sprite.category);
        if (!slice || !textureKey || !phaserScene.textures.exists(textureKey)) return [];
        // Use atlas slice frame (registered in projectLoader) so sizing/origin behave correctly.
        const image = phaserScene.add.image(propSprite.x, propSprite.y, textureKey, slice.name).setOrigin(0, 0).setDepth(DEPTH_PROPS + propSprite.y);
        return [image];
      }

      const textureKey = projectRuntime.getTileTextureKey(propSprite.sprite.category, propSprite.sprite.index);
      if (!textureKey || !phaserScene.textures.exists(textureKey)) return [];
      const image = phaserScene.add.image(propSprite.x, propSprite.y, textureKey).setOrigin(0, 0).setDepth(DEPTH_PROPS + propSprite.y);
      return [image];
    });
  };

  const applyCameraBounds = (sceneRuntime: SceneRuntime, options?: { x?: number; y?: number }) => {
    const camera = phaserScene.cameras.main;
    camera.setBounds(0, 0, sceneRuntime.widthPx, sceneRuntime.heightPx);

    if (options?.x !== undefined || options?.y !== undefined) {
      camera.centerOn(options?.x ?? sceneRuntime.widthPx / 2, options?.y ?? sceneRuntime.heightPx / 2);
    } else {
      camera.centerOn(sceneRuntime.widthPx / 2, sceneRuntime.heightPx / 2);
    }

    // Pixel-perfect: avoid sub-pixel scroll which can introduce faint seams between layers.
    const z = camera.zoom || 1;
    camera.scrollX = Math.round(camera.scrollX * z) / z;
    camera.scrollY = Math.round(camera.scrollY * z) / z;
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

      spawnPropSprites();

      currentEntities = spawnEntities(
        { phaserScene, entityRegistry, projectRuntime },
        currentSceneRuntime.scene.entities
      );

      const playerSprite = resolvePlayerSprite() ?? ensureFallbackPlayerSprite();
      currentPlayerSprite = playerSprite;
      syncEntityDepth();
      depthSyncHandler = () => syncEntityDepth();
      phaserScene.events.on('postupdate', depthSyncHandler);

      setRuntimeEnv({
        scene: phaserScene,
        getPlayerSprite: () => playerSprite.active ? playerSprite : null,
        getMainCamera: () => phaserScene.cameras.main,
        resolveAnimationKey: (value: string) => projectRuntime.resolveAnimationKey(value),
        resolveAnimationSetKey: (setIdOrName, facing) => projectRuntime.resolveAnimationSetKey(setIdOrName, facing),
        getAnimationPivotByKey: (key: string) => projectRuntime.getAnimationPivotByKey(key),
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
