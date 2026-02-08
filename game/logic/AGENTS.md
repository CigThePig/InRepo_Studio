# /game/logic — Local AGENTS.md

Purpose:
- Stores Blockly workspace JSON files that define user-created game logic scripts.
- This is the canonical storage location for all Logic Target scripts.

Owns:
- `main.json` — Game Logic target (global script)
- `maps/<mapId>.json` — Map Logic targets (per-map scripts)

Does NOT own:
- Editor or runtime code
- Generated JavaScript (never stored here — it is derived and disposable)
- Preset configuration (that lives in `/game/presets.json`)

Folder structure:
```
/game/logic/
├── AGENTS.md
├── main.json                    ← Game Logic target (optional, created on demand)
└── maps/
    ├── <mapId-1>.json           ← Map Logic for map 1 (optional, created on demand)
    ├── <mapId-2>.json           ← Map Logic for map 2 (optional, created on demand)
    └── ...
```

Future expansion (not v1):
```
/game/logic/
├── main.json
├── maps/
├── entities/                    ← Entity-scoped scripts
│   └── <entityId>.json
└── triggers/                    ← Trigger-scoped scripts
    └── <triggerId>.json
```

Logic Target → file mapping:
| Logic Target              | File path                         |
|---------------------------|-----------------------------------|
| Game Logic (main)         | `/game/logic/main.json`           |
| Map: \<mapName\>          | `/game/logic/maps/<mapId>.json`   |

File format (script envelope):
```json
{
  "formatVersion": 1,
  "scriptId": "main",
  "logicTarget": {
    "type": "game",
    "label": "Game Logic (main)"
  },
  "blockly": {
    "workspace": { /* Blockly serialization JSON */ }
  }
}
```

For map scripts:
```json
{
  "formatVersion": 1,
  "scriptId": "map:<mapId>",
  "logicTarget": {
    "type": "map",
    "mapId": "<mapId>",
    "label": "Map: <mapName>"
  },
  "blockly": {
    "workspace": { /* Blockly serialization JSON */ }
  }
}
```

Local invariants:
- **Workspace JSON is the source of truth**. Generated JS is never stored here.
- **Files are created on demand**: no pre-populated empty files for every map. A script file is created on the user's first save for that Logic Target.
- **Missing files are safe**: the runtime treats a missing script file as "no script for this target" — not an error.
- **Self-describing**: each file includes `logicTarget` metadata so the file's scope is identifiable without relying on file path alone.
- **Git-friendly**: keep JSON clean, avoid random ordering churn, avoid huge redundant metadata.
- **Format versioning**: `formatVersion` field supports future envelope migrations.
- **Script identity**: `scriptId` is stable and filesystem-safe (letters, numbers, underscore, colon for compound IDs like `map:forest`).

Naming rules:
- `mapId` values come from scene IDs (stable, never change after creation).
- `scriptId` format: `"main"` for game logic, `"map:<mapId>"` for map logic.
- Future: `"entity:<entityId>"`, `"trigger:<triggerId>"`.

Block versioning:
- Optional `blockSetVersion` field in envelope (recommended v1.1+).
- If blocks change: prefer additive changes. If a block must be replaced, keep old block type as "legacy" or provide workspace JSON migration.
- Unknown block types in a workspace must not silently disappear — show warnings.

Verification:
- Runtime cold mode loads script files without errors.
- Missing files are handled gracefully (no crash, no error).
- Script files round-trip through save/load without data loss.
- `logicTarget` metadata matches file path location.
