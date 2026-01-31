/**
 * Type exports for InRepo Studio
 *
 * This module provides all the core data structures and validation
 * functions for project, scene, and entity data.
 */

// Project types
export type {
  Project,
  ProjectSettings,
  TileCategory,
  EntityType,
} from './project';

export {
  DEFAULT_PROJECT_SETTINGS,
  createDefaultProject,
  validateProject,
  validateTileCategory,
  validateEntityType,
  validateProjectSettings,
} from './project';

// Scene types
export type {
  Scene,
  LayerData,
  TileLayer,
  TilesetReference,
  EntityInstance,
  LayerType,
  ResolvedTileRef,
  EnsureTilesetsResult,
} from './scene';

export {
  LAYER_ORDER,
  createEmptyLayerData,
  createScene,
  generateEntityId,
  validateScene,
  validateTilesetReference,
  validateLayerData,
  validateTileLayer,
  validateEntityInstance,
  resolveTileGid,
  getGidForTile,
  computeDefaultTilesets,
  ensureSceneTilesets,
  getTile,
  setTile,
  resizeLayer,
  resizeScene,
} from './scene';

// Entity types
export type {
  PropertyDefinition,
  PropertyConstraints,
  PropertyType,
} from './entity';

export {
  validatePropertyDefinition,
  isValidPropertyType,
  validatePropertyConstraints,
  validatePropertyValue,
  createDefaultProperties,
} from './entity';
