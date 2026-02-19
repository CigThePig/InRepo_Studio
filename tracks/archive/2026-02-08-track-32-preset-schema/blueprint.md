# Track 32 — Blueprint

## Technical Design

### Current State

Track 31 proactively created the type definitions in `/src/types/preset.ts`:
- PresetDefinition, KnobDef, CommandDef, EventDef, StateDef
- PresetCompatibility, PresetCategoryId
- PresetSavedConfig, PresetCategoryConfig
- CommandArgDef, EventPayloadFieldDef

These types are already registered in schema-registry.md and exported from `/src/types/index.ts`.

### Remaining Work

1. **Validation utilities** (`/src/types/presetValidation.ts`)
   - `validatePresetDefinition(def: unknown): { valid: boolean; errors: string[] }`
   - `validateKnobDef(knob: unknown): { valid: boolean; errors: string[] }`
   - Ensures required fields are present, IDs follow naming conventions (category prefix), types are valid
   - Used by PresetRegistry (Track 34) to reject malformed definitions at load time

2. **Default config factory** (`/src/types/presetDefaults.ts`)
   - `createDefaultPresetConfig(): PresetSavedConfig`
   - `createDefaultCategoryConfig(presetId: string): PresetCategoryConfig`
   - Produces valid starting state for `/game/presets.json`

3. **Example `/game/presets.json`**
   - Default empty config with formatVersion 1, profile "custom", empty categories
   - Serves as baseline for cold storage migration

### Files Touched

| File | Action | Purpose |
|------|--------|---------|
| `src/types/presetValidation.ts` | Create | Validation utilities |
| `src/types/presetDefaults.ts` | Create | Default config factories |
| `src/types/index.ts` | Edit | Export new utilities |
| `game/presets.json` | Create | Default preset config |
| `INDEX.md` | Edit | Add new files |

### Dependencies

- `src/types/preset.ts` (Track 31) — already complete
- `src/types/gameApi.ts` (Track 31) — already complete

### No Code in Blueprint

This blueprint describes architecture only. Implementation happens in plan.md phases.
