# /src/runtime/presets — Local AGENTS.md

Purpose:
- Owns preset definition schemas, the preset registry, and the PresetManager runtime engine.
- This is the runtime-side implementation of the preset system described in Parts 5–10 of the Blockly Plan.

Owns:
- **Preset definitions** (`defs/*.ts`): each file exports a `PresetDefinition` with knobs, commands, events, state, compatibility metadata.
- **Preset registry**: built via `import.meta.glob('./defs/*.ts', { eager: true })` at startup.
- **PresetManager**: loads `/game/presets.json`, instantiates the chosen preset per category, applies config, exposes command/event/state surfaces into the Game API, disposes on shutdown.
- **Preset runtime instances**: the live system objects that implement each preset (e.g., PlatformerMovement, TopdownControls, CameraFollow).

Does NOT own:
- Preset UI (use `/src/editor/panels` for Presets tab / berry content)
- Type definitions for PresetDefinition schema (use `/src/types`)
- Storage read/write (use `/src/storage`)
- Blockly block generation from preset schemas (use `/src/runtime/blockly`)

Sub-module layout:
```
/src/runtime/presets/
├── AGENTS.md
├── presetManager.ts        ← PresetManager engine
├── presetRegistry.ts       ← Registry loader (import.meta.glob)
├── index.ts                ← Public exports
└── defs/                   ← Preset definition files
    ├── controls-topdown.ts
    ├── controls-platformer.ts
    ├── movement-topdown.ts
    ├── movement-platformer.ts
    ├── camera-follow.ts
    └── animation-driver.ts
```

PresetManager rules:
- PresetManager is **game-wide / global** — not Logic-Target-specific.
- Both Game Logic and Map Logic scripts share the same PresetManager instance.
- Lifecycle: `instantiate → attach(scene) → applyConfig(presetConfig) → exposeApi(apiContext) → dispose()`.
- On `attach`: iterate enabled categories, instantiate preset implementations, register commands/events/state into ApiContext.
- On `applyConfig`: merge user overrides with defaults, validate, apply to live systems. Invalid values fall back to defaults with warning.
- On `dispose`: unsubscribe all listeners, stop timers, null references.

PresetDefinition contract:
- Every preset MUST expose four surfaces: **Knobs** (config options), **Commands** (callable actions), **Events** (emitted signals), **State** (readable values).
- Each surface entry includes: stable id, label, description, schema (args/payload/type), keywords.
- Compatibility: `compatibleWith[]`, `conflictsWith[]`, `suggestedAlternative`.
- Ownership: each category owns specific Phaser systems. Categories must not silently override each other.

Category ownership (v1):
- **Controls**: input abstraction, velocity intent (does not own camera or physics body)
- **Movement/Physics**: Arcade body config, grounded detection, movement math
- **Camera**: follow, deadzone, bounds, shake
- **Animation Driver**: animation selection based on movement/state

Config rules:
- Missing keys fall back to preset defaults. Unknown keys are preserved but ignored.
- "Modified" vs "Default" must be detectable for UI display.
- Config changes auto-apply with Undo toast support.
- `runtimeSettable: true` on knobs allows Blockly to adjust them at runtime via commands.

Game Profile behavior:
- Selecting Top-down/Platformer profile applies recommended presets with Undo.
- Custom profile is auto-set when user mixes incompatible presets.

API registration rules:
- Commands registered via `api.presets.getCategory(categoryId)` (typed) and `api.call(commandId, args)` (generic).
- Events emitted via InRepo event bus, not raw Phaser events.
- State exposed via `api.read(stateId)`.
- Naming: category prefixes (`controls.*`, `movement.*`, `camera.*`, `animation.*`).

Local invariants:
- Presets can read each other's state but must not silently override each other's owned systems.
- Presets must work at runtime without the editor present.
- Missing preset IDs and conflicts must never crash the runtime.
- All preset definitions must be registered and discoverable via the registry.

Verification:
- PresetManager attaches and disposes cleanly without leaks.
- Config merging + validation handles unknown/missing keys safely.
- Commands/events/state are accessible via both typed and generic API layers.
- Profile switching applies correct preset combinations.
- Runtime works with zero presets enabled (safe default).
