# Track 42 — Inspect/Errors Panel + Integration Polish — Plan

## Phase 1 — Inspect Panel Component + Log Buffer

**Goal**: Build the Inspect panel UI component and log ring buffer in isolation, before wiring to live script events.

### Tasks

- [ ] Create `/src/editor/blockly/inspectPanel.ts`
  - `createInspectPanel(container, opts): InspectPanelController`
  - Render: status strip (per-script status icon + label), error section (message + blockId + "Highlight block" button), active timer count, log list (scrollable, auto-scroll on append)
  - Implement `update(state: InspectState)` — full state replace + re-render
  - Implement `appendLog(entry: LogEntry)` — append single entry, scroll to bottom
  - Implement `destroy()` — remove DOM, clear listeners
  - "Highlight block" button fires `opts.onHighlightBlock(blockId)` (no-op if not set)
  - Log list capped at 100 displayed entries
  - Mobile-first: touch targets ≥ 44px, dark theme matching right berry palette
- [ ] Define `InspectState`, `ScriptInspectEntry`, `LogEntry` types (add to `/src/types/` or inline in inspectPanel.ts — choose based on whether runtime will also need them)
- [ ] Update `/src/editor/blockly/index.ts` to export the new types and controller
- [ ] Update `INDEX.md` with `inspectPanel.ts` entry

### Files touched
- `src/editor/blockly/inspectPanel.ts` (NEW)
- `src/editor/blockly/index.ts`
- `INDEX.md`

### Verification
- [ ] Panel renders correctly with mock `InspectState` (one running, one error)
- [ ] `update()` correctly reflects status changes (Running → Error → Stopped)
- [ ] Log list appends and auto-scrolls
- [ ] "Highlight block" callback fires with correct blockId
- [ ] `tsc --noEmit` passes
- [ ] Touch targets ≥ 44px (eyeball check)

### Stop point — review panel output before wiring to runtime ✋

---

## Phase 2 — WorkspaceManager Highlight + TopBar Status Sync

**Goal**: Add the `highlightBlock` API to the workspace and fix Run/Stop button reliability.

### Tasks

- [ ] Add `highlightBlock(blockId: string): void` to `workspaceManager.ts`
  - Call `workspace.centerOnBlock(id)` then `workspace.highlightBlock(id)` (or `Blockly.getMainWorkspace()?`)
  - Catch unknown blockId gracefully — log a warning, do not throw
  - Clear highlight on `clearHighlight()` (also add this method)
- [ ] Add `setScriptStatus(status: 'running' | 'stopped' | 'error'): void` to `blocklyTopBar.ts`
  - Updates Run/Stop button state (Run enabled when stopped/error; Stop enabled when running)
  - Updates status indicator color (green = running, grey = stopped, red = error)
  - This replaces the current click-only state management

### Files touched
- `src/editor/blockly/workspaceManager.ts`
- `src/editor/blockly/blocklyTopBar.ts`

### Verification
- [ ] `highlightBlock()` with a valid block ID highlights and scrolls to it in the workspace
- [ ] `highlightBlock()` with an unknown ID logs a warning and does not throw
- [ ] `setScriptStatus('running')` disables Run, enables Stop, shows green indicator
- [ ] `setScriptStatus('stopped')` enables Run, disables Stop, shows grey indicator
- [ ] `setScriptStatus('error')` enables Run, disables Stop, shows red indicator
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 3 — Cockpit Wiring + End-to-End Integration

**Goal**: Wire the Inspect panel into the cockpit, subscribe to ScriptHost events, and verify the full edit → run → inspect → stop cycle.

### Tasks

- [ ] In `blocklyCockpit.ts`:
  - Add log ring buffer (max 100 entries, `LogEntry[]`)
  - Patch `logApi` to append to ring buffer; push to Inspect panel if mounted
  - On enter Blockly Mode: subscribe to ScriptHost lifecycle events (`script.started`, `script.stopped`, `script.error`)
  - On each event: update local `InspectState` snapshot, call `inspectPanel.update(state)`, call `topBar.setScriptStatus(status)`
  - On exit Blockly Mode: unsubscribe from ScriptHost events, clear ring buffer
  - Replace right berry Tab 2 placeholder content with `createInspectPanel(container, { onHighlightBlock })`
  - Wire `onHighlightBlock` → `workspaceManager.highlightBlock(id)`
  - Guard against ScriptHost replacement: if ScriptHost instance changes, unsubscribe from old and subscribe to new
- [ ] Verify edge cases:
  - Exit Blockly Mode while script running → re-enter → status re-syncs
  - Script errors while Inspect tab not active → error visible on switch
  - Both Logic Targets error → both shown in status strip independently

### Files touched
- `src/editor/blockly/blocklyCockpit.ts`

### Verification
- [ ] Run a script → status strip shows "Running"
- [ ] Stop a script → status strip shows "Stopped"
- [ ] Trigger a script error → status strip shows "Error" + error message + block ID shown in panel
- [ ] Tap "Highlight block" → workspace scrolls to and highlights the error block
- [ ] Log entries from `api.log` appear in the panel log list
- [ ] Exit Blockly Mode and re-enter → no stale state, correct status shown
- [ ] Run/Stop buttons in top bar always reflect actual ScriptHost state
- [ ] `npm run build` succeeds
- [ ] Test on mobile (or mobile-width browser) — Inspect tab scrolls and is readable

### Stop point ✋

---

## Phase 4 — Closeout

**Goal**: Update all inventory docs and close the track.

### Tasks

- [ ] Update `context/schema-registry.md` if `InspectState` / `LogEntry` were added to `/src/types/`
- [ ] Update `context/active-track.md` — clear active track
- [ ] Append Track 42 entry to `context/history.md` using the Entry Template
- [ ] Confirm `INDEX.md` is complete (all new files listed)
- [ ] Confirm `context/track-index.md` marks Track 42 complete

### Files touched
- `context/schema-registry.md` (if types added)
- `context/active-track.md`
- `context/history.md`
- `INDEX.md` (confirm)
- `context/track-index.md`

### Verification
- [ ] `context/active-track.md` no longer points to Track 42
- [ ] History entry exists for Track 42 with shipped files listed
- [ ] No orphaned files (files on disk not in INDEX.md)

### Stop point — Phase 5 complete ✋
