# Track 42 — Inspect/Errors Panel + Integration Polish

## Intent

Implement the Inspect/Errors tab in the right berry (Tab 2 in Blockly Mode) and perform end-to-end integration polish across the Blockly cockpit. This completes Phase 5 (Presets + Blockly) by closing the edit → run → inspect → recover loop on mobile.

Authority: `/context/Blockly_Plan_Revised.md` (Parts 8, 11–14).

## Scope

### In scope

1. **Inspect/Errors tab** (`inspectPanel.ts` in `/src/editor/blockly/`) — the right berry Tab 2 in Blockly Mode. Displays:
   - **Script status strip** — per Logic Target: status icon (Running / Stopped / Error) + label.
   - **Last error section** — error message, Logic Target name, block ID. "Highlight block" button scrolls workspace to the offending block and visually marks it.
   - **Active timer count** — how many timers are currently live for each script.
   - **Recent log entries** — last N log lines from `api.log`, with timestamp and Logic Target attribution. Auto-scrolls on new entries while visible.

2. **Block highlight bridge** — when the Inspect panel highlights a block, it calls into the workspace to select and scroll to it (`Blockly.getMainWorkspace().highlightBlock(id)`).

3. **ScriptHost ↔ Inspect wiring** — `blocklyCockpit.ts` subscribes to ScriptHost lifecycle events (`script.started`, `script.stopped`, `script.error`) and pushes state updates to the Inspect panel when it is mounted.

4. **Integration polish** — close any gaps in the full edit → run → inspect → stop cycle:
   - Run/Stop buttons update reliably when script state changes.
   - Entering/exiting Blockly Mode cleans up all subscriptions and DOM.
   - Returning to World Mode and re-entering Blockly Mode re-attaches correctly.
   - Error state in one Logic Target does not affect the other.

5. **INDEX.md + schema-registry.md updates** — reflect new file in inventory.

### Out of scope

- Full debugger (step-through, breakpoints) — post-v1.
- Variable inspector (showing live variable values) — post-v1.
- Network or Phaser scene diagnostics — post-v1.
- Automated Playwright tests for the Blockly flow (tracked in `context/planned-tests.md`).

## Acceptance criteria

- [ ] Right berry Tab 2 shows "Inspect" label in Blockly Mode
- [ ] Script status strip shows correct status (Running / Stopped / Error) for each Logic Target
- [ ] When a script errors: error message, Logic Target name, and block ID are displayed
- [ ] "Highlight block" button scrolls workspace to the offending block and marks it
- [ ] Active timer count updates live while scripts run
- [ ] Recent log panel shows `api.log` entries with Logic Target attribution
- [ ] Log auto-scrolls when new entries arrive while the panel is visible
- [ ] Run/Stop buttons in the top bar reflect actual ScriptHost state
- [ ] Stopping scripts clears the Running status (does not leave stale Running indicator)
- [ ] Error in one Logic Target does not affect the other target's status indicator
- [ ] "Stop scripts" in error state successfully stops and clears the error
- [ ] Entering Blockly Mode → editing → running → inspecting → stopping works end-to-end on mobile
- [ ] Exiting Blockly Mode and re-entering re-attaches inspect panel without stale state
- [ ] Touch targets ≥ 44×44px throughout
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `context/active-track.md` cleared after completion
- [ ] `context/history.md` updated with Track 42 entry
- [ ] `INDEX.md` updated with new files

## Risks

- **ScriptHost event subscription lifetime** — if the cockpit subscribes to ScriptHost events but ScriptHost is recreated on scene reload, stale listeners could accumulate. ScriptHost subscription must be torn down and re-established whenever the host is replaced. (MEDIUM)
- **Block highlight Blockly API** — `highlightBlock(id)` behaviour varies by Blockly version and renderer. The block may not be visible if the workspace has scrolled. Scroll-into-view may require manual viewport adjustment. (MEDIUM)
- **Log buffer size** — unbounded log accumulation will cause memory and DOM performance issues. Cap at 100 entries with oldest-first eviction. (LOW)
- **Run/Stop state race** — if the user presses Run and immediately Stop before the script has started, the status may flicker. Guard with a brief debounce or lock during transitions. (LOW)
