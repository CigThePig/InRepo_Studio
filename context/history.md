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

### Track 23 — Bottom Interaction Strip
- **Dates**: 2026-02-02
- **Status**: Completed
- **Summary**: Added Editor V2 foundation modules with feature flags and introduced a bottom context strip to replace floating selection popups for tile/entity actions.
- **Shipped**:
  - Editor V2 feature flags, editor mode state, and legacy mode mapping utilities
  - Bottom context strip UI integrated into the bottom panel
  - Feature-flagged hiding of legacy floating selection bars
  - Editor state now stores editorMode for V2 migration
- **Verification**: `npm run build`, `npm run lint`
- **Learned**: Feature flag defaults make it safer to swap selection UI without ripping out legacy behavior immediately.
- **Follow-up**:
  - Track 24: Top Bar Globalization
  - Track 25: Right Berry Shell + Mode State

### Track 24 — Top Bar Globalization
- **Dates**: 2026-02-02
- **Status**: Completed
- **Summary**: Promoted Undo/Redo/Settings/Play into a new global top bar and removed undo/redo controls from the bottom toolbar for Editor V2.
- **Shipped**:
  - New TopBarV2 component with global action buttons and scene selector support
  - Undo/redo wiring moved to the top bar with history state updates
  - Bottom toolbar no longer includes undo/redo buttons
  - Editor V2 top bar flag enabled by default
- **Verification**: `npm run build`, `npm run lint`
- **Learned**: Keeping scene selection adjacent to global actions preserves workflow without mode-dependent UI.
- **Follow-up**:
  - Track 25: Right Berry Shell + Mode State
  - Track 26: Entities Mode + Move-First Behavior

### Track 25 — Right Berry Shell + Mode State
- **Dates**: 2026-02-02
- **Status**: Completed
- **Summary**: Introduced the right berry slide-out panel with mode tabs and converted the editor to mode-driven architecture with a single editorMode state variable.
- **Shipped**:
  - Right berry slide-out panel with overlay, swipe-to-close, and handle
  - Five mode tabs: Ground, Props, Entities, Collision, Triggers
  - EditorMode state management replacing layer+tool dual-state system
  - Mode-to-legacy mapping for gradual migration
  - Berry open/close wiring to editorMode (closing returns to select mode)
  - Right berry state persistence (rightBerryOpen in EditorState)
- **Verification**: `npm run build`
- **Learned**: Mode-driven architecture simplifies UI state by removing the need to coordinate separate layer and tool selections.
- **Follow-up**:
  - Track 26: Entities Mode + Move-First Behavior

### Track 26 — Entities Mode + Move-First Behavior
- **Dates**: 2026-02-02
- **Status**: Completed
- **Summary**: Added the Entities right berry tab for palette/selection/property editing and enabled move-first entity selection without popup inspectors in Editor V2.
- **Shipped**:
  - Entities tab UI with palette selection, selection summary, and inline property editor
  - Move-first entity selection/dragging in Entities mode
  - Property inspector popup now hides when move-first is enabled
  - Editor V2 entity move-first flag enabled by default
- **Verification**: Not run (manual testing recommended).
- **Learned**: Keeping property editing in the right berry simplifies entity selection workflows.
- **Follow-up**:
  - Track 27: Left Berry Shell + Sprite Slicing MVP

### Track 27 — Left Berry Shell + Sprite Slicing MVP
- **Dates**: 2026-02-02
- **Status**: Completed
- **Summary**: Introduced the left berry asset pipeline panel with sprite sheet slicing and a starter in-editor asset library view.
- **Shipped**:
  - Left berry slide-out panel with Sprites/Assets tabs and persisted open state
  - Sprite slicer UI for importing, previewing, and slicing sprite sheets at 16×16, 32×32, or custom sizes
  - Inline asset library grid populated from sliced sprite previews
  - Left berry feature flag enabled by default
- **Verification**: Not run (manual testing recommended).
- **Learned**: Keeping slicing previews lightweight avoids heavy UI work before the asset registry lands.
- **Follow-up**:
  - Track 28: Asset Library + Grouping System

### Track 28 — Asset Library + Grouping System
- **Dates**: 2026-02-02
- **Status**: Completed
- **Summary**: Added an in-editor asset registry with grouped assets, a left berry Assets Library tab, and right berry palettes that read from asset groupings.
- **Shipped**:
  - Asset registry data model with default groups and persistence in editor state
  - Asset Library tab for creating groups, selecting assets, and deleting local entries
  - Sprite slicer now tags slices with group name/type for palette use
  - Right berry palettes and Entities tab wired to asset groups
- **Verification**: Not run (not requested).
- **Learned**: Group metadata from sprite slicing reduces manual setup.
- **Follow-up**: Track 29 will slugify group names and mirror GitHub folder structure.

### Track 29 — GitHub Folder ↔ Group Mirroring
- **Dates**: 2026-02-02 → 2026-02-02
- **Status**: Completed
- **Summary**: Added group slugification, canonical asset paths, and repo folder scanning to mirror GitHub asset folders into the editor asset registry with repo/local source tags. Asset palettes now surface the asset source metadata. 
- **Shipped**:
  - Group slugify helper and canonical asset path constants for repo mirroring.
  - Repo folder scan via GitHub API with stored manifest in editor state.
  - Asset registry refresh merges repo groups and labels assets by source.
  - Asset library/palettes display asset source and size status.
- **Verification**: `npm run build` (chunk size warning reported by Vite build). 
- **Learned**: Repo scanning can populate group structure without blocking editor boot when run asynchronously.
- **Follow-up**:
  - Manual scan test against a real repo to validate folder parsing and public/private handling.
  - Add asset upload wiring in Track 30 to convert local assets to repo sources.

### Track 30 — Asset Upload + Editor V2 Completion
- **Dates**: 2026-02-02 → 2026-02-02
- **Status**: Completed
- **Summary**: Completed the asset pipeline by uploading grouped assets to GitHub, refreshed asset sources to repo-backed URLs, and hid legacy Editor V2 UI elements by default. 
- **Shipped**:
  - Asset upload module with size checks, conflict-safe commits, and per-file results.
  - Asset library upload controls with progress messaging and error handling per group.
  - Editor asset registry upload wiring that re-tags uploaded assets as repo sources.
  - Layer panel now hidden by default with a settings toggle for advanced access.
  - Removed legacy selection popups and property inspector wiring from active editor flow.
- **Verification**: Not run (manual end-to-end workflow recommended).
- **Learned**: Consolidating upload logic in the deploy module keeps GitHub API usage consistent across editor workflows.
- **Follow-up**:
  - Run a full asset upload workflow against a real repo to validate folder placement and refresh behavior.

### Track 31 — Game API Contract + Types
- **Dates**: 2026-02-08
- **Status**: Completed
- **Summary**: Defined the TypeScript Game API contract — the single doorway for Presets and Blockly. All interfaces for ApiContext, EventBus, TimeHelpers, LogApi, EntityHandle, EntityLookup, PresetSurface, and LogicTargetMeta are in place with generic call/on/read methods for Blockly codegen.
- **Shipped**:
  - `src/types/gameApi.ts` with full Game API type definitions (ApiContext, EventBus, TimeHelpers, LogApi, EntityHandle, EntityLookup, PresetSurface, ApiMeta, LogicTargetMeta)
  - Generic script surface: `call(commandId, args)`, `on(eventId, handler)`, `read(stateId)`
  - Disposer pattern for subscription/timer cleanup
  - `src/types/preset.ts` with PresetDefinition schema (knobs, commands, events, state, compatibility)
  - `src/types/script.ts` with script envelope types and path resolution helpers
  - All types re-exported from `src/types/index.ts`
  - Schema registry and INDEX updated with all new lists-of-truth
  - Runtime and types AGENTS.md updated with Game API rules
- **Verification**:
  - `tsc --noEmit` passes for all Track 31 type files (no errors in gameApi.ts, preset.ts, script.ts)
  - All interfaces match Part 4 of Blockly Plan Revised (sections 4.2–4.6)
  - Generic call/on/read cover Blockly codegen patterns
- **Learned**:
  - Scaffolding types, AGENTS.md files, and schema-registry entries together prevents drift between documentation and code.
  - The generic call/on/read layer successfully isolates Blockly codegen from typed internals.
- **Follow-up**:
  - Track 32: Preset Schema + Definition Types (Parts 5-6)

### Track 32 — Preset Schema + Definition Types (Parts 5-6)
- **Dates**: 2026-02-08
- **Status**: Completed
- **Summary**: Completed the PresetDefinition schema system with validation utilities and default config factories. Type definitions for knobs/commands/events/state were created proactively in Track 31; this track added validation, defaults, and the baseline `/game/presets.json`.
- **Shipped**:
  - `src/types/presetValidation.ts` — validation functions for PresetDefinition, KnobDef, CommandDef, EventDef, StateDef, PresetSavedConfig
  - `src/types/presetDefaults.ts` — default config factories (createDefaultPresetConfig, createDefaultCategoryConfig, mergeCategoryConfig, isCategoryConfigModified)
  - `game/presets.json` — baseline empty preset config (formatVersion 1, profile "custom", empty categories)
  - Track planning artifacts (spec/blueprint/plan)
  - INDEX.md, active-track.md, schema-registry.md all current
- **Verification**:
  - `tsc --noEmit` passes with no errors in new files
  - All types conform to Parts 5-6 of Blockly Plan Revised
  - Validation functions enforce required surfaces and naming conventions
- **Learned**:
  - Track 31 proactively created most type definitions, making Track 32 a "verify + fill gaps" track rather than greenfield work.
  - Validation utilities should be created alongside types to prevent malformed definitions from entering the system.
- **Follow-up**:
  - Track 33: Script Envelope + Storage (Part 12)

### Track 33 — Script Envelope + Storage (Part 12)
- **Dates**: 2026-02-08
- **Status**: Completed
- **Summary**: Implemented the storage layer for Blockly script files — hot storage (IndexedDB), cold fetch (repo), validation, and factory utilities. Script envelope types were created proactively in Track 31; this track added CRUD operations, validation at load boundaries, and cold fetch with 404 safety.
- **Shipped**:
  - `src/types/scriptUtils.ts` — createEmptyScriptFile factory, validateScriptFile validation, SCRIPT_FORMAT_VERSION constant
  - `src/storage/scriptStorage.ts` — dedicated IndexedDB (inrepo-scripts) with CRUD: initScriptStorage, saveScript, loadScript, deleteScript, listScriptIds, hasScript
  - `src/storage/scriptCold.ts` — fetchScriptFromRepo with URL helper, 404 safety, and validation
  - `src/shared/paths.ts` — LOGIC_DIR, LOGIC_MAIN_PATH, LOGIC_MAPS_DIR constants + resolveScriptUrl helper
  - Track planning artifacts (spec/blueprint/plan)
  - INDEX.md, active-track.md, schema-registry.md all current
- **Verification**:
  - `npm run build` succeeds (Vite build completes)
  - `npm run lint` passes (only pre-existing warnings in migration.ts)
  - No new TypeScript errors beyond pre-existing external module issues
- **Learned**:
  - Using a separate IndexedDB database for scripts avoids version migration of the main database.
  - Track 31 proactively created envelope types, making Track 33 focused on storage operations.
- **Follow-up**:
  - Track 34: Preset Registry + PresetManager (Parts 9-10)

### Track 36 — ScriptHost Engine (Part 11)
- **Dates**: 2026-02-09
- **Status**: Completed
- **Summary**: Implemented the ScriptHost engine — the Blockly script execution runtime that compiles workspace JS and manages multi-script lifecycle (Game Logic + Map Logic simultaneously).
- **Shipped**:
  - `src/runtime/blockly/scriptHost.ts` — ScriptHost class with full lifecycle (Stopped → Running → Error)
  - Per-script independent error handling (one script erroring doesn't stop the other)
  - Wrapped ApiContext per script with recursion guards and error boundaries
  - Lifecycle events emitted on shared EventBus (script.starting/started/stopping/stopped/error)
  - v1 compilation stub (accepts register function or raw JS source via Function constructor)
  - Integrated into SceneHost (owned subsystem, disposed in correct order)
  - Updated `src/runtime/blockly/index.ts` with public exports
- **Verification**:
  - `tsc --noEmit` passes for all Track 36 files (no new type errors)
  - Build succeeds (pre-existing external module errors only)
- **Learned**:
  - The wrapped ApiContext pattern allows per-script error isolation while sharing a single event bus.
  - v1 uses Function constructor for JS compilation; real Blockly codegen will be wired in Tracks 37-38.
- **Follow-up**:
  - Track 37: Schema-Driven Block Generation (Part 14)
  - Track 38: Core Block Definitions (Part 13)

### Track 37 — Schema-Driven Block Generation
- **Dates**: 2026-02-09
- **Status**: Completed
- **Summary**: Implemented deterministic block generation from PresetDefinition schemas, producing hat blocks (events), action blocks (commands), and reporter blocks (state).
- **Shipped**:
  - `src/runtime/blockly/codegenRules.ts` — shared codegen string builders for api.on/call/read/time/log
  - `src/runtime/blockly/schemaToBlocks.ts` — PresetDefinition → BlockPack generator
  - `src/runtime/blockly/blockRegistry.ts` — block registry with search + dependency lookup
- **Verification**: `tsc --noEmit` passes for all Track 37 files (no new type errors)
- **Learned**: Reusing BlockPackEntry for both schema-driven and core blocks keeps the registry uniform.
- **Follow-up**: Track 38 (Core Block Definitions)

### Track 38 — Core Block Definitions
- **Dates**: 2026-02-09
- **Status**: Completed
- **Summary**: Implemented built-in block categories (Events, Logic, Math, Variables, Time, Debug, Map) that exist independently of presets, plus the import.meta.glob-based core block loader.
- **Shipped**:
  - 7 core block files in `src/runtime/blockly/blocks/` (events, logic, math, variables, time, debug, map)
  - `src/runtime/blockly/coreBlocks.ts` — auto-discovery loader via import.meta.glob
  - 22 block types total across 7 categories
  - Map blocks use `logicTargetFilter: 'map'` for Map Logic target visibility
- **Verification**: `tsc --noEmit` passes for all Track 38 files (pre-existing external module errors only)
- **Learned**:
  - Core blocks reuse BlockPack/BlockPackEntry types from Track 37 seamlessly by using synthetic presetId (`__core_*`) and `requiresCategoryEnabled: '__core'`.
  - Variable sanitization (`v_` prefix) prevents JS keyword collisions.
- **Follow-up**: Track 39 (Blockly Workspace UI)

### Track 39 — Blockly Workspace UI (Part 8 — Cockpit)
- **Dates**: 2026-02-10
- **Status**: Completed
- **Summary**: Implemented the Blockly cockpit — workspace injection with Zelos renderer, Blockly Mode state management, Logic Target switching with auto-save, top bar with Back/Run/Stop controls, empty state UI, and lazy loading. Full mode enter/exit orchestration wired into editor init.
- **Shipped**:
  - `blocklyMode.ts` — top-level Blockly Mode boolean state with listeners
  - `blocklyWorkspace.ts` — Blockly.inject wrapper with Zelos renderer, mobile-tuned zoom/move, empty toolbox, change listener
  - `workspaceManager.ts` — save/load orchestration, Logic Target switching, debounced auto-save (1s), empty state handling
  - `blocklyTopBar.ts` — Back button, Logic Target dropdown, Run/Stop buttons, status indicator (green/gray/red)
  - `blocklyCockpit.ts` — full orchestrator (lazy loading, DOM layout, beforeunload save, resize handling, touch isolation)
  - `topBarV2.ts` updated with `setVisible()` for mode switching
  - Editor init wiring with `createBlocklyCockpit()` + `getBlocklyCockpit()` export
- **Verification**: `tsc --noEmit` passes, `npm run build` succeeds. Lazy loading confirmed (workspace in separate chunk).
- **Learned**:
  - Using a state object (`s.foo`) instead of individual `let` variables avoids TypeScript closure narrowing issues where TS thinks a variable is always null inside closures.
  - Blockly's dynamic import creates a clean code-split boundary (~17KB workspace chunk).
- **Follow-up**: Track 40 (Right Berry Blocks Palette)

### Track 40 — Right Berry Blocks Palette (Part 13 — Block Taxonomy + Palette UX)
- **Dates**: 2026-02-10
- **Status**: Completed
- **Summary**: Implemented the blocks palette in the right berry for Blockly Mode. When the editor enters Blockly Mode, the right berry swaps its World Mode tabs for Blockly-specific tabs (Blocks + Inspect placeholder). The Blocks tab renders a categorized, searchable block palette querying the BlockRegistry, with tap-to-insert, beginner/advanced split, Logic Target filtering, preset dependency prompts, and mobile-first UX.
- **Shipped**:
  - `paletteCategories.ts` — PALETTE_CATEGORIES (11 v1 categories), getCategoryBlocks(), isCategoryEnabled(), isCategoryVisible()
  - `blocklyBerryTabs.ts` — BLOCKLY_BERRY_TABS (Blocks + Inspect)
  - `blocksPalette.ts` — full palette component (categorized block list, collapsible sections, tap-to-insert, advanced toggle, dependency prompts, search, gesture isolation)
  - `blocksPaletteStyles.ts` — extracted CSS styles for palette
  - `rightBerry.ts` — added setTabSet(), restoreDefaultTabs(), getGenericTabContentContainer()
  - `blocklyCockpit.ts` — wired palette lifecycle, added rightBerry/presetConfig/enablePreset deps
  - `index.ts` — updated exports for palette, categories, and berry tabs
- **Verification**: `tsc --noEmit` passes (no new errors), `npm run build` succeeds.
- **Learned**:
  - Extracting CSS styles to a separate file keeps component files under the line limit.
  - Right berry tab switching via setTabSet/restoreDefaultTabs allows clean mode switching without restructuring the EditorMode-based tab system.
- **Follow-up**: Track 41 (Left Berry Presets UI + Blockly Hooks)

---

## Stalled / Abandoned Tracks

(none yet)

### Track 41 — Left Berry Presets UI + Blockly Hooks
- **Dates**: 2026-02-10
- **Status**: Completed
- **Summary**: Completed the Presets left-berry experience with dashboard, category detail, schema-driven hooks, preset picker modal, issues modal, and Blockly insert-block bridge wiring.
- **Shipped**:
  - `src/editor/presets/presetsTab.ts` — dashboard with profile chips, category status rows, and issues modal trigger.
  - `src/editor/presets/categoryDetail.ts` — Configure + Hooks sub-tabs, preset switching, reset/defaults, and undo toast integration.
  - `src/editor/presets/blocklyHooksTab.ts` — Events/Commands/State sections with expandable details and block insertion actions.
  - `src/editor/presets/presetPicker.ts` + `issuesModal.ts` — modal workflows for preset selection and issue drill-in.
  - `src/editor/panels/leftBerry.ts` + `src/editor/blockly/blocklyCockpit.ts` — insert-block callback bridge into active Blockly workspace.
  - Inventory updates: `INDEX.md`, `context/schema-registry.md`, `context/active-track.md`.
- **Verification**:
  - `npm run lint` passes.
  - `npx tsc --noEmit` passes.
  - `npm run build` succeeds.
- **Learned**:
  - Keeping insert-block wiring as a callback on the left berry avoids coupling presets UI to workspace internals.
  - Hooks tab block IDs can be derived deterministically from schema IDs, matching runtime block generation conventions.
- **Follow-up**:
  - Track 42: Right Berry Inspect/Errors panel.

### Track 42 — Right Berry Inspect/Errors Panel
- **Dates**: 2026-02-20
- **Status**: Completed
- **Summary**: Implemented the Inspect/Errors panel for the right berry Tab 2 in Blockly Mode, and wired up actual script execution (edit → run → inspect → stop cycle). The cockpit now owns a session-scoped ScriptHost and ApiContext, intercepts log calls into a 100-entry ring buffer, and pushes state updates to the panel on every lifecycle event.
- **Shipped**:
  - `src/editor/blockly/inspectPanel.ts` — new file: Inspect/Errors tab panel with script status strip, error card with block highlight button, console log list (max 100 entries, auto-scroll). Push-fed via `update(state)` and `appendLog(entry)`.
  - `src/editor/blockly/blocklyWorkspace.ts` — added `generateJs()`, `highlightBlock(blockId)`, `clearHighlight()` to `BlocklyWorkspaceController`.
  - `src/editor/blockly/workspaceManager.ts` — added `highlightBlock(blockId)` and `clearHighlight()` to `WorkspaceManagerController` (delegate to workspace controller).
  - `src/editor/blockly/blocklyCockpit.ts` — full rewrite: added ScriptHost + ApiContext, log ring buffer, script lifecycle subscriptions (`script.started`, `script.stopped`, `script.error`), inspect panel mount/destroy, real Run/Stop wiring via `generateJs()` + `ScriptHost.startScript()`.
  - `src/editor/blockly/index.ts` — exported `createInspectPanel`, `InspectPanelController`, `InspectPanelOptions`, `InspectState`, `ScriptInspectEntry`, `LogEntry`.
- **Verification**: `npx tsc --noEmit` produces no new errors (only pre-existing external module errors from phaser, blockly, idb, vitest).
- **Learned**:
  - Creating a minimal ApiContext (EventBus + TimeHelpers + intercepted LogApi) directly in the cockpit avoids modifying shared runtime code while enabling full script execution in the editor.
  - Blockly's `workspaceToCode()` generates flat code that calls `api.on/time.every/time.after`; ScriptHost's wrapped API captures disposers automatically, so appending `return [];` to the generated source is sufficient.
  - The cockpit was already 569 lines before Track 42; the ScriptHost + inspect panel additions push it over 600. A future track should split the cockpit into `cockpitRuntime.ts` (ScriptHost + log buffer wiring) and `cockpitLayout.ts` (DOM + tab orchestration).
- **Follow-up**:
  - Phase 6 planning: post-Blockly features TBD.
  - Consider splitting `blocklyCockpit.ts` into runtime and layout sub-modules.
