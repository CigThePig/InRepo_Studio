# /src/editor/panels — Local AGENTS.md

Purpose:
- Owns editor panels (toolbar, tile picker, inspector, settings, deploy).

Owns:
- Mobile layout patterns (bottom sheets, safe areas)
- Form models driven by canonical schemas
- Deploy panel UX (token entry, warnings, status feedback)

Does NOT own:
- Low-level storage implementations (use `/src/storage`)
- GitHub API calls (use `/src/deploy`)

Local invariants:
- Panels must not mutate persistence directly; call domain/storage APIs.
- Long lists (tiles/assets) should be virtualized or paged when needed.
- Token UX must encourage fine-grained, repo-scoped PATs.

Verification:
- Panels remain usable in portrait mode.
- Inspector edits apply to selected entity and persist in hot storage.
