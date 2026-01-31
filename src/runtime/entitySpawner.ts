import Phaser from 'phaser';
import type { EntityInstance } from '@/types';
import type { EntityRegistry } from '@/runtime/entityRegistry';
import type { ProjectRuntime } from '@/runtime/projectLoader';

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

export function spawnEntity(
  config: SpawnConfig,
  entity: EntityInstance
): SpawnedEntity | null {
  const { phaserScene, entityRegistry, projectRuntime } = config;
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
