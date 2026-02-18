/**
 * Runtime Presets module — preset definitions, registry, and PresetManager engine.
 *
 * Owns:
 * - Preset definitions (defs/*.ts): each exports a PresetDefinition + PresetFactory
 * - Preset registry: built via import.meta.glob at startup
 * - PresetManager: loads /game/presets.json, instantiates presets, manages lifecycle
 *
 * See /src/runtime/presets/AGENTS.md for full rules.
 */

// Interfaces
export type {
  PresetInstance,
  PresetFactory,
  PresetApiRegistrar,
  PresetRegistryEntry,
} from './presetInstance';

// Registry
export type { PresetRegistry } from './presetRegistry';
export { buildPresetRegistry, createPresetRegistry } from './presetRegistry';

// Manager
export { PresetManager } from './presetManager';
export type { PresetConflict } from './presetManager';

// Game Profiles
export type { GameProfileDef } from './gameProfiles';
export {
  GAME_PROFILES,
  getProfileDef,
  getProfileRecommendations,
} from './gameProfiles';
