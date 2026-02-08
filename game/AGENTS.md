# /game — Local AGENTS.md

Purpose:
- The game's content folder: project data, scenes, assets, **logic scripts**, and **preset configuration**.

Owns:
- `project.json` and `scenes/*.json` content files
- `assets/` organization and naming conventions
- **`presets.json`** — persisted preset selections and knob overrides (see Part 7 of Blockly Plan)
- **`logic/`** — Blockly workspace JSON scripts (see `/game/logic/AGENTS.md`)

Does NOT own:
- Editor or runtime code

Folder structure:
```
/game/
├── project.json
├── presets.json              ← preset selections + knob overrides
├── scenes/
│   └── *.json
├── assets/
│   ├── props/<group>/        ← prop assets by group (Editor V2)
│   ├── entities/<group>/     ← entity assets by group (Editor V2)
│   └── tilesets/<group>/     ← tileset assets by group (Editor V2)
└── logic/                    ← Blockly logic scripts
    ├── main.json             ← Game Logic target
    └── maps/
        └── <mapId>.json      ← Map Logic target per map
```

Local invariants:
- Content files must validate against schemas.
- Do not change file formats without updating `/src/types` + schema-registry + fixtures.
- Large media assets should be added via non-editor workflows unless explicitly supported.
- **Logic script files are workspace JSON** (Blockly serialization). Generated JS is never stored here.
- **Logic scripts are created on demand** — empty maps have no script file until the user creates one.
- **`presets.json` uses defaulting**: missing keys fall back to preset defaults. Unknown preset IDs are preserved but ignored (no crash).
- **Asset folder structure mirrors UI groupings** (Editor V2): folder names = group names, slugified for filesystem safety.

Verification:
- Runtime cold mode loads these files without errors.
- Missing `presets.json` = all defaults (safe).
- Missing `logic/main.json` or `logic/maps/<mapId>.json` = no script for that target (safe).
- Asset folders are scannable to build group lists in the editor.
