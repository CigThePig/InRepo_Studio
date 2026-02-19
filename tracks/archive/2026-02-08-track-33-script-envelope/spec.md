# Track 33 — Script Envelope + Storage (Part 12)

## Intent

Define the script file format and storage operations for Blockly workspace persistence. This track implements the storage layer that backs the Blockly editor — script files are saved/loaded from hot storage (IndexedDB) during editing, and fetched from cold storage (repo) on first load.

## Scope

- Script validation and factory utilities (create empty scripts, validate envelopes)
- Hot storage operations for script files (save, load, delete, list)
- Cold storage operations (fetch published scripts from repo via URL helper)
- Script path constants in shared paths module
- Empty-state behavior: scripts are created on demand, not pre-populated

## Out of scope

- Blockly workspace UI (Track 39)
- ScriptHost runtime engine (Track 36)
- Block definitions or code generation (Tracks 37-38)
- Deploy/commit of script files (handled by existing deploy module)

## Acceptance criteria

- Script files round-trip cleanly through hot storage (save -> load)
- Cold fetch resolves scripts via URL helper with BASE_URL
- Missing script file on cold fetch returns null (safe, not an error)
- Empty script factory creates valid ScriptFile envelopes
- Script validation catches malformed envelopes
- Logic Target -> file path mapping is deterministic (uses resolveScriptPath from types/script.ts)
- Hot storage key scheme supports multiple Logic Targets

## Risks

- Envelope format changes later require migrations (mitigated by formatVersion field)
- IndexedDB schema version bump may be needed for scripts store (evaluate)
