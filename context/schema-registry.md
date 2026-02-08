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
    - Keys: id, name, width, height, tileSize, tilesets[], layers{}, entities[]
    - Invariant: layer data arrays match width × height
  - `LayerDataSchema` — tilemap layer structure
    - Keys: ground, props, collision, triggers (each a 2D array)
  - `EntityInstanceSchema` — placed entity in scene
    - Keys: id, type, x, y, properties{}
    - Invariant: type must reference valid entityType from project


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
    - Keys: currentSceneId, currentTool, intent, domain, payload{}, editorMode, rightBerryOpen, leftBerryOpen, activeLayer, assetRegistry{}, repoAssetManifest{}, selectedTile{}, selectedEntityType, selectedEntityIds[], brushSize, entitySnapToGrid, viewport{}, panelStates{}, recentTiles[], layerVisibility{}, layerLocks{}, contentVersionToken
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

### Editor V2 (Track 23)

- `/src/editor/v2/editorMode.ts`
  - `EditorMode` — primary editing state
    - Values: select, ground, props, entities, collision, triggers
    - Invariant: single source of truth for editing context

- `/src/editor/v2/featureFlags.ts`
  - `EDITOR_V2_FLAGS` — feature flag registry for V2 rollout
    - Invariant: keys are stable across releases

- `/src/editor/v2/modeMapping.ts`
  - `MODE_TO_LAYER` — V2 mode to legacy layer mapping
    - Invariant: select/entities map to null layer
  - `MODE_TO_TOOL` — V2 mode to legacy tool mapping
    - Invariant: select -> select, entities -> entity

- `/src/editor/panels/rightBerryTabs.ts`
  - `RIGHT_BERRY_TABS` — right berry mode tab definitions
    - Invariant: order matches Editor V2 mode order

- `/src/editor/panels/leftBerryTabs.ts`
  - `LEFT_BERRY_TABS` — left berry asset workflow tabs
    - Invariant: order matches left berry navigation (Sprites, Assets, Tools)

- `/src/editor/assets/assetRegistry.ts`
  - `AssetRegistryState` — grouped asset library state
    - Keys: groups[], selectedAssetId, animations[]
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

- `/src/runtime/presets/defs/*.ts` — v1 preset stub definitions
  - 6 stubs: controls-topdown, controls-platformer, movement-topdown, movement-platformer, camera-follow, animation-driver
  - Each exports: `definition: PresetDefinition` + `factory: PresetFactory`
  - Invariant: all definitions pass validatePresetDefinition()
  - Invariant: preset IDs are stable (category-prefix naming)

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
