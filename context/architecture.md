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

### Apply Hooks
- Scene dimension change: `rebuildSceneLayers(sceneId)`
- Tileset reference change: `reloadSceneTilesets(sceneId)`
- Deploy: `commitToGitHub()` (explicit button)

---

## Module boundaries (high-level)

- **Boot**: Mode detection, initialization sequence, asset preloading
- **Storage/Hot**: IndexedDB operations (project, scenes, editorState)
- **Storage/Cold**: Fetch operations (read from repository)
- **Editor/Canvas**: Viewport, pan/zoom, grid rendering, coordinate transforms
- **Editor/Panels**: Top panel (nav), bottom panel (tools/palettes)
- **Editor/Tools**: Paint, erase, select, entity placement
- **Editor/Inspectors**: Property editors for entities and scenes
- **Runtime/Loader**: Load project/scene data for Phaser
- **Runtime/Spawner**: Instantiate tilemaps and entities
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