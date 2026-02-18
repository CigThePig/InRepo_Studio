import type { EntityManager } from '@/editor/entities/entityManager';
import type { Scene, PropSpriteInstance, SpriteRef } from '@/types';
import { generateEntityId, generatePropSpriteId } from '@/types';

export interface PropSpriteManagerConfig {
  getScene: () => Scene | null;
  onSceneChange: (scene: Scene) => void;
  entityManager?: EntityManager;
}

export interface PropSpriteManager {
  addPropSprite(sprite: SpriteRef, x: number, y: number): PropSpriteInstance | null;
  addPropSpriteInstance(instance: PropSpriteInstance): PropSpriteInstance | null;
  getPropSprite(id: string): PropSpriteInstance | null;
  getPropSprites(ids: string[]): PropSpriteInstance[];
  removePropSprites(ids: string[]): PropSpriteInstance[];
  movePropSprites(updates: Array<{ id: string; x: number; y: number }>): void;
  duplicatePropSprites(ids: string[], offsetPx: { x: number; y: number }): PropSpriteInstance[];
  convertPropSpritesToEntities(ids: string[], options?: {
    resolveSpriteSize?: (sprite: SpriteRef) => { width: number; height: number };
    entityType?: string;
  }): { converted: Array<{ propSprite: PropSpriteInstance; entityId: string }>; removed: PropSpriteInstance[] };
}

export function createPropSpriteManager(config: PropSpriteManagerConfig): PropSpriteManager {
  const { getScene, onSceneChange, entityManager } = config;

  function ensureList(scene: Scene): PropSpriteInstance[] {
    if (!Array.isArray(scene.propSprites)) {
      scene.propSprites = [];
    }
    return scene.propSprites;
  }

  return {
    addPropSprite(sprite, x, y) {
      const scene = getScene();
      if (!scene) return null;
      const instance: PropSpriteInstance = { id: generatePropSpriteId(), sprite: { ...sprite }, x, y };
      ensureList(scene).push(instance);
      onSceneChange(scene);
      return instance;
    },

    addPropSpriteInstance(instance) {
      const scene = getScene();
      if (!scene) return null;
      const list = ensureList(scene);
      const idx = list.findIndex((entry) => entry.id === instance.id);
      if (idx >= 0) list[idx] = instance;
      else list.push(instance);
      onSceneChange(scene);
      return instance;
    },

    getPropSprite(id) {
      const scene = getScene();
      if (!scene) return null;
      return ensureList(scene).find((entry) => entry.id === id) ?? null;
    },

    getPropSprites(ids) {
      const scene = getScene();
      if (!scene) return [];
      const idSet = new Set(ids);
      return ensureList(scene).filter((entry) => idSet.has(entry.id));
    },

    removePropSprites(ids) {
      const scene = getScene();
      if (!scene || ids.length === 0) return [];
      const idSet = new Set(ids);
      const list = ensureList(scene);
      const removed = list.filter((entry) => idSet.has(entry.id));
      if (removed.length === 0) return [];
      scene.propSprites = list.filter((entry) => !idSet.has(entry.id));
      onSceneChange(scene);
      return removed;
    },

    movePropSprites(updates) {
      const scene = getScene();
      if (!scene || updates.length === 0) return;
      const list = ensureList(scene);
      const updateMap = new Map(updates.map((entry) => [entry.id, entry]));
      let changed = false;
      for (const item of list) {
        const update = updateMap.get(item.id);
        if (!update) continue;
        if (item.x === update.x && item.y === update.y) continue;
        item.x = update.x;
        item.y = update.y;
        changed = true;
      }
      if (changed) onSceneChange(scene);
    },

    duplicatePropSprites(ids, offsetPx) {
      const source = this.getPropSprites(ids);
      if (source.length === 0) return [];
      const scene = getScene();
      if (!scene) return [];
      const created = source.map((item) => ({
        ...item,
        id: generatePropSpriteId(),
        x: item.x + offsetPx.x,
        y: item.y + offsetPx.y,
      }));
      ensureList(scene).push(...created);
      onSceneChange(scene);
      return created;
    },

    convertPropSpritesToEntities(ids, options) {
      const scene = getScene();
      if (!scene || !entityManager) {
        return { converted: [], removed: [] };
      }
      const entityType = options?.entityType ?? 'sprite';
      const removed = this.removePropSprites(ids);
      if (removed.length === 0) return { converted: [], removed: [] };

      const converted = removed.map((propSprite) => {
        const size = options?.resolveSpriteSize?.(propSprite.sprite) ?? { width: scene.tileSize, height: scene.tileSize };
        const entityId = generateEntityId();
        entityManager.addEntityInstance({
          id: entityId,
          type: entityType,
          x: propSprite.x + size.width / 2,
          y: propSprite.y + size.height / 2,
          properties: {
            spriteCategory: propSprite.sprite.category,
            spriteIndex: propSprite.sprite.index,
          },
        });
        return { propSprite, entityId };
      });

      return { converted, removed };
    },
  };
}
