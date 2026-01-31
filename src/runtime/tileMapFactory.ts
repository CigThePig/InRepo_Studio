import Phaser from 'phaser';
import type { SceneRuntime } from '@/runtime/sceneLoader';
import type { ProjectRuntime } from '@/runtime/projectLoader';
import { getGidForTile } from '@/types/scene';

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

function createOverlay(
  scene: Phaser.Scene,
  config: OverlayConfig
): Phaser.GameObjects.Graphics | null {
  const { layer, tileSize, color, alpha, depth } = config;
  let hasTiles = false;

  const graphics = scene.add.graphics();
  graphics.fillStyle(color, alpha);

  for (let y = 0; y < layer.length; y += 1) {
    const row = layer[y];
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] > 0) {
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

function buildTilesets(
  tilemap: Phaser.Tilemaps.Tilemap,
  sceneRuntime: SceneRuntime,
  projectRuntime: ProjectRuntime
): Phaser.Tilemaps.Tileset[] {
  const tilesets: Phaser.Tilemaps.Tileset[] = [];
  const { scene } = sceneRuntime;

  for (const category of projectRuntime.project.tileCategories) {
    for (const [index] of category.files.entries()) {
      const gid = getGidForTile(scene, category.name, index);
      if (!gid) continue;

      const textureKey = projectRuntime.getTileTextureKey(category.name, index);
      if (!textureKey) {
        console.warn(`${LOG_PREFIX} Missing texture key for ${category.name}:${index}`);
        continue;
      }

      if (!tilemap.scene.textures.exists(textureKey)) {
        console.warn(`${LOG_PREFIX} Texture not loaded for ${textureKey}`);
        continue;
      }

      const tileset = tilemap.addTilesetImage(
        textureKey,
        textureKey,
        scene.tileSize,
        scene.tileSize,
        0,
        0,
        gid
      );

      if (tileset) {
        tilesets.push(tileset);
      }
    }
  }

  return tilesets;
}

function paintLayer(
  layer: Phaser.Tilemaps.TilemapLayer | null,
  data: number[][]
): void {
  if (!layer) return;

  for (let y = 0; y < data.length; y += 1) {
    const row = data[y];
    for (let x = 0; x < row.length; x += 1) {
      const tileIndex = row[x];
      if (tileIndex > 0) {
        layer.putTileAt(tileIndex, x, y);
      }
    }
  }
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

  const tilesets = buildTilesets(tilemap, sceneRuntime, projectRuntime);

  const groundLayer = tilemap.createBlankLayer('ground', tilesets) ?? null;
  const propsLayer = tilemap.createBlankLayer('props', tilesets) ?? null;

  if (groundLayer) {
    groundLayer.setDepth(0);
  }
  if (propsLayer) {
    propsLayer.setDepth(1);
  }

  paintLayer(groundLayer, scene.layers.ground);
  paintLayer(propsLayer, scene.layers.props);

  const collisionOverlay = createOverlay(phaserScene, {
    layer: scene.layers.collision,
    tileSize: scene.tileSize,
    color: 0xff3b3b,
    alpha: 0.35,
    depth: 2,
  });

  const triggerOverlay = createOverlay(phaserScene, {
    layer: scene.layers.triggers,
    tileSize: scene.tileSize,
    color: 0x2ecc71,
    alpha: 0.35,
    depth: 3,
  });

  return {
    tilemap,
    layers: {
      ground: groundLayer,
      props: propsLayer,
      collision: collisionOverlay,
      triggers: triggerOverlay,
    },
    destroy() {
      groundLayer?.destroy();
      propsLayer?.destroy();
      collisionOverlay?.destroy();
      triggerOverlay?.destroy();
      tilemap.destroy();
    },
  };
}
