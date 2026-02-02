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
  /** Get an entity by ID */
  getEntity(id: string): EntityInstance | null;
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

  function getEntity(id: string): EntityInstance | null {
    const scene = getScene();
    if (!scene) return null;
    return scene.entities.find((entity) => entity.id === id) ?? null;
  }

  return {
    addEntity,
    getEntity,
  };
}
