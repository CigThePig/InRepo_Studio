# Track 39 — Blockly Workspace UI — Plan

## Phase 1: Blockly Mode State + Workspace Injection

### Tasks
- [ ] Create `blocklyMode.ts` — mode state module (`isBlocklyModeActive`, `enterBlocklyMode`, `exitBlocklyMode`, `onBlocklyModeChange`)
- [ ] Create `blocklyWorkspace.ts` — Blockly.inject wrapper with Zelos renderer, mobile config, empty toolbox, change listener
- [ ] Register core blocks (from Track 38) and schema-driven blocks (from Track 37) before workspace injection
- [ ] Verify workspace renders in a test container with Zelos renderer
- [ ] Verify pinch-to-zoom and drag-to-scroll work

### Files touched
- `src/editor/blockly/blocklyMode.ts` (new)
- `src/editor/blockly/blocklyWorkspace.ts` (new)
- `src/editor/blockly/index.ts` (update exports)

### Verification
- [ ] Blockly workspace injects and renders with Zelos renderer
- [ ] Workspace responds to pinch/zoom and drag/scroll
- [ ] No blocks appear in toolbox (it is empty)
- [ ] Core blocks are registered (can be created programmatically)
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds

### Stop point
Pause for review. Confirm workspace renders correctly and touch gestures work before building out the full cockpit.

---

## Phase 2: Workspace Manager (Save/Load/Logic Target Switching)

### Tasks
- [ ] Create `workspaceManager.ts` — orchestrates save/load, Logic Target switching, empty state, auto-save
- [ ] Implement auto-save: workspace change listener → debounced save (1s) → scriptStorage
- [ ] Implement Logic Target switching: save current → clear → load new → or show empty state
- [ ] Implement empty state handling: detect missing script, show prompt, create on first save
- [ ] Implement `createScript()`: creates a new ScriptFile envelope and saves to hot storage on first meaningful workspace change

### Files touched
- `src/editor/blockly/workspaceManager.ts` (new)
- `src/editor/blockly/index.ts` (update exports)

### Verification
- [ ] Switching Logic Target saves current workspace and loads the correct one
- [ ] Empty state shown when no script exists for a Logic Target
- [ ] "Create Script" creates the file on first save (not immediately)
- [ ] Auto-save fires on workspace changes after debounce
- [ ] Workspace state (scroll position, zoom) preserved across Logic Target switches
- [ ] `tsc --noEmit` passes

### Stop point
Pause for review. Confirm save/load cycle works before building UI controls.

---

## Phase 3: Blockly Top Bar + Mode Enter/Exit

### Tasks
- [ ] Create `blocklyTopBar.ts` — Back button, Logic Target dropdown, Run/Stop buttons, status indicator
- [ ] Logic Target dropdown: populate with "Logic Target: Game Logic (main)" + one entry per scene, prefixed "Logic Target: Map: <name>"
- [ ] Run button: compile workspace → ScriptHost.startScript(), update status
- [ ] Stop button: ScriptHost.stopScript(), update status
- [ ] Status indicator: green dot (running), gray dot (stopped), red dot (error)
- [ ] Back button: triggers `exitBlocklyMode()`
- [ ] Wire `enterBlocklyMode()` to hide canvas + World Mode top bar, show workspace container + Blockly top bar
- [ ] Wire `exitBlocklyMode()` to reverse the above, saving workspace first
- [ ] Add `setVisible()` to TopBarV2Controller (or use CSS class toggle) for World Mode top bar hide/show
- [ ] Add entry point into Blockly Mode (e.g., a "Logic" button in the World Mode UI or a method callable from other tracks)
- [ ] Implement lazy loading of Blockly workspace module via dynamic import with loading indicator

### Files touched
- `src/editor/blockly/blocklyTopBar.ts` (new)
- `src/editor/blockly/blocklyMode.ts` (update — wire enter/exit UI transitions)
- `src/editor/panels/topBarV2.ts` (minor — add visibility toggle)
- `src/editor/blockly/index.ts` (update exports)
- Editor shell / main wiring file (wire mode entry point)

### Verification
- [ ] Back button exits Blockly Mode, restores World Mode UI
- [ ] Logic Target dropdown shows correct items (Game Logic + maps)
- [ ] Changing Logic Target triggers workspace switch
- [ ] Run starts script execution, status indicator turns green
- [ ] Stop halts execution, status indicator turns gray
- [ ] Script error sets status indicator to red
- [ ] Lazy loading shows loading indicator before Blockly is ready
- [ ] All buttons meet 44×44px touch target minimum
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds

### Stop point
Pause for review. Full Blockly cockpit layout is functional. Test on mobile.

---

## Phase 4: Polish + Docs Update

### Tasks
- [ ] Test Blockly workspace gesture isolation (no conflicts with berry swipe)
- [ ] Add `beforeunload` listener to save workspace on page close
- [ ] Handle orientation change with `workspace.resize()`
- [ ] Verify script round-trip: enter Blockly → add blocks → auto-save → exit → re-enter → blocks present
- [ ] Update `INDEX.md` with new files (blocklyWorkspace.ts, workspaceManager.ts, blocklyMode.ts, blocklyTopBar.ts)
- [ ] Update `schema-registry.md` if any new lists-of-truth were added
- [ ] Update `context/repo-map.md` if module boundaries changed

### Files touched
- `INDEX.md` (update)
- `context/schema-registry.md` (update if needed)
- `context/repo-map.md` (update if needed)
- `src/editor/blockly/*.ts` (polish fixes)

### Verification
- [ ] Full round-trip: enter Blockly → edit → auto-save → exit → re-enter → state preserved
- [ ] Logic Target switch round-trip: switch away → switch back → workspace intact
- [ ] Empty state → create script → add blocks → save → reload → blocks present
- [ ] Run → error → status shows red → stop → status shows gray
- [ ] Berry swipe gestures do not interfere with workspace dragging
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes (or only pre-existing issues)
- [ ] INDEX.md, schema-registry.md, repo-map.md are up to date

### Stop point
Track 39 complete. Ready for Track 40 (Right Berry Blocks Palette).
