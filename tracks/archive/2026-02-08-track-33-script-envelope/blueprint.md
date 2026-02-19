# Track 33 — Blueprint (Script Envelope + Storage)

## Technical design

### Approach: Separate script store in IndexedDB

Rather than bumping the IndexedDB version (which would require a migration), script files will be stored in a **dedicated IndexedDB database** (`inrepo-scripts`) with a single object store keyed by `scriptId`. This avoids disrupting the existing `inrepo-studio` database and keeps script storage isolated.

Alternative considered: Adding a `scripts` store to the existing database. Rejected because it requires a version bump and migration handling for all existing users.

### Files and APIs

#### `src/shared/paths.ts` (modify)
- Add `LOGIC_DIR`, `LOGIC_MAIN_PATH`, `LOGIC_MAPS_DIR` constants
- Add `resolveScriptUrl(type, mapId?)` helper for cold fetch URLs

#### `src/types/scriptUtils.ts` (new)
- `createEmptyScriptFile(type, mapId?, label?)` — factory for new script envelopes
- `validateScriptFile(data)` — validates envelope structure
- `SCRIPT_FORMAT_VERSION` constant (1)

#### `src/storage/scriptStorage.ts` (new)
- Dedicated script IndexedDB (`inrepo-scripts`, version 1)
- `initScriptStorage()` — open/create DB
- `saveScript(script: ScriptFile)` — write by scriptId
- `loadScript(scriptId: string)` — read by scriptId, returns null if missing
- `deleteScript(scriptId: string)` — remove script
- `listScriptIds()` — list all stored scriptIds
- `hasScript(scriptId: string)` — check existence

#### `src/storage/scriptCold.ts` (new)
- `fetchScriptFromRepo(type, mapId?)` — fetch published script from repo via URL helper
- Returns `ScriptFile | null` (null if 404 / missing)
- Uses `resolveScriptUrl` from paths module

### State and data flow

```
Editor (Blockly workspace)
    ↓ auto-save
scriptStorage.saveScript(scriptFile)  → IndexedDB (inrepo-scripts)
    ↓ on load
scriptStorage.loadScript(scriptId)    ← IndexedDB
    ↓ cold fetch (first load)
scriptCold.fetchScriptFromRepo(type, mapId) ← repo /game/logic/*.json
```

### Key decisions

1. **Separate DB for scripts**: Avoids version migration of existing DB
2. **scriptId as key**: Uses `resolveScriptId()` from types/script.ts ("main" or "map:<mapId>")
3. **Create on demand**: No pre-populated files; factory creates when user first saves
4. **Validation at load boundaries**: Validate on cold fetch (untrusted data); trust hot storage (we wrote it)

### Risks

- Two IndexedDB databases means two init calls (manageable, both are small)
- Script files in cold storage may be missing (safe — returns null)
