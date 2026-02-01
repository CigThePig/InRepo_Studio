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

Local invariants:
- History stores deltas only (no full scene snapshots).
- History is session-only and cleared on scene changes.
- Undo/redo must call tool-provided apply hooks for render/save.

Verification:
- Grouped operations undo/redo as a single entry.
- Redo stack clears on new operations.
- History limit drops oldest entries.
