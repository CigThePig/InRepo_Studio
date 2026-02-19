# Track 34 — Plan

## Phase 1: PresetInstance interface + PresetRegistry

### Tasks
- [ ] Create `src/runtime/presets/presetInstance.ts` with PresetInstance, PresetFactory, PresetApiRegistrar interfaces
- [ ] Create `src/runtime/presets/presetRegistry.ts` with registry loader via import.meta.glob
- [ ] Validate all discovered definitions via `validatePresetDefinition()`

### Files touched
- `src/runtime/presets/presetInstance.ts` (new)
- `src/runtime/presets/presetRegistry.ts` (new)

### Verification
- [ ] `tsc --noEmit` passes
- [ ] Registry types are well-defined

### Stop point
Pause — review interfaces before building PresetManager.

---

## Phase 2: PresetManager lifecycle engine

### Tasks
- [ ] Create `src/runtime/presets/presetManager.ts` with full lifecycle
- [ ] Implement: initialize, registerApi, updateCategoryConfig, setCategoryEnabled, getConfig, getConflicts, update, dispose
- [ ] Wire config merging using existing `mergeCategoryConfig()`
- [ ] Handle missing presets, conflicts, zero-enabled state

### Files touched
- `src/runtime/presets/presetManager.ts` (new)

### Verification
- [ ] `tsc --noEmit` passes
- [ ] PresetManager constructor + initialize + dispose compiles

### Stop point
Pause — review lifecycle before adding stubs.

---

## Phase 3: v1 preset stubs + Game Profiles + wiring

### Tasks
- [ ] Create `src/runtime/presets/gameProfiles.ts` with profile definitions and apply logic
- [ ] Create 6 preset stub files in `src/runtime/presets/defs/`:
  - [ ] controls-topdown.ts
  - [ ] controls-platformer.ts
  - [ ] movement-topdown.ts
  - [ ] movement-platformer.ts
  - [ ] camera-follow.ts
  - [ ] animation-driver.ts
- [ ] Update `src/runtime/presets/index.ts` with all public exports
- [ ] Verify import.meta.glob discovers all 6 stubs

### Files touched
- `src/runtime/presets/gameProfiles.ts` (new)
- `src/runtime/presets/defs/controls-topdown.ts` (new)
- `src/runtime/presets/defs/controls-platformer.ts` (new)
- `src/runtime/presets/defs/movement-topdown.ts` (new)
- `src/runtime/presets/defs/movement-platformer.ts` (new)
- `src/runtime/presets/defs/camera-follow.ts` (new)
- `src/runtime/presets/defs/animation-driver.ts` (new)
- `src/runtime/presets/index.ts` (update)

### Verification
- [ ] `tsc --noEmit` passes
- [ ] All 6 stubs pass `validatePresetDefinition()`
- [ ] `npm run build` succeeds

### Stop point
Pause — review stubs and profiles before final docs.

---

## Phase 4: Documentation + verification + commit

### Tasks
- [ ] Update `INDEX.md` with new files
- [ ] Update `context/schema-registry.md` with PresetRegistry + PresetManager entries
- [ ] Update `context/active-track.md` to mark Track 34 complete
- [ ] Run `tsc --noEmit` and `npm run build`
- [ ] Commit and push

### Files touched
- `INDEX.md` (update)
- `context/schema-registry.md` (update)
- `context/active-track.md` (update)

### Verification
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] All new files listed in INDEX.md
- [ ] Schema registry reflects new lists-of-truth

### Stop point
Track complete.
