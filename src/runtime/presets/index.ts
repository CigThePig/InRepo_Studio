/**
 * Runtime Presets module — preset definitions, registry, and PresetManager engine.
 *
 * Owns:
 * - Preset definitions (defs/*.ts): each exports a PresetDefinition
 * - Preset registry: built via import.meta.glob at startup
 * - PresetManager: loads /game/presets.json, instantiates presets, manages lifecycle
 *
 * See /src/runtime/presets/AGENTS.md for full rules.
 */

// Public exports will be added as modules are implemented.
