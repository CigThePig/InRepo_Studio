import Phaser from 'phaser';
import type { SceneRuntime } from '@/runtime/sceneLoader';
import type { ProjectRuntime } from '@/runtime/projectLoader';
import { getGidForTile, resolveTileGid } from '@/types/scene';
import { getAtlasCategoryName } from '@/shared/atlasNaming';

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

function buildTilesets(tilemap: Phaser.Tilemaps.Tilemap, sceneRuntime: SceneRuntime, projectRuntime: ProjectRuntime): Phaser.Tilemaps.Tileset[] {
  const tilesets: Phaser.Tilemaps.Tileset[] = [];
  const { scene } = sceneRuntime;

  for (const category of projectRuntime.project.tileCategories) {
    for (const [index] of category.files.entries()) {
      const gid = getGidForTile(scene, category.name, index);
      if (!gid) continue;
      const textureKey = projectRuntime.getTileTextureKey(category.name, index);
      if (!textureKey || !tilemap.scene.textures.exists(textureKey)) continue;
      const tileset = tilemap.addTilesetImage(textureKey, textureKey, scene.tileSize, scene.tileSize, 0, 0, gid);
      if (tileset) tilesets.push(tileset);
    }
  }

  return tilesets;
}

function paintLayer(layer: Phaser.Tilemaps.TilemapLayer | null, data: number[][], sceneRuntime: SceneRuntime): void {
  if (!layer) return;
  const { scene } = sceneRuntime;
  for (let y = 0; y < data.length; y += 1) {
    for (let x = 0; x < data[y].length; x += 1) {
      const gid = data[y][x];
      if (gid <= 0) continue;
      const resolved = resolveTileGid(scene, gid);
      if (!resolved || resolved.category.startsWith('atlas:')) continue;
      layer.putTileAt(gid, x, y);
    }
  }
}

function paintAtlasLayer(rt: Phaser.GameObjects.RenderTexture, data: number[][], config: TileMapConfig): void {
  const { sceneRuntime, projectRuntime, phaserScene } = config;
  const { scene } = sceneRuntime;

  for (let y = 0; y < data.length; y += 1) {
    for (let x = 0; x < data[y].length; x += 1) {
      const gid = data[y][x];
      if (gid <= 0) continue;
      const resolved = resolveTileGid(scene, gid);
      if (!resolved || !resolved.category.startsWith('atlas:')) continue;

      const atlas = (projectRuntime.project.spriteAtlases ?? []).find((item) => getAtlasCategoryName(item.path) === resolved.category);
      const textureKey = projectRuntime.getAtlasTextureKey(resolved.category);
      const slice = atlas?.slices?.[resolved.index];
      if (!textureKey || !slice || !phaserScene.textures.exists(textureKey)) continue;

      // Atlas sheets are loaded as a single image; slices are registered as frames in projectLoader.
      const stamp = phaserScene.add.image(0, 0, textureKey, slice.name).setOrigin(0, 0).setVisible(false);
      stamp.setDisplaySize(scene.tileSize, scene.tileSize);
      rt.draw(stamp, x * scene.tileSize, y * scene.tileSize);
      stamp.destroy();
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
  groundLayer?.setDepth(0);
  propsLayer?.setDepth(1);

  paintLayer(groundLayer, scene.layers.ground, sceneRuntime);
  paintLayer(propsLayer, scene.layers.props, sceneRuntime);

  const groundAtlas = phaserScene.add.renderTexture(0, 0, scene.width * scene.tileSize, scene.height * scene.tileSize)
    .setOrigin(0, 0)
    .setDepth(0.5);
  const propsAtlas = phaserScene.add.renderTexture(0, 0, scene.width * scene.tileSize, scene.height * scene.tileSize)
    .setOrigin(0, 0)
    .setDepth(1.5);
  paintAtlasLayer(groundAtlas, scene.layers.ground, config);
  paintAtlasLayer(propsAtlas, scene.layers.props, config);

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

  console.log(`${LOG_PREFIX} created tile map for scene ${scene.id}`);

  return {
    tilemap,
    layers: { ground: groundLayer, props: propsLayer, collision: collisionOverlay, triggers: triggerOverlay },
    destroy() {
      groundLayer?.destroy();
      propsLayer?.destroy();
      groundAtlas.destroy();
      propsAtlas.destroy();
      collisionOverlay?.destroy();
      triggerOverlay?.destroy();
      tilemap.destroy();
    },
  };
}
