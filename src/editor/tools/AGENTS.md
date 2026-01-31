# /src/editor/tools — Local AGENTS.md

Purpose:
- Owns tool state machines (paint/erase/select/fill) and undo/redo-friendly operations.

Owns:
- Tool interface contracts (start/move/end)
- Operation objects for undo/redo
- Layer-safe editing (respect locked/hidden layers)

Does NOT own:
- Panel UI (use `/src/editor/panels`)
- Storage mechanics (use `/src/storage` APIs)

Local invariants:
- Tools must not directly perform deploy or auth actions.
- Tools should batch edits and commit atomic operations to state.
- Every meaningful change triggers auto-save (through storage API).

Verification:
- Tool actions are reversible (undo/redo) once implemented.
- Tool edits are reflected immediately in playtest hot mode.
