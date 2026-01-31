# /src/deploy — Local AGENTS.md

Purpose:
- Owns GitHub authentication (PAT) and publishing (commit flow).

Owns:
- PAT input/validation and storage policy (session default)
- Change detection (hot vs cold)
- SHA freshness checks and conflict detection UI
- Commit/write flow (files and small binary images)

Does NOT own:
- Editor UI layout (use `/src/editor/panels`)
- Storage write semantics (use `/src/storage`)

Local invariants:
- Never hardcode tokens.
- Default token storage is session-only; persistent storage requires explicit user opt-in.
- Deploy must check remote SHA before writing; no silent overwrites.
- Treat GitHub as publish storage (cold), not as a live database for iteration.

API etiquette:
- Cache SHAs/ETags to minimize requests.
- Warn/refuse large binary uploads by default (mobile timeouts).

Verification:
- Token validation succeeds with correct scope and fails with clear messaging otherwise.
- Deploy commits correct changed files and handles conflicts safely.
