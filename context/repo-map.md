# Repo Map (Module Map)

Purpose:
- High-level map of the major modules and how they connect.
- Not a full file list (that's `INDEX.md`).

Rules:
- Keep entries short (2–6 bullets).
- Update when module boundaries or responsibilities change.

---

## Agent instruction layers
- Root `/AGENTS.md` defines global rules and invariants.
- Local `AGENTS.md` files exist in key folders; agents must read the nearest one before editing files there.
- If local rules conflict with root rules, stop and report the conflict (root wins unless explicitly overridden).

Local instruction files (present):
- `src/boot/AGENTS.md` (mode routing + GitHub Pages base path notes)
- `src/types/AGENTS.md` (schemas + format stability)
- `src/storage/AGENTS.md` (hot/cold storage boundaries + quotas + export)
- `src/editor/AGENTS.md` (editor-only state + UI patterns)
- `src/editor/canvas/AGENTS.md` (touch input + coordinate transforms)
- `src/editor/tools/AGENTS.md` (tool contracts + undo/redo)
- `src/editor/panels/AGENTS.md` (bottom sheets + inspectors + deploy panel UX)
- `src/runtime/AGENTS.md` (runtime loader constraints)
- `src/deploy/AGENTS.md` (PAT + deploy + SHA conflict checks)
- `game/AGENTS.md` (content folder conventions)


## Top-level
- `AGENTS.md`
  - Role: agent rules + workflow gates
- `INDEX.md`
  - Role: full file inventory + lists-of-truth names

## Context
- `context/schema-registry.md`
  - Role: canonical inventory of schema-like lists-of-truth
- `context/track-index.md`
  - Role: roadmap as Tracks (29 tracks defined)
- `context/planning-checklist.md`
  - Role: how to create tracks safely (spec/blueprint/plan)
- `context/workflow.md`
  - Role: lifecycle rules
- `context/product.md`
  - Role: product intent + scope boundaries
- `context/architecture.md`
  - Role: technical invariants + apply/rebuild semantics
- `context/tech-stack.md`
  - Role: tooling/build/test/deploy

## Game Data (deployed)
- `game/project.json`
  - Role: project manifest (tile categories, entity types, settings)
  - Consumers: editor, runtime
- `game/scenes/*.json`
  - Role: scene data (layers, entities)
  - Consumers: editor, runtime
- `game/assets/`
  - Role: tile images, sprites, audio
  - Consumers: editor (preview), runtime (game)

## Source Modules

### Boot (`src/boot/`)
- `main.ts`
  - Role: entry point, mode detection, initialization routing
- `modeRouter.ts`
  - Role: decides editor vs game mode, initializes accordingly

### Types (`src/types/`)
- `project.ts`
  - Role: ProjectSchema, TileCategorySchema, EntityTypeSchema
- `scene.ts`
  - Role: SceneSchema, LayerDataSchema, EntityInstanceSchema
- `entity.ts`
  - Role: PropertyDefinitionSchema, PropertyConstraintsSchema

### Storage (`src/storage/`)
- `hot.ts`
  - Role: IndexedDB operations (project, scenes, editorState)
  - Owns: EditorStateSchema, HotProjectSchema
- `cold.ts`
  - Role: fetch operations (read from repository)
  - Owns: FreshnessCheckSchema
- `migration.ts`
  - Role: cold-to-hot migration on first load

### Editor (`src/editor/`)
- `canvas/viewport.ts`
  - Role: pan, zoom, coordinate transforms
  - Owns: ViewportStateSchema
- `canvas/grid.ts`
  - Role: grid rendering
- `canvas/tileCache.ts`
  - Role: tile image loading and caching
- `canvas/renderer.ts`
  - Role: tilemap rendering with layer support, culling, and dimming
  - Owns: LAYER_RENDER_ORDER, LAYER_COLORS
- `history/`
  - Role: undo/redo stack, operation definitions, grouping
- `panels/topPanel.ts`
  - Role: scene selector, layer switcher, deploy button
- `panels/bottomPanel.ts`
  - Role: toolbar, tile picker, entity palette, inspector
- `panels/bottomContextStrip.ts`
  - Role: bottom bar context actions for selection
- `tools/paint.ts`
  - Role: tile painting logic
- `tools/erase.ts`
  - Role: tile erasing logic
- `tools/select.ts`
  - Role: selection and manipulation
- `tools/entity.ts`
  - Role: entity placement and editing
- `panels/propertyInspector.ts`
  - Role: entity property editing UI
- `v2/`
  - Role: Editor V2 state + feature flags
- `settings/editorSettings.ts`
  - Role: user preferences
  - Owns: EditorSettingsSchema

### Runtime (`src/runtime/`)
- `loader.ts`
  - Role: load project/scene from hot or cold storage
- `projectLoader.ts`
  - Role: load project data and runtime assets
- `sceneLoader.ts`
  - Role: load scene data for runtime use
- `tileMapFactory.ts`
  - Role: create Phaser tilemaps from scene data
- `entityRegistry.ts`
  - Role: manage entity type definitions
- `entitySpawner.ts`
  - Role: instantiate entities from scene data
- `sceneManager.ts`
  - Role: scene transitions

### Deploy (`src/deploy/`)
- `auth.ts`
  - Role: GitHub PAT management
  - Owns: AuthStateSchema
- `changeDetector.ts`
  - Role: detect hot vs deployed changes + conflicts
  - Owns: FileChangeSchema, ConflictSchema
- `shaManager.ts`
  - Role: SHA storage + GitHub SHA/content fetching
  - Owns: ShaStoreSchema
- `commit.ts`
  - Role: GitHub commit operations + deploy orchestration
  - Owns: CommitResultSchema
- `conflictResolver.ts`
  - Role: conflict resolution UI
- `deployUI.ts`
  - Role: deploy status/progress UI
- `assetUpload.ts`
  - Role: upload new images to repository

## Data Flow Summary

```
[User Touch]
     ↓
[Editor Tools] ←→ [Canvas/Viewport]
     ↓
[Hot Storage (IndexedDB)]
     ↓                ↓
[Playtest]        [Deploy]
     ↓                ↓
[Runtime Loader]  [GitHub API]
     ↓                ↓
[Phaser Game]    [Repository]
```
