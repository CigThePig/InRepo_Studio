# Architecture

Purpose:
- Capture the technical invariants and shape of the system.
- Make "apply/rebuild semantics" explicit for anything that looks like a setting, preset, or config.

---

## Invariants (must not be broken)

- **Hot/Cold boundary**: IndexedDB is the only write target; fetch is read-only
- **Schema compliance**: All JSON must validate against defined schemas
- **Editor/Runtime separation**: Editor code never runs in game mode; runtime code works independently
- **Touch-first interaction**: Canvas interactions use touch offset system
- **Offline-safe editing**: All editing operations work without network
- **No data loss**: Auto-save to IndexedDB on every meaningful change
- **No Split Brain (Presets + Blockly)**: Presets and Blockly both operate through one unified Game API contract. Presets implement systems behind it; Blockly calls commands / listens to events / reads state through it
- **Blockly workspace JSON is source of truth**: Generated JS is derived and disposable. Never persist generated JS as canonical state
- **Event-first scripting**: Blockly is event-driven by default. No unrestricted per-frame loops in v1
- **No raw Phaser in Blockly**: Blockly scripts receive only safe Game API wrappers (api.on/call/read/time/log). Presets may use raw Phaser internally
- **Scope is never hidden**: In Blockly Mode, the Logic Target is always visible via the top-bar dropdown
- **Presets are global**: Presets are game-wide systems. They do not vary per Logic Target
- **Script errors don't crash the editor**: Runtime errors enter Error state for that script only, with clear reporting

Notes:
- **Offline-after-load**: Editing must work without network after initial load (no service worker required).
- **Offline cold-start**: Not guaranteed until a dedicated Service Worker track exists.
- **Deploy vs Playtest**: Playtest reads from hot storage; deploy publishes hot → repo → GitHub Pages.
- **GitHub Pages base path**: Project sites run under `/<repo>/`; avoid hardcoded absolute paths.

---

## Apply / rebuild semantics

### Editor Settings (stored in IndexedDB `editorState`)
- Grid visibility: **Live-applying** (toggle takes effect immediately)
- Grid color/opacity: **Live-applying**
- Touch offset distance: **Live-applying**
- Theme (dark/light): **Live-applying**
- Auto-save frequency: **Live-applying**

### Project Settings (stored in IndexedDB `project`)
- Project name: **Live-applying** (display only)
- Default tile size: **Requires rebuild** (affects new scenes only)
- Default grid dimensions: **Requires rebuild** (affects new scenes only)

### Scene Data (stored in IndexedDB `scenes`)
- Layer data changes: **Live-applying** (re-render affected region)
- Scene dimensions: **Requires rebuild** (regenerates layer arrays)
- Tileset references: **Requires apply** (reload tileset images)

### Preset Config (stored in /game/presets.json, hot storage)
- Preset enable/disable: **Live-applying** (PresetManager attach/detach)
- Preset knob changes: **Live-applying** (auto-apply with Undo toast)
- Profile switching: **Live-applying** (applies recommended presets)

### Blockly Scripts (stored in /game/logic/*.json, hot storage)
- Workspace changes: **Live-applying** (auto-save to hot storage)
- Script start/stop: **Live-applying** (ScriptHost manages lifecycle)
- Logic Target switching: **Requires apply** (workspace save + load)

### Apply Hooks
- Scene dimension change: `rebuildSceneLayers(sceneId)`
- Tileset reference change: `reloadSceneTilesets(sceneId)`
- Deploy: `commitToGitHub()` (explicit button)
- Preset config change: `PresetManager.applyConfig(categoryId)` (auto)
- Script start: `ScriptHost.start(logicTarget)` (explicit Run button)
- Script stop: `ScriptHost.stop(logicTarget)` (explicit Stop button)

---

## Module boundaries (high-level)

- **Boot**: Mode detection, initialization sequence, asset preloading
- **Storage/Hot**: IndexedDB operations (project, scenes, editorState)
- **Storage/Cold**: Fetch operations (read from repository)
- **Editor/Canvas**: Viewport, pan/zoom, grid rendering, coordinate transforms
- **Editor/Panels**: Top panel (nav), bottom panel (tools/palettes)
- **Editor/Tools**: Paint, erase, select, entity placement
- **Editor/Inspectors**: Property editors for entities and scenes
- **Editor/Blockly**: Blockly workspace UI, Logic Target switching, block insertion
- **Runtime/Loader**: Load project/scene data for Phaser
- **Runtime/Spawner**: Instantiate tilemaps and entities
- **Runtime/Presets**: PresetManager engine, preset definitions, preset registry
- **Runtime/Blockly**: ScriptHost engine, block definitions, schema-driven block generation, code generators
- **Runtime/SceneHost**: SceneHost (owns PresetManager + ScriptHost + ApiContext per scene)
- **Deploy**: GitHub API integration, conflict detection, commit flow

---

## Data flow (high-level)

### Editor Mode
```
User Touch → Tool Handler → Scene Data (IndexedDB) → Canvas Renderer
                                ↓
                           Auto-save
```

### Playtest Mode
```
IndexedDB (hot) → Runtime Loader → Phaser Scene → Game Loop
```

### Game Mode (deployed)
```
Fetch (cold) → Runtime Loader → Phaser Scene → Game Loop
```

### Blockly Mode (editing scripts)
```
Logic Target Dropdown → Workspace Manager → Hot Storage (script JSON)
                              ↓
                        Blockly Workspace ← Right Berry Palette
                              ↓
                        Auto-save to IndexedDB
```

### Playtest Mode (with Presets + Scripts)
```
IndexedDB (hot) → Runtime Loader → Phaser Scene
                                        ↓
                                   SceneHost.attach()
                                        ↓
                              ┌─────────┴─────────┐
                        PresetManager          ScriptHost
                        (apply config,         (compile workspace,
                         register API)          register handlers)
                              └─────────┬─────────┘
                                   ApiContext
                                   (shared bus)
```

### Deploy Flow
```
IndexedDB (hot) → Change Detection → GitHub API → Repository
                        ↓
                  Conflict Check → Resolve or Commit
```

---

## Risks & scaling notes

- **Large scenes**: Scenes over 100x100 tiles may hit performance limits; consider chunked rendering
- **Many entities**: Entity rendering should batch; watch for DOM-like overhead
- **IndexedDB limits**: Monitor storage quota; warn user before hitting limits
- **GitHub rate limits**: Cache SHAs; minimize API calls during deploy
- **Asset loading**: Lazy-load tile categories; unload unused to manage memory
- **Blockly bundle size**: Blockly is a large dependency; consider lazy-loading workspace UI
- **Script execution**: Timer caps (64 per script), recursion guards, min interval 50ms for "Every" timers
- **Multi-script runtime**: Game Logic + Map Logic run simultaneously; errors isolated per script