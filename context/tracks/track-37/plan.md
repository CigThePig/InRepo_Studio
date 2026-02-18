# Track 37 — Plan

## Phase 1: Core Implementation

### Tasks
- [x] Create `src/runtime/blockly/codegenRules.ts` — shared codegen string builders
- [x] Create `src/runtime/blockly/schemaToBlocks.ts` — PresetDefinition → BlockPack generator
- [x] Create `src/runtime/blockly/blockRegistry.ts` — registry with search + dependency lookup
- [x] Update `src/runtime/blockly/index.ts` — re-export new modules

### Files touched
- `src/runtime/blockly/codegenRules.ts` (new)
- `src/runtime/blockly/schemaToBlocks.ts` (new)
- `src/runtime/blockly/blockRegistry.ts` (new)
- `src/runtime/blockly/index.ts` (updated)
- `src/runtime/blockly/scriptHost.ts` (lint fix: no-this-alias)

### Verification
- [x] `npm run lint` passes (0 errors)
- [x] `npx tsc --noEmit` passes (0 type errors)
- [x] Block type IDs follow stable naming conventions
- [x] All codegen uses only `api.on/call/read/time/log`

### Stop point
Review generated block packs against real preset definitions before proceeding.

## Phase 2: Documentation

### Tasks
- [x] Create `context/tracks/track-37/spec.md`
- [x] Create `context/tracks/track-37/blueprint.md`
- [x] Create `context/tracks/track-37/plan.md`
- [x] Update `context/active-track.md`
- [x] Update `INDEX.md` with new files
