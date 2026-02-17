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
  SpriteAtlas,
  SpriteAtlasSlice,
} from './project';

export {
  DEFAULT_PROJECT_SETTINGS,
  createDefaultProject,
  validateProject,
  validateTileCategory,
  validateEntityType,
  validateProjectSettings,
  validateSpriteAtlas,
  validateSpriteAtlasSlice,
  validateProjectAnimation,
  validateProjectAnimationFrame,
} from './project';

// Animation types
export type {
  ProjectAnimationLoopMode,
  ProjectAnimationFrame,
  ProjectAnimation,
  Facing4,
  ProjectAnimationSet,
} from './animation';

// Animation state machine types
export type {
  AnimStateMachine,
  AnimState,
  AnimTransition,
  TransitionCondition,
} from './animStateMachine';

// Scene types
export type {
  Scene,
  LayerData,
  TileLayer,
  TilesetReference,
  EntityInstance,
  SpriteRef,
  PropSpriteInstance,
  LayerType,
  ResolvedTileRef,
  EnsureTilesetsResult,
} from './scene';

export {
  LAYER_ORDER,
  createEmptyLayerData,
  createScene,
  generateEntityId,
  generatePropSpriteId,
  validateScene,
  validateTilesetReference,
  validateLayerData,
  validateTileLayer,
  validateEntityInstance,
  validateSpriteRef,
  validatePropSpriteInstance,
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

// Game API types
export type {
  Disposer,
  TimerHandle,
  EventBus,
  TimeHelpers,
  LogApi,
  EntityHandle,
  EntityLookup,
  PresetCategorySurface,
  PresetSurface,
  LogicTargetType,
  LogicTargetMeta,
  ApiMeta,
  ApiContext,
} from './gameApi';

// Preset schema types
export type {
  PresetCategoryId,
  KnobType,
  KnobDef,
  CommandArgDef,
  CommandDef,
  EventPayloadFieldDef,
  EventDef,
  StateDef,
  PresetCompatibility,
  PresetDefinition,
  PresetCategoryConfig,
  PresetSavedConfig,
} from './preset';

// Script envelope types
export type {
  ScriptLogicTarget,
  ScriptGeneratedMeta,
  ScriptFile,
} from './script';

export {
  resolveScriptPath,
  resolveScriptId,
} from './script';

// Script validation + factory utilities
export type { ScriptValidationResult } from './scriptUtils';

export {
  SCRIPT_FORMAT_VERSION,
  createEmptyScriptFile,
  validateScriptFile,
} from './scriptUtils';

// Preset validation utilities
export type { ValidationResult } from './presetValidation';

export {
  validatePresetDefinition,
  validateKnobDef,
  validateCommandDef,
  validateEventDef,
  validateStateDef,
  validatePresetSavedConfig,
  isPresetDefinition,
} from './presetValidation';

// Preset default factories
export type { GameProfile } from './presetDefaults';

export {
  PRESET_CONFIG_FORMAT_VERSION,
  VALID_PROFILES,
  createDefaultPresetConfig,
  createDefaultCategoryConfig,
  mergeCategoryConfig,
  isCategoryConfigModified,
} from './presetDefaults';

// Workspace + editor UI state types
export type {
  WorkspaceMeta,
  WorkspaceContent,
  EditorUIState,
  ViewportState,
  PanelStates,
  SelectedTile,
  BrushSize,
  EditorIntent,
  EditorDomain,
  EditorPayload,
  LayerVisibility,
  LayerLocks,
} from './workspace';
