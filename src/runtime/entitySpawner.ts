import Phaser from 'phaser';
import type { EntityInstance } from '@/types';
import type { EntityRegistry } from '@/runtime/entityRegistry';
import type { ProjectRuntime } from '@/runtime/projectLoader';
import { getAtlasCategoryName } from '@/shared/atlasNaming';
import { resolveAtlasSliceByLocalId } from '@/shared/atlasTileIds';
import { DEPTH_ENTITIES_BASE } from '@/runtime/depthBands';

const LOG_PREFIX = '[Runtime/EntitySpawner]';
const PLACEHOLDER_KEY = 'entity:placeholder';

export interface SpawnConfig {
  phaserScene: Phaser.Scene;
  entityRegistry: EntityRegistry;
  projectRuntime: ProjectRuntime;
}

export interface SpawnedEntity {
  instance: EntityInstance;
  gameObject: Phaser.GameObjects.GameObject;
  destroy(): void;
}

function ensurePlaceholderTexture(scene: Phaser.Scene, size: number): string {
  if (scene.textures.exists(PLACEHOLDER_KEY)) {
    return PLACEHOLDER_KEY;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xff00ff, 1);
  graphics.fillRect(0, 0, size, size);
  graphics.generateTexture(PLACEHOLDER_KEY, size, size);
  graphics.destroy();
  return PLACEHOLDER_KEY;
}


function trySpawnSpriteEntity(config: SpawnConfig, entity: EntityInstance): SpawnedEntity | null {
  const { phaserScene, projectRuntime } = config;
  const spriteCategory = entity.properties?.spriteCategory;
  const spriteIndex = entity.properties?.spriteIndex;
  if (typeof spriteCategory !== 'string' || typeof spriteIndex !== 'number') {
    return null;
  }

  let sprite: Phaser.GameObjects.Sprite;

  if (spriteCategory.startsWith('atlas:')) {
    const atlas = (projectRuntime.project.spriteAtlases ?? []).find((entry) => getAtlasCategoryName(entry.path) === spriteCategory);
    const slice = resolveAtlasSliceByLocalId(atlas, spriteIndex);
    const textureKey = projectRuntime.getAtlasTextureKey(spriteCategory);
    if (!slice || !textureKey || !phaserScene.textures.exists(textureKey)) return null;
    // Use Sprite (not Image) so atlas entities can play animations.
    sprite = phaserScene.add.sprite(entity.x, entity.y, textureKey, slice.name).setOrigin(0.5, 0.5).setDepth(DEPTH_ENTITIES_BASE + entity.y);
  } else {
    const textureKey = projectRuntime.getTileTextureKey(spriteCategory, spriteIndex);
    if (!textureKey || !phaserScene.textures.exists(textureKey)) return null;
    sprite = phaserScene.add.sprite(entity.x, entity.y, textureKey).setOrigin(0.5, 0.5).setDepth(DEPTH_ENTITIES_BASE + entity.y);
  }

  // Auto-play animation if entity has animationId property
  const animRef = entity.properties?.animationId;
  if (typeof animRef === 'string' && animRef.length > 0) {
    const animKey = projectRuntime.resolveAnimationKey(animRef);
    if (animKey) {
      const pivot = projectRuntime.getAnimationPivotByKey(animKey);
      if (pivot) sprite.setOrigin(pivot.x, pivot.y);
      sprite.anims.play(animKey, true);
    }
  }

  return {
    instance: entity,
    gameObject: sprite,
    destroy() {
      sprite.destroy();
    },
  };
}

export function spawnEntity(
  config: SpawnConfig,
  entity: EntityInstance
): SpawnedEntity | null {
  const { phaserScene, entityRegistry, projectRuntime } = config;

  if (entity.type === 'sprite' || entity.type === 'inrepo_sprite') {
    const spriteSpawn = trySpawnSpriteEntity(config, entity);
    if (spriteSpawn) return spriteSpawn;
  }

  const entityType = entityRegistry.getType(entity.type);

  if (!entityType) {
    console.warn(`${LOG_PREFIX} Unknown entity type: ${entity.type}`);
    return null;
  }

  const spriteKey = projectRuntime.getEntitySpriteKey(entity.type);
  const fallbackKey = ensurePlaceholderTexture(
    phaserScene,
    projectRuntime.project.settings.defaultTileSize
  );
  const textureKey =
    spriteKey && phaserScene.textures.exists(spriteKey) ? spriteKey : fallbackKey;

  const sprite = phaserScene.add.sprite(entity.x, entity.y, textureKey);
  sprite.setDepth(DEPTH_ENTITIES_BASE + entity.y);
  sprite.setName(entity.id);

  for (const [key, value] of Object.entries(entity.properties)) {
    sprite.setData(key, value);
  }
  sprite.setData('entityType', entity.type);

  return {
    instance: entity,
    gameObject: sprite,
    destroy() {
      sprite.destroy();
    },
  };
}

export function spawnEntities(
  config: SpawnConfig,
  entities: EntityInstance[]
): SpawnedEntity[] {
  const spawned: SpawnedEntity[] = [];

  for (const entity of entities) {
    const result = spawnEntity(config, entity);
    if (result) {
      spawned.push(result);
    }
  }

  return spawned;
}
