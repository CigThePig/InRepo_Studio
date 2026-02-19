# Track 39 — Blockly Workspace UI — Blueprint

## Technical Design

### Architecture overview

Track 39 introduces **Blockly Mode** — a parallel UI state to the existing World Mode. When Blockly Mode is active, the center viewport is replaced by a Blockly workspace, the top bar swaps scene controls for Logic Target + Run/Stop controls, and the berries remain available (their content changes are handled by later tracks).

**Key design decision:** Blockly Mode is a separate boolean state (`isBlocklyMode`), NOT a new value in the `EditorMode` union. This is because `EditorMode` controls sub-modes within World Mode (ground, props, entities, etc.), while Blockly Mode is a top-level context switch that replaces the entire center area. When Blockly Mode is exited, the previous `EditorMode` is restored.

### State model

```
blocklyModeState = {
  active: boolean,                    // Is Blockly Mode on?
  currentLogicTarget: LogicTarget,    // Which script is being edited
  workspaceReady: boolean,            // Has Blockly been injected?
  scriptStatus: 'stopped' | 'running' | 'error',  // Current script state
  hasUnsavedChanges: boolean,         // Workspace dirty flag
  scriptExists: boolean,             // Does a script file exist for current target?
}
```

`LogicTarget` reuses the existing `ScriptLogicTarget` type from `/src/types/script.ts`:
```
{ type: 'game', label: 'Game Logic (main)' }
{ type: 'map', mapId: string, label: 'Map: <mapName>' }
```

### Files touched / created

#### New files

1. **`/src/editor/blockly/blocklyWorkspace.ts`** — Workspace injection + lifecycle
   - `createBlocklyWorkspace(container: HTMLElement): BlocklyWorkspaceController`
   - Injects `Blockly.inject()` with Zelos renderer and mobile-tuned config
   - Returns controller: `getWorkspace()`, `save()`, `load(json)`, `clear()`, `dispose()`, `onChanged(cb)`, `insertBlock(blockType, position?)`
   - Hides built-in toolbox (empty toolbox config)
   - Sets up workspace change listener for auto-save signaling
   - Disables events during load operations

2. **`/src/editor/blockly/workspaceManager.ts`** — Save/load + Logic Target switching
   - `createWorkspaceManager(deps): WorkspaceManagerController`
   - Dependencies: BlocklyWorkspaceController, scriptStorage API, scene list
   - Logic Target switching: save current → load new → handle empty state
   - Auto-save with debounce (~1000ms) via workspace change listener
   - Empty state management: tracks whether script file exists, creates on first save
   - `switchLogicTarget(target)`, `getCurrentTarget()`, `saveNow()`, `getScriptExists()`

3. **`/src/editor/blockly/blocklyMode.ts`** — Mode state + UI orchestration
   - `blocklyMode` state: `isBlocklyModeActive()`, `enterBlocklyMode(target?)`, `exitBlocklyMode()`, `onBlocklyModeChange(listener)`
   - Coordinates UI changes: hides canvas, shows workspace container, swaps top bar controls
   - Default Logic Target on entry: current map's logic (per Blockly Plan Part 8.8)
   - Preserves and restores World Mode state on exit

4. **`/src/editor/blockly/blocklyTopBar.ts`** — Blockly Mode top bar overlay
   - `createBlocklyTopBar(container): BlocklyTopBarController`
   - Renders: Back button, Logic Target dropdown, Run/Stop buttons, status indicator
   - `setLogicTargets(targets[])`, `setCurrentTarget(target)`, `setScriptStatus(status)`, `onBack(cb)`, `onTargetChange(cb)`, `onRun(cb)`, `onStop(cb)`, `destroy()`
   - Logic Target dropdown prefixed with "Logic Target:" per invariant
   - Status indicator: green dot (running), gray dot (stopped), red dot (error)

#### Modified files

5. **`/src/editor/blockly/index.ts`** — Update exports
   - Re-export public API from new modules

6. **`/src/editor/v2/editorMode.ts`** — No changes to EditorMode union
   - Blockly Mode is separate state, not part of this union

7. **`/src/editor/panels/topBarV2.ts`** — Add show/hide capability
   - Add `setVisible(visible: boolean)` to controller
   - When Blockly Mode is active, World Mode top bar is hidden and Blockly top bar is shown

8. **Editor shell / main wiring** — Wire Blockly Mode enter/exit
   - Connect playtest button or a new "Logic" button to enter Blockly Mode
   - Connect Back button to exit Blockly Mode

### APIs and interfaces

```typescript
// blocklyWorkspace.ts
interface BlocklyWorkspaceController {
  getWorkspace(): Blockly.WorkspaceSvg;
  save(): Record<string, unknown>;           // Blockly workspace JSON
  load(json: Record<string, unknown>): void; // Load workspace state
  clear(): void;
  dispose(): void;
  onChanged(callback: () => void): () => void; // Returns disposer
  insertBlock(blockType: string, position?: { x: number; y: number }): void;
  resize(): void;                            // Call after container resize
}

// workspaceManager.ts
interface WorkspaceManagerController {
  switchLogicTarget(target: ScriptLogicTarget): Promise<void>;
  getCurrentTarget(): ScriptLogicTarget;
  saveNow(): Promise<void>;                  // Force immediate save
  getScriptExists(): boolean;
  createScript(): Promise<void>;             // Create script for current target
  dispose(): void;
}

// blocklyMode.ts
function isBlocklyModeActive(): boolean;
function enterBlocklyMode(target?: ScriptLogicTarget): void;
function exitBlocklyMode(): void;
function onBlocklyModeChange(listener: (active: boolean) => void): () => void;

// blocklyTopBar.ts
interface BlocklyTopBarController {
  setLogicTargets(targets: LogicTargetItem[]): void;
  setCurrentTarget(target: ScriptLogicTarget): void;
  setScriptStatus(status: 'stopped' | 'running' | 'error'): void;
  onBack(callback: () => void): void;
  onTargetChange(callback: (target: ScriptLogicTarget) => void): void;
  onRun(callback: () => void): void;
  onStop(callback: () => void): void;
  destroy(): void;
}

interface LogicTargetItem {
  target: ScriptLogicTarget;
  label: string;        // "Logic Target: Game Logic (main)" or "Logic Target: Map: Forest"
}
```

### Workspace Blockly.inject configuration

```
{
  renderer: 'zelos',
  toolbox: { kind: 'categoryToolbox', contents: [] },  // Empty — palette is right berry
  zoom: {
    controls: false,        // No zoom buttons (use pinch)
    wheel: true,
    pinch: true,
    startScale: 0.8,
    maxScale: 2,
    minScale: 0.3,
    scaleSpeed: 1.1,
  },
  move: {
    scrollbars: { horizontal: true, vertical: true },
    drag: true,
    wheel: true,
  },
  grid: {
    spacing: 20,
    length: 3,
    colour: '#333',
    snap: true,
  },
  trashcan: true,
  sounds: false,            // No audio on mobile
  media: 'https://unpkg.com/blockly/media/',  // Or bundled
}
```

### Data flow

```
Enter Blockly Mode
  → Hide canvas + World Mode top bar
  → Show workspace container + Blockly top bar
  → Resolve default Logic Target (current map)
  → Load script from scriptStorage (hot) or cold
  → If exists: Blockly.serialization.workspaces.load()
  → If missing: Show empty state

Logic Target switch
  → workspaceManager.saveNow() (current target)
  → workspaceManager.switchLogicTarget(newTarget)
  → Load new script → populate workspace or show empty state

User edits blocks
  → workspace.addChangeListener fires
  → Debounced auto-save (1s) → workspaceManager saves to scriptStorage

Run button pressed
  → workspaceManager.saveNow()
  → Generate JS from workspace
  → ScriptHost.startScript(scriptId, generatedJs)
  → Update status indicator

Stop button pressed
  → ScriptHost.stopScript(scriptId)
  → Update status indicator

Exit Blockly Mode
  → workspaceManager.saveNow()
  → Hide workspace + Blockly top bar
  → Show canvas + World Mode top bar
  → Restore previous EditorMode state
```

### Lazy loading strategy

Blockly is a large dependency. The workspace module should be dynamically imported:
```
const { createBlocklyWorkspace } = await import('./blocklyWorkspace');
```
This ensures Blockly is only loaded when Blockly Mode is first entered. A loading indicator should display while the import resolves.

### DOM layout (Blockly Mode)

```html
<div id="editor-root">
  <div class="top-bar-v2" style="display:none">  <!-- Hidden in Blockly Mode -->
  <div class="blockly-top-bar">                   <!-- Visible in Blockly Mode -->
    <button class="back-btn">←</button>
    <select class="logic-target-dropdown">...</select>
    <div class="status-indicator"></div>
    <button class="run-btn">▶ Run</button>
    <button class="stop-btn">■ Stop</button>
  </div>
  <div class="editor-center">
    <canvas id="game-canvas" style="display:none"> <!-- Hidden in Blockly Mode -->
    <div id="blockly-container">                    <!-- Visible in Blockly Mode -->
      <!-- Blockly injects here -->
      <div class="empty-state" style="display:none">
        No script exists for [target]. Create one?
        <button>Create Script</button>
      </div>
    </div>
  </div>
  <!-- Left/right berries remain -->
</div>
```

### Mobile considerations

- Blockly workspace touch events should use `stopPropagation()` to prevent conflicts with berry swipe gestures
- Run/Stop buttons must be ≥44×44px touch targets
- Logic Target dropdown must be large enough to tap on mobile
- Workspace container must resize correctly on orientation change (`workspace.resize()`)
- Empty state prompt must be centered and readable on small screens

### Integration with existing systems

- **scriptStorage** (Track 33): Load/save script files by scriptId
- **ScriptHost** (Track 36): Start/stop script execution, listen for status events
- **coreBlocks** (Track 38): Register core blocks before workspace loads
- **schemaBlockGenerator** (Track 37): Register preset-driven blocks before workspace loads
- **Scene list**: Pull map names for Logic Target dropdown items

### Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Blockly gesture conflicts with berries | MEDIUM | stopPropagation on workspace container; test on mobile |
| Large bundle delays first Blockly entry | MEDIUM | Dynamic import + loading indicator |
| Workspace state lost on unexpected close | LOW | Auto-save with 1s debounce; save on beforeunload |
| EditorMode and BlocklyMode state confusion | MEDIUM | Clear separation: blocklyMode is top-level toggle, editorMode is World Mode sub-state |
