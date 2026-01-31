# /src/storage — Local AGENTS.md

Purpose:
- Owns the Hot/Cold data boundary and persistence reliability.

Owns:
- IndexedDB (hot) read/write and auto-save behavior
- Cold fetch interfaces (read-only)
- Export/import of hot project state
- Storage quota checks and warnings

Does NOT own:
- UI panels (use `/src/editor/panels`)
- Deploy commits (use `/src/deploy`)
- Schemas (use `/src/types`)

Local invariants:
- Hot storage is the only write target during editing.
- Cold storage is read-only and represents published state.
- Playtest reads from hot storage (instant).
- Deploy publishes hot → repo; never the reverse silently.

Performance:
- All IndexedDB ops are async; avoid per-tile writes (batch).
- Cache remote metadata (ETag/SHA) where applicable to reduce API calls.

Verification:
- Save → reload restores state.
- Export → import round-trips cleanly.
- Quota warning appears when approaching limits.
