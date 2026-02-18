# Track 34 — Preset Registry + PresetManager (Parts 9-10)

## Intent

Implement the preset runtime engine: a registry that discovers PresetDefinition files via `import.meta.glob`, a PresetInstance runtime interface that preset implementations conform to, and a PresetManager that orchestrates the full lifecycle (instantiate, attach, applyConfig, exposeApi, dispose). Also define v1 preset stubs (Controls, Movement, Camera, Animation Driver) and Game Profile behavior.

Authority: `/context/Blockly_Plan_Revised.md` Parts 9-10, `/src/runtime/presets/AGENTS.md`.

## Scope

### In scope
1. `PresetInstance` runtime interface — what a live preset must implement (attach, apply, dispose, getCommands, getEvents, getState)
2. `PresetRegistry` — discovers preset definitions via `import.meta.glob('./defs/*.ts', { eager: true })`, validates and indexes by id/category
3. `PresetManager` — lifecycle engine:
   - Loads PresetSavedConfig (from /game/presets.json or defaults)
   - Instantiates PresetInstance per enabled category
   - Merges user config with preset defaults
   - Registers commands/events/state into ApiContext generic surface
   - Disposes cleanly on scene shutdown
4. Config merging + validation + defaulting (leverages existing `mergeCategoryConfig`, `isCategoryConfigModified`)
5. API registration — commands registered via `api.call()`, state via `api.read()`, events via `api.events.emit()`
6. Game Profile behavior — Top-down/Platformer profiles apply recommended presets; Custom auto-set on incompatible mix
7. v1 preset stubs — 6 stub definitions (controls-topdown, controls-platformer, movement-topdown, movement-platformer, camera-follow, animation-driver) with realistic schemas but no-op runtime implementations

### Out of scope
- Phaser scene integration (Track 35 — SceneHost)
- ScriptHost / Blockly execution (Track 36)
- Blockly block generation from schemas (Track 37)
- Presets UI in left berry (Track 41)
- Full preset implementations with real Phaser logic (post-Track 35)

## Acceptance Criteria

- [ ] `PresetInstance` interface defined with full lifecycle contract
- [ ] `PresetRegistry` discovers and validates all preset defs in `defs/`
- [ ] `PresetManager` attaches and disposes without leaks
- [ ] Config merging handles missing/unknown keys safely (fall back to defaults)
- [ ] Commands/events/state accessible via generic `api.call()`/`api.read()` layer
- [ ] Game Profiles apply recommended preset combinations
- [ ] 6 v1 preset stubs exist with valid PresetDefinition schemas
- [ ] Missing preset IDs and conflicts never crash the runtime
- [ ] Runtime works with zero presets enabled (safe default)
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] INDEX.md, schema-registry.md updated

## Risks

- Preset ownership conflicts between categories (mitigated: ownership rules in AGENTS.md)
- PresetInstance interface may need extension when real Phaser integration lands (mitigated: keep interface minimal, additive evolution)
- PresetManager singleton vs per-scene (clarified: per-SceneHost, but Track 34 provides the engine; Track 35 wires it)
