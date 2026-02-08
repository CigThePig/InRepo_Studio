# Track 33 — Plan (Script Envelope + Storage)

## Phase 1: Implementation (single phase — low-risk, local work)

### Tasks

- [ ] Add script path constants to `src/shared/paths.ts`
- [ ] Create `src/types/scriptUtils.ts` (validation + factory)
- [ ] Create `src/storage/scriptStorage.ts` (hot storage CRUD)
- [ ] Create `src/storage/scriptCold.ts` (cold fetch)
- [ ] Update `src/types/index.ts` with new exports
- [ ] Update `src/storage/index.ts` with new exports
- [ ] Update `INDEX.md`
- [ ] Update `context/schema-registry.md`
- [ ] Update `context/active-track.md`

### Files touched

- `src/shared/paths.ts` (modify — add LOGIC_DIR, LOGIC_MAIN_PATH, LOGIC_MAPS_DIR, resolveScriptUrl)
- `src/types/scriptUtils.ts` (new — createEmptyScriptFile, validateScriptFile, SCRIPT_FORMAT_VERSION)
- `src/storage/scriptStorage.ts` (new — initScriptStorage, saveScript, loadScript, deleteScript, listScriptIds, hasScript)
- `src/storage/scriptCold.ts` (new — fetchScriptFromRepo)
- `src/types/index.ts` (modify — add scriptUtils exports)
- `src/storage/index.ts` (modify — add scriptStorage + scriptCold exports)
- `INDEX.md` (modify)
- `context/schema-registry.md` (modify)
- `context/active-track.md` (modify)

### Verification checklist

- [ ] `tsc --noEmit` passes with no errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes (or only pre-existing warnings)
- [ ] Script path resolution matches Part 12 spec (game -> game/logic/main.json, map -> game/logic/maps/<mapId>.json)
- [ ] Empty script factory produces valid ScriptFile with correct logicTarget metadata
- [ ] Validation rejects malformed envelopes (missing formatVersion, missing scriptId, etc.)
- [ ] Hot storage operations handle missing scripts gracefully (return null)
- [ ] Cold fetch uses BASE_URL for URL resolution
- [ ] Cold fetch returns null on 404 (no throw)

### Stop point

Pause for review after Phase 1. Track 34 (Preset Registry + PresetManager) can proceed independently.
