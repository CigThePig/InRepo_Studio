# Track 31 — Game API Contract + Types — Plan

## Phase 1: Define Game API types (single phase — types only)

### Tasks

- [x] Create `src/types/gameApi.ts` with all interfaces
  - [x] `Disposer` and `TimerHandle` types
  - [x] `EventBus` interface (on/once/off/emit/list)
  - [x] `TimeHelpers` interface (after/every/clear)
  - [x] `LogApi` interface (info/warn/error/event)
  - [x] `EntityHandle` interface (id/type/x/y/exists)
  - [x] `EntityLookup` interface (getById/getByTag/setTag/exists)
  - [x] `PresetCategorySurface` interface
  - [x] `PresetSurface` interface (getCategory/isEnabled/activePresetId)
  - [x] `LogicTargetType` and `LogicTargetMeta` types
  - [x] `ApiMeta` interface (apiVersion/schemaVersion/logicTarget/categories/capabilities)
  - [x] `ApiContext` interface (meta/events/time/log/entities/presets/call/on/read)
- [x] Add SCHEMA INVENTORY header to `gameApi.ts`
- [x] Re-export all types from `src/types/index.ts`
- [x] Update `/context/schema-registry.md` with Game API Contract section
- [x] Update `/INDEX.md` with `gameApi.ts` entry
- [x] Update `/src/types/AGENTS.md` with Game API rules
- [x] Update `/src/runtime/AGENTS.md` with Game API consumption rules

### Files touched

- `src/types/gameApi.ts` (new)
- `src/types/index.ts` (modified)
- `context/schema-registry.md` (modified)
- `INDEX.md` (modified)
- `src/types/AGENTS.md` (modified)
- `src/runtime/AGENTS.md` (modified)

### Verification checklist

- [x] `tsc --noEmit` passes for `src/types/gameApi.ts` (no type errors in Track 31 files)
- [x] All interfaces match Part 4 of Blockly Plan Revised (sections 4.2–4.6)
- [x] Generic `call`/`on`/`read` cover Blockly codegen patterns
- [x] `api.meta.logicTarget` present for error attribution
- [x] Event payloads are `Record<string, unknown>` (plain JSON)
- [x] `schema-registry.md` has complete Game API Contract section
- [x] `INDEX.md` lists `gameApi.ts` with correct lists-of-truth

### Stop point

Track 31 complete. Next: Track 32 (Preset Schema + Definition Types).
