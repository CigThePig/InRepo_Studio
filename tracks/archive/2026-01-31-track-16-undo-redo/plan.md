# Track 16: Undo/Redo System — Plan

## Overview

This plan breaks Track 16 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 4

---

## Recon Summary

### Files Likely to Change

- `src/editor/history/index.ts` (new) - Public exports
- `src/editor/history/historyManager.ts` (new) - Undo/redo stack
- `src/editor/history/operations.ts` (new) - Operation types
- `src/editor/history/AGENTS.md` (new) - Module rules
- `src/editor/tools/paint.ts` - Capture operations
- `src/editor/tools/erase.ts` - Capture operations
- `src/editor/tools/select.ts` - Capture operations
- `src/editor/panels/bottomPanel.ts` - Undo/redo buttons
- `src/editor/init.ts` - Wire history manager

### Key Modules/Functions Involved

- `createHistoryManager()` - Undo/redo stack factory
- `createTileChangeOperation()` - Tile operation factory
- `createCompositeOperation()` - Grouped operation factory
- Tool modifications for operation capture

### Invariants to Respect

- Hot/Cold boundary: Changes still go to IndexedDB
- No data loss: Operations affect scene, auto-save continues
- Touch-first interaction: UI must work with touch

### Cross-Module Side Effects

- All tools must integrate with history manager
- Bottom panel needs undo/redo buttons
- Scene changes trigger re-render

### Apply/Rebuild Semantics

- Undo/redo: Live-applying (immediate visual effect)
- Scene data: Still auto-saves after operations

### Data Migration Impact

- None - history is session-only

### File Rules Impact

- New module: src/editor/history/
- Tool modifications should stay within size limits

### Risks/Regressions

- Tool refactoring could break existing functionality
- Memory usage with large operations
- Performance with complex undos

### Verification Commands/Checks

- `npm run build` - TypeScript compilation
- `npm run lint` - Code style
- Manual testing on mobile device

---

## Phase 1: History Manager Core

**Goal**: Implement the history manager with basic undo/redo stack.

### Tasks

- [ ] Create `src/editor/history/` directory
- [ ] Create `src/editor/history/AGENTS.md`
  - [ ] Document history module rules
  - [ ] Operation capture patterns
  - [ ] Memory management guidelines
- [ ] Create `src/editor/history/operations.ts`
  - [ ] Define Operation interface
  - [ ] Define OperationType enum
  - [ ] Define TileChange interface
  - [ ] Implement `createTileChangeOperation()`
  - [ ] Implement `createCompositeOperation()`
  - [ ] Implement `generateOperationId()`
- [ ] Create `src/editor/history/historyManager.ts`
  - [ ] Implement HistoryManagerConfig interface
  - [ ] Implement HistoryManager interface
  - [ ] Implement `createHistoryManager()`
  - [ ] Undo stack with push/pop
  - [ ] Redo stack with push/pop
  - [ ] State change notifications
  - [ ] Max size enforcement
- [ ] Create `src/editor/history/index.ts`
  - [ ] Export all public APIs

### Files Touched

- `src/editor/history/AGENTS.md` (new)
- `src/editor/history/operations.ts` (new)
- `src/editor/history/historyManager.ts` (new)
- `src/editor/history/index.ts` (new)

### Verification

- [ ] History manager creates successfully
- [ ] Push operation adds to undo stack
- [ ] Undo pops from undo, pushes to redo
- [ ] Redo pops from redo, pushes to undo
- [ ] canUndo/canRedo return correct values
- [ ] Max size limit enforced
- [ ] State change callback fires
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test history manager before integrating with tools.

---

## Phase 2: Operation Grouping

**Goal**: Add operation grouping for drag operations.

### Tasks

- [ ] Update `src/editor/history/historyManager.ts`
  - [ ] Add `beginGroup()` method
  - [ ] Add `endGroup()` method
  - [ ] Track grouping state
  - [ ] Collect operations during group
  - [ ] Create composite on endGroup
- [ ] Update `src/editor/history/operations.ts`
  - [ ] Ensure composite handles nested operations
  - [ ] Undo in reverse order
- [ ] Add unit tests for grouping
  - [ ] Single operation in group
  - [ ] Multiple operations in group
  - [ ] Empty group creates nothing
  - [ ] Nested groups (if supported)

### Files Touched

- `src/editor/history/historyManager.ts` (modify)
- `src/editor/history/operations.ts` (modify)

### Verification

- [ ] beginGroup starts collecting
- [ ] endGroup creates composite
- [ ] Composite undo reverses all
- [ ] Composite redo re-applies all
- [ ] Empty group creates no operation
- [ ] Operations during group don't affect stacks
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test grouping before integrating with paint tool.

---

## Phase 3: Tool Integration

**Goal**: Integrate history with paint, erase, and select tools.

### Tasks

- [ ] Update `src/editor/tools/paint.ts`
  - [ ] Accept history manager in config
  - [ ] Call beginGroup on start
  - [ ] Capture tile changes before mutation
  - [ ] Push operations during paint
  - [ ] Call endGroup on end
- [ ] Update `src/editor/tools/erase.ts`
  - [ ] Accept history manager in config
  - [ ] Similar pattern to paint
- [ ] Update `src/editor/tools/select.ts`
  - [ ] Capture move operations
  - [ ] Capture delete operations
  - [ ] Capture paste operations
  - [ ] Capture fill operations
- [ ] Update `src/editor/init.ts`
  - [ ] Create history manager instance
  - [ ] Pass to all tool factories
  - [ ] Wire state change callback

### Files Touched

- `src/editor/tools/paint.ts` (modify)
- `src/editor/tools/erase.ts` (modify)
- `src/editor/tools/select.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Paint creates grouped operation
- [ ] Single tap paint = single operation
- [ ] Drag paint = composite operation
- [ ] Erase creates grouped operation
- [ ] Select move creates operation
- [ ] Select delete creates operation
- [ ] Select paste creates operation
- [ ] Fill creates single operation
- [ ] Undo restores previous state
- [ ] Redo re-applies changes
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test tool integration before adding UI.

---

## Phase 4: UI + Polish

**Goal**: Add undo/redo buttons and finalize integration.

### Tasks

- [ ] Update `src/editor/panels/bottomPanel.ts`
  - [ ] Add undo/redo buttons to toolbar
  - [ ] Position before tool buttons
  - [ ] Disabled state styling
  - [ ] Click handlers for undo/redo
- [ ] Update `src/editor/init.ts`
  - [ ] Wire button state updates
  - [ ] Handle undo/redo button clicks
  - [ ] Clear history on scene change
- [ ] Test all tool integrations
- [ ] Test edge cases (empty stacks, limits)
- [ ] Update `INDEX.md` with new files
  - [ ] Add `src/editor/history/index.ts`
  - [ ] Add `src/editor/history/historyManager.ts`
  - [ ] Add `src/editor/history/operations.ts`
  - [ ] Add `src/editor/history/AGENTS.md`
- [ ] Update `context/repo-map.md`
  - [ ] Add history module
- [ ] Update `context/active-track.md` to mark Track 16 complete
- [ ] Append summary to `context/history.md`

### Files Touched

- `src/editor/panels/bottomPanel.ts` (modify)
- `src/editor/init.ts` (modify)
- `INDEX.md` (modify)
- `context/repo-map.md` (modify)
- `context/active-track.md` (modify)
- `context/history.md` (modify)

### Verification

- [ ] Undo button visible in toolbar
- [ ] Redo button visible in toolbar
- [ ] Buttons disabled when stacks empty
- [ ] Buttons enabled when operations available
- [ ] Clicking undo reverses last operation
- [ ] Clicking redo re-applies undone operation
- [ ] New operation clears redo
- [ ] History cleared on scene change
- [ ] Full manual test on mobile device
- [ ] INDEX.md lists new files
- [ ] repo-map.md updated
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Phase complete. Track 16 done.

---

## Risk Checkpoints

### Before Phase 1

- Review command pattern implementation
- Understand operation storage needs
- Consider memory implications

### Before Phase 2

- Verify grouping design is sound
- Test composite operation logic
- Consider edge cases

### Before Phase 3

- Backup existing tool code
- Test each tool individually
- Verify no regressions

### Before Phase 4

- Test all tools with history
- Verify performance is acceptable
- Test button interactions

### End of Track

- Full manual test cycle:
  1. Paint some tiles
  2. Tap undo → tiles restored
  3. Tap redo → tiles re-painted
  4. Drag paint a line
  5. Single undo → entire line undone
  6. Erase some tiles
  7. Undo → tiles restored
  8. Use select tool operations
  9. Verify all can be undone
  10. Create 60+ operations
  11. Verify oldest dropped
  12. Switch scenes → history cleared

---

## Rollback Plan

If issues arise:
- Phase 1: Remove history module
- Phase 2: Keep basic push/undo/redo, disable grouping
- Phase 3: Keep history, revert tool changes
- Phase 4: Keep tool integration, disable UI buttons

---

## INDEX.md Updates

After Phase 4, add:

```markdown
- `src/editor/history/index.ts`
  - Role: Public exports for history module.
  - Lists of truth: none

- `src/editor/history/historyManager.ts`
  - Role: Undo/redo stack management.
  - Lists of truth: none

- `src/editor/history/operations.ts`
  - Role: Operation types and factories.
  - Lists of truth: OperationType

- `src/editor/history/AGENTS.md`
  - Role: History module rules and patterns.
  - Lists of truth: none
```

---

## repo-map.md Updates

After Phase 4, add to module boundaries:

```markdown
- **Editor/History**: Undo/redo stack, operation capture, grouping
```

---

## Notes

- Operations store deltas, not snapshots
- Composite operations for drag paint/erase
- Clear history on scene switch
- Redo cleared on any new operation
- 50 operation limit by default
- Session-only, not persisted
- Consider entity undo in Track 21
