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

- `/src/types/entity.ts`
  - `PropertyDefinitionSchema` — entity property schema
    - Keys: name, type, default, constraints{}
    - Types: string, number, boolean, assetRef
  - `PropertyConstraintsSchema` — validation rules
    - Keys: min, max, minLength, maxLength, pattern, assetType

### Storage Schemas (Tracks 2-3)

- `/src/storage/hot.ts`
  - `EditorStateSchema` — persisted editor state
    - Keys: currentSceneId, currentTool, activeLayer, selectedTile{}, viewport{}, panelStates{}, recentTiles[]
    - Apply mode: live (restored on load)
    - `activeLayer`: 'ground' | 'props' | 'collision' | 'triggers' (default: 'ground')
    - `selectedTile`: { category: string, index: number } | null (default: null)
  - `HotProjectSchema` — IndexedDB project record
    - Keys: project (ProjectSchema), lastSaved, lastDeployedSha{}

- `/src/storage/cold.ts`
  - `FreshnessCheckSchema` — remote file state
    - Keys: etag, lastModified, sha

### Editor UI Schemas (Tracks 5-9)

- `/src/editor/panels/bottomPanel.ts`
  - `ToolList` — available tools
    - Values: select, paint, erase, entity
    - Invariant: exactly one tool active at a time

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
    - Keys: token, username, scopes[], persistToken
    - Invariant: token never logged or exposed

- `/src/deploy/commit.ts`
  - `FileChangeSchema` — detected change
    - Keys: path, oldSha, newContent, status (added|modified|deleted)
  - `ConflictSchema` — remote conflict
    - Keys: path, localSha, remoteSha, resolution (overwrite|pull|skip)

### Runtime (Track 10)

- `/src/runtime/loader.ts`
  - `DataSourceMode` — runtime data source selector (hot | cold)
    - Invariant: playtest uses hot, deployed uses cold

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
