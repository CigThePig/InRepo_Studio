# Track 32 — Plan

## Phase 1: Validation Utilities + Default Config

### Tasks

- [ ] Create `src/types/presetValidation.ts` with validation functions
- [ ] Create `src/types/presetDefaults.ts` with default config factories
- [ ] Create `game/presets.json` with default empty config
- [ ] Update `src/types/index.ts` to export new utilities
- [ ] Update `INDEX.md` with new files
- [ ] Verify `tsc --noEmit` passes
- [ ] Verify `npm run lint` passes

### Files Touched

- `src/types/presetValidation.ts` (new)
- `src/types/presetDefaults.ts` (new)
- `src/types/index.ts` (edit)
- `game/presets.json` (new)
- `INDEX.md` (edit)

### Verification Checklist

- [ ] `validatePresetDefinition()` rejects definitions missing required surfaces
- [ ] `validatePresetDefinition()` accepts well-formed definitions
- [ ] `createDefaultPresetConfig()` produces valid JSON
- [ ] `game/presets.json` is valid JSON matching PresetSavedConfig shape
- [ ] `tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] schema-registry.md is current (already up to date from Track 31)

### Stop Point

Pause for review after Phase 1. Track 32 is single-phase since types already exist.
