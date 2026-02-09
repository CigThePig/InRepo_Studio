# Track 39 — Blockly Workspace UI (Part 8 — Cockpit)

## Intent

Implement the Blockly Cockpit layout and workspace UI that allows users to edit Blockly scripts directly in the editor. This is the first track that delivers a visible, interactive Blockly experience — the center workspace where users assemble block programs, the Logic Target dropdown for selecting which script to edit, Run/Stop controls, and the mode-switching infrastructure between World Mode and Blockly Mode.

Authority: `/context/Blockly_Plan_Revised.md` Part 8 (Blockly Cockpit Screen Spec).

## Scope

### In scope
1. **Blockly workspace injection** — inject Blockly into the center zone with Zelos renderer, mobile-tuned zoom/move config, hidden built-in toolbox
2. **Blockly Mode state** — a new top-level `blocklyMode` boolean (separate from EditorMode) that toggles the entire UI layout between World Mode and Blockly Mode
3. **Logic Target dropdown** — replaces the scene selector in the top bar secondary row when in Blockly Mode; shows "Logic Target: Game Logic (main)" and "Logic Target: Map: <mapName>" items
4. **Logic Target switching** — auto-save current workspace, load new target's workspace, handle empty state ("No script exists — Create one?")
5. **Run/Stop buttons + status indicator** — in top bar, start/stop script execution via ScriptHost, show running/stopped/error status
6. **Back button** — exits Blockly Mode and returns to World Mode
7. **Auto-save** — workspace change listener with debounce, saves to hot storage via scriptStorage
8. **Blockly Mode enter/exit** — show/hide workspace container, swap top bar controls, preserve workspace state across mode switches

### Out of scope
- Right berry blocks palette content (Track 40)
- Left berry Presets UI + Blockly Hooks insert actions (Track 41)
- Inspect/Errors panel (Track 42)
- Block definitions and code generators (Tracks 37-38, already complete)
- Script execution engine internals (Track 36, already complete)

## Acceptance criteria

- [ ] Blockly workspace renders on mobile with Zelos renderer
- [ ] Pinch-to-zoom and drag-to-scroll work on mobile without gesture conflicts
- [ ] Blockly's built-in toolbox is hidden (right berry will be the palette in Track 40)
- [ ] Logic Target dropdown appears in top bar when Blockly Mode is active
- [ ] Logic Target dropdown shows correct items (Game Logic + one per existing map)
- [ ] Switching Logic Target auto-saves current workspace and loads the new target
- [ ] Empty state shows "No script exists for [target]. Create one?" when no script file exists
- [ ] "Create Script" creates the file on first meaningful save (not immediately)
- [ ] Run/Stop buttons appear in top bar during Blockly Mode
- [ ] Run button compiles workspace and starts script via ScriptHost
- [ ] Stop button stops running script
- [ ] Status indicator shows running/stopped/error state
- [ ] Back button exits Blockly Mode and restores World Mode UI
- [ ] Auto-save fires on workspace changes with debounce (~1s)
- [ ] Workspace state (scroll, zoom) is preserved across Logic Target switches within a session
- [ ] Entering/exiting Blockly Mode does not lose workspace state
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `schema-registry.md` updated if new lists-of-truth are added
- [ ] `INDEX.md` updated with new files

## Risks

- **Blockly bundle size** — Blockly is a large dependency (~500KB+). Lazy-loading the workspace UI module is recommended to avoid impacting World Mode load time (MEDIUM)
- **Gesture conflicts** — Blockly's internal touch handling may conflict with berry slide-out gestures. Need to ensure workspace touch events don't leak (MEDIUM)
- **Mobile performance** — Zelos renderer on low-end phones with complex workspaces may lag. Keep initial workspace empty and test on real devices (LOW for v1)
- **EditorMode interaction** — Adding Blockly Mode as a parallel state (not part of EditorMode union) requires careful UI coordination to avoid split-brain between mode systems (MEDIUM)
