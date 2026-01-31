# /game — Local AGENTS.md

Purpose:
- The game's content folder: project data, scenes, and assets.

Owns:
- `project.json` and `scenes/*.json` content files
- `assets/` organization and naming conventions

Does NOT own:
- Editor or runtime code

Local invariants:
- Content files must validate against schemas.
- Do not change file formats without updating `/src/types` + schema-registry + fixtures.
- Large media assets should be added via non-editor workflows unless explicitly supported.

Verification:
- Runtime cold mode loads these files without errors.
