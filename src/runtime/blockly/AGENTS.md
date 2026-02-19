# /src/runtime/blockly — Local AGENTS.md

Purpose:
- Owns Blockly block definitions, code generators, ScriptHost engine, and schema-driven block generation.
- This is the runtime-side implementation of the Blockly system described in Parts 11–14 of the Blockly Plan.

Owns:
- **Block definitions** (`blocks/*.ts`): JSON block definitions registered with Blockly, plus generator functions for JavaScript output.
- **Block registry**: built via `import.meta.glob('./blocks/*.ts', { eager: true })` at startup.
- **Schema-driven block generator**: converts PresetDefinition schemas into Blockly block packs (hat blocks for events, action blocks for commands, reporter blocks for state).
- **ScriptHost**: manages Blockly script lifecycle (compile workspace → JS, register handlers, start/stop/error, dispose).
- **Code generation rules**: all generated JS uses only `api.on/call/read/time/log`. Never raw Phaser/DOM/window.

Does NOT own:
- Blockly workspace UI rendering (use `/src/editor/blockly`)
- Preset definitions or PresetManager (use `/src/runtime/presets`)
- Type definitions for script envelope or Game API (use `/src/types`)
- Storage of workspace JSON (use `/src/storage`)

Sub-module layout:
```
/src/runtime/blockly/
├── AGENTS.md
├── scriptHost.ts           ← ScriptHost engine (compile, run, stop, error handling)
├── blockRegistry.ts        ← Block registry with search + dependency lookup
├── coreBlocks.ts           ← Core + preset block loader (import.meta.glob, populates registry)
├── installIntoBlockly.ts   ← Installs registry block definitions/generators into Blockly runtime
├── schemaToBlocks.ts       ← PresetDefinition → Blockly block pack generator (BlockPack/BlockPackEntry)
├── codegenRules.ts         ← Shared codegen utilities and patterns
├── index.ts                ← Public exports
└── blocks/                 ← Core block definition files (loaded by coreBlocks.ts)
    ├── events.ts           ← Event hat blocks (When Scene Starts)
    ├── time.ts             ← Timer blocks (wait, every, cancel)
    ├── logic.ts            ← If/else, comparisons, boolean ops
    ├── math.ts             ← Math operations, random, round, modulo
    ├── variables.ts        ← Variable get/set blocks
    ├── debug.ts            ← Log message, log value blocks
    └── map.ts              ← Map-specific blocks (map entered/exited; Map Logic only)
```

ScriptHost rules:
- ScriptHost is owned by SceneHost and supports **multiple simultaneous scripts** per scene.
- v1 scripts: Game Logic (`/game/logic/main.json`) + Map Logic (`/game/logic/maps/<mapId>.json`).
- Both run against the same ApiContext and event bus. Both can register handlers for the same events.
- **States**: Stopped (default) → Running → Error (per-script, independent).
- **Lifecycle events**: `script.starting`, `script.started`, `script.stopping`, `script.stopped`, `script.error({ message, blockId?, stack?, logicTarget? })`.
- Error in one script does NOT stop the other.
- On stop/shutdown: cancel all timers, unsubscribe all handlers, clear references.

Generated JS structure:
- Generated code exports a `register(api)` function that:
  1. Registers event handlers via `api.on(...)`
  2. Sets up timers via `api.time.after/every`
  3. Returns a disposer list for cleanup
- Hat blocks generate: `api.on("eventId", (payload) => { ...statements... })`
- Command blocks generate: `api.call("commandId", { arg1: val, ... })`
- State blocks generate: `api.read("stateId")`
- Event payload access: implicit `__eventPayload` context var, field reporters compile to `__eventPayload.<field>`
- Timer blocks: `api.time.after(ms, () => {...})`, `api.time.every(ms, () => {...})`

Safety limits:
- Minimum interval for "Every" timers: clamp to ≥ 50ms.
- Hard cap on active timers per script: 64.
- Guard recursion depth.
- Optional execution time budget per handler.
- If limits hit: warn via `api.log.warn`, optionally stop script if severe.

Schema-driven block generation rules:
- Input: PresetDefinition (from `/src/runtime/presets/defs/`)
- Output: block JSON definitions, generator functions, palette entries, dependency metadata

Block families:
1. **Events → Hat blocks** (`inrepo_when_<eventId>`): no previous connection, has next. Payload fields → `inrepo_event_<eventId>_<field>` reporter blocks.
2. **Commands → Action blocks** (`inrepo_do_<commandId>`): statement blocks. Args mapped to fields (boolean → checkbox, enum → dropdown, number → input+validator, entityId → dynamic dropdown, string → text).
3. **State → Reporter blocks** (`inrepo_get_<stateId>`): output reporters typed by state type.
4. **Knob setters** (optional): only for `runtimeSettable: true` knobs. Generic command per category.

Block type ID rules:
- Format: `inrepo_when_<eventId>`, `inrepo_do_<commandId>`, `inrepo_get_<stateId>`, `inrepo_event_<eventId>_<field>`
- **Stable once released**. Deprecated blocks keep old type as "legacy" with alias or provide workspace JSON migration.
- Changing a block type ID is HIGH RISK.

Dependency system:
- Each generated block carries: `requiresCategoryEnabled: "<categoryId>"`, optional `requiresPresetId`.
- If user places a block whose category is disabled: prompt "Enable [Category] preset?" → Enable / Cancel.
- Dependency prompt fires on drag from palette and on search selection.

Category visibility by Logic Target:
- Map-specific blocks (Map category) only appear when a Map Logic target is selected.
- Game Logic target does not show Map category blocks.

Naming and discoverability:
- Labels read like sentences: "When player lands", "Shake camera", "Set run speed to ___".
- Keywords include synonyms (e.g., camera shake → shake, rumble, hit, impact).
- Keywords stored in schema for search.

v1 block generation timing:
- **Runtime generation in editor** (Option A): read preset registry, create Blockly blocks dynamically. Always in sync, no build step.

Local invariants:
- All generated code must use ONLY the Game API surface. Never `scene.*`, `Phaser.*`, DOM, imports/exports.
- Block type IDs are stable and versioned. No casual renames.
- Unknown blocks in a workspace should not silently disappear — show warnings and highlight.
- ScriptHost must track all registrations for clean disposal.

Verification:
- Schema-driven generation produces valid Blockly blocks for all preset events/commands/state.
- Generated JS compiles and runs without errors for valid workspaces.
- ScriptHost start/stop/error lifecycle works correctly.
- Game Logic + Map Logic run simultaneously without interference.
- Error reporting includes block ID and Logic Target.
- Dependency prompts fire correctly for disabled categories.
- Block search returns results across all visible categories with keyword matching.
