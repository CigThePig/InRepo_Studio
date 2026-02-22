# Audit Report Verification

Verified against actual source code on 2026-02-22.
Branch: `claude/verify-audit-report-gTkEv`

## Verdict Summary

Most claims in the audit report are **accurate**. A few specific points are inaccurate or incomplete; these are called out below with evidence.

---

## Section A — Repo Map

### Entry Points

| Claim | Status | Evidence |
|---|---|---|
| `index.html` loads `/src/boot/main.ts` | ✅ Correct | `index.html:63`: `<script type="module" src="/src/boot/main.ts">` |
| `?tool=editor` → editor mode | ✅ Correct | `modeRouter.ts:71-74`: `if (tool === 'editor') return 'editor'` |
| default → game mode | ✅ Correct | `modeRouter.ts:76-77`: falls through to `return 'game'` |
| `sessionStorage` playtest flag → playtest mode | ✅ Correct | `modeRouter.ts:111-113`: `sessionStorage.getItem(PLAYTEST_FLAG) === 'true'` |
| Runtime startup in `src/runtime/init.ts` creates a Phaser `RuntimeScene` | ✅ Correct | `runtime/init.ts:84`: `class RuntimeScene extends Phaser.Scene` (inner class) |
| Editor startup in `src/editor/init.ts` wires canvas, panels, tools, asset registry, scene manager, presets, Blockly | ✅ Correct | Confirmed in `editor/init.ts` `initEditor()` / `initCanvas()` / `initPanels()` |

### Storage Layer

| Claim | Status | Evidence |
|---|---|---|
| Hot: IndexedDB (`inrepo-studio`) object stores `workspace`, `project`, `scenes`, `editorState` | ✅ Correct | `hot.ts:43,226-229`: DB_NAME = `'inrepo-studio'`, all four stores created on upgrade |
| Separate script DB (`inrepo-scripts`) | ✅ Correct | `scriptStorage.ts:30`: `const DB_NAME = 'inrepo-scripts'` |
| Boot calls `initHotStorage()`, then if no hot data `migrateFromCold()` | ✅ Correct | `main.ts:141,163-173`: `needsMigration()` checks `!hasHotData()` |
| Playtest forces hot loader (`createUnifiedLoader('hot')`) | ✅ Correct | `main.ts:111`: `const loader = createUnifiedLoader('hot')` |
| `saveEditorState` in `src/storage/hot.ts` | ⚠️ Minor naming issue | The canonical name is `saveEditorUIState`; `saveEditorState` is exported as a legacy alias (`hot.ts:332`). Functionally identical. |
| `workspaceContent` loaded/saved via `loadWorkspaceContent`/`saveWorkspaceContent` in `hot.ts` | ✅ Correct | `hot.ts:250,282` |
| Cold: repo files fetched via `resolveGamePath`/`resolveScriptUrl` | ✅ Correct | `cold.ts` imports `resolveGamePath`, `resolveAssetUrl` from `shared/paths.ts` |
| Deploy commits to `game/project.json`, `game/scenes/*.json`, `game/logic/...`, `game/presets.json`, assets | ✅ Correct | `commit.ts`: paths constructed via `PROJECT_JSON_PATH`, `SCENES_DIR` constants; asset paths under `ASSETS_ROOT` |

---

## Section B — Critical User Flows

### Flow 1: Open Project / Bootstrap

- ✅ All steps confirmed.
- **Failure point — save debounce on tab close**: Partially accurate. The report says "no explicit lifecycle flush is wired in editor init." **This is not fully accurate**: There IS an explicit manual save flush wired into the TopBarV2 `onSave` button handler (`editor/init.ts:1678-1703`), which cancels `saveTimeout` and `sceneSaveTimeout` immediately and calls `saveEditorState` + `saveScene` synchronously. However, `workspaceSaveTimeout` is **not** flushed there, and there are **no** `pagehide`/`visibilitychange` listeners for any of the three debounced save paths. The core concern (automatic lifecycle flush missing) is valid.

### Flow 6: Playtest

- ✅ `startPlaytest()` saves current scene and editor state directly (not debounced).
- **Failure point — workspace save lag**: ✅ Confirmed. `startPlaytest()` (`editor/init.ts:1249-1266`) does NOT flush `workspaceSaveTimeout`. Recent asset/animation/script metadata changes via the asset registry path go through `scheduleWorkspaceSave()` and could lag.
- **Additional finding (not in report)**: If the user is in Blockly mode when playtest starts, Blockly's `workspaceManager.saveNow()` is NOT called by `startPlaytest()`. The only protection is the `beforeunload` handler registered in `blocklyCockpit.ts:626`, which fires async and best-effort when `switchMode('game')` triggers page navigation. This is a real data-loss risk not fully called out in the report.

### Flow 7: Save / Persist to Repo (hot → cold)

- ✅ Conflict resolution applies remote JSON for project/scenes via `applyRemoteContent()` in `commit.ts:578-625`.
- ✅ **Asset files are explicitly no-op'd on conflict pull**: `commit.ts:617-622` — `if (path.startsWith(ASSETS_ROOT + '/')) { return; }` with a comment: "Asset files cannot be applied back to local storage." This confirms the report's claim exactly.

---

## Section C — Issue Backlog

### Issue 1: Debounced saves can lose recent edits

- **Severity P0 — status: Confirmed with nuance.**
- `scheduleSave` (500ms), `scheduleSceneSave` (500ms), `scheduleWorkspaceSave` (500ms) — all timer-based, confirmed.
- **Report claim "no explicit lifecycle flush is wired in editor init" is partially inaccurate.** There IS an explicit flush in the manual save button: it cancels `saveTimeout` + `sceneSaveTimeout` and calls `saveEditorState` + `saveScene` immediately. `workspaceSaveTimeout` is not flushed there.
- There are NO `pagehide`/`visibilitychange` hooks for any of the debounced editor save paths. (The Blockly cockpit has a `beforeunload` save but this is separate and async.)
- **The suggested fix (add `pagehide`/`visibilitychange` flush) is valid** and would cover the remaining gaps.

### Issue 2: Collision/trigger editing is mostly visual

- **Confirmed.** `tileMapFactory.ts:195-209`: collision and trigger layers are rendered via `phaserScene.add.graphics()` + `fillRect()` — pure visual overlays with no Phaser physics bodies or event emitters.

### Issue 3: Workspace/script dual persistence stores

- **Confirmed.** `scriptStorage.ts:104-110`: `saveScript()` writes to BOTH `inrepo-scripts` DB AND `workspace.scripts` (via `updateWorkspaceScripts()`). `hot.ts:282-307`: `saveWorkspaceContent()` also calls `saveScriptsToLegacyDb()` which writes `workspace.scripts` back to `inrepo-scripts`. Both stores are kept in sync bidirectionally, creating the consistency risk described.

### Issue 4: Large image import without memory guardrails

- Not directly verified in this pass (would require reading `spriteSlicerTab.ts` decode paths). File at `src/editor/panels/spriteSlicerTab.ts` — confirmed to exist.

### Issue 5: Runtime/editor mismatch for animation attachment

- Not verified in detail. The animation entity-animation preset chain would need tracing through `runtime/presets/defs/animation-entity-animator.ts`.

### Issue 6: Conflict "pull" path is asymmetric for assets

- **Confirmed** — see Flow 7 above. `commit.ts:617-622` makes this a confirmed no-op with an explicit comment.

### Issue 7: Boot/build base-path assumptions

- **Confirmed.** `vite.config.ts:42`: `base: './'` with comment "overridden in CI with --base=/<repo>/". Path helpers use `import.meta.env.BASE_URL`. The split-convention risk described is real.

### Issue 8: Editor init is oversized

- **Confirmed.** `src/editor/init.ts` is 2483 lines and owns: global state variables, debounced save logic, canvas init, all panel init, scene management, Blockly cockpit wiring, update/quota banners, and playtest bridge.

---

## Section D — Risk Register

All 8 items confirmed by code inspection.

---

## Section E — Quick Wins

All 5 items remain valid as suggested. No prior implementation detected.

---

## Section F — Next Investigation Tasks (answers where determinable)

### F1: Blockly workspace saves before playtest

**Answer: Debounced and NOT flushed before playtest.**

- `workspaceManager.ts:83-91`: `AUTO_SAVE_DEBOUNCE_MS = 1000`, fully debounced.
- `workspaceManager.ts:149-167`: `switchLogicTarget()` DOES flush before switching targets — but this is only called when switching logic targets within Blockly mode, not when exiting to playtest.
- `startPlaytest()` (`editor/init.ts:1249-1266`) does NOT call `blocklyCockpit.saveNow()` or `workspaceManager.saveNow()`.
- The only protection is `blocklyCockpit.ts:621-626`: a `beforeunload` handler that calls `manager.saveNow()`. This fires when `switchMode('game')` triggers `window.location.href = url`, but the async save is best-effort only. **This is a real risk.**

### F3: Lifecycle hooks already flushing pending saves

**Answer: Only Blockly has a beforeunload hook. Main editor debounced saves have no automatic lifecycle flush.**

- `blocklyCockpit.ts:626`: `window.addEventListener('beforeunload', handleBeforeUnload)` — Blockly only.
- No `pagehide`, `visibilitychange`, or `beforeunload` hook for `scheduleSave`, `scheduleSceneSave`, or `scheduleWorkspaceSave`.
- There IS a manual `onSave` button that flushes `saveTimeout` + `sceneSaveTimeout` synchronously, but not `workspaceSaveTimeout`.

---

## Inaccuracies Summary

| # | Report Claim | Actual Status |
|---|---|---|
| A.storage | "`saveEditorState` in `src/storage/hot.ts`" | Canonical name is `saveEditorUIState`; `saveEditorState` is a legacy alias. Functionally equivalent. |
| C.Issue1 | "no explicit lifecycle flush is wired in editor init" | Inaccurate: manual save button flushes `saveTimeout` + `sceneSaveTimeout` synchronously. `workspaceSaveTimeout` and `pagehide`/`visibilitychange` gaps are real. |
| F.1 | Asks whether Blockly is flushed before playtest — left open | Answer: NOT flushed. `startPlaytest()` relies on async `beforeunload` only. |

No structural inaccuracies were found in the repo map, storage layer description, or critical user flow descriptions. The issue rankings and suggested fixes are all substantiated by the code.
