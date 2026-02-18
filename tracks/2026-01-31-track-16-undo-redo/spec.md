# Track 16: Undo/Redo System — Spec

## Goal

Implement a comprehensive undo/redo system that tracks all editing operations and allows users to reverse or replay them. Supports operation grouping to treat continuous actions (like drag painting) as single undo entries.

## User Story

As a mobile game developer using InRepo Studio, I want to undo my mistakes and redo changes I've undone so that I can experiment freely without fear of losing work.

## Scope

### In Scope

1. **Undo Stack**: Track operations that can be undone
2. **Redo Stack**: Track undone operations that can be redone
3. **Operation Grouping**: Combine related actions (drag paint) into single entries
4. **Undo/Redo Buttons**: UI controls in toolbar
5. **History Limit**: Cap stack size to manage memory
6. **Paint Tool Integration**: Capture paint operations
7. **Erase Tool Integration**: Capture erase operations
8. **Select Tool Integration**: Capture selection operations

### Out of Scope (deferred)

- Keyboard shortcuts (Ctrl+Z/Y - future desktop support)
- Operation preview before undo
- Selective undo (undo specific operation, not most recent)
- Cross-scene undo history
- Entity operation undo (Track 21)
- Scene-level undo (scene resize, rename - Track 17)

## Acceptance Criteria

1. **Undo Operation**
   - [ ] Undo button reverses the last operation
   - [ ] Undoing paint restores previous tile values
   - [ ] Undoing erase restores erased tiles
   - [ ] Undoing selection operations restores tile state
   - [ ] Undo button disabled when stack empty

2. **Redo Operation**
   - [ ] Redo button re-applies undone operations
   - [ ] Redo button disabled when stack empty
   - [ ] New operations clear redo stack

3. **Operation Grouping**
   - [ ] Drag paint counted as single undo operation
   - [ ] Drag erase counted as single undo operation
   - [ ] Selection move counted as single operation
   - [ ] Flood fill counted as single operation

4. **History Limit**
   - [ ] Maximum 50 operations in undo stack
   - [ ] Oldest operations dropped when limit exceeded
   - [ ] Configurable limit (future: editor settings)

5. **UI Integration**
   - [ ] Undo/redo buttons in toolbar
   - [ ] Visual feedback when buttons disabled
   - [ ] Operation count indicator (optional)

6. **Persistence**
   - [ ] Undo/redo stacks cleared on page reload
   - [ ] Tile changes still auto-save to IndexedDB
   - [ ] Stacks are session-only (not persisted)

## Risks

1. **Memory Usage**: Large operations consume memory
   - Mitigation: Store deltas only, limit stack size

2. **Performance**: Undoing large operations may lag
   - Mitigation: Batch tile updates, optimize rendering

3. **Tool Integration Complexity**: All tools must capture operations
   - Mitigation: Central operation recording pattern

4. **Grouping Logic**: Determining operation boundaries
   - Mitigation: Use start/end markers for drag operations

## Verification

- Manual: Paint tiles, undo, verify tiles restored
- Manual: Redo after undo, verify tiles re-placed
- Manual: Drag paint, undo once, verify entire stroke undone
- Manual: New operation after undo clears redo
- Manual: Exceed history limit, verify oldest removed
- Automated: Unit tests for undo/redo stack operations
- Automated: Unit tests for operation grouping

## Dependencies

- Track 8 (Paint Tool): Operation capture
- Track 14 (Erase Tool): Operation capture
- Track 15 (Select Tool): Operation capture

## Notes

- Store tile deltas (before/after values) not full layer copies
- Consider using command pattern for operations
- Drag operations use start/end group markers
- Clear redo stack on any new operation
- Consider visual indicator for undo availability
