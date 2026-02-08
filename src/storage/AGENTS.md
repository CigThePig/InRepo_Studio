# /src/storage — Local AGENTS.md

Purpose:
- Owns the Hot/Cold data boundary and persistence reliability.

Owns:
- IndexedDB (hot) read/write and auto-save behavior
- Cold fetch interfaces (read-only)
- Export/import of hot project state
- Storage quota checks and warnings
- **Logic script storage** (save/load Blockly workspace JSON to/from hot storage)
- **Preset config storage** (save/load `/game/presets.json` to/from hot storage)

Does NOT own:
- UI panels (use `/src/editor/panels`)
- Deploy commits (use `/src/deploy`)
- Schemas (use `/src/types`)
- Blockly workspace rendering or script execution (use `/src/runtime`)

Local invariants:
- Hot storage is the only write target during editing.
- Cold storage is read-only and represents published state.
- Playtest reads from hot storage (instant).
- Deploy publishes hot → repo; never the reverse silently.

Logic script storage rules:
- Logic scripts are stored as workspace JSON (the canonical source of truth). Generated JS is never persisted.
- Hot storage key scheme must support multiple Logic Targets: Game Logic (`main`) and Map Logic (`map:<mapId>`).
- Cold fetch resolves scripts via URL helper: `new URL('game/logic/main.json', import.meta.env.BASE_URL)` and `new URL('game/logic/maps/<mapId>.json', import.meta.env.BASE_URL)`.
- Script files are **created on demand** (first save), not pre-populated for every map.
- Missing script file on cold fetch = no script for that target (safe, not an error).

Preset config storage rules:
- Presets are saved as data in `/game/presets.json`. Never as ad-hoc code edits.
- Hot storage persists preset selections and knob overrides.
- Cold fetch loads published preset config. Hot-to-cold migration applies on first load.

Performance:
- All IndexedDB ops are async; avoid per-tile writes (batch).
- Cache remote metadata (ETag/SHA) where applicable to reduce API calls.
- Logic script saves should debounce (workspace changes fire frequently during editing).

Verification:
- Save → reload restores state.
- Export → import round-trips cleanly.
- Quota warning appears when approaching limits.
- Logic script save → reload restores Blockly workspace state exactly.
- Preset config save → reload restores all selections and knob values.
