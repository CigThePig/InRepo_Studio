# InRepo Studio Repository Audit (Reality-Based)

## A) Repo Map (Reality-Based)

### App entry points
- Browser entry is `index.html` loading `/src/boot/main.ts`.
- Boot routing happens in `src/boot/main.ts` + `src/boot/modeRouter.ts`:
  - `?tool=editor` → editor mode.
  - default → game mode.
  - `sessionStorage` playtest flag → playtest mode.
- Runtime startup is `src/runtime/init.ts` and creates a Phaser `RuntimeScene`.
- Editor startup is `src/editor/init.ts` and wires canvas, panels, tools, asset registry, scene manager, presets, and Blockly cockpit.

### Main runtime layers (current implementation)
- **UI/editor state layer**: `src/editor/*` (panels, canvas interactions, editor modes, tools).
- **Workspace/state persistence layer**: `src/storage/hot.ts`, `src/storage/migration.ts`, `src/storage/scriptStorage.ts`.
- **Cold/read-only repo layer**: `src/storage/cold.ts`, `src/storage/scriptCold.ts`.
- **Deploy/publish layer**: `src/deploy/changeDetector.ts`, `src/deploy/commit.ts`.
- **Runtime/game execution layer**: `src/runtime/*` (loader, project loader, scene manager, tilemap factory, scene host, script host/presets).

### Key state containers / stores
- `editorState` (UI-only state, debounced saves) in `src/editor/init.ts` and persisted by `saveEditorState` in `src/storage/hot.ts`.
- `workspaceContent` (authoritative local content bundle: project/scenes/assetRegistry/presets/scripts) loaded/saved via `loadWorkspaceContent`/`saveWorkspaceContent` in `src/storage/hot.ts`.
- `assetRegistry` (editor asset + animation + state machine metadata) in `src/editor/assets/assetRegistry.ts`.
- Runtime in-memory scene state in `src/runtime/sceneManager.ts` and Phaser scene graph.

### Hot vs cold storage flow (actual)
- **Hot**: IndexedDB (`inrepo-studio`) object stores `workspace`, `project`, `scenes`, `editorState`; separate script DB (`inrepo-scripts`).
- **Cold**: repository files fetched from `/game/*` paths via `resolveGamePath`/`resolveScriptUrl`.
- Boot calls `initHotStorage()`, then if no hot data `migrateFromCold()` seeds hot from cold.
- Playtest forces hot loader (`createUnifiedLoader('hot')`) and runs runtime from hot content.
- Deploy detects diffs from hot pack output and commits to GitHub repo paths (`game/project.json`, `game/scenes/*.json`, `game/logic/...`, `game/presets.json`, assets).

---

## B) Critical User Flows (and where they break)

### 1) Open project / bootstrap
**Steps**
1. `index.html` loads `src/boot/main.ts`.
2. Boot initializes IndexedDB, optionally reset/migrate.
3. Editor mode: `initEditor()` loads workspace + editor state.
4. Project + scene are loaded and normalized (`ensureSceneTilesets`).
5. Canvas/panels/tools mount.

**Touched modules/files**
- `index.html`, `src/boot/main.ts`, `src/boot/modeRouter.ts`
- `src/storage/hot.ts`, `src/storage/migration.ts`, `src/storage/cold.ts`
- `src/editor/init.ts`

**Failure points**
- Save debounce is async and not explicitly flushed on tab close/background; recent edits can be dropped if app is killed before debounce completes.
- If migration partially fails, boot continues with mixed defaults + partial repo data; recovery path is mostly console logs.

### 2) Import assets (spritesheet/atlas + individual)
**Steps**
1. User imports/slices via editor panels (`spriteSlicerTab` / animation tab frame import).
2. Assets are inserted into `assetRegistry` groups.
3. Atlas metadata is rehydrated and later compiled to project pack on deploy.

**Touched modules/files**
- `src/editor/panels/spriteSlicerTab.ts`
- `src/editor/assets/assetRegistry.ts`, `src/editor/assets/spriteAtlasRehydrate.ts`, `src/editor/assets/atlasImporter.ts`
- `src/pack/buildProjectPack.ts`

**Failure points**
- Large images are decoded in-browser without explicit memory guardrails/chunking; mobile can stall/OOM.
- Registry is mutable and broad; malformed group/slice relationships can silently become diagnostics only at pack-build time.

### 3) Place tiles / props / entities
**Steps**
1. Domain/tool set in editor state (`ground|props|entities|collision|triggers`).
2. Canvas gestures dispatch tool events.
3. Tools mutate scene/selection state.
4. Debounced `saveScene()` + `saveEditorState()`.

**Touched modules/files**
- `src/editor/init.ts`
- `src/editor/canvas/Canvas.ts`, `src/editor/canvas/gestures.ts`
- `src/editor/tools/paint.ts`, `src/editor/tools/select.ts`, `src/editor/tools/entity.ts`, `src/editor/tools/propSprite.ts`

**Failure points**
- Collision/trigger layers are painted but runtime treats them as visual overlays only (no gameplay hooks/physics/triggers).
- Mixed mutable state + debounced persistence increases data-loss window on mobile process death.

### 4) Create animation
**Steps**
1. Animation tab loads source asset(s).
2. Frames assembled/sliced/imported.
3. `saveAnimation()` writes animation asset into `assetRegistry`.

**Touched modules/files**
- `src/editor/panels/animationTab.ts`
- `src/editor/assets/assetRegistry.ts`

**Failure points**
- Save UX is local-only to registry; integrity errors surface later when building runtime pack.
- No strong pre-save validation that all frames resolve to deployable atlas slices.

### 5) Apply animation to entity
**Steps**
1. Animation tab `attachToSelectedEntity()` writes `animationId` + default state to selected entity properties.
2. Entity tab also has animation dropdown interaction.

**Touched modules/files**
- `src/editor/panels/animationTab.ts`
- `src/editor/panels/entitiesTab.ts`
- Runtime consumption in presets (`entity-animation`) and scene spawn/runtime env.

**Reality check**
- This is currently possible, but behavior depends on preset/runtime wiring and property conventions.

**Failure points**
- Attachment uses property keys; missing/invalid runtime preset config can make assignment appear successful in editor but inert in playtest.

### 6) Playtest / runtime preview
**Steps**
1. Editor `startPlaytest()` saves current scene/editor state, sets session playtest flag.
2. Route to game URL; boot detects playtest session.
3. Runtime initializes with hot loader.

**Touched modules/files**
- `src/editor/init.ts`
- `src/boot/modeRouter.ts`, `src/boot/main.ts`
- `src/runtime/init.ts`, `src/runtime/loader.ts`

**Failure points**
- Scene save + editor save are explicit, but workspace save is separately debounced; some recent asset/animation/script metadata can lag if not flushed.

### 7) Save / persist to repo (hot → cold)
**Steps**
1. Deploy UI triggers change detector.
2. `buildProjectPack()` compiles deploy artifacts from workspace.
3. SHA checks + conflict detection.
4. Commit writes changed files to repo.

**Touched modules/files**
- `src/deploy/changeDetector.ts`, `src/deploy/commit.ts`
- `src/pack/buildProjectPack.ts`

**Failure points**
- Conflict resolution can apply remote JSON back to local for project/scenes, but asset pulls are no-op; can leave local asset/data assumptions diverged.

### 8) Reload project and verify integrity
**Steps**
1. Boot loads hot workspace.
2. Update check compares cold freshness baseline.
3. Scene/project/asset registry rehydrate paths run.

**Touched modules/files**
- `src/storage/hot.ts`, `src/storage/migration.ts`, `src/storage/cold.ts`
- `src/editor/init.ts`, `src/editor/assets/spriteAtlasRehydrate.ts`

**Failure points**
- If workspace/script dual-store drifts (workspace vs legacy scripts DB), reconciliation logic is best-effort.
- Validation relies heavily on runtime checks + logs; user-facing repair flows are limited.

---

## C) Issue Backlog (Ranked)

### 1) Debounced saves can lose recent edits on abrupt mobile app kill
- **Severity**: P0 data-loss
- **Category**: reliability
- **Evidence**: `scheduleSave`, `scheduleSceneSave`, `scheduleWorkspaceSave` are timer-based; no explicit lifecycle flush is wired in editor init.
- **Why it matters on mobile**: Android frequently kills/backgrounds tabs aggressively.
- **Likely root cause**: write-behind debounce without pagehide/visibility flush.
- **Suggested fix (minimal first)**: add `pagehide` + `visibilitychange` best-effort flush for pending editor/scene/workspace writes.
- **Verification plan**: automate/ manual reproduce: edit, immediately background/close tab, relaunch, confirm last action persisted.

### 2) Collision/trigger editing is mostly visual; runtime gameplay hooks incomplete
- **Severity**: P1 broken feature
- **Category**: correctness
- **Evidence**: collision/triggers are paintable layers (`types/scene`, tools), runtime `tileMapFactory` renders overlays via `Graphics` rather than actual physics/trigger systems.
- **Why it matters on mobile**: users spend time authoring data that may not affect gameplay.
- **Likely root cause**: editor feature landed before runtime mechanics wiring.
- **Suggested fix**: implement minimal runtime hooks (collision body generation + trigger event emission), or hard-label as “preview-only” until wired.
- **Verification plan**: playtest scene with painted collision/trigger zones and assert movement blocking + trigger callbacks.

### 3) Workspace/script dual persistence stores increase consistency risk
- **Severity**: P1 broken feature (intermittent)
- **Category**: architecture
- **Evidence**: scripts persisted in both `workspace.scripts` and separate `inrepo-scripts` DB; sync helpers mirror between both.
- **Why it matters on mobile**: interrupted writes can desync stores; reload behavior may vary.
- **Likely root cause**: backward compatibility bridge kept long-term.
- **Suggested fix**: make workspace the sole source of truth; gate legacy mirror behind migration flag then remove.
- **Verification plan**: save/edit/delete scripts, force reload/close mid-write, ensure deterministic script set after restart.

### 4) Large image import path lacks explicit memory/size guardrails in editor-side decode flows
- **Severity**: P2 major friction
- **Category**: performance
- **Evidence**: sprite slicing/import workflows process image files directly in UI paths; no clear hard limits in slicer/import code.
- **Why it matters on mobile**: low-RAM Android devices can freeze/crash on large sheets.
- **Likely root cause**: desktop-first assumptions during decode/slicing.
- **Suggested fix**: enforce size/pixel-count limits before decode + friendly rejection toast.
- **Verification plan**: attempt imports near threshold on mobile emulator/device and confirm graceful refusal.

### 5) Runtime/editor mismatch risk for animation attachment semantics
- **Severity**: P2 major friction
- **Category**: correctness
- **Evidence**: editor writes entity properties for animation attachment; runtime behavior depends on preset category enablement and expected keys.
- **Why it matters on mobile**: users interpret missing animation playback as broken editor action.
- **Likely root cause**: loose coupling between editor property assignment and runtime preset state.
- **Suggested fix**: add immediate validation badge/toast when attached animation has no active runtime driver.
- **Verification plan**: attach animation with preset on/off and verify deterministic user feedback.

### 6) Conflict “pull” path is asymmetric for assets (no local apply)
- **Severity**: P2 major friction
- **Category**: reliability
- **Evidence**: commit conflict resolver applies remote JSON for project/scenes but explicitly no-ops for asset files.
- **Why it matters on mobile**: users may believe “pull” fully synced while local previews/assets remain stale.
- **Likely root cause**: hot storage lacks binary mirror path.
- **Suggested fix**: mark asset pull as “metadata-only” in UI + prompt refresh from cold.
- **Verification plan**: conflict scenario with changed remote assets; confirm UI warns exactly what was/was not synced.

### 7) Boot/build base-path assumptions are split between `base: './'` and runtime URL helpers
- **Severity**: P3 papercut
- **Category**: tooling
- **Evidence**: Vite config uses relative base while comments mention CI overriding for Pages; path helpers rely on `BASE_URL`.
- **Why it matters on mobile**: deep-links/bookmarks on GitHub Pages can fail subtly.
- **Likely root cause**: mixed deployment conventions.
- **Suggested fix**: standardize one Pages base strategy and assert with CI smoke test.
- **Verification plan**: run built app under repo subpath and root path, verify asset/script fetches.

### 8) Editor init is oversized orchestration module with high coupling
- **Severity**: P3 papercut (future P1 risk)
- **Category**: architecture
- **Evidence**: `src/editor/init.ts` centrally owns many concerns: state, saves, panels, tools, playtest bridge, asset scanning, scene switching.
- **Why it matters on mobile**: fragile code paths slow bug fixes for interaction regressions.
- **Likely root cause**: incremental feature growth in a single coordinator.
- **Suggested fix**: small extraction first (save coordinator + boot hydration module), no behavior changes.
- **Verification plan**: existing tests + smoke test editor bootstrap/playtest.

---

## D) Risk Register (Systemic)

1. **Write-behind persistence risk**: debounce-based autosave without lifecycle flush can drop user work.
2. **Dual persistence sources**: scripts mirrored across two DBs increase split-brain risk.
3. **Schema compile-time diagnostics not surfaced**: pack build warns in diagnostics/logs but editor UX may appear successful.
4. **Index/id coupling in sprite references**: many systems depend on category+index/tileId resolution; migration edge cases can cause silent mismatches.
5. **Large init orchestrator coupling**: broad mutable globals in editor init create hidden side effects.
6. **Runtime/editor feature parity drift**: authored data (collision/triggers/animation) can outpace runtime behavior.
7. **Asset conflict asymmetry**: pull conflict resolution updates JSON but not binaries, risking stale local reality.
8. **Mobile memory cliffs**: import/slice flows decode big images in UI thread.

---

## E) Quick Wins (1–2 day fixes)

1. Add robust save flush on `pagehide`/`visibilitychange` (highest data-safety ROI).
2. Add import hard limits (pixel count/file size) + user-facing error copy.
3. Add explicit badge in UI when collision/trigger is “editor-only preview” (until runtime hooks exist).
4. Add deploy conflict UI note for assets: “pull does not hydrate local binary cache.”
5. Add smoke test covering Pages subpath asset/script URL resolution.

---

## F) Next Investigation Tasks

1. Confirm whether Blockly workspace saves are debounced and flushed before playtest switch (inspect `src/editor/blockly/workspaceManager.ts`).
2. Trace animation runtime driver exact dependency chain (`entity-animation` preset + entity property keys).
3. Verify if any lifecycle hooks already flush pending saves in other modules (`beforeunload`, service worker, visibility hooks).
4. Measure import memory footprint on Android Chrome for typical spritesheet sizes (instrument decode + canvas allocations).
5. Audit scene/asset deletion paths for orphan references (entities referencing removed animations/assets).
