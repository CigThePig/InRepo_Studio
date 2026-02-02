# INDEX (File Inventory)

Purpose:
- A single place to see what exists in the repo and what each file is responsible for.
- Prevents "lost schemas", orphaned settings, and duplicated/contradictory definitions.

Rules:
- Keep entries short.
- Every file entry includes:
  - **Role**: 1 line describing what it does.
  - **Lists of Truth**: names only (metadata lists, defaults maps, JSON definitions, lookup tables, allow/deny key lists).
- Do not paste long schemas here. If an entry needs details, link to:
  - the owning file's **SCHEMA INVENTORY (lists-of-truth)** header, and/or
  - `/context/schema-registry.md`.

Micro-format (copy/paste):
- `<path>`
  - Role: <1 line>
  - Lists of truth: <Name1>, <Name2> (or "none")

---

## Top-level
- `AGENTS.md`
  - Role: Rules for AI agents working in this repo.
  - Lists of truth: RequiredReadingOrder, RiskGates (human-readable policies)

- `package.json`
  - Role: NPM dependencies and scripts.
  - Lists of truth: none

- `tsconfig.json`
  - Role: TypeScript compiler configuration.
  - Lists of truth: none

- `vite.config.ts`
  - Role: Vite build configuration.
  - Lists of truth: none

- `index.html`
  - Role: HTML entry point.
  - Lists of truth: none

- `.eslintrc.cjs`
  - Role: ESLint configuration.
  - Lists of truth: none

## Scoped agent rules (local AGENTS.md)
- `src/boot/AGENTS.md`
  - Role: Boot routing rules for editor/game mode + GitHub Pages base path notes.
  - Lists of truth: none

- `src/types/AGENTS.md`
  - Role: Schema/type stability rules for persisted formats.
  - Lists of truth: none

- `src/storage/AGENTS.md`
  - Role: Hot/Cold storage boundary rules + persistence reliability notes.
  - Lists of truth: none

- `src/editor/AGENTS.md`
  - Role: Editor-only rules (touch-first UI, state boundaries).
  - Lists of truth: none

- `src/editor/canvas/AGENTS.md`
  - Role: Canvas input/render rules (touch offset, transforms, perf).
  - Lists of truth: none

- `src/editor/tools/AGENTS.md`
  - Role: Tool contracts + undo/redo operation rules.
  - Lists of truth: none

- `src/editor/panels/AGENTS.md`
  - Role: Panel UX rules (bottom sheets, inspectors, deploy panel).
  - Lists of truth: none

- `src/runtime/AGENTS.md`
  - Role: Runtime constraints + loader invariants (hot vs cold).
  - Lists of truth: none

- `src/deploy/AGENTS.md`
  - Role: GitHub PAT + deploy flow rules (SHA checks, conflicts, API etiquette).
  - Lists of truth: none

- `game/AGENTS.md`
  - Role: Content folder conventions and schema validation expectations.
  - Lists of truth: none

- `INDEX.md`
  - Role: This file inventory.
  - Lists of truth: FileInventory (this list)

## Context
- `context/README.md`
  - Role: Project overview and setup instructions.
  - Lists of truth: none

- `context/schema-registry.md`
  - Role: Canonical inventory of schema-like "lists of truth".
  - Lists of truth: SchemaRegistry

- `context/repo-map.md`
  - Role: Module map (how the major parts connect).
  - Lists of truth: ModuleMap

- `context/track-index.md`
  - Role: Roadmap as 29 Tracks (converted from original phases).
  - Lists of truth: Tracks

- `context/planning-checklist.md`
  - Role: Repeatable ritual for planning Tracks.
  - Lists of truth: PlanningRitual

- `context/workflow.md`
  - Role: Lifecycle rules for building safely.
  - Lists of truth: WorkflowGates

- `context/product.md`
  - Role: Product intent + scope boundaries.
  - Lists of truth: ProductPillars

- `context/architecture.md`
  - Role: Technical invariants + apply/rebuild semantics.
  - Lists of truth: Invariants, ApplySemantics

- `context/tech-stack.md`
  - Role: Tools + build + deploy + test.
  - Lists of truth: Tooling

- `context/code-style.md`
  - Role: Code boundaries + module rules.
  - Lists of truth: CodeRules

- `context/active-track.md`
  - Role: Pointer to the current track + phase + context refresh prompt + stalled track protocol.
  - Lists of truth: ActiveTrackPointer, ContextRefreshPrompt, StalledTrackProtocol

- `context/history.md`
  - Role: Append-only track summaries with structured entry template.
  - Lists of truth: ChangeLog, EntryTemplate

## Tracks
- `tracks/YYYY-MM-DD-track-N-slug/`
  - Role: Planning artifacts for a single bounded unit of work.
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-5-canvas/`
  - Role: Track 5 planning artifacts (Canvas System).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-6-panels/`
  - Role: Track 6 planning artifacts (Panels + Tile Picker).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-7-tilemap-rendering/`
  - Role: Track 7 planning artifacts (Tilemap Rendering).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-8-paint-tool/`
  - Role: Track 8 planning artifacts (Paint Tool).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-9-touch-foundation/`
  - Role: Track 9 planning artifacts (Touch Foundation).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-10-playtest-bridge/`
  - Role: Track 10 planning artifacts (Playtest Bridge).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-11-runtime-loader/`
  - Role: Track 11 planning artifacts (Runtime Loader).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-12-authentication/`
  - Role: Track 12 planning artifacts (Authentication).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-13-deploy-flow/`
  - Role: Track 13 planning artifacts (Deploy Flow).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-14-erase-tool/`
  - Role: Track 14 planning artifacts (Erase Tool).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-15-select-tool/`
  - Role: Track 15 planning artifacts (Select Tool).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-16-undo-redo/`
  - Role: Track 16 planning artifacts (Undo/Redo System).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-17-scene-management/`
  - Role: Track 17 planning artifacts (Scene Management).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-01-31-track-18-layer-system/`
  - Role: Track 18 planning artifacts (Layer System).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-02-02-tracks-23-30-editor-v2-migration/`
  - Role: Tracks 23-30 planning artifacts (Editor V2 Migration: UI + Workflow Overhaul).
  - Lists of truth: Spec, Blueprint, Plan

## Game Data (created during Track 1)
- `game/project.json`
  - Role: Project manifest (tile categories, entity types, settings).
  - Lists of truth: ProjectSchema

- `game/scenes/*.json`
  - Role: Scene data files (layers, entities).
  - Lists of truth: SceneSchema

- `game/scenes/index.json`
  - Role: Optional scene manifest for cold-start discovery (GitHub Pages has no directory listing).
  - Lists of truth: SceneIndexSchema

- `game/assets/`
  - Role: Tile images, sprites, audio.
  - Lists of truth: none

## Source (Phase 0 complete, Tracks 5-9 complete)

### Boot (Track 4 — exists)
- `src/boot/main.ts`
  - Role: Entry point, mode detection, initialization.
  - Lists of truth: none

- `src/boot/modeRouter.ts`
  - Role: Route to editor or game mode.
  - Lists of truth: BootConfig

### Types (Track 1 — exists)
- `src/types/index.ts`
  - Role: Re-exports all types.
  - Lists of truth: none

- `src/types/project.ts`
  - Role: ProjectSchema, TileCategorySchema, EntityTypeSchema.
  - Lists of truth: ProjectSchema, TileCategorySchema, EntityTypeSchema, ProjectSettingsSchema

- `src/types/scene.ts`
  - Role: SceneSchema, LayerDataSchema, EntityInstanceSchema.
  - Lists of truth: SceneSchema, LayerDataSchema, EntityInstanceSchema, LayerType

- `src/types/entity.ts`
  - Role: PropertyDefinitionSchema, PropertyConstraintsSchema.
  - Lists of truth: PropertyDefinitionSchema, PropertyConstraintsSchema, PropertyType

### Storage (Tracks 2-3 — exists)
- `src/storage/index.ts`
  - Role: Re-exports all storage functions.
  - Lists of truth: none

- `src/storage/hot.ts`
  - Role: IndexedDB operations (project, scenes, editorState).
  - Lists of truth: EditorStateSchema, HotProjectSchema, ViewportState, PanelStates, SelectedTile, LayerVisibility, LayerLocks

- `src/storage/cold.ts`
  - Role: Fetch operations (read from repository).
  - Lists of truth: FreshnessCheckSchema

- `src/storage/migration.ts`
  - Role: Cold-to-hot migration on first load.
  - Lists of truth: MigrationResult

- `src/vite-env.d.ts`
  - Role: Vite type declarations.
  - Lists of truth: none

### Editor (Tracks 5-9 complete)
- `src/editor/init.ts`
  - Role: Editor initialization, canvas setup, state management.
  - Lists of truth: none

- `src/editor/canvas/index.ts`
  - Role: Public exports for canvas module.
  - Lists of truth: none

- `src/editor/canvas/viewport.ts`
  - Role: Viewport state and coordinate transforms.
  - Lists of truth: ViewportState (re-exported from storage), MIN_ZOOM, MAX_ZOOM

- `src/editor/canvas/gestures.ts`
  - Role: Pan/zoom gesture handling, tool gestures, and long-press detection.
  - Lists of truth: none

- `src/editor/canvas/touchConfig.ts`
  - Role: Centralized touch offset and gesture configuration.
  - Lists of truth: TouchConfig, DEFAULT_TOUCH_CONFIG

- `src/editor/canvas/brushCursor.ts`
  - Role: Brush cursor rendering for tool actions.
  - Lists of truth: none

- `src/editor/canvas/grid.ts`
  - Role: Grid rendering with culling.
  - Lists of truth: GridConfig

- `src/editor/canvas/Canvas.ts`
  - Role: Main canvas controller (orchestrates viewport, gestures, rendering).
  - Lists of truth: none

- `src/editor/canvas/tileCache.ts`
  - Role: Shared tile image cache for renderer and tile picker.
  - Lists of truth: none

- `src/editor/canvas/renderer.ts`
  - Role: Tilemap rendering with layer support, culling, and dimming.
  - Lists of truth: LAYER_RENDER_ORDER, LAYER_COLORS

- `src/editor/canvas/entityRenderer.ts`
  - Role: Entity rendering on canvas (sprites, placeholders, preview).
  - Lists of truth: EntityRendererConfig, EntityPreview

- `src/editor/panels/index.ts`
  - Role: Public exports for panels module.
  - Lists of truth: none

- `src/editor/panels/topPanel.ts`
  - Role: Top panel with scene info and layer tabs.
  - Lists of truth: none

- `src/editor/panels/bottomPanel.ts`
  - Role: Bottom panel with toolbar and tile picker.
  - Lists of truth: ToolType

- `src/editor/panels/deployPanel.ts`
  - Role: Deploy panel with authentication status.
  - Lists of truth: none

- `src/editor/panels/tilePicker.ts`
  - Role: Tile category tabs and tile grid for selection.
  - Lists of truth: none (uses TileCategory from types/project.ts)

- `src/editor/panels/selectionBar.ts`
  - Role: Floating action bar for selection operations.
  - Lists of truth: none

- `src/editor/panels/entitySelectionBar.ts`
  - Role: Floating action bar for entity selection actions.
  - Lists of truth: none

- `src/editor/panels/propertyInspector.ts`
  - Role: Entity property inspector panel for editing instance properties.
  - Lists of truth: PropertyInspectorConfig

- `src/editor/panels/layerPanel.ts`
  - Role: Layer panel with visibility and lock toggles.
  - Lists of truth: none

### Scene Management (Track 17)
- `src/editor/scenes/AGENTS.md`
  - Role: Scene management module rules.
  - Lists of truth: none

- `src/editor/scenes/index.ts`
  - Role: Public exports for scenes module.
  - Lists of truth: none

- `src/editor/scenes/sceneManager.ts`
  - Role: Scene CRUD operations (create, rename, delete, duplicate, resize).
  - Lists of truth: SceneListItem, ValidationResult

- `src/editor/scenes/sceneDialog.ts`
  - Role: Modal dialogs for scene operations.
  - Lists of truth: none

- `src/editor/scenes/sceneSelector.ts`
  - Role: Scene dropdown selector UI in top panel.
  - Lists of truth: SceneAction

- `src/editor/tools/paint.ts`
  - Role: Tile painting logic with single-tap and drag support.
  - Lists of truth: none

- `src/editor/tools/erase.ts`
  - Role: Tile erasing logic with brush size support.
  - Lists of truth: none

- `src/editor/tools/common.ts`
  - Role: Shared utilities for paint/erase tools.
  - Lists of truth: none

- `src/editor/tools/select.ts`
  - Role: Selection and manipulation tool.
  - Lists of truth: none

- `src/editor/tools/selectTypes.ts`
  - Role: Shared selection tool types for tile selection.
  - Lists of truth: SelectToolMode

- `src/editor/tools/selectTileController.ts`
  - Role: Tile selection controller (move, paste, fill, delete) for select tool.
  - Lists of truth: none

- `src/editor/tools/selectEntityController.ts`
  - Role: Entity selection/move/delete controller for select tool.
  - Lists of truth: none

- `src/editor/history/index.ts`
  - Role: Public exports for history module.
  - Lists of truth: none

- `src/editor/history/historyManager.ts`
  - Role: Undo/redo stack management with grouping.
  - Lists of truth: none

- `src/editor/history/operations.ts`
  - Role: Operation types and tile delta factories for undo/redo.
  - Lists of truth: OperationType

- `src/editor/history/AGENTS.md`
  - Role: History module rules and patterns.
  - Lists of truth: none

- `src/editor/tools/clipboard.ts`
  - Role: Clipboard for selection copy/paste.
  - Lists of truth: none

- `src/editor/tools/floodFill.ts`
  - Role: Flood fill algorithm for selection fill.
  - Lists of truth: none

- `src/editor/tools/entity.ts`
  - Role: Entity placement tool handling.
  - Lists of truth: none

- `src/editor/entities/entityManager.ts`
  - Role: Entity CRUD operations for scenes.
  - Lists of truth: EntityManager, EntityManagerConfig

- `src/editor/entities/entitySelection.ts`
  - Role: Entity selection tracking for manipulation workflows.
  - Lists of truth: EntitySelectionState


- `src/editor/settings/editorSettings.ts` (planned — Track 28)
  - Role: User preferences.
  - Lists of truth: EditorSettingsSchema

### Runtime (Track 4 stub — exists, Track 10 complete, Track 11 planned)
- `src/runtime/init.ts`
  - Role: Runtime initialization (Phaser boot + scene manager).
  - Lists of truth: none

- `src/runtime/loader.ts`
  - Role: Unified data loader for hot (IndexedDB) and cold (fetch) modes.
  - Lists of truth: DataSourceMode

- `src/runtime/index.ts`
  - Role: Runtime public API exports.
  - Lists of truth: none

- `src/runtime/projectLoader.ts`
  - Role: Load project data and runtime assets.
  - Lists of truth: none

- `src/runtime/sceneLoader.ts`
  - Role: Load scene data for runtime.
  - Lists of truth: none

- `src/runtime/playtestOverlay.ts`
  - Role: Playtest mode UI overlay with exit controls.
  - Lists of truth: none

- `src/runtime/tileMapFactory.ts`
  - Role: Create Phaser tilemaps and overlays from scene data.
  - Lists of truth: none

- `src/runtime/entityRegistry.ts`
  - Role: Entity type registry for runtime.
  - Lists of truth: none

- `src/runtime/entitySpawner.ts`
  - Role: Instantiate entities from scene data.
  - Lists of truth: none

- `src/runtime/sceneManager.ts`
  - Role: Scene transitions.
  - Lists of truth: none

### Deploy (Tracks 12-13)
- `src/deploy/auth.ts`
  - Role: GitHub PAT management.
  - Lists of truth: AuthStateSchema

- `src/deploy/tokenStorage.ts`
  - Role: Token storage abstraction (session + IndexedDB).
  - Lists of truth: StorageKeys

- `src/deploy/authUI.ts`
  - Role: Authentication modal UI.
  - Lists of truth: none

- `src/deploy/index.ts`
  - Role: Public exports for deploy module.
  - Lists of truth: none

- `src/deploy/changeDetector.ts`
  - Role: Detect changes between hot storage and deployed state.
  - Lists of truth: FileChangeSchema, ConflictSchema

- `src/deploy/shaManager.ts`
  - Role: SHA tracking and remote content fetching.
  - Lists of truth: ShaEntrySchema, ShaStoreSchema

- `src/deploy/conflictResolver.ts`
  - Role: Conflict resolution UI.
  - Lists of truth: none

- `src/deploy/deployUI.ts`
  - Role: Deploy progress and status UI.
  - Lists of truth: none

- `src/deploy/commit.ts`
  - Role: GitHub commit operations and deploy orchestration.
  - Lists of truth: CommitResultSchema

- `src/deploy/assetUpload.ts` (planned — Track 29)
  - Role: Upload new images to repository.
  - Lists of truth: none
