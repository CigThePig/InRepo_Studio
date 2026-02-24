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

- `.github/workflows/validate.yml`
  - Role: CI validation workflow (lint, build, project contract).
  - Lists of truth: none

- `tools/validate-project.mjs`
  - Role: Validate filesystem contract for project/scenes/assets.
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

- `game/logic/AGENTS.md`
  - Role: Logic script storage rules — workspace JSON format, file paths, on-demand creation, envelope schema.
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
  - Role: Ordered track roadmap (Phases 0–5+). Add new tracks here as phases expand.
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

- `context/planned-tests.md`
  - Role: Future-facing test plan covering high-risk debugging and stability areas.
  - Lists of truth: PlannedTestSuites

- `context/technical-debt.md`
  - Role: Unstarted codebase health tasks (duplicate utilities, deprecated API usage, barrel export gaps, type fixes).
  - Lists of truth: none

- `context/archive/`
  - Role: Historical planning docs superseded by completed tracks. Not active context — agents should ignore.
  - Lists of truth: none

- `context/Blockly_Plan_Revised.md`
  - Role: Blockly + Presets constitution (Parts 1–15). Authority for Phase 5 tracks.
  - Lists of truth: BlocklyNonNegotiables, GameApiContract, PresetContract, BlockTaxonomy

- `context/editor-architecture.md`
  - Role: Editor mode-driven architecture spec (mode state, berry layout, dual-mode rules). Authority for the editor architecture and dual-mode system.
  - Lists of truth: EditorArchitecture

- `context/ux-polish-rules.md`
  - Role: Non-negotiable UX feedback standards — required reading before marking any feature complete.
  - Lists of truth: FeedbackContract, PolishRules

- `context/repo-audit-report.md`
  - Role: Reality-based repository audit of current behavior, failure points, and ranked issue backlog.
  - Lists of truth: none

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

- `tracks/archive/2026-02-02-tracks-23-30-editor-v2-migration/`
  - Role: Tracks 23-30 planning artifacts (Editor Architecture Migration: UI + Workflow Overhaul). Archived.
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-02-08-track-31-game-api-contract/`
  - Role: Track 31 planning artifacts (Game API Contract + Types).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-02-08-track-32-preset-schema/`
  - Role: Track 32 planning artifacts (Preset Schema + Definition Types).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-02-08-track-33-script-envelope/`
  - Role: Track 33 planning artifacts (Script Envelope + Storage).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-02-08-track-34-preset-registry/`
  - Role: Track 34 planning artifacts (Preset Registry + PresetManager).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-02-09-track-35-scenehost-apicontext/`
  - Role: Track 35 planning artifacts (SceneHost + ApiContext Runtime).
  - Lists of truth: Spec, Blueprint, Plan

- `context/tracks/track-36/`
  - Role: Track 36 planning artifacts (ScriptHost Engine). Note: housed under `context/tracks/` rather than the top-level `tracks/` folder; this is a historical anomaly — new tracks go in `tracks/YYYY-MM-DD-track-N-slug/`.
  - Lists of truth: Spec, Blueprint, Plan

- `context/tracks/track-37/`
  - Role: Track 37 planning artifacts (Schema-Driven Block Generation). See location note on track-36.
  - Lists of truth: Spec, Blueprint, Plan

- `context/tracks/track-38/`
  - Role: Track 38 planning artifacts (Core Block Definitions). See location note on track-36.
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-02-09-track-39-blockly-workspace-ui/`
  - Role: Track 39 planning artifacts (Blockly Workspace UI — Cockpit).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-02-10-track-40-right-berry-blocks-palette/`
  - Role: Track 40 planning artifacts (Right Berry Blocks Palette).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-02-10-track-41-presets-ui-blockly-hooks/`
  - Role: Track 41 planning artifacts (Presets UI + Blockly Hooks).
  - Lists of truth: Spec, Blueprint, Plan

- `tracks/2026-02-19-track-42-inspect-errors-panel/`
  - Role: Track 42 planning artifacts (Inspect/Errors Panel + Integration Polish).
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

- `game/presets.json`
  - Role: Preset configuration (enabled presets + knob overrides).
  - Lists of truth: PresetSavedConfig

## Source (Phase 0 complete, Tracks 5-9 complete)

### Boot (Track 4 — exists)
- `src/boot/main.ts`
  - Role: Entry point, mode detection, initialization.
  - Lists of truth: none

- `src/boot/loadingScreen.ts`
  - Role: Boot loading screen DOM helpers (progress + hide transition).
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
  - Lists of truth: ProjectSchema, TileCategorySchema, EntityTypeSchema, ProjectSettingsSchema, ProjectAnimationSchema, ProjectAnimationSetSchema

- `src/types/scene.ts`
  - Role: SceneSchema, LayerDataSchema, EntityInstanceSchema, PropSpriteInstanceSchema.
  - Lists of truth: SceneSchema, LayerDataSchema, EntityInstanceSchema, PropSpriteInstanceSchema, LayerType

- `src/types/entity.ts`
  - Role: PropertyDefinitionSchema, PropertyConstraintsSchema.
  - Lists of truth: PropertyDefinitionSchema, PropertyConstraintsSchema, PropertyType

- `src/types/gameApi.ts`
  - Role: Game API contract types (ApiContext, EventBus, TimeHelpers, etc.).
  - Lists of truth: ApiContext, EventBus, TimeHelpers, LogApi, EntityHandle, EntityLookup, PresetSurface, ApiMeta, LogicTargetMeta

- `src/types/preset.ts`
  - Role: PresetDefinition schema types.
  - Lists of truth: PresetDefinition, PresetCategoryId, KnobDef, CommandDef, EventDef, StateDef, PresetSavedConfig

- `src/types/script.ts`
  - Role: Logic script envelope types.
  - Lists of truth: ScriptFile, ScriptLogicTarget, resolveScriptPath, resolveScriptId

- `src/types/presetValidation.ts`
  - Role: Validation utilities for PresetDefinition schemas.
  - Lists of truth: validatePresetDefinition, validateKnobDef, validateCommandDef, validateEventDef, validateStateDef, validatePresetSavedConfig

- `src/types/presetDefaults.ts`
  - Role: Default factories for preset configuration.
  - Lists of truth: PRESET_CONFIG_FORMAT_VERSION, VALID_PROFILES, createDefaultPresetConfig, createDefaultCategoryConfig

- `src/types/scriptUtils.ts`
  - Role: Script envelope validation and factory utilities.
  - Lists of truth: SCRIPT_FORMAT_VERSION, createEmptyScriptFile, validateScriptFile

- `src/types/workspace.ts`
  - Role: Canonical local WorkspaceContent + EditorUIState schemas.
  - Lists of truth: WorkspaceContent, EditorUIState, WorkspaceMeta

### Storage (Tracks 2-3 — exists)
- `src/storage/index.ts`
  - Role: Re-exports all storage functions.
  - Lists of truth: none

- `src/storage/hot.ts`
  - Role: IndexedDB operations for workspace content, editor UI state, and legacy migration compatibility.
  - Lists of truth: WorkspaceRecordSchema, EditorUIStateSchema, HotProjectSchema, AssetRegistrySnapshot

- `src/storage/cold.ts`
  - Role: Fetch operations (read from repository).
  - Lists of truth: FreshnessCheckSchema, RepoAssetManifest

- `src/storage/migration.ts`
  - Role: Cold-to-hot migration on first load.
  - Lists of truth: MigrationResult

- `src/storage/scriptStorage.ts`
  - Role: Hot storage (IndexedDB) operations for Blockly script files.
  - Lists of truth: ScriptStoreDB

- `src/storage/scriptCold.ts`
  - Role: Cold storage fetch for published script files.
  - Lists of truth: none

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

- `src/editor/canvas/animationClock.ts`
  - Role: Shared animation playback clock for editor canvas entity previews.
  - Lists of truth: AnimationClock, AnimationFrameSnapshot

- `src/editor/canvas/tileCache.ts`
  - Role: Shared tile image cache for renderer and tile picker.
  - Lists of truth: none

- `src/editor/canvas/atlasCache.ts`
  - Role: Atlas sheet + slice cache used by canvas renderer for atlas-backed tiles.
  - Lists of truth: none

- `src/editor/canvas/renderer.ts`
  - Role: Tilemap + prop-sprite + entity rendering with layer support and culling.
  - Lists of truth: LAYER_RENDER_ORDER, LAYER_COLORS

- `src/editor/canvas/entityRenderer.ts`
  - Role: Entity rendering on canvas (sprites, placeholders, preview).
  - Lists of truth: EntityRendererConfig, EntityPreview

- `src/editor/canvas/animationClock.test.ts`
  - Role: Unit tests for editor canvas animation clock playback behavior.
  - Lists of truth: none

- `src/editor/panels/index.ts`
  - Role: Public exports for panels module.
  - Lists of truth: none

- `src/editor/panels/topPanel.ts`
  - Role: Top panel with scene info and layer tabs.
  - Lists of truth: none

- `src/editor/panels/topBar.ts`
  - Role: Global-only top bar (Undo/Redo/Settings/Play).
  - Lists of truth: none

- `src/editor/panels/bottomPanel.ts`
  - Role: Bottom panel with selection button, context strip slot, and utilities.
  - Lists of truth: ToolType

- `src/editor/panels/bottomContextStrip.ts`
  - Role: Bottom bar context strip for tile/entity/prop-sprite selection actions.
  - Lists of truth: BottomContextSelection

- `src/editor/panels/deployPanel.ts`
  - Role: Deploy panel with authentication status.
  - Lists of truth: none

- `src/editor/panels/tilePicker.ts`
  - Role: Tile category tabs and tile grid for selection.
  - Lists of truth: none (uses TileCategory from types/project.ts)

- `src/editor/panels/layerPanel.ts`
  - Role: Layer panel with visibility and lock toggles.
  - Lists of truth: none

- `src/editor/panels/berryShell.ts`
  - Role: Shared Berry side panel shell factory (DOM shell, styles, open/close + swipe behavior).
  - Lists of truth: BerryShellConfig

- `src/editor/panels/rightBerry.ts`
  - Role: Right berry slide-out panel shell for editor modes.
  - Lists of truth: none

- `src/editor/panels/rightBerryTabs.ts`
  - Role: Right berry mode tab definitions.
  - Lists of truth: RIGHT_BERRY_TABS

- `src/editor/panels/berryControls.ts`
  - Role: Shared berry UI controls (brush size, hints).
  - Lists of truth: none

- `src/editor/panels/leftBerry.ts`
  - Role: Left berry slide-out shell that renders registered tab plugins.
  - Lists of truth: none

- `src/editor/panels/leftBerryPlugins.ts`
  - Role: Default plugin registrations for left berry tabs.
  - Lists of truth: createDefaultLeftBerryPlugins

- `src/editor/panels/leftBerryTabs.ts`
  - Role: Left berry asset workflow tab definitions.
  - Lists of truth: LEFT_BERRY_TABS

- `src/editor/panels/spriteSlicerTab.ts`
  - Role: Sprite sheet slicing UI for the left berry.
  - Lists of truth: none

- `src/editor/panels/animationTab.ts`
  - Role: Left berry animation tab for sprite-sheet slicing and animation preview/editing.
  - Lists of truth: none

- `src/editor/panels/assetLibraryTab.ts`
  - Role: Left berry Assets Library tab UI for grouped assets, animation clips, and directional animation sets.
  - Lists of truth: none

- `src/editor/panels/assetPalette.ts`
  - Role: Asset palette UI for right berry modes.
  - Lists of truth: none

- `src/editor/panels/utilitiesTab.ts`
  - Role: Left berry utilities tab for deploy and data tools.
  - Lists of truth: none

- `src/editor/panels/animStateMachine.ts`
  - Role: Visual Animation State Machine editor UI in the left berry animation tab.
  - Lists of truth: none

- `src/editor/panels/settingsPanel.ts`
  - Role: Settings preview dialog + warning notice helpers shared by editor init flows.
  - Lists of truth: none

- `src/editor/panels/smSimulator.ts`
  - Role: Pure TypeScript SM simulator for the SM editor "Simulate" mode (no Phaser, no DOM side effects).
  - Lists of truth: none

- `src/editor/panels/entitiesTab.ts`
  - Role: Entities mode tab UI for palette, selection, and inline property editing including animation set binding.
  - Lists of truth: none

- `src/editor/presets/AGENTS.md`
  - Role: Module rules for editor presets UI.
  - Lists of truth: none

- `src/editor/presets/index.ts`
  - Role: Editor Presets module public exports.
  - Lists of truth: none

- `src/editor/presets/presetConfigStore.ts`
  - Role: Editor-side preset config read/write to hot storage.
  - Lists of truth: PresetConfigStore

- `src/editor/presets/presetsTab.ts`
  - Role: Presets dashboard UI with profile selector and category status list.
  - Lists of truth: CATEGORY_META

- `src/editor/presets/undoToast.ts`
  - Role: Undo toast UI for reversible preset edits.
  - Lists of truth: none


- `src/editor/presets/categoryDetail.ts`
  - Role: Category detail screen with Configure/Hooks tabs and knob-editing actions.
  - Lists of truth: CATEGORY_LABELS

- `src/editor/presets/knobEditor.ts`
  - Role: Schema-driven knob control renderer (number/boolean/enum/string).
  - Lists of truth: none

- `src/editor/presets/blocklyHooksTab.ts`
  - Role: Category detail Hooks tab renderer for events/commands/state with insert actions.
  - Lists of truth: none

- `src/editor/presets/presetPicker.ts`
  - Role: Preset selection modal with compatibility hints per category.
  - Lists of truth: none

- `src/editor/presets/issuesModal.ts`
  - Role: Preset issue list modal for conflicts and missing definitions.
  - Lists of truth: none

- `src/editor/core/index.ts`
  - Role: Editor core public exports.
  - Lists of truth: none

- `src/editor/core/featureFlags.ts`
  - Role: Editor feature flag management.
  - Lists of truth: EDITOR_FLAGS

- `src/editor/core/editorMode.ts`
  - Role: Editor mode state management.
  - Lists of truth: EditorMode

- `src/editor/core/modeMapping.ts`
  - Role: Legacy tool/layer to mode mapping.
  - Lists of truth: MODE_TO_LAYER, MODE_TO_TOOL

- `src/editor/core/tabRegistry.ts`
  - Role: Plugin contracts and tab registry for berry shell composition.
  - Lists of truth: TabRegistry.leftBerryTabs

- `src/editor/core/eventBus.ts`
  - Role: Strongly typed editor event bus for UI intents and state broadcasts.
  - Lists of truth: EditorEventMap

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

- `src/editor/scenes/scenePopover.ts`
  - Role: Reusable in-canvas scene popover toast component for short status messages.
  - Lists of truth: none

- `src/editor/props/propSpriteManager.ts`
  - Role: CRUD + conversion manager for sprite-sized prop objects in scenes.
  - Lists of truth: none

- `src/editor/tools/paint.ts
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

- `src/editor/tools/propSprite.ts`
  - Role: Place sprite-sized props as world-space prop objects.
  - Lists of truth: none

- `src/editor/tools/selectPropSpriteController.ts`
  - Role: Select/move/delete/duplicate controller for prop sprite objects.
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

- `src/editor/assets/index.ts`
  - Role: Asset pipeline module exports.
  - Lists of truth: none

- `src/editor/assets/assetGroup.ts`
  - Role: Asset group types and defaults for the asset library.
  - Lists of truth: AssetGroupType, DEFAULT_ASSET_GROUPS, ASSET_GROUP_PATHS

- `src/editor/assets/groupSlugify.ts`
  - Role: Group name slug normalization helper.
  - Lists of truth: none

- `src/editor/assets/assetRegistry.ts`
  - Role: In-editor asset registry with grouped assets and selection state.
  - Lists of truth: AssetRegistryState, AssetEntry, AssetEntrySource, AnimationAsset, AnimationFrameRef, AnimationLoopMode, AnimationSetAsset, Facing4

- `src/editor/assets/assetRegistry.test.ts`
  - Role: Unit tests for asset registry rename/reorder behavior.
  - Lists of truth: none

- `src/editor/assets/animationRefs.ts`
  - Role: Pure helper for collecting animation references in scene entities and animation sets.
  - Lists of truth: AnimationReferenceHit

- `src/editor/assets/animationRefs.test.ts`
  - Role: Unit tests for animation reference collection.
  - Lists of truth: none

- `src/editor/assets/atlasImporter.ts`
  - Role: Atlas JSON format detection/parsing for animation frame import.
  - Lists of truth: AtlasImportFormat

- `src/editor/assets/atlasImporter.test.ts`
  - Role: Unit tests for atlas JSON parser coverage across supported formats.
  - Lists of truth: none

- `src/editor/assets/spriteSlider.ts`
  - Role: Sprite sheet slicing logic for asset prep.
  - Lists of truth: none

- `src/editor/assets/spriteAtlasRehydrate.ts`
  - Role: Rehydrate virtual atlas slice assets from project sprite atlas metadata.
  - Lists of truth: none

- `src/editor/settings/editorSettings.ts` (planned — Track 28)
  - Role: User preferences.
  - Lists of truth: EditorSettingsSchema

### Editor Blockly (Track 39)
- `src/editor/blockly/AGENTS.md`
  - Role: Blockly workspace UI module rules — cockpit layout, workspace lifecycle, Logic Target switching, blocks palette, berry tab definitions.
  - Lists of truth: none

- `src/editor/blockly/index.ts`
  - Role: Public exports for editor blockly module.
  - Lists of truth: none

- `src/editor/blockly/blocklyWorkspace.ts`
  - Role: Blockly workspace injection, Zelos renderer config, lifecycle (create/save/load/dispose).
  - Lists of truth: none

- `src/editor/blockly/workspaceManager.ts`
  - Role: Workspace save/load orchestration, Logic Target switching, empty state, auto-save.
  - Lists of truth: none

- `src/editor/blockly/blocklyMode.ts`
  - Role: Blockly Mode state management (enter/exit), UI layout coordination.
  - Lists of truth: none

- `src/editor/blockly/blocklyTopBar.ts`
  - Role: Blockly Mode top bar (Back, Logic Target dropdown, Run/Stop, status indicator).
  - Lists of truth: none

- `src/editor/blockly/blocklyCockpit.ts`
  - Role: Full Blockly Mode orchestrator (lazy-load, enter/exit, DOM layout, beforeunload).
  - Lists of truth: none

- `src/editor/blockly/paletteCategories.ts`
  - Role: Palette category definitions and query helpers for blocks palette.
  - Lists of truth: PALETTE_CATEGORIES

- `src/editor/blockly/blocklyBerryTabs.ts`
  - Role: Blockly Mode tab definitions for right berry (Blocks + Inspect).
  - Lists of truth: BLOCKLY_BERRY_TABS

- `src/editor/blockly/blocksPalette.ts`
  - Role: Categorized block browser — search, categories, tap-to-insert, mobile-first palette.
  - Lists of truth: none

- `src/editor/blockly/blocksPaletteStyles.ts`
  - Role: CSS styles for the blocks palette component.
  - Lists of truth: none

- `src/editor/blockly/inspectPanel.ts` (Track 42 — complete)
  - Role: Inspect/Errors tab content — script status strip, last error with block highlight, active timer count, recent log entries. Push-fed by blocklyCockpit via update()/appendLog().
  - Lists of truth: none

### Shared
- `src/shared/theme.css`
  - Role: Global UI design tokens for surfaces, accents, borders, typography, and geometry sizing.
  - Lists of truth: IRSThemeTokens

- `src/shared/common-styles.css`
  - Role: Shared utility classes for standard overlays, dialogs, buttons, and inputs using theme tokens.
  - Lists of truth: none

- `src/shared/ui/searchInput.ts`
  - Role: Shared DOM factory for berry-themed search inputs with icon/clear affordances and lifecycle cleanup.
  - Lists of truth: none

- `src/shared/atlasNaming.ts`
  - Role: Stable atlas category naming helpers (`atlas:<groupSlug>`) for editor/runtime/scene mapping.
  - Lists of truth: none

- `src/shared/paths.ts`
  - Role: Centralized content path constants + URL resolver.
  - Lists of truth: ContentPathContract

- `src/shared/projectManifest.ts`
  - Role: Append-only helpers for project.json updates.
  - Lists of truth: none

- `src/shared/atlasTileIds.ts`
  - Role: Atlas tileId migration + local-id lookup helpers for editor/runtime/pack.
  - Lists of truth: none

### Runtime (Track 4 stub — exists, Track 10 complete, Track 11 planned)
- `src/pack/buildProjectPack.ts`
  - Role: Deterministic builder that derives runtime/deploy project pack from WorkspaceContent including animations and animation sets.
  - Lists of truth: ProjectPack

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
  - Role: Load project data and runtime assets, including animation set resolution.
  - Lists of truth: none

- `src/runtime/sceneLoader.ts`
  - Role: Load scene data for runtime.
  - Lists of truth: none

- `src/runtime/playtestOverlay.ts`
  - Role: Playtest mode UI overlay with exit controls + mobile joystick input.
  - Lists of truth: none

- `src/runtime/input/moveInput.ts`
  - Role: Shared move vector store for runtime input systems.
  - Lists of truth: MoveVectorState

- `src/runtime/tileMapFactory.ts`
  - Role: Build runtime tilemap layers from unified registry (atlas + packed cut tiles), fallback sprite layer, and debug overlays.
  - Lists of truth: none

- `src/runtime/depthBands.ts`
  - Role: Shared runtime depth band constants for tile layers, props, entities, and UI.
  - Lists of truth: RuntimeDepthBands

- `src/runtime/tiles/runtimeTilesetRegistry.ts`
  - Role: Runtime tileset registry mapping scene tile refs to Phaser runtime GIDs (atlas + packed cut tiles) with non-eligible fallback metadata.
  - Lists of truth: RuntimeTilesetRegistry

- `src/runtime/tiles/texturePixelSize.ts`
  - Role: Pure duck-typed helpers to read pixel dimensions from Phaser texture source images without DOM globals.
  - Lists of truth: none

- `src/runtime/tiles/texturePixelSize.test.ts`
  - Role: Unit tests for texture pixel-width extraction fallback behavior.
  - Lists of truth: none

- `src/runtime/entityRegistry.ts`
  - Role: Entity type registry for runtime.
  - Lists of truth: none

- `src/runtime/entitySpawner.ts`
  - Role: Instantiate entities from scene data and assign runtime depth ordering.
  - Lists of truth: none

- `src/runtime/sceneManager.ts`
  - Role: Scene transitions + runtime environment binding + prop sprite spawning + depth sync.
  - Lists of truth: none

### Runtime Presets (Track 34)
- `src/runtime/presets/AGENTS.md`
  - Role: Preset definitions + PresetManager module rules.
  - Lists of truth: none

- `src/runtime/presets/index.ts`
  - Role: Public exports for presets module.
  - Lists of truth: none

- `src/runtime/presets/presetInstance.ts`
  - Role: Runtime interface for live preset instances + API registration surface.
  - Lists of truth: PresetInstance, PresetFactory, PresetApiRegistrar, PresetRegistryEntry

- `src/runtime/presets/presetRegistry.ts`
  - Role: Preset registry — discovers and indexes PresetDefinitions via import.meta.glob.
  - Lists of truth: PresetRegistry, buildPresetRegistry

- `src/runtime/presets/presetManager.ts`
  - Role: PresetManager lifecycle engine (instantiate, config, API registration, dispose).
  - Lists of truth: PresetManager, PresetConflict

- `src/runtime/presets/runtimeEnv.ts`
  - Role: Scene-scoped runtime environment access for preset implementations.
  - Lists of truth: RuntimeEnv

- `src/runtime/presets/gameProfiles.ts`
  - Role: Game Profile definitions and apply logic.
  - Lists of truth: GAME_PROFILES, GameProfileDef

- `src/runtime/presets/defs/controls-topdown.ts`
  - Role: Top-down controls preset definition + stub factory.
  - Lists of truth: PresetDefinition (controls-topdown)

- `src/runtime/presets/defs/controls-platformer.ts`
  - Role: Platformer controls preset definition + stub factory.
  - Lists of truth: PresetDefinition (controls-platformer)

- `src/runtime/presets/defs/movement-topdown.ts`
  - Role: Top-down movement preset definition + stub factory.
  - Lists of truth: PresetDefinition (movement-topdown)

- `src/runtime/presets/defs/movement-platformer.ts`
  - Role: Platformer movement preset definition + stub factory.
  - Lists of truth: PresetDefinition (movement-platformer)

- `src/runtime/presets/defs/camera-follow.ts`
  - Role: Camera follow preset definition + stub factory.
  - Lists of truth: PresetDefinition (camera-follow)

- `src/runtime/presets/defs/animation-driver.ts`
  - Role: Animation driver preset definition + runtime factory for clip/set-based facing selection.
  - Lists of truth: PresetDefinition (animation-driver)

- `src/runtime/presets/defs/animation-entity-animator.ts`
  - Role: Entity animation controller preset definition + runtime factory for per-entity play/stop/autofacing behavior.
  - Lists of truth: PresetDefinition (animation-entity-animator)

- `src/runtime/presets/defs/state-machine-driver.ts`
  - Role: Animation state machine driver preset definition + stub factory.
  - Lists of truth: PresetDefinition (state-machine-driver)

### Runtime ApiContext (Track 35)
- `src/runtime/apiContext/index.ts`
  - Role: Public exports for ApiContext module.
  - Lists of truth: none

- `src/runtime/apiContext/eventBus.ts`
  - Role: Scene-scoped event pub/sub implementation.
  - Lists of truth: createEventBus

- `src/runtime/apiContext/timeHelpers.ts`
  - Role: Safe timer wrappers with guardrails (50ms min, 64 cap).
  - Lists of truth: createTimeHelpers, DisposableTimeHelpers

- `src/runtime/apiContext/logApi.ts`
  - Role: Structured logging with source attribution.
  - Lists of truth: createLogApi

- `src/runtime/apiContext/entityLookup.ts`
  - Role: Entity lookup stub for v1.
  - Lists of truth: createEntityLookupStub

- `src/runtime/apiContext/createApiContext.ts`
  - Role: Factory assembling ApiContext from subsystems.
  - Lists of truth: DisposableApiContext, CreateApiContextOptions

### Runtime SceneHost (Track 35)
- `src/runtime/sceneHost.ts`
  - Role: SceneHost class — owns PresetManager + ApiContext per scene.
  - Lists of truth: SceneHost, SceneHostConfig

- `src/runtime/inrepoRuntime.ts`
  - Role: Top-level InRepo runtime attach/detach entry point.
  - Lists of truth: InRepoRuntime

### Runtime Blockly (Tracks 36-38)
- `src/runtime/blockly/AGENTS.md`
  - Role: Block definitions + ScriptHost module rules.
  - Lists of truth: none

- `src/runtime/blockly/index.ts`
  - Role: Public exports for runtime blockly module.
  - Lists of truth: none

- `src/runtime/blockly/scriptHost.ts`
  - Role: ScriptHost engine — Blockly script lifecycle (compile, run, stop, error).
  - Lists of truth: ScriptHost, ScriptState, ScriptEntry, ScriptErrorInfo

- `src/runtime/blockly/codegenRules.ts`
  - Role: Shared codegen utilities for Blockly → JS code generation.
  - Lists of truth: none (pure string builders)

- `src/runtime/blockly/schemaToBlocks.ts`
  - Role: Schema-driven block generation (PresetDefinition → BlockPack).
  - Lists of truth: BlockDefinition, BlockPackEntry, BlockPack, BlockDependency

- `src/runtime/blockly/blockRegistry.ts`
  - Role: Block registry with search + dependency lookup.
  - Lists of truth: BlockRegistry

- `src/runtime/blockly/coreBlocks.ts`
  - Role: Core + preset block loader for registry population.
  - Lists of truth: none

- `src/runtime/blockly/installIntoBlockly.ts`
  - Role: Installs registry block definitions/generators into Blockly runtime.
  - Lists of truth: none

- `src/runtime/blockly/blocks/events.ts`
  - Role: Core event hat blocks (When Scene Starts).
  - Lists of truth: CoreBlockPack (events)

- `src/runtime/blockly/blocks/logic.ts`
  - Role: Core logic blocks (if/else, comparisons, boolean ops).
  - Lists of truth: CoreBlockPack (logic)

- `src/runtime/blockly/blocks/math.ts`
  - Role: Core math blocks (number, arithmetic, round, random, modulo).
  - Lists of truth: CoreBlockPack (math)

- `src/runtime/blockly/blocks/variables.ts`
  - Role: Core variable blocks (get/set variable).
  - Lists of truth: CoreBlockPack (variables)

- `src/runtime/blockly/blocks/time.ts`
  - Role: Core time blocks (wait, every, cancel timer).
  - Lists of truth: CoreBlockPack (time)

- `src/runtime/blockly/blocks/debug.ts`
  - Role: Core debug blocks (log message, log value).
  - Lists of truth: CoreBlockPack (debug)

- `src/runtime/blockly/blocks/map.ts`
  - Role: Core map blocks (map entered/exited, Map Logic only).
  - Lists of truth: CoreBlockPack (map)

### Game Logic Data
- `game/logic/`
  - Role: Blockly script files (workspace JSON envelopes).
  - Lists of truth: none

- `game/logic/main.json` (created on demand)
  - Role: Game Logic script.
  - Lists of truth: ScriptFile

- `game/logic/maps/*.json` (created on demand)
  - Role: Per-map Logic scripts.
  - Lists of truth: ScriptFile

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

- `src/deploy/assetUpload.ts`
  - Role: Upload grouped asset images to GitHub with size checks and conflict safety.
  - Lists of truth: none
