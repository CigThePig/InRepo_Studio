/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Entity CRUD operations for editor scenes
 *
 * Defines:
 * - EntityManager — entity manipulation interface (type: interface)
 * - EntityManagerConfig — setup configuration (type: interface)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (entity updates reflected immediately)
 */

import { createDefaultProperties } from '@/types/entity';
import { generateEntityId, type Scene, type EntityInstance, type Project } from '@/types';

const LOG_PREFIX = '[EntityManager]';

export interface EntityManagerConfig {
  /** Get the current scene */
  getScene: () => Scene | null;
  /** Get the current project */
  getProject: () => Project | null;
  /** Callback when scene data changes */
  onSceneChange: (scene: Scene) => void;
}

export interface EntityManager {
  /** Add a new entity instance to the current scene */
  addEntity(type: string, x: number, y: number): EntityInstance | null;
  /** Insert an existing entity instance (used for undo/redo) */
  addEntityInstance(entity: EntityInstance): EntityInstance | null;
  /** Get an entity by ID */
  getEntity(id: string): EntityInstance | null;
  /** Get entities by IDs */
  getEntities(ids: string[]): EntityInstance[];
  /** Remove entities by ID and return removed instances */
  removeEntities(ids: string[]): EntityInstance[];
  /** Update positions for one or more entities */
  moveEntities(updates: Array<{ id: string; x: number; y: number }>): void;
  /** Update properties for one or more entities */
  updateEntityProperties(
    updates: Array<{
      id: string;
      properties: Record<string, string | number | boolean | undefined>;
    }>
  ): void;
  /** Duplicate entities with an offset */
  duplicateEntities(ids: string[], offset: { x: number; y: number }): EntityInstance[];
}

export function createEntityManager(config: EntityManagerConfig): EntityManager {
  const { getScene, getProject, onSceneChange } = config;

  function addEntity(type: string, x: number, y: number): EntityInstance | null {
    const scene = getScene();
    const project = getProject();

    if (!scene || !project) {
      return null;
    }

    const entityType = project.entityTypes.find((candidate) => candidate.name === type);
    if (!entityType) {
      console.warn(`${LOG_PREFIX} Unknown entity type "${type}"`);
      return null;
    }

    const entity: EntityInstance = {
      id: generateEntityId(),
      type: entityType.name,
      x,
      y,
      properties: createDefaultProperties(entityType.properties),
    };

    if (!Array.isArray(scene.entities)) {
      scene.entities = [];
    }

    scene.entities.push(entity);
    onSceneChange(scene);
    console.log(`${LOG_PREFIX} Added entity "${entityType.name}" (${entity.id})`);

    return entity;
  }

  function addEntityInstance(entity: EntityInstance): EntityInstance | null {
    const scene = getScene();
    if (!scene) return null;

    if (!Array.isArray(scene.entities)) {
      scene.entities = [];
    }

    const existingIndex = scene.entities.findIndex((entry) => entry.id === entity.id);
    if (existingIndex >= 0) {
      scene.entities[existingIndex] = entity;
    } else {
      scene.entities.push(entity);
    }

    onSceneChange(scene);
    return entity;
  }

  function getEntity(id: string): EntityInstance | null {
    const scene = getScene();
    if (!scene) return null;
    return scene.entities.find((entity) => entity.id === id) ?? null;
  }

  function getEntities(ids: string[]): EntityInstance[] {
    const scene = getScene();
    if (!scene) return [];
    const lookup = new Set(ids);
    return scene.entities.filter((entity) => lookup.has(entity.id));
  }

  function removeEntities(ids: string[]): EntityInstance[] {
    const scene = getScene();
    if (!scene || ids.length === 0) return [];

    const lookup = new Set(ids);
    const removed = scene.entities.filter((entity) => lookup.has(entity.id));
    if (removed.length === 0) return [];

    scene.entities = scene.entities.filter((entity) => !lookup.has(entity.id));
    onSceneChange(scene);
    console.log(`${LOG_PREFIX} Removed ${removed.length} entities`);
    return removed;
  }

  function moveEntities(updates: Array<{ id: string; x: number; y: number }>): void {
    const scene = getScene();
    if (!scene || updates.length === 0) return;

    const updateMap = new Map(updates.map((update) => [update.id, update]));
    let changed = false;

    for (const entity of scene.entities) {
      const update = updateMap.get(entity.id);
      if (!update) continue;
      if (entity.x === update.x && entity.y === update.y) continue;
      entity.x = update.x;
      entity.y = update.y;
      changed = true;
    }

    if (changed) {
      onSceneChange(scene);
    }
  }

  function updateEntityProperties(
    updates: Array<{ id: string; properties: Record<string, string | number | boolean | undefined> }>
  ): void {
    const scene = getScene();
    if (!scene || updates.length === 0) return;

    const updateMap = new Map(updates.map((update) => [update.id, update.properties]));
    let changed = false;

    for (const entity of scene.entities) {
      const properties = updateMap.get(entity.id);
      if (!properties) continue;
      if (!entity.properties) {
        entity.properties = {};
      }

      for (const [key, value] of Object.entries(properties)) {
        if (value === undefined) {
          if (key in entity.properties) {
            delete entity.properties[key];
            changed = true;
          }
          continue;
        }

        if (entity.properties[key] !== value) {
          entity.properties[key] = value;
          changed = true;
        }
      }
    }

    if (changed) {
      onSceneChange(scene);
    }
  }

  function duplicateEntities(
    ids: string[],
    offset: { x: number; y: number }
  ): EntityInstance[] {
    const scene = getScene();
    if (!scene || ids.length === 0) return [];

    const lookup = new Set(ids);
    const duplicates: EntityInstance[] = [];

    for (const entity of scene.entities) {
      if (!lookup.has(entity.id)) continue;
      duplicates.push({
        ...entity,
        id: generateEntityId(),
        x: entity.x + offset.x,
        y: entity.y + offset.y,
        properties: { ...entity.properties },
      });
    }

    if (duplicates.length === 0) return [];

    scene.entities.push(...duplicates);
    onSceneChange(scene);
    console.log(`${LOG_PREFIX} Duplicated ${duplicates.length} entities`);
    return duplicates;
  }

  return {
    addEntity,
    addEntityInstance,
    getEntity,
    getEntities,
    removeEntities,
    moveEntities,
    updateEntityProperties,
    duplicateEntities,
  };
}
