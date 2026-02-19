# Track 42 — Inspect/Errors Panel + Integration Polish — Blueprint

## Technical Design

### Architecture overview

Track 42 adds the **Inspect/Errors tab** as the second tab in the right berry when Blockly Mode is active, and wires it to live ScriptHost events via the cockpit. It also closes any gaps in the edit → run → inspect → stop cycle.

The Inspect panel is a passive subscriber — it does not own or control ScriptHost; it only observes state that ScriptHost emits. All subscriptions are managed by `blocklyCockpit.ts`, which is the single orchestrator that holds references to both the workspace and the runtime.

### Key design decisions

1. **Inspect panel as a push-fed view**: `inspectPanel.ts` renders a DOM panel but holds no internal timers or polling. The cockpit pushes state updates to it via a controller API (`update(state: InspectState)`). This makes it easy to test and ensures no stale subscriptions.

2. **InspectState shape**:
```ts
interface ScriptInspectEntry {
  logicTarget: string;           // e.g. "Game Logic" | "Map: forest"
  status: 'running' | 'stopped' | 'error';
  errorMessage?: string;
  errorBlockId?: string;
  activeTimerCount: number;
}

interface InspectState {
  scripts: ScriptInspectEntry[];
  logs: LogEntry[];              // Last 100 entries, newest last
}

interface LogEntry {
  timestamp: number;
  logicTarget: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}
```

3. **Block highlight bridge**: `inspectPanel.ts` accepts a `onHighlightBlock(blockId: string): void` callback from the cockpit. The cockpit forwards this to `workspaceManager.highlightBlock(id)`, which wraps `Blockly.getMainWorkspace()?.highlightBlock(id)` and scrolls the block into view if possible.

4. **Log interception**: The cockpit patches the `api.log` adapter (in `logApi.ts`) to also push entries to an in-memory ring buffer (max 100). The Inspect panel reads from this buffer when mounting and subscribes to new entries while visible.

5. **BLOCKLY_BERRY_TABS update**: `blocklyBerryTabs.ts` already defines `BLOCKLY_BERRY_TABS` with a placeholder Inspect tab. This track replaces the placeholder content with the real `inspectPanel.ts` component.

### Files touched / created

#### New files

- **`/src/editor/blockly/inspectPanel.ts`**
  - `createInspectPanel(container, opts): InspectPanelController`
  - Renders: status strip, error section, timer count, log list
  - Controller: `update(state: InspectState)`, `destroy()`
  - "Highlight block" button fires `opts.onHighlightBlock(blockId)`

#### Modified files

- **`/src/editor/blockly/blocklyCockpit.ts`**
  - Subscribe to ScriptHost lifecycle events on enter Blockly Mode
  - Unsubscribe on exit Blockly Mode
  - Maintain local `InspectState` snapshot; push to Inspect panel on changes
  - Patch log buffer interception
  - Wire `onHighlightBlock` callback → `workspaceManager.highlightBlock(id)`
  - Replace right berry Tab 2 placeholder with `createInspectPanel()`

- **`/src/editor/blockly/workspaceManager.ts`**
  - Add `highlightBlock(blockId: string): void` — wraps Blockly highlight API + scroll into view

- **`/src/editor/blockly/blocklyTopBar.ts`**
  - Ensure Run/Stop button state subscribes to ScriptHost state changes (not just click events)
  - Add `setScriptStatus(status: 'running' | 'stopped' | 'error')` method

- **`/src/editor/blockly/index.ts`**
  - Export `InspectPanelController`, `InspectState`, `ScriptInspectEntry`, `LogEntry`

- **`INDEX.md`** — add `inspectPanel.ts` entry

- **`context/schema-registry.md`** — add `InspectState`, `ScriptInspectEntry`, `LogEntry` if needed

- **`context/active-track.md`** — update on completion

- **`context/history.md`** — append Track 42 entry on completion

### State flow

```
ScriptHost emits:
  script.started  → cockpit updates InspectState → pushes to panel
  script.stopped  → cockpit updates InspectState → pushes to panel
  script.error    → cockpit updates InspectState (errorMessage, blockId) → pushes to panel

api.log call →
  logApi intercept → append to ring buffer (max 100) →
  if panel is mounted: panel.appendLog(entry)

User taps "Highlight block" →
  inspectPanel fires onHighlightBlock(blockId) →
  cockpit calls workspaceManager.highlightBlock(blockId) →
  workspaceManager calls Blockly.getMainWorkspace()?.highlightBlock(id) + scroll
```

### Log ring buffer

- Max 100 entries. When full, drop oldest (index 0).
- Buffer lives in `blocklyCockpit.ts` (cleared on cockpit destroy).
- `createInspectPanel()` receives the initial buffer snapshot at mount time.
- New entries are pushed to the panel via `controller.appendLog(entry)` while mounted.

### Run/Stop button reliability fix

Current state: Run/Stop buttons update on click only.

Fix: `blocklyTopBar.ts` exposes `setScriptStatus(status)`. The cockpit calls this whenever ScriptHost state changes (not just on user click). This ensures the button state is always in sync, including when a script errors mid-run.

### Integration edge cases

| Scenario | Expected behaviour |
|---|---|
| Exit Blockly Mode while script running | Cockpit unsubscribes, script keeps running; on re-enter, re-subscribe and re-sync status |
| Script errors while Inspect tab not active | Error state stored; visible immediately when user switches to Inspect tab |
| Switch Logic Target while script running | Running script continues; new target shows Stopped (unless it was also running) |
| Re-enter Blockly Mode after scene reload | New ScriptHost instance — cockpit re-subscribes to new instance |
| Both targets error simultaneously | Both shown in status strip with independent error messages |

### Risks and mitigations

- **ScriptHost replacement on scene reload**: cockpit must hold a ref to the current ScriptHost and re-subscribe when it is replaced. Guard with a `currentScriptHost !== newScriptHost` check before subscribing.
- **`highlightBlock` scroll behavior**: Blockly does not scroll to highlighted blocks by default. Use `workspace.centerOnBlock(id)` before `highlightBlock(id)`. If block ID is unknown (stale), catch and log a warning rather than throwing.
- **Log volume on hot loops**: if a script logs every frame (via a timer at <100ms), the log buffer will fill quickly. The 100-entry cap prevents DOM bloat; the 50ms timer minimum guardrail in `timeHelpers.ts` mitigates the root cause.
