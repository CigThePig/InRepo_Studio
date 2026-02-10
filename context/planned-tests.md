# Planned Tests (Future Debugging + Stability)

This document proposes a practical test plan for InRepo Studio. It is focused on high-value debugging protection: places where regressions are expensive (data loss, deploy conflicts, runtime breakage, Blockly drift).

## Why this plan exists

The editor has several high-risk boundaries:
- **Persistence and schema round-trip** (hot storage + JSON envelopes)
- **Deploy conflict safety** (GitHub SHA checks and no silent overwrite)
- **Editor/runtime separation** (mode routing + runtime loading)
- **Schema-driven presets/blockly coupling** (one source of truth feeding UI and blocks)

The tests below are grouped by these boundaries and intentionally emphasize **failure diagnostics** (what failed and where) so future debugging is faster.

---

## 1) Persistence + Migration Tests (Highest priority)

### 1.1 Hot storage round-trip for project/scenes/presets/scripts
- **What to test:** Save and load all major payloads (`project.json`, scenes index + scene files, `presets.json`, Blockly script envelopes).
- **Why needed:** Prevent silent data loss and drift between editor state and IndexedDB. This is the most expensive class of bug to recover from.
- **How it would work:**
  - Use Vitest with IndexedDB mocking (or idb-compatible test environment).
  - Write canonical fixtures to hot storage via `src/storage/hot.ts` and `src/storage/scriptStorage.ts`.
  - Read back and deep-compare against expected canonical structures.
  - Include tests for first-load defaults when files are missing.

### 1.2 Migration compatibility tests
- **What to test:** Migration from older hot-storage payload shapes to current schemas.
- **Why needed:** Prevent breakage for returning users after schema changes.
- **How it would work:**
  - Build fixture snapshots of prior versions.
  - Run migration entry points in `src/storage/migration.ts`.
  - Assert output validates through type/schema guards (`src/types/*` validation helpers) and preserves user content.

### 1.3 Auto-save trigger coverage
- **What to test:** Meaningful editor actions (paint, erase, entity move, preset change, Blockly save) trigger hot-storage writes.
- **Why needed:** Protect the “no data loss” invariant.
- **How it would work:**
  - Integration tests around controllers (tool actions + preset config store + Blockly workspace manager).
  - Spy on storage write calls and assert write frequency/shape.
  - Verify debounce/batching behavior if present.

---

## 2) Schema Contract Tests (Highest priority)

### 2.1 Preset definition integrity
- **What to test:** Every preset definition in `src/runtime/presets/defs/*.ts` satisfies required fields and stable IDs.
- **Why needed:** Presets power both runtime behavior and Blockly exposure; a broken schema cascades across systems.
- **How it would work:**
  - Registry-level tests against `src/runtime/presets/presetRegistry.ts`.
  - Assert category IDs and command/event/state names are unique and non-empty.
  - Validate knob defaults/type constraints.

### 2.2 Schema-driven block generation parity
- **What to test:** For each enabled preset hook, expected block types are generated and registered.
- **Why needed:** Prevent “hook exists in presets UI but no matching Blockly block” regressions.
- **How it would work:**
  - Test `src/runtime/blockly/schemaToBlocks.ts`, `blockRegistry.ts`, `codegenRules.ts` together.
  - Snapshot generated block type IDs (`inrepo_when_*`, `inrepo_do_*`, `inrepo_get_*`).
  - Assert registration and generator availability for each emitted block type.

### 2.3 Script envelope validation
- **What to test:** Logic files (`/game/logic/main.json`, `/game/logic/maps/<mapId>.json`) validate and round-trip.
- **Why needed:** Blockly workspace JSON is source of truth; envelope corruption can make scripts unrecoverable.
- **How it would work:**
  - Contract tests for `src/types/script.ts` + `src/storage/scriptStorage.ts`.
  - Parse/save/load cycles with malformed-input rejection tests.

---

## 3) Deploy + GitHub Safety Tests (High priority)

### 3.1 SHA conflict detection and handling
- **What to test:** Diverged remote SHA correctly produces conflict state and blocks silent overwrite.
- **Why needed:** Deploy safety is a core product promise; regressions here can destroy remote content.
- **How it would work:**
  - Mock GitHub API responses in tests for `src/deploy/changeDetector.ts`, `shaManager.ts`, and `commit.ts`.
  - Cover happy path, conflict path, and retry-after-refresh path.

### 3.2 Commit payload composition tests
- **What to test:** Deploy payload includes expected changed files, paths, and content encoding.
- **Why needed:** Broken payloads are hard to debug from UI symptoms alone.
- **How it would work:**
  - Unit tests over `src/deploy/commit.ts` + `assetUpload.ts` using deterministic fixtures.
  - Assert created tree entries and commit message metadata.

### 3.3 Token storage behavior
- **What to test:** PAT lifecycle (set/get/clear), session vs persistent policy, and non-leaking UI behavior.
- **Why needed:** Auth bugs break deploy flow and can become security issues.
- **How it would work:**
  - Unit tests for `src/deploy/tokenStorage.ts` and `auth.ts` with localStorage/sessionStorage fakes.
  - Verify clear paths on sign-out and invalid-token flows.

---

## 4) Editor Interaction Tests (High priority)

### 4.1 Tool behavior correctness (paint/erase/select/entity)
- **What to test:** Tool operations produce expected operation objects and scene mutations.
- **Why needed:** Editing regressions are frequent and can be subtle in visual workflows.
- **How it would work:**
  - Unit tests for `src/editor/tools/*.ts` with grid fixtures.
  - Assert operation diffs, bounds handling, and multi-layer behavior.

### 4.2 Undo/redo operation integrity
- **What to test:** Every operation type can undo and redo without drift.
- **Why needed:** History corruption can irreversibly damage editing sessions.
- **How it would work:**
  - Integration tests with `src/editor/history/historyManager.ts` and `operations.ts`.
  - Execute command sequences and assert final scene state after undo/redo cycles.

### 4.3 Touch transform and viewport math
- **What to test:** Screen-to-world/tile transforms under pan/zoom and touch offsets.
- **Why needed:** Mobile-first editing depends on accurate touch placement; these bugs are high-friction.
- **How it would work:**
  - Pure math tests for `src/editor/canvas/viewport.ts`, `touchConfig.ts`, `gestures.ts`.
  - Use parameterized cases across zoom levels and device pixel ratios.

---

## 5) Runtime Loading + SceneHost Tests (High priority)

### 5.1 Runtime boot/load contract
- **What to test:** Runtime can load project + scene + entities from hot storage fallback paths.
- **Why needed:** Prevent playtest failures after editor changes.
- **How it would work:**
  - Integration tests around `src/runtime/loader.ts`, `projectLoader.ts`, `sceneLoader.ts` with mocked storage providers.
  - Assert explicit error states for missing/invalid assets.

### 5.2 SceneHost + ScriptHost lifecycle isolation
- **What to test:** Script errors isolate to one script target and do not crash whole runtime/editor bridge.
- **Why needed:** Required invariant for Blockly safety and debuggability.
- **How it would work:**
  - Integration tests for `src/runtime/sceneHost.ts` + `src/runtime/blockly/scriptHost.ts`.
  - Inject script failures and assert per-script error state while other scripts continue.

### 5.3 Event bus + API context contract
- **What to test:** `api.on/call/read/time/log` behavior, event ordering, and unsubscribe cleanup.
- **Why needed:** This is the stable contract shared by presets and Blockly; regressions affect all scripting.
- **How it would work:**
  - Contract tests for `src/runtime/apiContext/*`.
  - Verify event delivery semantics and timer throttling/min interval guardrails.

---

## 6) UI Integration / E2E Smoke (Medium priority)

### 6.1 Core editor smoke flow
- **What to test:** Open editor, paint tiles, switch scenes, save, reload, confirm state persistence.
- **Why needed:** Fast confidence check for major regressions in CI.
- **How it would work:**
  - Browser E2E (Playwright) targeting key flows and visible state checks.
  - Use deterministic fixture project and explicit selectors.

### 6.2 Blockly mode smoke flow
- **What to test:** Switch to Blockly mode, choose Logic Target, insert blocks, save, reopen, verify workspace JSON restored.
- **Why needed:** Protects the source-of-truth workspace lifecycle.
- **How it would work:**
  - E2E flow around `src/editor/blockly/*` + storage.
  - Assert block count/types and rehydration after reload.

### 6.3 Presets UI + Blockly hooks bridge
- **What to test:** From Presets tab, open category hooks and insert a block into workspace in Blockly mode.
- **Why needed:** This is a critical cross-module bridge with high regression risk.
- **How it would work:**
  - E2E test covering left berry → hook row action → workspace block insertion.
  - Assert block type IDs and undo toast behavior for config edits.

---

## 7) Suggested execution order (phased rollout)

1. **Foundation (Week 1–2):**
   - Storage round-trip + migrations
   - Script envelope validation
   - Preset registry contract tests
2. **Safety (Week 2–3):**
   - Deploy SHA conflict and commit payload tests
   - Undo/redo + tool correctness suites
3. **Runtime contract (Week 3–4):**
   - SceneHost/ScriptHost lifecycle tests
   - API context event/timer contract tests
4. **E2E smoke (Week 4+):**
   - Editor smoke
   - Blockly smoke
   - Presets-to-Blockly bridge smoke

---

## 8) Test quality guardrails (to improve debugging value)

- Keep fixtures small and named by behavior (`project-minimal`, `scene-two-layers`, `script-error-repro`).
- Prefer explicit assertions over broad snapshots for business-critical logic.
- Add failure context in assertions (include mapId, categoryId, command/event names).
- Ensure every regression test maps to an issue/track note when possible.
- Run core suites in CI on every PR; run heavy E2E smoke at least on main merges.
