# /src/editor/history — Local AGENTS.md

Purpose:
- Owns editor undo/redo history stack management and operation grouping.

Owns:
- History manager (undo/redo stacks, grouping, limits)
- Operation definitions used by editor tools
- Session-only history lifecycle

Does NOT own:
- Tool-specific state machines (use /src/editor/tools)
- Persistence (do not write IndexedDB here)
- Panel UI (use /src/editor/panels)
- Blockly workspace undo/redo (Blockly has its own internal undo system)

Local invariants:
- History stores deltas only (no full scene snapshots).
- History is session-only and cleared on scene changes.
- Undo/redo must call tool-provided apply hooks for render/save.

Mode-aware behavior:
- This history system manages **World Mode** (map editing) undo/redo only.
- **Blockly Mode** uses Blockly's built-in undo/redo system (managed by the Blockly workspace). This module does not participate in Blockly undo.
- The top-bar Undo/Redo buttons must route to the correct undo system based on current editor mode: World Mode → this history manager; Blockly Mode → Blockly workspace undo.
- History is NOT cleared when switching between World and Blockly modes — only when switching scenes.

Verification:
- Grouped operations undo/redo as a single entry.
- Redo stack clears on new operations.
- History limit drops oldest entries.
- Undo/Redo buttons dispatch to correct system based on editor mode.
