# Track 38 — Blueprint (Technical Design)

## Architecture

Track 38 populates `src/runtime/blockly/blocks/` with core block definition files and updates the block registry loader to auto-discover them via `import.meta.glob`.

```
src/runtime/blockly/
├── blocks/
│   ├── events.ts       ← NEW: Common event hat blocks
│   ├── logic.ts        ← NEW: If/else, comparisons, booleans
│   ├── math.ts         ← NEW: Number, arithmetic, rounding, random
│   ├── variables.ts    ← NEW: Get/set variables
│   ├── time.ts         ← NEW: Wait, every, cancel timer
│   ├── debug.ts        ← NEW: Log message, log value
│   └── map.ts          ← NEW: Map-specific event hats
├── coreBlocks.ts       ← NEW: import.meta.glob loader + core block registration
├── index.ts            ← UPDATED: re-export coreBlocks
├── schemaToBlocks.ts   ← existing (unchanged)
├── codegenRules.ts     ← existing (unchanged)
├── blockRegistry.ts    ← existing (unchanged)
├── scriptHost.ts       ← existing (unchanged)
└── AGENTS.md           ← existing (unchanged)
```

## Data Flow

```
blocks/*.ts (static block definitions)
      ↓
coreBlocks.ts (import.meta.glob, eager: true)
      ↓
registerCoreBlocks(registry) → BlockRegistry
                                    ↓
                        Blockly workspace + palette (Track 39-40)
```

## Core Block Export Contract

Each file in `blocks/` exports a `CoreBlockPack` — an array of `BlockPackEntry` objects plus a category identifier. This reuses the existing `BlockPackEntry` type from Track 37.

### CoreBlockPack shape

```
{
  categoryId: string       — e.g., "events", "logic", "math", "variables", "time", "debug", "map"
  packId: string           — synthetic pack ID for registry (e.g., "__core_events")
  entries: BlockPackEntry[]
}
```

This maps directly to `BlockPack` with `presetId` set to the synthetic `packId`.

## Block Type ID Naming

Core blocks follow the stable `inrepo_` prefix convention:

- Events: `inrepo_event_scene_started`
- Logic: `inrepo_logic_if`, `inrepo_logic_ifelse`, `inrepo_logic_compare`, `inrepo_logic_operation`, `inrepo_logic_negate`, `inrepo_logic_boolean`
- Math: `inrepo_math_number`, `inrepo_math_arithmetic`, `inrepo_math_round`, `inrepo_math_random_int`, `inrepo_math_modulo`
- Variables: `inrepo_variables_get`, `inrepo_variables_set`
- Time: `inrepo_time_after`, `inrepo_time_every`, `inrepo_time_cancel`
- Debug: `inrepo_debug_log`, `inrepo_debug_log_value`
- Map: `inrepo_event_map_entered`, `inrepo_event_map_exited`

## Block Categories and Colors

| Category  | Colour (hue) | Dependency         | Logic Target Filter |
|-----------|-------------|--------------------|---------------------|
| events    | 40 (gold)   | `__core`           | null                |
| logic     | 210 (blue)  | `__core`           | null                |
| math      | 230 (indigo)| `__core`           | null                |
| variables | 330 (red)   | `__core`           | null                |
| time      | 120 (green) | `__core`           | null                |
| debug     | 0 (red)     | `__core`           | null                |
| map       | 60 (yellow) | `__core`           | `map`               |

## Block Definitions Per Category

### Events (events.ts)
- **When Scene Starts** — hat block, no args. Codegen: `api.on('scene.started', function(payload) { ... })`

### Logic (logic.ts)
- **if / do** — statement block with boolean input + statement input
- **if / do / else** — statement block with boolean input + 2 statement inputs
- **compare** — reporter returning Boolean. Dropdown: =, ≠, <, ≤, >, ≥. Two value inputs (Number)
- **and / or** — reporter returning Boolean. Dropdown: AND, OR. Two Boolean inputs
- **not** — reporter returning Boolean. One Boolean input
- **true / false** — reporter returning Boolean. Dropdown: TRUE, FALSE

These generate pure JS (no api.* calls): `if (condition) { ... }`, comparisons, logical operators.

### Math (math.ts)
- **number** — reporter returning Number. Field: number literal
- **arithmetic** — reporter returning Number. Dropdown: +, -, ×, ÷, ^. Two Number inputs
- **round** — reporter returning Number. Dropdown: round, ceil, floor. One Number input
- **random integer** — reporter returning Number. Two Number inputs (from, to)
- **modulo** — reporter returning Number. Two Number inputs

These generate pure JS: math operations, `Math.round/ceil/floor`, `Math.floor(Math.random() * ...)`.

### Variables (variables.ts)
- **get variable** — reporter. Dropdown: variable name
- **set variable to** — statement. Dropdown: variable name + value input

Variables use Blockly's built-in variable model. Codegen: direct JS variable references.

### Time (time.ts)
- **wait N ms then do** — statement with number input + statement input. Codegen: `api.time.after(ms, function() { ... })`
- **every N ms do** — statement with number input + statement input. Codegen: `api.time.every(ms, function() { ... })`
- **cancel timer** — statement. Takes a variable reference (timer handle). Codegen: `api.time.clear(handle)`

### Debug (debug.ts)
- **log message** — statement. Dropdown: info/warn/error. Text input. Codegen: `api.log.info/warn/error(msg)`
- **log value** — statement. Text label + value input. Codegen: `api.log.info(label + ': ' + value)`

### Map (map.ts)
- **When map entered** — hat block. `logicTargetFilter: 'map'`. Codegen: `api.on('map.entered', fn)`
- **When map exited** — hat block. `logicTargetFilter: 'map'`. Codegen: `api.on('map.exited', fn)`

## Codegen Strategy

- **Core logic/math/variables**: Generate standard JavaScript. No api.* needed for conditionals, arithmetic, or variables.
- **Events/Time/Debug/Map**: Use existing codegen helpers from `codegenRules.ts` (`codegenEventHandler`, `codegenTimeAfter`, `codegenTimeEvery`, `codegenLog`).
- All blocks use `BlockGenerator` type signature from Track 37.
- ORDER constants from Blockly used for expression precedence.

## Integration with BlockRegistry

- `coreBlocks.ts` exports a `registerCoreBlocks(registry: BlockRegistry)` function.
- It discovers all `blocks/*.ts` modules via `import.meta.glob('./blocks/*.ts', { eager: true })`.
- Each module exports a `CoreBlockPack` (mapped to `BlockPack` for registry).
- Registration happens before preset-generated blocks, so core blocks are always available.

## Risks

- **MEDIUM**: Block type ID stability — core block IDs must also follow the "stable once released" rule
- **LOW**: Variable block integration — Blockly's built-in variable system needs careful codegen
- **LOW**: Codegen correctness for logic/math — pure JS generation must handle operator precedence

## Dependencies

- `src/runtime/blockly/schemaToBlocks.ts` — BlockPackEntry, BlockDefinition, BlockDependency types
- `src/runtime/blockly/codegenRules.ts` — codegen helpers
- `src/runtime/blockly/blockRegistry.ts` — BlockRegistry interface
