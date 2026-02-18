# /src/editor/blockly — Local AGENTS.md

Purpose:
- Owns the Blockly workspace UI, the Blockly Cockpit layout, and editor-side Blockly interactions.
- This is the editor-side implementation of Blockly Mode described in Part 8 and Part 13 of the Blockly Plan.

Owns:
- **Blockly workspace container**: injects Blockly into the center zone when Blockly Mode is active.
- **Workspace configuration**: zoom (pinch/scroll), move (drag/scroll), renderer (Zelos for mobile-friendly), theme.
- **Workspace lifecycle**: create on enter Blockly Mode, save state on exit, load workspace JSON per Logic Target.
- **Logic Target switching**: swap workspace file when dropdown changes, handle empty-state (no script yet).
- **Block insertion**: handle "Insert block" actions from Presets Hooks and palette drag/tap.
- **Workspace serialization bridge**: save/load workspace JSON via storage API.

Does NOT own:
- Block definitions or code generators (use `/src/runtime/blockly`)
- ScriptHost or script execution (use `/src/runtime/blockly`)
- Preset UI or Presets tab content (use `/src/editor/panels`)
- Right berry palette content (use `/src/editor/panels` — palette is a panel)
- Storage mechanics (use `/src/storage`)
- Game API types (use `/src/types`)

Sub-module layout:
```
/src/editor/blockly/
├── AGENTS.md
├── blocklyWorkspace.ts     ← Workspace injection, config, lifecycle
├── workspaceManager.ts     ← Save/load, Logic Target switching, empty state
├── blockInserter.ts        ← "Insert block" from Presets Hooks + palette placement
└── index.ts                ← Public exports
```

Blockly Cockpit layout:
- The Blockly Cockpit is the full-screen layout when Blockly Mode is active:
  - **Top bar**: Back (exit Blockly Mode), Logic Target dropdown, Run/Stop buttons, status indicator
  - **Left berry**: Presets panel (global systems — same as World Mode, plus "Insert block" actions)
  - **Center**: Blockly workspace (replaces map viewport)
  - **Right berry**: Tab 1 = Blocks Palette for selected Logic Target; Tab 2 = Inspect/Errors panel

Workspace configuration rules:
- **Renderer**: Zelos (Scratch-like, mobile-friendly). Can be configured but Zelos is default.
- **Zoom**: pinch enabled, scroll wheel enabled, min/max scale tuned for mobile readability.
- **Move**: scrollbars enabled, drag enabled, wheel movement enabled.
- **Toolbox**: NOT used as primary palette (right berry IS the palette). Blockly's built-in toolbox is hidden or minimal.
- **Plugins to consider**: continuous-toolbox (if needed for accessibility), scroll-options, keyboard navigation.

Logic Target switching behavior:
- Changing the Logic Target dropdown:
  1. Auto-save current workspace to hot storage.
  2. Load the new Logic Target's workspace JSON from storage.
  3. If no script file exists for the target, show empty state: "No script exists for [Logic Target]. Create one?" with a "Create Script" button.
  4. Script file is created on first save, not immediately.
  5. Right berry palette may update (Map targets gain Map category blocks).

Empty-state behavior:
- Centered prompt in workspace area: "No script exists for [Logic Target]. Create one?"
- "Create Script" button creates the file on first save.
- Switching to another target that has no script shows the same empty state.

Block insertion rules:
- Blocks inserted via right berry palette: drag or tap to place.
- Blocks inserted via Presets Hooks "Insert block" button: direct insert into workspace.
- Placement: near current selection or cursor anchor. If nothing selected, place near viewport center.

Workspace save/load rules:
- Use Blockly's modern serialization: `Blockly.serialization.workspaces.save(workspace)` / `.load(state, workspace)`.
- Auto-save on meaningful changes (use workspace change listener with debounce).
- Temporarily disable events while loading/importing state.

Mobile-first UI rules:
- Large touch targets for all workspace controls.
- Pinch-to-zoom must work smoothly.
- Block dragging must not conflict with berry slide-out gestures.
- Run/Stop buttons must be easily reachable.

Local invariants:
- Workspace is only active/visible in Blockly Mode. Suspend (not destroy) when returning to World Mode.
- Workspace state (scroll position, zoom) is preserved across Logic Target switches within a session.
- Workspace never directly executes scripts — that is ScriptHost's job (runtime side).
- All workspace persistence goes through the storage API, never direct IndexedDB access.

Verification:
- Blockly workspace renders correctly on mobile with Zelos renderer.
- Logic Target switching loads correct workspace and handles empty state.
- Block insertion from both palette and Presets Hooks places blocks correctly.
- Auto-save captures workspace state without data loss.
- Switching between World and Blockly modes preserves workspace state.
- Pinch-to-zoom and block dragging work without gesture conflicts.
