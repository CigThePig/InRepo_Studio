# Track 38 — Plan

## Recon Summary

### Files likely to change
- `src/runtime/blockly/blocks/events.ts` (new) — common event hat blocks
- `src/runtime/blockly/blocks/logic.ts` (new) — if/else, comparisons, boolean ops
- `src/runtime/blockly/blocks/math.ts` (new) — arithmetic, rounding, random
- `src/runtime/blockly/blocks/variables.ts` (new) — get/set variables
- `src/runtime/blockly/blocks/time.ts` (new) — wait, every, cancel timer
- `src/runtime/blockly/blocks/debug.ts` (new) — log message, log value
- `src/runtime/blockly/blocks/map.ts` (new) — map-specific events
- `src/runtime/blockly/coreBlocks.ts` (new) — import.meta.glob loader
- `src/runtime/blockly/index.ts` (updated) — re-export coreBlocks
- `src/runtime/blockly/blocks/.gitkeep` (removed) — replaced by actual files
- `context/tracks/track-38/spec.md` (new) — track spec
- `context/tracks/track-38/blueprint.md` (new) — track blueprint
- `context/tracks/track-38/plan.md` (new) — this file
- `context/active-track.md` (updated) — point to Track 38
- `INDEX.md` (updated) — add Track 38 entries
- `context/schema-registry.md` (updated) — add core block type IDs

### Key modules/functions involved
- `BlockPackEntry`, `BlockPack`, `BlockDependency`, `BlockDefinition` from schemaToBlocks.ts
- `BlockRegistry.registerPack()` from blockRegistry.ts
- `codegenEventHandler`, `codegenTimeAfter`, `codegenTimeEvery`, `codegenLog` from codegenRules.ts

### Invariants to respect
- All codegen uses only Game API surface (api.on/call/read/time/log) for events/time/debug — no raw Phaser
- Logic/Math/Variables generate pure JS (standard operators, no api.* needed)
- Block type IDs are stable once released (inrepo_ prefix)
- Map blocks must have `logicTargetFilter: 'map'` — only visible for Map Logic targets
- Files must stay under 450 lines (soft limit)

### Cross-module side effects
- BlockRegistry will now have core blocks in addition to preset-generated blocks
- `getByCategory()` will return core blocks for categories like "events", "logic", etc.
- Track 40 (Right Berry Palette) will consume these categories from the registry

### Apply/rebuild semantics
- No apply/rebuild needed — core blocks are registered at app startup (static, always available)

### Data migration impact
- None — no persistence format changes

### File rules impact
- 7 new block definition files + 1 loader = 8 new files
- Each block file should be well under 450 lines (estimated 60-120 lines each)

### Risks/regressions
- No regressions expected — purely additive (new files, no changes to existing logic)
- Variables blocks may need careful attention for Blockly's built-in variable model integration

### Verification commands/checks
- `npm run lint` — 0 errors
- `npx tsc --noEmit` — 0 type errors
- Manually inspect that all block type IDs follow stable naming conventions

---

## Phase 1: Core Block Definitions (Events, Logic, Math)

### Tasks
- [x] Create `src/runtime/blockly/blocks/events.ts` — When Scene Starts hat block
- [x] Create `src/runtime/blockly/blocks/logic.ts` — if/else, comparisons, boolean operators, boolean constants
- [x] Create `src/runtime/blockly/blocks/math.ts` — number literal, arithmetic, rounding, random int, modulo

### Files touched
- `src/runtime/blockly/blocks/events.ts` (new)
- `src/runtime/blockly/blocks/logic.ts` (new)
- `src/runtime/blockly/blocks/math.ts` (new)

### Verification
- [x] `npx tsc --noEmit` passes
- [x] Block type IDs follow `inrepo_` prefix convention
- [x] Logic/Math blocks generate valid pure JS
- [x] Events block uses `codegenEventHandler`

### Stop point
Review block definitions and codegen output before continuing to remaining categories.

---

## Phase 2: Remaining Block Categories (Variables, Time, Debug, Map)

### Tasks
- [x] Create `src/runtime/blockly/blocks/variables.ts` — get/set variable blocks
- [x] Create `src/runtime/blockly/blocks/time.ts` — wait, every, cancel timer blocks
- [x] Create `src/runtime/blockly/blocks/debug.ts` — log message, log value blocks
- [x] Create `src/runtime/blockly/blocks/map.ts` — map entered/exited hat blocks (logicTargetFilter: 'map')

### Files touched
- `src/runtime/blockly/blocks/variables.ts` (new)
- `src/runtime/blockly/blocks/time.ts` (new)
- `src/runtime/blockly/blocks/debug.ts` (new)
- `src/runtime/blockly/blocks/map.ts` (new)

### Verification
- [x] `npx tsc --noEmit` passes
- [x] Time blocks use `codegenTimeAfter` / `codegenTimeEvery`
- [x] Debug blocks use `codegenLog`
- [x] Map blocks have `logicTargetFilter: 'map'`

### Stop point
Review all 7 block files before wiring up the registry loader.

---

## Phase 3: Registry Loader + Integration

### Tasks
- [x] Create `src/runtime/blockly/coreBlocks.ts` — `import.meta.glob` loader + `registerCoreBlocks(registry)` function
- [x] Remove `src/runtime/blockly/blocks/.gitkeep`
- [x] Update `src/runtime/blockly/index.ts` — re-export `registerCoreBlocks`

### Files touched
- `src/runtime/blockly/coreBlocks.ts` (new)
- `src/runtime/blockly/blocks/.gitkeep` (removed)
- `src/runtime/blockly/index.ts` (updated)

### Verification
- [x] `npm run lint` passes (0 errors)
- [x] `npx tsc --noEmit` passes (0 type errors)
- [x] All core block categories registered in BlockRegistry

### Stop point
Full lint + type-check pass before documentation phase.

---

## Phase 4: Documentation + Closeout

### Tasks
- [x] Update `context/active-track.md` — Track 38 in progress / complete
- [x] Update `INDEX.md` — add new files
- [x] Update `context/schema-registry.md` — add core block type IDs
- [x] Verify all acceptance criteria from spec.md

### Files touched
- `context/active-track.md` (updated)
- `INDEX.md` (updated)
- `context/schema-registry.md` (updated)

### Verification
- [x] All acceptance criteria met
- [x] INDEX.md matches actual files
- [x] schema-registry.md includes core block entries

### Stop point
Track 38 complete. Ready for Track 39 (Blockly Workspace UI).
