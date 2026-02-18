# Track 37 — Blueprint (Technical Design)

## Architecture

Track 37 adds three modules to `/src/runtime/blockly/`:

```
src/runtime/blockly/
├── codegenRules.ts      ← NEW: shared JS code string builders
├── schemaToBlocks.ts    ← NEW: PresetDefinition → BlockPack generator
├── blockRegistry.ts     ← NEW: block registry with search + dependency lookup
├── index.ts             ← UPDATED: re-exports new modules
├── scriptHost.ts        ← existing (lint fix only)
└── AGENTS.md            ← existing
```

## Data Flow

```
PresetDefinition → generateBlockPack() → BlockPack → BlockRegistry
                                                          ↓
                                              Blockly workspace + palette
```

## Key Types

### BlockPack (output of schema generation)
- `entries: BlockPackEntry[]` — individual blocks with definitions, generators, metadata
- `categoryId: string` — preset category (controls, movement, camera, animation)
- `presetId: string` — source preset ID

### BlockPackEntry (single block)
- `definition: BlockDefinition` — Blockly JSON block shape
- `generator: BlockGenerator` — codegen function
- `dependency: BlockDependency` — required category/preset
- `keywords: string[]` — for search
- `advanced: boolean` — beginner/advanced split
- `logicTargetFilter: 'game' | 'map' | null` — visibility filtering
- `blockFamily: 'event' | 'payload' | 'command' | 'state'` — block type family

### Block Type ID Format (stable, never change)
- Hat: `inrepo_when_<eventId>`
- Payload field: `inrepo_event_<eventId>_<fieldName>`
- Command: `inrepo_do_<commandId>`
- State: `inrepo_get_<stateId>`

## Codegen Rules

All generated JS uses only the Game API surface:
- `api.on("eventId", function(payload) { ... })` — event handlers
- `api.call("commandId", { arg: val })` — command calls
- `api.read("stateId")` — state reads
- `api.time.after/every(ms, fn)` — timers
- `api.log.info/warn/error(msg)` — logging
- `payload["fieldName"]` — event payload access

## Arg UI Mapping (Part 14.2)
- boolean → `field_checkbox`
- enum → `field_dropdown`
- number → `field_number` with min/max validator
- entityId → `field_input` (v1; dynamic dropdown in future track)
- string → `field_input`

## Category Colors
- controls: 210 (blue)
- movement: 160 (green)
- camera: 30 (orange)
- animation: 290 (purple)

## Risks
- **HIGH**: Block type ID stability — IDs must never change once released
- **MEDIUM**: Codegen correctness — generated JS must be valid and safe
- **LOW**: Performance of runtime generation — acceptable for v1 preset count

## Dependencies
- `src/types/preset.ts` — PresetDefinition, EventDef, CommandDef, StateDef types
- `src/runtime/presets/presetRegistry.ts` — provides PresetDefinitions to generate from
