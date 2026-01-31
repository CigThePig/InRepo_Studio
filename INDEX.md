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

## Game Data (created during Track 1)
- `game/project.json`
  - Role: Project manifest (tile categories, entity types, settings).
  - Lists of truth: ProjectSchema

- `game/scenes/*.json`
  - Role: Scene data files (layers, entities).
  - Lists of truth: SceneSchema

- `game/assets/`
  - Role: Tile images, sprites, audio.
  - Lists of truth: none

## Source (Phase 0 complete, Tracks 5-6 in progress)

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
  - Lists of truth: EditorStateSchema, HotProjectSchema, ViewportState, PanelStates, SelectedTile

- `src/storage/cold.ts`
  - Role: Fetch operations (read from repository).
  - Lists of truth: FreshnessCheckSchema

- `src/storage/migration.ts`
  - Role: Cold-to-hot migration on first load.
  - Lists of truth: MigrationResult

- `src/vite-env.d.ts`
  - Role: Vite type declarations.
  - Lists of truth: none

### Editor (Track 5 — exists, Tracks 6-9 planned)
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
  - Role: Pan/zoom gesture handling (multi-touch).
  - Lists of truth: none

- `src/editor/canvas/grid.ts`
  - Role: Grid rendering with culling.
  - Lists of truth: GridConfig

- `src/editor/canvas/Canvas.ts`
  - Role: Main canvas controller (orchestrates viewport, gestures, rendering).
  - Lists of truth: none

- `src/editor/canvas/renderer.ts` (planned — Track 7)
  - Role: Tilemap and entity rendering.
  - Lists of truth: none

- `src/editor/panels/index.ts`
  - Role: Public exports for panels module.
  - Lists of truth: none

- `src/editor/panels/topPanel.ts`
  - Role: Top panel with scene info and layer tabs.
  - Lists of truth: none

- `src/editor/panels/bottomPanel.ts`
  - Role: Bottom panel with toolbar and content container.
  - Lists of truth: ToolType

- `src/editor/tools/paint.ts` (planned — Track 8)
  - Role: Tile painting logic.
  - Lists of truth: none

- `src/editor/tools/erase.ts` (planned — Track 14)
  - Role: Tile erasing logic.
  - Lists of truth: none

- `src/editor/tools/select.ts` (planned — Track 15)
  - Role: Selection and manipulation.
  - Lists of truth: none

- `src/editor/tools/entity.ts` (planned — Track 20)
  - Role: Entity placement and editing.
  - Lists of truth: none

- `src/editor/inspectors/propertyInspector.ts` (planned — Track 22)
  - Role: Entity property editing UI.
  - Lists of truth: none

- `src/editor/settings/editorSettings.ts` (planned — Track 28)
  - Role: User preferences.
  - Lists of truth: EditorSettingsSchema

### Runtime (Track 4 stub — exists, Track 11 planned)
- `src/runtime/init.ts`
  - Role: Runtime initialization (placeholder).
  - Lists of truth: none

- `src/runtime/loader.ts` (planned — Track 11)
  - Role: Load project/scene from hot or cold storage.
  - Lists of truth: none

- `src/runtime/tileMapFactory.ts` (planned — Track 11)
  - Role: Create Phaser tilemaps from scene data.
  - Lists of truth: none

- `src/runtime/entitySpawner.ts` (planned — Track 11)
  - Role: Instantiate entities from scene data.
  - Lists of truth: none

- `src/runtime/sceneManager.ts` (planned — Track 11)
  - Role: Scene transitions.
  - Lists of truth: none

### Deploy (planned — Tracks 12-13)
- `src/deploy/auth.ts` (planned — Track 12)
  - Role: GitHub PAT management.
  - Lists of truth: AuthStateSchema

- `src/deploy/commit.ts` (planned — Track 13)
  - Role: Change detection, SHA management, commit flow.
  - Lists of truth: FileChangeSchema, ConflictSchema

- `src/deploy/assetUpload.ts` (planned — Track 29)
  - Role: Upload new images to repository.
  - Lists of truth: none