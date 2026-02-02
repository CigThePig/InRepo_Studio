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

### Track 8 — Paint Tool
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Implemented tile painting with single-tap and drag support. Tiles paint to the active layer with auto-save to IndexedDB.
- **Shipped**:
  - Paint tool module (paint.ts) with start/move/end gesture handling
  - Single-tap tile placement at touch offset position
  - Drag painting with Bresenham line interpolation for continuous lines
  - Layer-aware painting (ground/props use tile index, collision/trigger use value 1)
  - Debounced auto-save of scene data after paint operations
  - Wired paint tool into editor initialization
- **Verification**:
  - TypeScript compiles without errors
  - Vite build succeeds
  - Tapping canvas places tiles at correct position
  - Dragging paints continuous lines with no gaps
  - Scene persists after page reload
- **Learned**:
  - Bresenham algorithm handles fast drag efficiently
  - Debouncing saves prevents IndexedDB thrashing during drag
  - Touch offset must match renderer's hover highlight for consistency
- **Follow-up**:
  - Track 14: Erase Tool
  - Track 16: Undo/Redo System

### Track 9 — Touch Foundation
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Centralized touch configuration and added enhanced gesture handling with long-press detection and brush cursor infrastructure.
- **Shipped**:
  - Touch configuration module (touchConfig.ts) with centralized constants
  - Brush cursor module (brushCursor.ts) for visual tool feedback
  - Long-press detection in gestures.ts (500ms threshold)
  - Updated gesture handler to use configurable delays and thresholds
  - Re-exported TOUCH_OFFSET_Y from touchConfig for consistency
- **Verification**:
  - TypeScript compiles without errors
  - Vite build succeeds
  - Gestures use configurable constants from touchConfig
  - Long-press cancels on movement, doesn't trigger paint
- **Learned**:
  - Centralizing touch config enables future user preferences (Track 28)
  - Long-press provides foundation for context menus
  - Brush cursor can show tile preview in future enhancement
- **Follow-up**:
  - Track 25: Touch Refinements (haptic feedback, loupe mode)
  - Track 28: Editor Settings (configurable touch offset)

### Track 10 — Playtest Bridge
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Added playtest mode to launch runtime from the editor using hot storage data and a playtest overlay with exit control.
- **Shipped**:
  - Unified runtime loader for hot/cold data sources with explicit data source mode
  - Playtest overlay UI with exit button and badge
  - Boot routing for playtest mode with session flag handling
  - Editor playtest button with state preservation and round-trip flow
- **Verification**: Not run (not requested).
- **Learned**: Playtest flow benefits from explicit data source selection instead of auto-detection.
- **Follow-up**:
  - Track 11: Runtime Loader (Phaser integration)
  - Track 12: Authentication (GitHub PAT management)

### Track 11 — Runtime Loader
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Implemented Phaser runtime loading to render tilemaps, spawn entities, and manage scene transitions from hot or cold data sources.
- **Shipped**:
  - Project loader that registers tiles and entity sprites for runtime use
  - Scene loader, tilemap factory, and overlays for collision/trigger layers
  - Entity registry/spawner and scene manager with cleanup and transitions
  - Runtime init rewritten to boot Phaser and load the starting scene
- **Verification**:
  - `npm run build`
  - `npm run lint`
- **Learned**:
  - Phaser runtime boot benefits from explicit project/scene loader boundaries.
- **Follow-up**:
  - Track 12: Authentication (GitHub PAT management)
  - Track 13: Deploy Flow (Commit changes to GitHub)

### Track 12 — Authentication
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Added GitHub PAT authentication with validation, storage options, and deploy panel status UI.
- **Shipped**:
  - Token storage abstraction with session default and IndexedDB persistence
  - Auth manager + validation against GitHub API with scoped error handling
  - Auth modal and deploy panel status UI integrated into the editor
- **Verification**: `npm run build`, `npm run lint` (warnings in migration.ts)
- **Learned**: Centralizing auth state prevents repeated validation calls and keeps UI responsive.
- **Follow-up**:
  - Track 13: Deploy Flow (Commit changes to GitHub)

### Track 13 — Deploy Flow
- **Dates**: 2026-01-31
- **Status**: Completed
- **Summary**: Implemented change detection, SHA tracking, conflict handling, and GitHub commit orchestration to deploy hot data to the repository.
- **Shipped**:
  - SHA manager with IndexedDB-backed deploy metadata store and GitHub SHA/content fetching
  - Change detection with content hashing and conflict detection
  - Conflict resolution modal (overwrite/pull/skip)
  - Commit + deploy orchestration with progress/status UI in the deploy panel
- **Verification**: `npm run build`, `npm run lint` (warnings in migration.ts)
- **Learned**: Centralizing deploy state in a dedicated UI component keeps panel feedback consistent during multi-step commits.
- **Follow-up**:
  - Track 14: Erase Tool (tile removal)

### Track 14 — Erase Tool
- **Dates**: 2026-02-01
- **Status**: Completed
- **Summary**: Added erase tool support with brush sizes, UI controls, and hover previews, plus shared tool utilities for paint/erase behavior.
- **Shipped**:
  - Erase tool with tap/drag behavior and debounced auto-save wiring
  - Brush size selector in the bottom panel and persisted brush size in editor state
  - Shared tool utilities for line interpolation and brush footprints
  - Hover highlight and brush cursor sizing for erase previews
- **Verification**: `npm run build`
- **Learned**: Centralizing brush logic avoids duplicated line/offset math across tools.
- **Follow-up**:
  - Track 15: Select Tool (tile region manipulation)
  - Track 16: Undo/Redo System (erase operations)

### Track 15 — Select Tool
- **Dates**: 2026-02-02
- **Status**: Completed
- **Summary**: Implemented the select tool with rectangular selection, copy/paste/delete, move via long-press, flood fill, and a floating action bar for selection actions.
- **Shipped**:
  - Selection tool state machine with clipboard, move preview, and flood fill support
  - Selection overlay rendering with move ghost preview
  - Floating selection action bar with Move/Copy/Paste/Delete/Fill
- **Verification**: Not run (not requested).
- **Learned**: Selection UX needs clear visual feedback when switching between move and paste modes.
- **Follow-up**:
  - Track 16: Undo/Redo System (selection operations should become reversible)

### Track 16 — Undo/Redo System
- **Dates**: 2026-02-01
- **Status**: Completed
- **Summary**: Added an undo/redo history system with grouped operations and toolbar controls, integrating paint/erase/select tools for reversible edits.
- **Shipped**:
  - History module with undo/redo stacks, grouping, and operation definitions
  - Paint/erase/select tools record tile deltas for undo/redo (including move, paste, delete, fill)
  - Undo/redo buttons in the bottom toolbar with disabled states
- **Verification**: `npm run build`, `npm run lint` (warnings in storage files).
- **Learned**: Selection operations benefit from wrapping tile deltas with selection state updates to keep overlays consistent.
- **Follow-up**:
  - Track 17: Scene Management (clear history when switching scenes via UI)

### Track 17 — Scene Management
- **Dates**: 2026-02-01
- **Status**: Completed
- **Summary**: Added multi-scene support with create/rename/delete/duplicate/resize operations and a scene selector dropdown in the top panel.
- **Shipped**:
  - Scene manager module with CRUD operations (create, rename, delete, duplicate, resize, switch)
  - Scene dialogs for create, rename, resize, and delete confirmation
  - Scene selector dropdown in top panel with scene list and action menus
  - Auto-save current scene before switching, history cleared on scene switch
  - Default scene update when current default is deleted
- **Verification**: `npm run build`
- **Learned**: Scene switching requires coordinating multiple state updates (canvas, panels, editor state) and the scene manager acts as the central coordinator.
- **Follow-up**:
  - Track 18: Layer System (visibility/lock toggles)

### Track 18 — Layer System
- **Dates**: 2026-02-01
- **Status**: Completed
- **Summary**: Added layer visibility toggles and lock controls with a layer panel in the top panel, plus tool integration to prevent editing locked layers.
- **Shipped**:
  - Layer visibility and lock state in EditorState with persistence
  - Layer panel UI with visibility and lock toggles per layer
  - Renderer skip of hidden layers for visibility toggle
  - Tool integration: paint, erase, select operations blocked on locked layers
  - Layer panel replaces simple layer tabs in top panel
- **Verification**: `npm run build`
- **Learned**: Layer locks need to be checked at multiple points (paint, erase, delete, move, paste, fill) to fully prevent edits.
- **Follow-up**:
  - Track 19: Entity Tool (place and edit entities)

### Track 21 — Entity Manipulation
- **Dates**: 2026-02-02
- **Status**: Completed
- **Summary**: Implemented entity selection, multi-entity manipulation, and undo/redo integration for placement edits.
- **Shipped**:
  - Entity selection state with touch-friendly hit testing and selection highlights
  - Drag-to-move with grid snapping, delete/duplicate actions, and multi-select via long-press
  - Entity manipulation operations wired into undo/redo history
- **Verification**: Not run (not requested).
- **Learned**: Entity selection benefits from a dedicated action bar to keep touch targets large and discoverable.
- **Follow-up**:
  - Track 22: Property Inspector (entity property editing UI)
  - Add box selection for entities (optional UX enhancement)
  - Refactor `src/editor/tools/select.ts` (size >450 lines)

### Track 22 — Property Inspector
- **Dates**: 2026-02-02
- **Status**: Completed
- **Summary**: Added an entity property inspector with validation, multi-select editing, and undo/redo support, plus select tool refactors to reduce file size.
- **Shipped**:
  - Property inspector panel with string, number, boolean, and asset reference editors
  - Validation feedback and constraint hints for entity properties
  - Multi-select editing for shared property definitions with mixed value handling
  - Undo/redo support for property edits (entity_property_change)
  - Select tool refactor into tile/entity controllers to keep file sizes manageable
- **Verification**: `npm run build`, `npm run lint`
- **Learned**: Datalist-backed asset suggestions provide lightweight asset picking without schema changes.
- **Follow-up**:
  - Box selection for entities (optional UX enhancement)

---

## Stalled / Abandoned Tracks

(none yet)
