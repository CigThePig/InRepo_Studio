# Persistence Audit: Canonical Truth Map

**Date:** 2026-03-10
**Scope:** All persistence-related reads and writes for workspace content, project, scenes, scripts, editor UI state, cold-to-hot migration, playtest/runtime loading, and deploy flows.
**Method:** Direct code inspection of all named files plus callers and callees traced outward.

---

## 1. Executive Summary

### Intended Canonical Model
The codebase intends `inrepo-studio/workspace` (key `current`) to be the single authoritative IndexedDB record for all editable project content: project data, scenes, asset registry state, preset config, and scripts. All reads and writes are meant to go through `loadWorkspaceContent()` / `saveWorkspaceContent()` in `src/storage/hot.ts`.

### Actual Observed Model
The workspace store IS the primary read/write target, but the codebase is in an explicit transitional state. Three older persistence stores remain **actively written in normal editor use**:

1. **`inrepo-studio/project`** — still dual-written by both `saveWorkspaceContent()` and `saveProject()` during every project save.
2. **`inrepo-studio/scenes`** — still dual-written by `saveScene()` on every scene change.
3. **`inrepo-scripts/scripts`** — still the **authoritative read source** for script loading in the editor (Blockly `workspaceManager.ts` reads from `inrepo-scripts`, not from workspace), while `saveScript()` writes to BOTH `inrepo-scripts` AND `inrepo-studio/workspace.scripts` via a workspace sync path.

### Major Split-Truth Findings

| Domain | Split-Truth Type | Severity |
|--------|-----------------|----------|
| Scripts | Three-way: `inrepo-scripts` DB + `workspace.scripts` + potential divergence on writes | **Critical** |
| Scenes | Dual-write: `scenes` object store + `workspace.scenes` — reads come from workspace only | Medium |
| Project | Dual-write: `project` object store + `workspace.project` — reads come from workspace | Medium |
| Migration | Scripts have NO cold-to-hot migration path; project and scenes do | High |
| Deploy | Scripts are NOT included in the deploy change detector pack at all | High |

### Biggest Persistence Risks

1. **Scripts**: Three DBs can diverge. Editor reads from `inrepo-scripts`. `saveWorkspaceContent()` fires `saveScriptsToLegacyDb()` (full clear + rewrite to `inrepo-scripts`), which can race with concurrent `saveScript()` calls from the Blockly workspace.
2. **Cold-to-hot migration does not migrate scripts**: Any cold repo `game/logic/*.json` files are never pulled into hot storage. On first load, workspace.scripts will be empty and `inrepo-scripts` will also be empty.
3. **Scripts are not in the deploy pack**: `changeDetector.ts` builds `buildProjectPack()` which returns only `{project, scenes}`. Script files (`game/logic/...`) are never included in deploy changes.
4. **Stale scene data**: `saveScene()` still writes to the legacy `scenes` object store which is no longer a read source, creating storage waste and potential confusion during debugging.
5. **`project` store is now semi-orphaned for content**: Its `project` field mirrors workspace but is only reliable for SHA metadata (`lastDeployedSha`, `coldBaseline`).

---

## 2. Persistence Store Inventory

| DB Name | Version | Object Store | Key / Pattern | Data Domain | Purpose | Status | Classification |
|---------|---------|-------------|---------------|-------------|---------|--------|----------------|
| `inrepo-studio` | 2 | `workspace` | `"current"` | All content: project, scenes, assets, presets, scripts | Unified canonical workspace content | **Primary read/write target** | **Canonical** |
| `inrepo-studio` | 2 | `project` | `"current"` | Project JSON + SHA metadata + preset config | Legacy hot project store, kept for `lastDeployedSha`, `coldBaseline` | Dual-written on every workspace save | **Compatibility bridge (still live)** |
| `inrepo-studio` | 2 | `scenes` | scene.id | Individual Scene objects | Legacy hot scene store | Dual-written on every scene save; never read in normal flow | **Legacy but still live** |
| `inrepo-studio` | 2 | `editorState` | `"current"` | EditorUIState only | Editor UI state (no content payloads) | Active, clean read/write path | **Canonical (UI-only)** |
| `inrepo-scripts` | 1 | `scripts` | scriptId (`"main"`, `"map:X"`) | ScriptFile objects | Legacy hot script store | **Still the primary editor-side read source**; dual-written by saveScript() and saveScriptsToLegacyDb() | **Legacy but still live (critical)** |
| `inrepo-deploy` | 1 | `shaStore` | `"deploy"` | SHA + content hash per deployed file path | Deploy conflict detection and idempotency | Active during deploy only | **Canonical (deploy-only domain)** |
| Cold storage (`fetch`) | — | `/game/project.json` | — | Project JSON | Repository-published project | Read-only; source of truth for game mode | **Canonical (game mode)** |
| Cold storage (`fetch`) | — | `/game/scenes/{id}.json` | — | Scene JSON | Repository-published scenes | Read-only | **Canonical (game mode)** |
| Cold storage (`fetch`) | — | `/game/logic/*.json` | — | ScriptFile JSON | Repository-published scripts | Read-only; **NOT migrated to hot on first load** | **Canonical (game mode); orphaned from migration** |
| Cold storage (`fetch`) | — | `/game/scenes/index.json` | — | Scene ID list | Scene discovery | Read-only | **Canonical (game mode)** |

---

## 3. Domain-by-Domain Audit

### 3.1 Workspace Content

**Primary read path:**
`loadWorkspaceContent()` — `src/storage/hot.ts:250`
- Reads `inrepo-studio/workspace["current"]`
- Returns `WorkspaceContent` which contains `{version, project, scenes, assetRegistry, presetConfig, scripts, meta}`
- On-the-fly normalization: runs `ensureAtlasSliceTileIds()` and saves back if changed
- On-the-fly script upgrade: if `workspace.scripts` is empty, reads all from `inrepo-scripts` and backfills workspace (one-time upgrade path)
- If no workspace record exists at all → calls `migrateLegacyDataIfNeeded()` which reads from old `project`, `scenes`, and `editorState` stores to build workspace

**Primary write path:**
`saveWorkspaceContent()` — `src/storage/hot.ts:282`
- Writes to `inrepo-studio/workspace["current"]`
- Also calls `saveScriptsToLegacyDb()` → clears and rewrites ALL scripts to `inrepo-scripts`
- Also updates `inrepo-studio/project["current"]` if a `project` record already exists

**Fallback:** If workspace store is empty: `createDefaultWorkspaceContent()` returns in-memory default.

**Classification:** Canonical for all content, but write path has active dual-write side effects.

---

### 3.2 Project

**Primary read paths:**
- `loadProject()` — `src/storage/hot.ts:351`: calls `loadWorkspaceContent()`, returns `workspace.project`. Clean.
- `getHotProject()` — `src/storage/hot.ts:356`: reads workspace.project for content, ALSO reads `inrepo-studio/project["current"]` for SHA metadata, merges them into a `HotProject` object. This is the only legitimate reason to still read from the `project` store.
- Boot: `loadProject()` called at `src/boot/main.ts:166` to verify data exists. Reads from workspace.

**Primary write paths:**
- `saveProject()` — `src/storage/hot.ts:335`:
  1. Calls `loadWorkspaceContent()` and `saveWorkspaceContent({...workspace, project})` — workspace write
  2. Then reads `project` store and writes it again directly with the updated project — **dual-write**
- `saveWorkspaceContent()` — `src/storage/hot.ts:282`: on every workspace save, if project store exists, updates it with `{...existing, project: normalized.project, presetConfig: ..., lastSaved: now}`

**SHA metadata paths (project store only):**
- `getColdBaseline()` → `getHotProject()` → reads `project` store for `coldBaseline` field
- `setColdBaseline()` — writes only to `project` store
- `updateLastDeployedSha()` — writes only to `project` store

**Classification:**
- `workspace.project` — **Canonical** for content
- `project` store `.project` field — **Compatibility bridge** (kept for SHA fields `lastDeployedSha` and `coldBaseline`)
- `project` store — **not yet removable** because it carries SHA metadata that workspace does not

**Ambiguity risk:** `saveProject()` writes to workspace AND project store independently. If `saveWorkspaceContent()` fails partway, project store and workspace.project can diverge briefly.

---

### 3.3 Scenes

**Primary read paths:**
- `loadScene(sceneId)` — `src/storage/hot.ts:407`: reads from `workspace.scenes[sceneId]`. Does NOT touch legacy `scenes` store.
- `getAllScenes()` — `src/storage/hot.ts:412`: returns `Object.values(workspace.scenes)`. Workspace-only.
- `getAllSceneIds()` — `src/storage/hot.ts:426`: returns `Object.keys(workspace.scenes)`. Workspace-only.
- `deleteScene(sceneId)` — `src/storage/hot.ts:417`: deletes from BOTH `scenes` store AND workspace.scenes

Editor init (`src/editor/init.ts:1019`): calls `loadScene()` → reads from workspace.

**Primary write paths:**
`saveScene(scene)` — `src/storage/hot.ts:400`:
1. `database.put('scenes', scene, scene.id)` — writes to legacy `scenes` store
2. `loadWorkspaceContent()` + `saveWorkspaceContent({...workspace, scenes: {..., [scene.id]: scene}})` — writes to workspace

Every scene save is a **dual-write**. The `scenes` object store is written but never read in normal operation.

**Fallback:** Cold fetch via `fetchScene()` is only used during migration and `syncSceneFromCold()`.

**Classification:**
- `workspace.scenes` — **Canonical** (sole read source)
- `scenes` object store — **Legacy but still live** (written on every save, never read — waste + confusion risk)

---

### 3.4 Scripts

> This is the most complex domain and the highest risk split-truth zone.

**Script storage locations:**
1. `inrepo-scripts` DB → `scripts` store, keyed by `scriptId`
2. `inrepo-studio/workspace["current"].scripts` (embedded in workspace)
3. Cold repo: `game/logic/main.json`, `game/logic/maps/{id}.json`, etc.

**Primary read path in editor (Blockly):**
`loadScript(scriptId)` — `src/storage/scriptStorage.ts:117`
→ reads from `inrepo-scripts/scripts[scriptId]`
→ Does NOT read from workspace.scripts

`workspaceManager.ts:loadWorkspaceForTarget()` calls `hasScript()` + `loadScript()` → always hits `inrepo-scripts`.

**Primary write path in editor (Blockly):**
`saveScript(script)` — `src/storage/scriptStorage.ts:104`:
1. Writes to `inrepo-scripts/scripts[script.scriptId]`
2. Calls `updateWorkspaceScripts()` — opens `inrepo-studio` DB separately, gets workspace, updates `workspace.scripts[scriptId]`, saves back

This is a **dual-write on every Blockly auto-save**.

**Write path via workspace save:**
`saveWorkspaceContent()` — `src/storage/hot.ts:282`:
- Calls `saveScriptsToLegacyDb(normalized.scripts)` — `hot.ts:296`
- This calls `clearScriptStorage()` + `saveScript()` for each script
- Full clear-and-rewrite of `inrepo-scripts` on every workspace save

**Read path for workspace.scripts:**
`loadWorkspaceContent()` — `hot.ts:266`:
- If `workspace.scripts` is empty AND `inrepo-scripts` has scripts → backfills workspace.scripts (one-time upgrade path)
- Otherwise, workspace.scripts is used as-is (for non-script reads like deploy pack building)

**Cold script read path:**
`fetchScriptFromRepo()` — `src/storage/scriptCold.ts:33`
→ Used only if explicitly called; **NOT called during `migrateFromCold()`**
→ Scripts from cold repo are NEVER loaded into hot storage automatically

**Deploy path:**
`changeDetector.ts` → builds `buildProjectPack(workspace)` → returns `{project, scenes}` only.
Script files (`game/logic/*.json`) are **NOT detected as deploy changes**.
Scripts paths (`LOGIC_DIR`, `LOGIC_MAIN_PATH`, `LOGIC_MAPS_DIR`) are defined in `paths.ts` but unused by `changeDetector.ts`.

**Runtime/playtest path:**
`SceneHost` creates a `ScriptHost` but no script loading is wired into the bootstrap. The `ScriptHost.startScript()` receives a compiled `registerFn` or `jsSource` — there is no automatic loading of persisted scripts into the runtime during playtest. **Scripts do not appear to execute during playtest in current code**.

**Classification:**
- `inrepo-scripts` DB — **Legacy but still the active editor read source** (critical concern)
- `workspace.scripts` — **Intended canonical** but not yet used as primary read source by editor
- Cold `game/logic/...` — **Canonical (game mode)** but not migrated to hot
- Deploy: scripts are **orphaned from deploy** — no mechanism writes them to cold repo

**Split-truth risk:** The write ordering `saveWorkspaceContent()` → `saveScriptsToLegacyDb()` clears and rewrites `inrepo-scripts`. If a concurrent `saveScript()` from Blockly auto-save fires mid-clear, a script can be silently lost from `inrepo-scripts` while workspace.scripts retains it, causing divergence between the two stores on next editor load.

---

### 3.5 Editor UI State

**Primary read path:**
`loadEditorUIState()` / `loadEditorState()` — `src/storage/hot.ts:309`
→ reads from `inrepo-studio/editorState["current"]`
→ Merges with `DEFAULT_EDITOR_STATE` to fill missing fields (forward-compat fallback)
→ Infers `intent` from `currentTool` if missing (legacy compat)
→ Infers `domain` from legacy `editorMode` and `activeLayer` if missing

**Primary write path:**
`saveEditorUIState()` / `saveEditorState()` — `src/storage/hot.ts:325`
→ writes to `inrepo-studio/editorState["current"]` only

**Schedule:**
`scheduleSave()` in editor/init.ts — debounced 500ms after any tool/mode/layer/selection change.

**Content boundary:**
`EditorUIState` fields are intentionally UI-only: tool selection, viewport, panel states, layer visibility, selected tile/entity. No project content payloads are stored here.

**One edge case:** `EditorUIState.contentVersionToken` (a commit SHA string) is stored in editor state and used to cache-bust asset URLs. This is metadata about content version, not content itself, but it does blur the line slightly.

**Classification:**
- `editorState` store — **Canonical** for editor UI state
- Cleanly separated from content domain
- The `contentVersionToken` field is a minor boundary blur but low risk

---

## 4. Flow Map Across App Lifecycle

### 4.1 App Boot (`src/boot/main.ts`)

```
1. initHotStorage()           → opens inrepo-studio DB v2, runs migrateLegacyDataIfNeeded()
2. initScriptStorage()        → opens inrepo-scripts DB v1 (only on ?reset=1)
3. needsMigration()           → hasHotData() → checks if workspace/"current" exists
4. migrateFromCold() (if needed):
   - fetchProject()           → cold fetch /game/project.json
   - saveProject()            → writes workspace + project stores
   - discoverScenes()         → cold fetch /game/scenes/index.json
   - fetchScene() × N        → cold fetch /game/scenes/{id}.json
   - saveScene() × N         → dual-writes workspace + scenes store
   - [scripts: NOT fetched from cold]
5. loadProject()              → reads workspace.project (verify data exists)
6. routeToMode():
   - editor → bootEditor()
   - game   → bootGame() with dataSource='cold'
   - playtest → bootPlaytest() with dataSource='hot'
```

### 4.2 Editor Startup (`src/editor/init.ts:initEditor()`)

```
1. loadWorkspaceContent()     → reads inrepo-studio/workspace/"current"
2. loadEditorState()          → reads inrepo-studio/editorState/"current"
3. createAssetRegistry()      → initializes with workspace.assetRegistry
4. loadProject()              → reads workspace.project (second workspace read)
5. checkForUpdates()          → hot.getHotProject() + cold.checkFreshness() [non-destructive]
6. loadScene(sceneId)         → reads workspace.scenes[sceneId]
7. ensureSceneTilesets() → saveScene() if changed  → dual-writes workspace + scenes store
8. saveEditorState()          → writes editorState store
9. scanAssetFolders() [async] → GitHub API; assetRegistry.refreshFromRepo() → scheduleWorkspaceSave()
```

### 4.3 Normal Editing and Saving

```
Tool/mode/selection change → scheduleSave() → saveEditorState() [debounced 500ms]

Scene tile paint/erase/entity → handleSceneChange(scene) → scheduleSceneSave(scene)
  → saveScene(scene) [debounced 500ms]
    → writes inrepo-studio/scenes[scene.id]  [legacy dual-write]
    → writes inrepo-studio/workspace["current"] via saveWorkspaceContent()
      → also calls saveScriptsToLegacyDb() [full clear+rewrite of inrepo-scripts]
      → also updates inrepo-studio/project["current"] if exists

Asset registry change → onChange() → scheduleWorkspaceSave()
  → saveWorkspaceContent(workspaceContent with updated assetRegistry)
    → also calls saveScriptsToLegacyDb()
    → also updates project store

Blockly workspace change → workspaceManager.debouncedSave() [1000ms]
  → saveScript(scriptFile)
    → writes inrepo-scripts/scripts[scriptId]
    → updateWorkspaceScripts() → opens inrepo-studio, updates workspace.scripts[scriptId]

Project update (after asset upload) → applyProjectUpdate() → saveProject()
  → saveWorkspaceContent({...workspace, project})
    → also calls saveScriptsToLegacyDb()
    → also updates project store
  → writes project store again directly
```

### 4.4 Playtest Mode

```
bootPlaytest():
  createUnifiedLoader('hot')
  initRuntime({ loader, dataSource: 'hot' })
    loader.loadProject() → loadWorkspaceContent() → buildProjectPack(workspace).project
    loader.loadScene(id) → loadWorkspaceContent() → buildProjectPack(workspace).scenes[id]
    loadPresetConfig() → loadWorkspaceContent() → workspace.presetConfig
    SceneHost created → ScriptHost created but NO scripts loaded into it
```

Scripts are NOT executed during playtest in current code. The runtime `ScriptHost` is instantiated but no scripts are compiled/started from hot storage.

### 4.5 Game Mode (Cold)

```
bootGame():
  initRuntime({ dataSource: 'cold' })
    loader.loadProject() → fetchProject() → cold fetch /game/project.json
    loader.loadScene(id) → fetchScene(id) → cold fetch /game/scenes/{id}.json
    presetConfig: null (game mode doesn't load from hot storage)
    SceneHost created → ScriptHost created but NO scripts loaded
```

### 4.6 Deploy/Build Flow

```
deployChanges():
  changeDetector.detectChanges():
    Phase 1: image assets from assetRegistry (local data: URLs only)
    Phase 2: buildProjectPack(workspace) → pack.project → JSON → hash → compare with SHA store
    Phase 3: pack.scenes → JSON × N → hash × N → compare with SHA store
    Phase 4: deleted files from SHA store not in current set
    [scripts: NOT included in any phase]
  detectConflicts() → user resolution
  committer.commitAtomic() → GitHub API PUT per file
  shaStore.save() → writes inrepo-deploy/shaStore/"deploy"
```

### 4.7 Migration (First Load)

See §4.1. Key points:
- `migrateFromCold()` fetches project + scenes from cold repo and writes to hot
- Scripts are NOT migrated: `workspace.scripts` starts empty, `inrepo-scripts` starts empty
- Baseline fingerprint (`coldBaseline`) is set in `project` store after successful migration

### 4.8 Cold Sync / Force Refresh

`forceRefreshFromCold()` = `clearAllData()` + `migrateFromCold()`
- Clears all four object stores in `inrepo-studio` + clears `inrepo-scripts`
- Then re-runs migration (which doesn't migrate scripts)
- Any scripts in hot storage are **permanently lost** on force refresh

`syncSceneFromCold(sceneId)` — fetches one scene from cold and `saveScene()` → dual-writes. No equivalent for scripts.

`checkForUpdates()` — etag/lastModified comparison against stored baseline. Surfaces a banner; never overwrites hot data automatically.

---

## 5. Migration and Sync Consistency Audit

### 5.1 Project: Migration vs. Later Sync

| Path | Normalization | Validation | Notes |
|------|-------------|-----------|-------|
| `migrateFromCold()` | None (cold project used as-is after `validateProject()`) | `validateProject()` | Creates default if 404 |
| `loadWorkspaceContent()` | `ensureAtlasSliceTileIds()` on read, saves back if changed | None | Live normalization on every load |
| `saveProject()` in editor | `ensureAtlasSliceTileIds()` happens at load time, not save time | None | |
| `checkForUpdates()` pull path | None | `validateProject()` before applying | Only if fingerprint changed |

**Risk:** Cold migration does NOT run `ensureAtlasSliceTileIds()`. The normalization only happens on the next `loadWorkspaceContent()` call. This means a freshly migrated workspace may have un-normalized atlas tile IDs until the editor's first read.

### 5.2 Scenes: Migration vs. Later Sync

| Path | Normalization | Validation | Notes |
|------|-------------|-----------|-------|
| `migrateFromCold()` | `ensureSceneTilesets(scene, project)` applied before `saveScene()` | `validateScene()` in `fetchScene()` | Normalizes tilesets and GIDs |
| `syncSceneFromCold(sceneId)` | **NO `ensureSceneTilesets()`** — raw scene written directly | `validateScene()` in `fetchScene()` | **Inconsistency** |
| Editor init load | `ensureSceneTilesets()` on load; `saveScene()` if changed | None at load | |

**Risk:** `syncSceneFromCold()` skips `ensureSceneTilesets()`. A scene synced via conflict resolution may have un-normalized tileset GIDs, which the editor corrects on next load — but only for the currently open scene.

### 5.3 Scripts: Migration vs. Later Sync

| Path | Normalization | Notes |
|------|-------------|-------|
| `migrateFromCold()` | Not applicable — scripts are never fetched from cold | **Gap: no cold script migration** |
| `syncSceneFromCold()` | Not applicable — no script equivalent | **Gap: no syncScriptFromCold()** |
| `saveScript()` | None | Writes raw Blockly JSON |
| `loadWorkspaceContent()` script upgrade | Reads from `inrepo-scripts` to backfill workspace if workspace.scripts empty | One-time upgrade, not ongoing sync |

**Risk:** If a user has published scripts in `game/logic/*.json` (cold repo), they are NEVER loaded into hot storage. Force refresh also loses all scripts. There is no recovery mechanism.

---

## 6. Confirmed Split-Truth Zones

### 6.1 Scripts: Three-Way Split (CRITICAL)

**Data domain:** ScriptFile objects
**Files/functions:**
- `src/storage/scriptStorage.ts:saveScript()` — writes to `inrepo-scripts` AND `workspace.scripts`
- `src/storage/hot.ts:saveWorkspaceContent()` → `saveScriptsToLegacyDb()` — clears+rewrites `inrepo-scripts` from workspace.scripts
- `src/editor/blockly/workspaceManager.ts:loadWorkspaceForTarget()` — reads exclusively from `inrepo-scripts`

**What is duplicated:**
- `inrepo-scripts/scripts[scriptId]` — legacy DB
- `inrepo-studio/workspace["current"].scripts[scriptId]` — unified workspace
- Cold: `game/logic/*.json` — never hot-migrated

**Why it is risky:**
1. Race condition: `saveWorkspaceContent()` calls `clearScriptStorage()` then re-saves scripts. A concurrent `saveScript()` can write a script that immediately gets erased by the clear.
2. The editor reads from `inrepo-scripts` (legacy). If workspace.scripts diverges (e.g., workspace saves without script data), the next editor restart reads stale `inrepo-scripts` content.
3. Scripts are excluded from both migration and deploy — they cannot be published to the repo through the normal flow, and any published scripts cannot be recovered into hot storage.

**Appears transitional:** Yes. The upgrade path in `loadWorkspaceContent()` (lines 266-277) shows intent to move scripts fully into workspace. The `saveScript()` dual-write is the scaffolding for that transition. But the transition is incomplete.

---

### 6.2 Scenes Object Store: Still Live but Unreachable as Read Source (MEDIUM)

**Data domain:** Scene objects
**Files/functions:**
- `src/storage/hot.ts:saveScene()` — writes to both `scenes` store AND workspace
- `src/storage/hot.ts:loadScene()`, `getAllScenes()` — read ONLY from workspace
- `src/storage/hot.ts:deleteScene()` — deletes from BOTH stores

**Why it is risky:**
- `scenes` object store grows with every scene save but is never read
- If a future developer reads from `scenes` directly (e.g., debugging), they will see data that may be slightly behind workspace due to write ordering
- `clearAllData()` clears both stores — consistent

**Appears transitional:** Yes, `scenes` store is a legacy residue. It will be safe to stop writing here once workspace is confirmed as the sole authoritative store.

---

### 6.3 Project Object Store: Partially Orphaned Content Field (MEDIUM)

**Data domain:** Project JSON (content) + SHA metadata
**Files/functions:**
- `src/storage/hot.ts:saveProject()` — writes workspace AND project store
- `src/storage/hot.ts:saveWorkspaceContent()` — updates project store on every workspace save
- `src/storage/hot.ts:loadProject()` — reads from workspace only
- `src/storage/hot.ts:getHotProject()` — reads workspace.project + project store `.lastDeployedSha` + `.coldBaseline`

**What is duplicated:** `project.project` field mirrors `workspace.project` entirely.
**Why it is risky:** Two independent write paths to project.project can diverge if one fails. The project store's `project` field is the least important part; the SHA metadata is what justifies keeping the store.
**Appears transitional:** Yes. The project store's content field should be removed; only `lastDeployedSha` and `coldBaseline` need to remain.

---

### 6.4 Script Deploy Gap: Orphaned from Deploy System (HIGH)

**Data domain:** ScriptFile JSON
**Files/functions:**
- `src/deploy/changeDetector.ts:createChangeDetector()` — builds pack from workspace, includes only project and scenes
- `src/shared/paths.ts` — defines `LOGIC_DIR`, `LOGIC_MAIN_PATH`, `LOGIC_MAPS_DIR` but unused by changeDetector
- `src/storage/scriptCold.ts:fetchScriptFromRepo()` — cold read path exists but is never called during migration

**What is duplicated:** Scripts have infrastructure in paths.ts and scriptCold.ts but no deploy or migration wiring.
**Why it is risky:** Any Blockly scripts saved in the editor cannot be published to the repo. A game deployed without scripts but with Blockly logic in hot storage will not reflect the author's intent. After force refresh, all scripts are lost permanently.

---

## 7. Canonical Truth Assessment

### Intended canonical sources

| Domain | Intended canonical |
|--------|-------------------|
| Project content | `inrepo-studio/workspace["current"].project` |
| Scenes | `inrepo-studio/workspace["current"].scenes` |
| Asset registry | `inrepo-studio/workspace["current"].assetRegistry` |
| Preset config | `inrepo-studio/workspace["current"].presetConfig` |
| Scripts | `inrepo-studio/workspace["current"].scripts` (intended but incomplete) |
| Editor UI state | `inrepo-studio/editorState["current"]` |
| Deploy SHA tracking | `inrepo-deploy/shaStore["deploy"]` |
| Deploy baseline/SHA | `inrepo-studio/project["current"].lastDeployedSha`, `.coldBaseline` |

### Actual canonical sources in current live behavior

| Domain | Actual canonical in live behavior |
|--------|----------------------------------|
| Project content | `workspace.project` ✓ (matches intent) |
| Scenes | `workspace.scenes` ✓ (matches intent, `scenes` store is shadow) |
| Asset registry | `workspace.assetRegistry` ✓ (matches intent) |
| Preset config | `workspace.presetConfig` ✓ (matches intent) |
| Scripts (editor reads) | **`inrepo-scripts` DB** ✗ (diverges from intent) |
| Scripts (workspace) | `workspace.scripts` — written but not used as read source by editor |
| Editor UI state | `editorState` store ✓ (matches intent) |
| SHA metadata | `project` store `.lastDeployedSha`, `.coldBaseline` ✓ |

### Contested / Ambiguous Sources

- **Scripts**: Three-way contest between `inrepo-scripts`, `workspace.scripts`, and cold repo
- **Project store `.project` field**: mirrors workspace but serves no active read purpose
- **`scenes` object store**: written but never read; should be considered zombied

### Recommended Target Architecture Direction

1. **Make `workspace.scripts` the sole canonical script store**: Update `workspaceManager.ts:loadWorkspaceForTarget()` to read from `loadWorkspaceContent().scripts` instead of `loadScript()`. Remove dual-write from `saveScript()`. Eliminate `saveScriptsToLegacyDb()`.
2. **Remove dual-write to `scenes` store**: Stop calling `database.put('scenes', ...)` in `saveScene()`. Keep `delete` for `deleteScene()` during transition.
3. **Remove `.project` field dual-write**: Keep `project` store only for `lastDeployedSha` and `coldBaseline`. Move SHA metadata to workspace or a dedicated metadata store.
4. **Wire scripts into migration**: `migrateFromCold()` should call `fetchScriptFromRepo()` for all known logic targets and populate `workspace.scripts`.
5. **Wire scripts into deploy**: `changeDetector.ts` should include `workspace.scripts` entries, generating `FileChange` records for `game/logic/*.json` paths.

---

## 8. High-Priority Future Stabilization Targets

Listed in order of impact and risk, with specific locations:

### Priority 1: Eliminate Script Three-Way Split
**Files:**
- `src/storage/scriptStorage.ts` — `saveScript()`: remove `updateWorkspaceScripts()` call; use workspace as write target only
- `src/storage/hot.ts` — `saveScriptsToLegacyDb()`: eliminate this function and its call in `saveWorkspaceContent()`
- `src/editor/blockly/workspaceManager.ts` — `loadWorkspaceForTarget()`: switch from `loadScript()` / `hasScript()` to reading `loadWorkspaceContent().scripts`
- `src/storage/hot.ts` — `loadWorkspaceContent()`: remove the script upgrade fallback path once transition is complete

### Priority 2: Add Script Migration from Cold
**File:**
- `src/storage/migration.ts` — `migrateFromCold()`: add a loop that calls `fetchScriptFromRepo()` for each expected logic target and saves into workspace.scripts

### Priority 3: Add Scripts to Deploy Change Detector
**File:**
- `src/deploy/changeDetector.ts` — `createChangeDetector().detectChanges()`: add Phase for `workspace.scripts` → serialize to `game/logic/*.json` → hash compare → `FileChange` entries

### Priority 4: Remove Zombie Scenes Object Store Writes
**File:**
- `src/storage/hot.ts` — `saveScene()`: remove `database.put('scenes', scene, scene.id)` line
- Keep `deleteScene()` delete from `scenes` store until confident no old clients depend on it

### Priority 5: Simplify Project Store to Metadata-Only
**File:**
- `src/storage/hot.ts` — `saveProject()`: remove the second `database.put('project', ...)` block
- `src/storage/hot.ts` — `saveWorkspaceContent()`: remove the project store update block (lines 298–306)
- Move `lastDeployedSha` and `coldBaseline` to workspace.meta or a dedicated metadata field

### Priority 6: Fix `syncSceneFromCold()` Normalization Gap
**File:**
- `src/storage/migration.ts` — `syncSceneFromCold()`: apply `ensureSceneTilesets(scene, project)` before `saveScene()`, consistent with `migrateFromCold()`

### Priority 7: Apply `ensureAtlasSliceTileIds()` During Migration
**File:**
- `src/storage/migration.ts` — `migrateFromCold()`: call `ensureAtlasSliceTileIds(project)` on the fetched project before `saveProject()`, so the workspace is normalized from the start

---

## 9. Open Questions / Uncertainty

### 9.1 Are scripts actually executed in playtest?

Inspecting `src/runtime/init.ts` and `src/runtime/sceneHost.ts`: `SceneHost` creates a `ScriptHost` but no code in the traced paths loads scripts from any persistence store and passes them to `ScriptHost.startScript()`. The `ScriptHost` API (`startScript()` accepting `registerFn` or `jsSource`) suggests this wiring may exist elsewhere or may not yet be implemented. This could not be confirmed from the files inspected. If scripts ARE executed, the read path and its hot-vs-cold selection must be confirmed.

### 9.2 Is `inrepo-scripts` DB used anywhere other than scriptStorage.ts and hot.ts?

A direct grep for `inrepo-scripts` and `openDB.*scripts` was not performed on the full codebase. It is possible another module opens `inrepo-scripts` directly. The audit traced all reads of `loadScript()` / `hasScript()` to `workspaceManager.ts`, which is the sole editor-side consumer found.

### 9.3 What happens to preset config in deploy?

`PresetSavedConfig` is stored in `workspace.presetConfig` and in the legacy `project` store. The deploy change detector does not appear to include a preset config file in the output pack. It is unclear whether preset config is published to the repo or kept only in local hot storage. This gap was not fully resolved in this audit.

### 9.4 Is there a `savePresetConfig` call that bypasses workspace?

`savePresetConfig()` at `hot.ts:390` calls `saveWorkspaceContent({...workspace, presetConfig: config})`. This goes through workspace and triggers the script dual-write side effect. No separate preset config store was found. This appears consistent with the canonical model.

### 9.5 What is `EditorUIState.contentVersionToken` used for exactly?

It stores a GitHub commit SHA to cache-bust asset URLs (`setContentVersionToken()` in `paths.ts`). It is restored from editor state on startup. It is NOT content, but it tracks a deployed state marker. No risk was identified, but it slightly mixes deployment metadata into editor UI state.

---

## Appendix: Files Inspected

| File | Role |
|------|------|
| `src/storage/hot.ts` | All canonical hot storage operations |
| `src/storage/cold.ts` | Cold fetch operations |
| `src/storage/migration.ts` | Cold-to-hot migration and sync |
| `src/storage/scriptStorage.ts` | Legacy script DB operations |
| `src/storage/scriptCold.ts` | Cold script fetch |
| `src/storage/index.ts` | Storage module exports |
| `src/boot/main.ts` | Boot sequence and mode routing |
| `src/runtime/init.ts` | Runtime initialization |
| `src/runtime/loader.ts` | UnifiedLoader hot/cold selection |
| `src/runtime/sceneHost.ts` | SceneHost + ScriptHost instantiation |
| `src/runtime/blockly/scriptHost.ts` | ScriptHost API |
| `src/editor/init.ts` | Editor initialization + all save schedulers |
| `src/editor/blockly/workspaceManager.ts` | Blockly script save/load orchestration |
| `src/deploy/commit.ts` | GitHub commit logic + conflict resolution |
| `src/deploy/changeDetector.ts` | Deploy change detection |
| `src/deploy/shaManager.ts` | SHA tracking DB |
| `src/pack/buildProjectPack.ts` | Workspace → deployable pack transform |
| `src/types/workspace.ts` | WorkspaceContent + EditorUIState schemas |
| `src/types/project.ts` | Project schema |
| `src/types/script.ts` | ScriptFile schema |
| `src/shared/paths.ts` | Path constants and URL resolvers |

---

*End of audit report.*
