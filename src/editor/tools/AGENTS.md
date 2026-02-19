# /src/editor/tools — Local AGENTS.md

Purpose:
- Owns tool state machines (paint/erase/select/fill) and undo/redo-friendly operations for **World Mode** map editing.

Owns:
- Tool interface contracts (start/move/end)
- Operation objects for undo/redo
- Layer-safe editing (respect locked/hidden layers)

Does NOT own:
- Panel UI (use `/src/editor/panels`)
- Storage mechanics (use `/src/storage` APIs)
- **Blockly workspace interactions** (use `/src/editor/blockly`). Tools in this folder are World Mode map-editing tools only.

Local invariants:
- Tools must not directly perform deploy or auth actions.
- Tools should batch edits and commit atomic operations to state.
- Every meaningful change triggers auto-save (through storage API).

Mode-driven context:
- Tools are activated via the **editor mode state** (`editorMode`): `select | ground | props | entities | collision | triggers`.
- The right berry tab selection sets `editorMode` and determines which tool is active.
- Tools in this folder are **World Mode only**. They are inactive/suspended when the editor is in Blockly Mode.
- Entity tools follow **move-first behavior**: selecting an entity allows immediate movement (no separate "move mode").

Verification:
- Tool actions are reversible (undo/redo) once implemented.
- Tool edits are reflected immediately in playtest hot mode.
- Tools are inactive when editor is in Blockly Mode.
