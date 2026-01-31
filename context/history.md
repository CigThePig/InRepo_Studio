# History (append-only)

Purpose:
- Record what shipped, what was learned, and any follow-up needed.
- Useful for onboarding new agents and understanding past decisions.

---

## Entry Template (copy/paste)

### Track N — <Title>
- **Dates**: YYYY-MM-DD → YYYY-MM-DD
- **Status**: Completed | Stalled | Abandoned
- **Summary**: <1–2 sentences: what changed>
- **Shipped**:
  - <Key deliverable 1>
  - <Key deliverable 2>
- **Verification**: <How it was verified (manual + automated)>
- **Learned**: <What surprised you, what would you do differently>
- **Follow-up**: <Any deferred work, tech debt, or next steps>

---

## Completed Tracks

### Phase 0 — Foundation Architecture (Tracks 1–4)
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Established the core data structures, storage layer, and boot system for InRepo Studio. Project scaffolding created with Vite, TypeScript, and Phaser.
- **Shipped**:
  - Track 1: TypeScript types for Project, Scene, Entity schemas with validation
  - Track 2: IndexedDB hot storage with idb library (save/load project, scenes, editor state)
  - Track 3: Cold storage fetch operations with migration support
  - Track 4: Boot system with mode router (editor vs game), entry point
  - Example project.json and main.json scene files
  - Placeholder editor and runtime init modules
- **Verification**:
  - TypeScript type-checking passes (tsc --noEmit)
  - Vite build completes successfully
  - Example JSON files conform to defined schemas
- **Learned**:
  - Need vite-env.d.ts for import.meta.env types
  - idb library provides clean IndexedDB wrapper
- **Follow-up**:
  - Track 5: Canvas System (pan/zoom/grid)
  - Track 6: Panels + Tile Picker

### Track 5 — Canvas System
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Implemented the central workspace canvas with pan/zoom gestures and grid overlay. This is the foundation for all visual editing in InRepo Studio.
- **Shipped**:
  - Phase 1: Viewport state management with coordinate transforms (screen↔world↔tile)
  - Phase 2: Canvas controller with gesture handling (two-finger pan, pinch zoom)
  - Phase 3: Grid rendering with culling and 'G' toggle
  - ResizeObserver for responsive canvas sizing
  - Debounced viewport persistence to IndexedDB
- **Verification**:
  - TypeScript compiles without errors
  - Transform functions verified as inverses
  - Grid renders and scales correctly with zoom
  - Viewport state saved and restored on reload
- **Learned**:
  - Pointer events provide unified touch/mouse handling
  - 0.5px offset needed for crisp grid lines on non-retina displays
  - Debouncing viewport saves prevents excessive IndexedDB writes
- **Follow-up**:
  - Track 6: Panels + Tile Picker
  - Track 9: Touch Foundation (gesture refinements)

### Track 6 — Panels + Tile Picker
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Implemented the editor's collapsible panel system with layer tabs, toolbar, and tile picker. Users can now select tiles for painting.
- **Shipped**:
  - Phase 1: Panel containers (topPanel.ts, bottomPanel.ts) with expand/collapse, layer tabs, toolbar
  - Phase 2: Toolbar with tool buttons (Select, Paint, Erase, Entity) — integrated into bottomPanel.ts
  - Phase 3: Tile picker (tilePicker.ts) with category tabs, tile grid, image loading
  - EditorState extended with activeLayer and selectedTile fields
  - Tile selection persists across reload
  - Tile picker shows only for Paint/Erase tools
- **Verification**:
  - TypeScript compiles without errors
  - ESLint passes
  - Panel states persist correctly
  - Tile images load from project categories
  - Tile selection updates EditorState
- **Learned**:
  - CSS grid with auto-fill provides responsive tile grid layout
  - Image caching prevents redundant fetches when switching categories
  - Vite's BASE_URL handles asset paths for GitHub Pages deployment
- **Follow-up**:
  - Track 7: Tilemap Rendering (display tiles on canvas)
  - Track 8: Paint Tool (place selected tile on map)

### Track 7 — Tilemap Rendering
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Implemented tilemap rendering with layer support, visible tile culling, layer dimming for inactive layers, and hover highlight with touch offset.
- **Shipped**:
  - Phase 1: Tile image cache (tileCache.ts) for shared image loading
  - Phase 1: Tilemap renderer (renderer.ts) with layer rendering order
  - Phase 2: Canvas integration with scene, activeLayer, hover tracking
  - Phase 2: Layer dimming (inactive layers at 40% opacity)
  - Phase 3: Collision/trigger layer overlay visualization (red/green)
  - Phase 3: Hover highlight with touch offset (-48px above finger)
  - Preloading of tile categories on editor startup
  - Active layer and tile category wiring from panels to canvas
- **Verification**:
  - TypeScript compiles without errors
  - Vite build succeeds
  - Layers render in correct order (ground → props → collision → triggers)
  - Visible tile culling uses getVisibleTileRange
  - Active layer renders at full opacity, others dimmed
  - Hover highlight follows touch position with offset
- **Learned**:
  - ctx.imageSmoothingEnabled = false for pixel-perfect tile rendering
  - Touch offset improves mobile usability (finger doesn't hide target)
  - Preloading tiles on startup provides instant rendering
- **Follow-up**:
  - Track 8: Paint Tool (place tiles on map)
  - Track 18: Layer visibility/lock toggles

---

## Stalled / Abandoned Tracks

(none yet)
