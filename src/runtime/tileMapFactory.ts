import Phaser from 'phaser';
import type { SceneRuntime } from '@/runtime/sceneLoader';
import type { ProjectRuntime } from '@/runtime/projectLoader';
import { resolveTileGid } from '@/types/scene';
import { getAtlasCategoryName } from '@/shared/atlasNaming';
import { resolveAtlasSliceByLocalId } from '@/shared/atlasTileIds';
import {
  buildRuntimeTilesetRegistry,
  type NonTilemapTileUsage,
  type RuntimeTilesetRegistry,
} from '@/runtime/tiles/runtimeTilesetRegistry';
import {
  DEPTH_GROUND,
  DEPTH_GROUND_DETAIL,
  DEPTH_PROPS,
} from '@/runtime/depthBands';

const LOG_PREFIX = '[Runtime/TileMapFactory]';

export interface TileMapConfig {
  phaserScene: Phaser.Scene;
  sceneRuntime: SceneRuntime;
  projectRuntime: ProjectRuntime;
}

export interface TileMapResult {
  tilemap: Phaser.Tilemaps.Tilemap;
  layers: {
    ground: Phaser.Tilemaps.TilemapLayer | null;
    props: Phaser.Tilemaps.TilemapLayer | null;
    collision: Phaser.GameObjects.Graphics | null;
    triggers: Phaser.GameObjects.Graphics | null;
    tileSpriteFallbackLayer: Phaser.GameObjects.Container | null;
  };
  destroy(): void;
}

interface OverlayConfig {
  layer: number[][];
  tileSize: number;
  color: number;
  alpha: number;
  depth: number;
}

function createOverlay(scene: Phaser.Scene, config: OverlayConfig): Phaser.GameObjects.Graphics | null {
  const { layer, tileSize, color, alpha, depth } = config;
  let hasTiles = false;
  const graphics = scene.add.graphics();
  graphics.fillStyle(color, alpha);
  for (let y = 0; y < layer.length; y += 1) {
    for (let x = 0; x < layer[y].length; x += 1) {
      if (layer[y][x] > 0) {
        graphics.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        hasTiles = true;
      }
    }
  }
  if (!hasTiles) {
    graphics.destroy();
    return null;
  }
  graphics.setDepth(depth);
  return graphics;
}

function addTilesets(
  tilemap: Phaser.Tilemaps.Tilemap,
  registry: RuntimeTilesetRegistry,
  tileSize: number,
): Phaser.Tilemaps.Tileset[] {
  if (registry.tilesets.length === 0) return [];

  const binding = registry.tilesets[0];
  const tileset = tilemap.addTilesetImage(
    binding.key,
    binding.textureKey,
    tileSize,
    tileSize,
    0,
    0,
  );
  return tileset ? [tileset] : [];
}

function paintTileLayer(
  layer: Phaser.Tilemaps.TilemapLayer | null,
  data: number[][],
  sceneRuntime: SceneRuntime,
  registry: RuntimeTilesetRegistry,
): void {
  if (!layer) return;

  for (let y = 0; y < data.length; y += 1) {
    for (let x = 0; x < data[y].length; x += 1) {
      const sourceGid = data[y][x];
      if (sourceGid <= 0) continue;
      const tileRef = resolveTileGid(sceneRuntime.scene, sourceGid);
      const runtimeIndex = registry.resolveTileIndex(tileRef);
      if (runtimeIndex < 0) continue;
      layer.putTileAt(runtimeIndex, x, y);
    }
  }
}

function spawnFallbackSprites(
  phaserScene: Phaser.Scene,
  sceneRuntime: SceneRuntime,
  projectRuntime: ProjectRuntime,
  usages: NonTilemapTileUsage[],
): Phaser.GameObjects.Container | null {
  if (usages.length === 0) return null;

  const container = phaserScene.add.container(0, 0).setDepth(DEPTH_GROUND_DETAIL);
  const tileSize = sceneRuntime.scene.tileSize;

  for (const usage of usages) {
    const separatorIndex = usage.key.lastIndexOf(':');
    const category = separatorIndex >= 0 ? usage.key.slice(0, separatorIndex) : usage.key;
    const indexRaw = separatorIndex >= 0 ? usage.key.slice(separatorIndex + 1) : '';
    const index = Number(indexRaw);
    if (!Number.isFinite(index)) continue;

    let textureKey: string | null = null;
    let frameName: string | undefined;

    if (category.startsWith('atlas:')) {
      const atlas = (projectRuntime.project.spriteAtlases ?? []).find(
        (item) => getAtlasCategoryName(item.path) === category,
      );
      const slice = resolveAtlasSliceByLocalId(atlas, index);
      textureKey = projectRuntime.getAtlasTextureKey(category);
      if (!slice || !textureKey || !phaserScene.textures.exists(textureKey)) continue;
      frameName = slice.name;
    } else {
      textureKey = projectRuntime.getTileTextureKey(category, index);
      if (!textureKey || !phaserScene.textures.exists(textureKey)) continue;
      frameName = undefined;
    }

    for (const placement of usage.placements) {
      const sprite = phaserScene.add
        .image(
          placement.x * tileSize + tileSize / 2,
          placement.y * tileSize + tileSize / 2,
          textureKey,
          frameName,
        )
        .setDisplaySize(tileSize, tileSize)
        .setOrigin(0.5, 0.5);
      container.add(sprite);
    }

    const isGroundPlacement = usage.placements.some((placement) => {
      const sourceGid = sceneRuntime.scene.layers.ground[placement.y]?.[placement.x] ?? 0;
      return sourceGid > 0;
    });
    if (isGroundPlacement) {
      console.warn(`${LOG_PREFIX} Ground layer using sprite fallback (seams can reappear).`, usage);
    }
  }

  return container;
}

export function createTileMap(config: TileMapConfig): TileMapResult {
  const { phaserScene, sceneRuntime, projectRuntime } = config;
  const { scene } = sceneRuntime;

  const tilemap = phaserScene.make.tilemap({
    tileWidth: scene.tileSize,
    tileHeight: scene.tileSize,
    width: scene.width,
    height: scene.height,
  });

  const registry = buildRuntimeTilesetRegistry(phaserScene, projectRuntime, sceneRuntime);
  const tilesets = addTilesets(tilemap, registry, scene.tileSize);

  const groundLayer = tilemap.createBlankLayer('ground', tilesets) ?? null;
  const propsLayer = tilemap.createBlankLayer('props', tilesets) ?? null;
  groundLayer?.setPosition(0, 0).setDepth(DEPTH_GROUND);
  propsLayer?.setPosition(0, 0).setDepth(DEPTH_PROPS);

  paintTileLayer(groundLayer, scene.layers.ground, sceneRuntime, registry);
  paintTileLayer(propsLayer, scene.layers.props, sceneRuntime, registry);

  const fallbackLayer = spawnFallbackSprites(
    phaserScene,
    sceneRuntime,
    projectRuntime,
    registry.nonTilemapTileUsages,
  );

  const collisionOverlay = createOverlay(phaserScene, {
    layer: scene.layers.collision,
    tileSize: scene.tileSize,
    color: 0xff3b3b,
    alpha: 0.35,
    depth: DEPTH_PROPS + 1,
  });

  const triggerOverlay = createOverlay(phaserScene, {
    layer: scene.layers.triggers,
    tileSize: scene.tileSize,
    color: 0x2ecc71,
    alpha: 0.35,
    depth: DEPTH_PROPS + 2,
  });

  console.log(`${LOG_PREFIX} created tile map for scene ${scene.id}`, registry.debugInfo);

  return {
    tilemap,
    layers: {
      ground: groundLayer,
      props: propsLayer,
      collision: collisionOverlay,
      triggers: triggerOverlay,
      tileSpriteFallbackLayer: fallbackLayer,
    },
    destroy() {
      groundLayer?.destroy();
      propsLayer?.destroy();
      fallbackLayer?.destroy(true);
      collisionOverlay?.destroy();
      triggerOverlay?.destroy();
      registry.destroy();
      tilemap.destroy();
    },
  };
}
