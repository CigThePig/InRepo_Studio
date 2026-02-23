# Schema Registry (Lists of Truth)

Purpose:
- One-page inventory of schema-like structures that other code treats like an API.
- Prevent orphan keys, half-wired UIs, and settings that silently do nothing.

What counts as a "list of truth":
- metadata lists (UI schemas, config meta, category lists, field definitions)
- form models / field maps
- JSON-schema-ish definitions (even if informal)
- lookup tables that drive behavior or UI
- key allow/deny lists (export/import keys, excluded keys, feature flags)

Rules:
- When you add/rename/move one of these structures, update this file in the same commit.
- Keep entries short: name + role + non-obvious invariants.
- Details live beside the code; this file is the index.
- `INDEX.md` may list list-names per file, but this file is the canonical "what lists exist and who owns them".

- Some entries may be **planned**; if the owning file does not exist yet, create it and update `INDEX.md` in the same phase.
---

## Inventory

### Context + planning
- `/INDEX.md`
  - FileInventory — file list + per-file lists-of-truth names.
- `/context/track-index.md`
  - Tracks — ordered roadmap; canonical for scope.
- `/context/repo-map.md`
  - ModuleMap — major modules + how they connect.
- `/context/schema-registry.md`
  - SchemaRegistry — this inventory.

### Project Data Schemas (Track 1)

- `/src/types/project.ts`
  - `ProjectSchema` — JSON shape for project.json
    - Keys: name, defaultScene, tileCategories[], entityTypes[], settings{}
    - Invariant: tileCategories must have unique names
    - Invariant: entityTypes must have unique names
  - `TileCategorySchema` — tile category definition
    - Keys: name, path, files[]
  - `EntityTypeSchema` — entity type definition
    - Keys: name, properties[]
  - `ProjectSettingsSchema` — global project settings
    - Keys: defaultTileSize, defaultGridWidth, defaultGridHeight

- `/src/types/scene.ts`
  - `SceneSchema` — JSON shape for scene files
    - Keys: id, name, width, height, tileSize, tilesets[], layers{}, entities[], propSprites[]
    - Invariant: layer data arrays match width × height
  - `LayerDataSchema` — tilemap layer structure
    - Keys: ground, props, collision, triggers (each a 2D array)
  - `EntityInstanceSchema` — placed entity in scene
    - Keys: id, type, x, y, properties{}
    - Invariant: type must reference valid entityType from project
  - `SpriteRefSchema` — category/index sprite reference
    - Keys: category, index
  - `PropSpriteInstanceSchema` — placed sprite-sized prop object in scene
    - Keys: id, sprite{category,index}, x, y


- `/game/scenes/index.json`
  - `SceneIndexSchema` — optional scene manifest to enable cold-start discovery on GitHub Pages
    - Shapes supported: string[], { scenes: string[] }, { scenes: {id:string}[] }, { ids: string[] }
    - Invariant: ids map to files at `game/scenes/<id>.json`

- `/src/types/entity.ts`
  - `PropertyDefinitionSchema` — entity property schema
    - Keys: name, type, default, constraints{}
    - Types: string, number, boolean, assetRef
  - `PropertyConstraintsSchema` — validation rules
    - Keys: min, max, minLength, maxLength, pattern, assetType

### Storage Schemas (Tracks 2-3)

- `/src/storage/hot.ts`
  - `EditorStateSchema` — persisted editor state
    - Keys: currentSceneId, currentTool, intent, domain, payload{}, editorMode, rightBerryOpen, leftBerryOpen, activeLayer, assetRegistry{}, repoAssetManifest{}, selectedTile{}, selectedEntityType, selectedEntityIds[], selectedPropSpriteIds[], brushSize, entitySnapToGrid, viewport{}, panelStates{}, recentTiles[], layerVisibility{}, layerLocks{}, contentVersionToken
    - Apply mode: live (restored on load)
    - `activeLayer`: 'ground' | 'props' | 'collision' | 'triggers' (default: 'ground')
    - `rightBerryOpen`: boolean (default: false)
    - `leftBerryOpen`: boolean (default: false)
    - `assetRegistry`: AssetRegistryState (default: groups + empty selection)
    - `selectedTile`: { category: string, index: number } | null (default: null)
    - `layerVisibility`: Record<LayerType, boolean> (default: all true)
    - `layerLocks`: Record<LayerType, boolean> (default: all false)
  - `HotProjectSchema` — IndexedDB project record
    - Keys: project (ProjectSchema), lastSaved, lastDeployedSha{}, coldBaseline?{project{etag,lastModified},checkedAt}

- `/src/storage/cold.ts`
  - `FreshnessCheckSchema` — remote file state
    - Keys: etag, lastModified, sha
  - `RepoAssetManifest` — scanned repo asset folders
    - Keys: scannedAt, groups[]

### Editor UI Schemas (Tracks 5-9)

- `/src/editor/panels/bottomPanel.ts`
  - `IntentType` — primary intent list
    - Values: place, interact, remove
    - Invariant: exactly one intent active at a time
  - `ToolType` — legacy tool list (for mode mapping)
    - Values: select, paint, erase, entity

### Editor Core Modules

- `/src/editor/core/editorMode.ts`
  - `EditorMode` — primary editing state
    - Values: select, ground, props, entities, collision, triggers
    - Invariant: single source of truth for editing context

- `/src/editor/core/featureFlags.ts`
  - `EDITOR_FLAGS` — feature flag registry for editor behavior
    - Invariant: keys are stable across releases

- `/src/editor/core/modeMapping.ts`
  - `MODE_TO_LAYER` — mode to legacy layer mapping
    - Invariant: select/entities map to null layer
  - `MODE_TO_TOOL` — mode to legacy tool mapping
    - Invariant: select -> select, entities -> entity

- `/src/editor/core/tabRegistry.ts`
  - `TabRegistry.leftBerryTabs` — plugin registry for left berry tabs
    - Invariant: plugin IDs are unique; registry insertion order controls tab order

- `/src/editor/core/eventBus.ts`
  - `EditorEventMap` — canonical editor UI intent and state event contracts
    - Invariant: event names remain stable; payload shapes stay backwards-compatible

- `/src/editor/panels/rightBerryTabs.ts`
  - `RIGHT_BERRY_TABS` — right berry mode tab definitions
    - Invariant: order matches editor mode order

- `/src/editor/panels/leftBerryTabs.ts`
  - `LEFT_BERRY_TABS` — left berry asset workflow tabs
    - Invariant: order matches left berry navigation (Sprites, Animation, Assets, Tools, Presets)

- `/src/editor/panels/leftBerryPlugins.ts`
  - `createDefaultLeftBerryPlugins` — default left berry plugin order
    - Invariant: default order remains Sprites, Animation, Assets, Tools, Presets

- `/src/editor/presets/presetConfigStore.ts`
  - `PresetConfigStore` — editor preset config mutations + subscriptions
    - Invariant: writes/reads PresetSavedConfig from hot storage; changes auto-save

- `/src/editor/presets/presetsTab.ts`
  - `CATEGORY_META` — canonical dashboard category order + labels/icons
    - Invariant: order stays controls, movement, camera, animation for consistent UI

- `/src/editor/presets/categoryDetail.ts`
  - `CATEGORY_LABELS` — category title lookup for detail header
    - Invariant: keys match PresetCategoryId set (controls, movement, camera, animation)

- `/src/editor/presets/blocklyHooksTab.ts`
  - `BlockTypeResolution` — deterministic hook→block type mapping
    - Invariant: events=`inrepo_when_<eventId>`, commands=`inrepo_do_<commandId>`, state=`inrepo_get_<stateId>`

- `/src/editor/assets/assetRegistry.ts`
  - `AssetRegistryState` — grouped asset library state
    - Keys: groups[], selectedAssetId, animations[], animationSets[]
    - Apply mode: live
  - `AssetEntry` — asset metadata stored in groups
    - Keys: id, name, type, source, dataUrl, width, height, createdAt
  - `AssetEntrySource` — asset origin
    - Values: local, repo
  - `AnimationAsset` — animation metadata stored in registry
    - Keys: id, name, frames[], fps, loopMode, pivot, posterDataUrl?, createdAt
  - `AnimationFrameRef` — frame slice metadata
    - Keys: sourceAssetId, rect{x,y,w,h}, offset?
  - `AnimationLoopMode` — animation looping behavior
    - Values: loop, once, pingpong
  - `AnimationSetAsset` — directional animation-set metadata
    - Keys: id, name, directions{down?,up?,left?,right?}, createdAt

- `/src/editor/assets/assetGroup.ts`
  - `AssetGroupType` — asset grouping buckets
    - Values: tilesets, props, entities
  - `DEFAULT_ASSET_GROUPS` — baseline asset groups per type
    - Apply mode: live
  - `ASSET_GROUP_PATHS` — canonical repo asset roots
    - Keys: tilesets, props, entities

- `/src/editor/tools/selectTypes.ts`
  - `SelectToolMode` — selection tool sub-states
    - Values: idle, selecting, selected, moving, pasting

### Entity System (Track 20)

- `/src/editor/entities/entityManager.ts`
  - `EntityManager` — entity CRUD operations interface
    - Methods: addEntity, addEntityInstance, getEntity, getEntities, removeEntities, moveEntities, updateEntityProperties, duplicateEntities
    - Invariant: entity IDs unique within scene

- `/src/editor/entities/entitySelection.ts`
  - `EntitySelectionState` — entity selection tracking
    - Keys: selectedIds[]
    - Apply mode: live

- `/src/editor/panels/propertyInspector.ts`
  - `PropertyInspectorConfig` — property inspector wiring for entity edits
    - Apply mode: live

### Editor History (Track 16)

- `/src/editor/history/operations.ts`
  - `OperationType` — undo/redo operation categories
    - Values: paint, erase, move, delete, paste, fill, composite, entity_add, entity_delete, entity_move, entity_duplicate, entity_property_change

- `/src/editor/canvas/viewport.ts`
  - `ViewportState` — pan/zoom state (re-exported from storage/hot.ts)
    - Keys: panX, panY, zoom
    - Invariant: zoom between MIN_ZOOM (0.25) and MAX_ZOOM (4.0)
    - Apply mode: live

- `/src/editor/canvas/grid.ts`
  - `GridConfig` — grid display settings (internal, not persisted yet)
    - Keys: visible, color, opacity, lineWidth
    - Apply mode: live
    - Note: Will be persisted via EditorSettingsSchema in Track 28

- `/src/editor/settings/editorSettings.ts`
  - `EditorSettingsSchema` — user preferences
    - Keys: gridVisible, gridColor, gridOpacity, touchOffset, theme, autoSaveFrequency
    - Apply mode: live

### Deploy Schemas (Tracks 12-13)

- `/src/deploy/auth.ts`
  - `AuthStateSchema` — GitHub auth state
    - Keys: username, scopes[], isPersistent, isAuthenticated
    - Invariant: token never logged or exposed

- `/src/deploy/tokenStorage.ts`
  - `StorageKeys` — storage keys for GitHub token persistence
    - Keys: sessionStorage key, IndexedDB name/store/key

- `/src/deploy/shaManager.ts`
  - `ShaEntrySchema` — per-file deploy metadata
    - Keys: sha, contentHash, updatedAt
  - `ShaStoreSchema` — persisted SHA store
    - Keys: entries{}, lastUpdated

- `/src/deploy/changeDetector.ts`
  - `FileChangeSchema` — detected change
    - Keys: path, status (added|modified|deleted), content, contentHash, localSha, encoding? (utf-8|base64)
  - `ConflictSchema` — remote conflict
    - Keys: path, localSha, remoteSha, hasConflict

- `/src/deploy/commit.ts`
  - `CommitResultSchema` — deploy commit result
    - Keys: success, path, newSha, commitSha, error

### Shared Contracts

- `/src/shared/paths.ts`
  - `ContentPathContract` — canonical repo paths for project/scenes/assets
    - Invariant: all path literals live in this module

### Runtime (Track 10)

- `/src/runtime/loader.ts`
  - `DataSourceMode` — runtime data source selector (hot | cold)
    - Invariant: playtest uses hot, deployed uses cold

### Game API Contract (Track 31)

- `/src/types/gameApi.ts`
  - `ApiContext` — top-level Game API shape
    - Keys: meta, events, time, log, entities, presets, call(), on(), read()
    - Invariant: scene-scoped (one per playable Scene, disposed on shutdown)
    - Invariant: Blockly scripts only access this surface, never raw Phaser
  - `EventBus` — scene-scoped event pub/sub
    - Methods: on, once, off, emit, list
    - Invariant: payloads must be plain JSON
  - `TimeHelpers` — safe timer wrappers
    - Methods: after, every, clear
    - Invariant: min interval 50ms for every()
  - `LogApi` — structured logging
    - Methods: info, warn, error, event
  - `EntityHandle` — stable entity reference (read-only, no raw Phaser)
    - Keys: id, type, x, y, exists
  - `EntityLookup` — entity query surface
    - Methods: getById, getByTag, setTag, exists
  - `PresetSurface` — enabled preset modules
    - Methods: getCategory, isEnabled, activePresetId
  - `LogicTargetMeta` — identifies which Logic Target a script belongs to
    - Keys: type (game|map), id, label
  - `ApiMeta` — version + registry metadata
    - Keys: apiVersion, schemaVersion, logicTarget, categories, capabilities

### Preset Schema (Track 32)

- `/src/types/preset.ts`
  - `PresetDefinition` — full preset definition shape
    - Keys: id, category, label, description, version, knobs[], commands[], events[], state[], compatibility{}
    - Invariant: every preset must declare all four surfaces
  - `PresetCategoryId` — preset category identifiers
    - Values: controls, movement, camera, animation
  - `KnobDef` — configuration option definition
    - Keys: id, label, description, type, default, runtimeSettable?, constraints?, group?, advanced?
  - `CommandDef` — callable action definition
    - Keys: id, label, description, args[], keywords?, advanced?
  - `EventDef` — emitted signal definition
    - Keys: id, label, description, payload[], keywords?, advanced?
  - `StateDef` — readable state definition
    - Keys: id, label, description, type, keywords?, advanced?
  - `PresetSavedConfig` — persisted preset config (/game/presets.json)
    - Keys: formatVersion, profile, categories{}
    - Invariant: missing keys fall back to preset defaults

### Script Envelope + Storage (Track 33)

- `/src/types/script.ts`
  - `ScriptFile` — Blockly workspace persistence envelope
    - Keys: formatVersion, scriptId, logicTarget{}, blockly.workspace{}, generated?{}
    - Invariant: workspace JSON is source of truth, generated JS is disposable
  - `ScriptLogicTarget` — script scope metadata
    - Keys: type (game|map), mapId?, label
  - `resolveScriptPath()` — Logic Target → file path mapping
    - game → game/logic/main.json, map → game/logic/maps/<mapId>.json
  - `resolveScriptId()` — Logic Target → stable script ID
    - game → "main", map → "map:<mapId>"

- `/src/types/scriptUtils.ts`
  - `SCRIPT_FORMAT_VERSION` — current envelope format version (1)
  - `createEmptyScriptFile()` — factory for new script envelopes (on-demand creation)
  - `validateScriptFile()` — structural validation at load boundaries

- `/src/storage/scriptStorage.ts`
  - `ScriptStoreDB` — dedicated IndexedDB schema for script persistence
    - DB: inrepo-scripts, Store: scripts, Key: scriptId
    - Invariant: scriptId comes from resolveScriptId()
  - CRUD: initScriptStorage, saveScript, loadScript, deleteScript, listScriptIds, hasScript

- `/src/storage/scriptCold.ts`
  - `fetchScriptFromRepo()` — cold fetch via resolveScriptUrl()
    - Invariant: returns null on 404 (missing script is safe)
    - Invariant: validates envelope before returning

### Preset Registry + PresetManager (Track 34)

- `/src/runtime/presets/presetInstance.ts`
  - `PresetInstance` — runtime interface for live preset instances
    - Lifecycle: applyConfig → registerApi → update → dispose
    - Invariant: presets never access raw ApiContext, only PresetApiRegistrar
  - `PresetApiRegistrar` — registration surface for commands/state/events
    - Methods: registerCommand, registerState, emitEvent
  - `PresetFactory` — factory function type (PresetDefinition → PresetInstance)

- `/src/runtime/presets/presetRegistry.ts`
  - `PresetRegistry` — indexed preset definition lookup
    - Methods: getById, getByCategory, getAllDefinitions, getAllIds
    - Invariant: built at startup via import.meta.glob, immutable after
    - Invariant: invalid definitions logged and skipped

- `/src/runtime/presets/presetManager.ts`
  - `PresetManager` — lifecycle engine for preset systems
    - Lifecycle: initialize → registerApi → update → dispose
    - Invariant: game-wide / global, not Logic-Target-specific
    - Invariant: missing presets never crash (warn + skip)
    - Invariant: zero enabled presets is a valid state
  - `PresetConflict` — detected conflict between active presets

- `/src/runtime/presets/gameProfiles.ts`
  - `GAME_PROFILES` — v1 profile definitions (topdown, platformer, custom)
    - Invariant: profile IDs are stable

- `/src/runtime/presets/defs/*.ts` — v1 preset definitions
  - 7 defs: controls-topdown, controls-platformer, movement-topdown, movement-platformer, camera-follow, animation-driver, animation-entity-animator
  - Each exports: `definition: PresetDefinition` + `factory: PresetFactory`
  - Invariant: all definitions pass validatePresetDefinition()
  - Invariant: preset IDs are stable (category-prefix naming)

### SceneHost + ApiContext Runtime (Track 35)

- `/src/runtime/apiContext/eventBus.ts`
  - `createEventBus()` — scene-scoped event pub/sub implementation
    - Implements: EventBus (from gameApi.ts)
    - Returns disposable EventBus (on, once, off, emit, list, dispose)
    - Invariant: each SceneHost gets its own instance (no shared state)

- `/src/runtime/apiContext/timeHelpers.ts`
  - `createTimeHelpers()` — safe timer wrappers
    - Implements: TimeHelpers (from gameApi.ts)
    - Guardrails: min interval 50ms for every(), hard cap 64 active timers
    - Invariant: all timers auto-cancel on dispose

- `/src/runtime/apiContext/logApi.ts`
  - `createLogApi()` — structured logging with source attribution
    - Implements: LogApi (from gameApi.ts)
    - Logs include Logic Target source when available

- `/src/runtime/apiContext/entityLookup.ts`
  - `createEntityLookupStub()` — v1 stub entity lookup
    - Implements: EntityLookup (from gameApi.ts)
    - Returns empty/null for all queries (full integration future track)

- `/src/runtime/apiContext/createApiContext.ts`
  - `DisposableApiContext` — fully assembled ApiContext with dispose
    - Wires: EventBus, TimeHelpers, LogApi, EntityLookup, PresetSurface
    - Generic call/on/read delegate to PresetManager
    - Invariant: scene-scoped (one per SceneHost)

- `/src/runtime/sceneHost.ts`
  - `SceneHost` — single attach/detach point per playable scene
    - Owns: PresetManager, ScriptHost, ApiContext, Disposables[]
    - Lifecycle: construct → update → dispose
    - Invariant: dispose cleans up in reverse order (disposables, scriptHost, presets, apiContext)
    - Invariant: no shared mutable state between SceneHost instances
  - `SceneHostConfig` — configuration for attaching to a scene
    - Keys: registry, presetConfig, sceneId

- `/src/runtime/inrepoRuntime.ts`
  - `InRepoRuntime` — static attach/detach helper
    - Methods: attach, getHost, detach
    - Stores SceneHost on scene.data for retrieval
    - Auto-disposes on scene shutdown/destroy events
    - Invariant: prevents double-attach
  - `AttachOptions` — attach configuration
    - Keys: registry, presetConfig, sceneId?

### ScriptHost Engine (Track 36)

- `/src/runtime/blockly/scriptHost.ts`
  - `ScriptHost` — Blockly script execution engine
    - Lifecycle: startScript → stopScript → dispose
    - Manages multiple scripts simultaneously (Game Logic + Map Logic)
    - Invariant: one script erroring does not stop the other
    - Invariant: all disposers tracked and cleaned up on stop/dispose
    - Invariant: recursion guard (max depth 32)
  - `ScriptState` — per-script state machine
    - Values: stopped, running, error
  - `ScriptEntry` — per-script tracking
    - Keys: scriptId, logicTarget, state, disposers, errorInfo?
  - `ScriptErrorInfo` — structured error info
    - Keys: message, blockId?, stack?, logicTarget
  - Lifecycle events (emitted on shared EventBus):
    - script.starting, script.started, script.stopping, script.stopped, script.error

### Core Block Definitions (Track 38)

- `/src/runtime/blockly/blocks/events.ts`
  - `CoreBlockPack (events)` — common event hat blocks
    - Block types: `inrepo_event_scene_started`
    - Invariant: dependency is `__core` (always available, no preset needed)

- `/src/runtime/blockly/blocks/logic.ts`
  - `CoreBlockPack (logic)` — if/else, comparisons, boolean operators
    - Block types: `inrepo_logic_if`, `inrepo_logic_ifelse`, `inrepo_logic_compare`, `inrepo_logic_operation`, `inrepo_logic_negate`, `inrepo_logic_boolean`
    - Invariant: generates pure JS (no api.* calls)

- `/src/runtime/blockly/blocks/math.ts`
  - `CoreBlockPack (math)` — number, arithmetic, round, random, modulo
    - Block types: `inrepo_math_number`, `inrepo_math_arithmetic`, `inrepo_math_round`, `inrepo_math_random_int`, `inrepo_math_modulo`
    - Invariant: generates pure JS (no api.* calls)

- `/src/runtime/blockly/blocks/variables.ts`
  - `CoreBlockPack (variables)` — get/set variable
    - Block types: `inrepo_variables_get`, `inrepo_variables_set`
    - Invariant: variable names sanitized with `v_` prefix

- `/src/runtime/blockly/blocks/time.ts`
  - `CoreBlockPack (time)` — wait, every, cancel timer
    - Block types: `inrepo_time_after`, `inrepo_time_every`, `inrepo_time_cancel`
    - Invariant: uses api.time.after/every/clear from Game API

- `/src/runtime/blockly/blocks/debug.ts`
  - `CoreBlockPack (debug)` — log message, log value
    - Block types: `inrepo_debug_log`, `inrepo_debug_log_value`
    - Invariant: uses api.log from Game API

- `/src/runtime/blockly/blocks/map.ts`
  - `CoreBlockPack (map)` — map entered/exited events
    - Block types: `inrepo_event_map_entered`, `inrepo_event_map_exited`
    - Invariant: `logicTargetFilter: 'map'` (only visible for Map Logic targets)

- `/src/runtime/blockly/coreBlocks.ts`
  - `registerCoreBlocks()` — auto-discovers blocks/*.ts via import.meta.glob
    - Invariant: registered before schema-driven preset blocks
    - Invariant: safe to call multiple times (warns on duplicates)

- `/src/editor/blockly/paletteCategories.ts`
  - `PALETTE_CATEGORIES` — ordered list of palette category metadata for blocks palette (lookup)
    - Keys: events, controls, movement, camera, animation, logic, math, variables, time, debug, map
    - Invariant: order matches v1 spec (Events through Map)
    - Invariant: preset-driven categories map to BlockRegistry category IDs
    - Apply mode: live (palette re-renders on Logic Target or preset state change)

- `/src/editor/blockly/blocklyBerryTabs.ts`
  - `BLOCKLY_BERRY_TABS` — tab definitions for right berry in Blockly Mode (lookup)
    - Keys: blocks, inspect
    - Apply mode: live (tabs render on Blockly Mode enter)

- `/src/types/workspace.ts`
  - `WorkspaceContent` — canonical local-first content bundle for project/scenes/assets/scripts/presets (schema)
    - Keys: version, project, scenes, assetRegistry, presetConfig, scripts, meta
    - Apply mode: live (consumed by deploy + runtime pack builder)
  - `EditorUIState` — UI-only persisted editor state (schema)
    - Keys: currentSceneId, currentTool, intent/domain, selection/layout fields, selectedAssetId, viewport/panel states
    - Invariant: project content payloads are excluded (assetRegistry/scripts/presetConfig not stored here)
    - Apply mode: live (editor restore)

- `/src/pack/buildProjectPack.ts`
  - `ProjectPack` — deterministic derived runtime-ready pack from WorkspaceContent (schema)
    - Keys: project, scenes, diagnostics
    - Apply mode: live (used by hot runtime and deploy serialization)

---

## Invariants checklist for schema-driven work
- Schema references only canonical keys (no orphans).
- Export/import uses one canonical key set and round-trips cleanly.
- "Requires apply/rebuild" settings have an explicit apply hook or an explicit button (no silent no-ops).
- Excluded and complex/structured settings stay hidden unless explicitly requested.

Minimum verification before merging:
- One toggle truly disables (writes the correct type + behavior reflects it).
- One apply-required setting truly applies (hook or button).
- Export → import restores values without key loss.

---

## File-level template: SCHEMA INVENTORY (agents must update)

Add this near the top of any file that owns a list-of-truth.
Keep it short: names + what they drive + apply semantics.

### TypeScript

```ts
/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: <1 line>
 *
 * Defines:
 * - <n> — <what it drives> (type: schema|defaults|lookup|form-model|json-shape)
 *
 * Canonical key set:
 * - Keys come from: <source-of-truth>
 * - Export/Import policy: <same key set?> <excluded keys?>
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live | requires apply | requires rebuild | restart-only
 * - Apply hook: <function/event>
 *
 * Excluded / not exposed:
 * - <key/list> — <reason>
 *
 * Verification (minimum):
 * - [ ] No orphan keys (schema ↔ defaults consistent)
 * - [ ] Export→Import round-trip works
 * - [ ] One apply-required setting actually applies
 */
```
