# /src/deploy — Local AGENTS.md

Purpose:
- Owns GitHub authentication (PAT) and publishing (commit flow).

Owns:
- PAT input/validation and storage policy (session default)
- Change detection (hot vs cold)
- SHA freshness checks and conflict detection UI
- Commit/write flow (project + scene JSON files + **logic scripts** + **preset config**)

Does NOT own:
- Editor UI layout (use `/src/editor/panels`)
- Storage write semantics (use `/src/storage`)
- Blockly workspace rendering or script execution (use `/src/runtime`)

Local invariants:
- Never hardcode tokens.
- Default token storage is session-only; persistent storage requires explicit user opt-in.
- Deploy must check remote SHA before writing; no silent overwrites.
- Treat GitHub as publish storage (cold), not as a live database for iteration.

Logic script deploy rules:
- Logic scripts (`/game/logic/main.json`, `/game/logic/maps/<mapId>.json`) are deployed alongside project/scene files.
- Change detection must include logic script files: compare hot workspace JSON against cold (published) versions.
- Logic scripts are committed to the correct paths in the repo: `game/logic/main.json`, `game/logic/maps/<mapId>.json`.
- Generated JS is **never committed** — only workspace JSON (source of truth).
- New logic scripts (created on demand) are detected as new files during deploy.

Preset config deploy rules:
- `/game/presets.json` is deployed as a data file alongside other project content.
- Change detection compares hot preset config against cold version.

Asset deploy rules (Editor V2):
- Grouped assets are committed to canonical paths: `props/<group>/`, `entities/<group>/`, `tilesets/<group>/`.
- Asset upload follows existing auth system and commit flow.

API etiquette:
- Cache SHAs/ETags to minimize requests.
- Warn/refuse large binary uploads by default (mobile timeouts).

Verification:
- Token validation succeeds with correct scope and fails with clear messaging otherwise.
- Deploy commits correct changed files and handles conflicts safely.
- Logic script files are included in change detection and deploy.
- Preset config is included in change detection and deploy.
