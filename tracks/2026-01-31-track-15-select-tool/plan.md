# Track 15: Select Tool — Plan

## Overview

This plan breaks Track 15 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 4

---

## Recon Summary

### Files Likely to Change

- `src/editor/tools/select.ts` (new) - Core select tool logic
- `src/editor/tools/clipboard.ts` (new) - Clipboard for copy/paste
- `src/editor/tools/floodFill.ts` (new) - Flood fill algorithm
- `src/editor/panels/selectionBar.ts` (new) - Action buttons UI
- `src/editor/canvas/renderer.ts` - Selection overlay rendering
- `src/editor/init.ts` - Wire select tool
- `src/editor/canvas/gestures.ts` - Long-press for move mode

### Key Modules/Functions Involved

- `createSelectTool()` - Factory for select tool
- `createClipboard()` - Clipboard factory
- `floodFill()` - Fill algorithm
- `createSelectionBar()` - Action bar UI

### Invariants to Respect

- Hot/Cold boundary: All changes go to IndexedDB
- No data loss: Auto-save after operations
- Touch-first interaction: Touch offset for visibility
- Offline-safe editing: No network required

### Cross-Module Side Effects

- Canvas renderer needs selection overlay
- Gesture system needs long-press handling
- Bottom panel may need to coordinate with selection bar

### Apply/Rebuild Semantics

- Selection changes: Live-applying (visual only)
- Tile changes: Live-applying (re-render + save)

### Data Migration Impact

- None - selection state is transient

### File Rules Impact

- New files: select.ts, clipboard.ts, floodFill.ts, selectionBar.ts
- Renderer modifications should stay within size limits

### Risks/Regressions

- Gesture conflicts with pan/zoom
- Performance with large selections
- Complex mode state management

### Verification Commands/Checks

- `npm run build` - TypeScript compilation
- `npm run lint` - Code style
- Manual testing on mobile device

---

## Phase 1: Basic Selection

**Goal**: Implement rectangular selection with visual feedback.

### Tasks

- [ ] Read `src/editor/tools/AGENTS.md` before editing
- [ ] Create `src/editor/tools/select.ts`
  - [ ] Implement SelectToolConfig interface
  - [ ] Implement basic SelectTool interface
  - [ ] `start()` - record start position
  - [ ] `move()` - update selection bounds
  - [ ] `end()` - finalize selection
  - [ ] `getSelection()` - return current selection
  - [ ] `clearSelection()` - clear selection
  - [ ] Track mode state (idle, selecting, selected)
- [ ] Update `src/editor/canvas/renderer.ts`
  - [ ] Add selection overlay rendering function
  - [ ] Render blue rectangle with semi-transparent fill
  - [ ] Accept selection bounds from controller
- [ ] Update `src/editor/init.ts`
  - [ ] Import select tool
  - [ ] Create select tool instance
  - [ ] Wire to onToolGesture for select tool
  - [ ] Pass selection to renderer

### Files Touched

- `src/editor/tools/select.ts` (new)
- `src/editor/canvas/renderer.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Drag on canvas with select tool creates rectangle
- [ ] Rectangle snaps to tile boundaries
- [ ] Selection respects touch offset
- [ ] Selection visible with blue border and fill
- [ ] Tapping outside clears selection
- [ ] Selection state tracked correctly
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test selection UX before adding actions.

---

## Phase 2: Selection Actions (Copy/Paste/Delete)

**Goal**: Add action bar and implement copy, paste, delete operations.

### Tasks

- [ ] Create `src/editor/tools/clipboard.ts`
  - [ ] Implement Clipboard interface
  - [ ] `copy()` - store selection data
  - [ ] `paste()` - retrieve clipboard data
  - [ ] `hasData()` - check if clipboard has content
  - [ ] `clear()` - clear clipboard
- [ ] Create `src/editor/panels/selectionBar.ts`
  - [ ] Create floating action bar component
  - [ ] Buttons: Copy, Paste, Delete, Cancel
  - [ ] Position relative to selection
  - [ ] Enable/disable paste based on clipboard
- [ ] Update `src/editor/tools/select.ts`
  - [ ] Add `copySelection()` - copy tiles to clipboard
  - [ ] Add `deleteSelection()` - clear tiles in selection
  - [ ] Add `paste()` - place clipboard at position
- [ ] Update `src/editor/init.ts`
  - [ ] Create clipboard instance
  - [ ] Create selection bar
  - [ ] Wire action callbacks
  - [ ] Show/hide bar based on selection

### Files Touched

- `src/editor/tools/clipboard.ts` (new)
- `src/editor/panels/selectionBar.ts` (new)
- `src/editor/tools/select.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Action bar appears when selection exists
- [ ] Action bar hidden when no selection
- [ ] Copy button copies tiles to clipboard
- [ ] Paste button places tiles at position
- [ ] Paste disabled when clipboard empty
- [ ] Delete button clears selected tiles
- [ ] Cancel button clears selection
- [ ] Scene auto-saves after operations
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test copy/paste/delete before adding move.

---

## Phase 3: Move Selection

**Goal**: Add move functionality with long-press activation.

### Tasks

- [ ] Update `src/editor/canvas/gestures.ts`
  - [ ] Add long-press detection for select tool
  - [ ] Emit long-press event when inside selection
- [ ] Update `src/editor/tools/select.ts`
  - [ ] Add `startMove()` - enter move mode
  - [ ] Add `moveSelection()` - update position during drag
  - [ ] Add `applyMove()` - finalize move (cut + paste)
  - [ ] Track move offset during drag
  - [ ] Add mode: 'moving' state
- [ ] Update `src/editor/canvas/renderer.ts`
  - [ ] Render move preview (ghost tiles at new position)
  - [ ] Show original position dimmed
- [ ] Update `src/editor/init.ts`
  - [ ] Handle long-press event for move
  - [ ] Wire move gesture handling
- [ ] Add Move button to selection bar

### Files Touched

- `src/editor/canvas/gestures.ts` (modify)
- `src/editor/tools/select.ts` (modify)
- `src/editor/canvas/renderer.ts` (modify)
- `src/editor/init.ts` (modify)
- `src/editor/panels/selectionBar.ts` (modify)

### Verification

- [ ] Long-press on selection activates move mode
- [ ] Dragging shows move preview
- [ ] Releasing places tiles at new position
- [ ] Original tiles are cleared
- [ ] Move respects scene bounds
- [ ] Move button works from action bar
- [ ] Scene auto-saves after move
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test move before adding flood fill.

---

## Phase 4: Flood Fill + Polish

**Goal**: Implement flood fill and finalize integration.

### Tasks

- [ ] Create `src/editor/tools/floodFill.ts`
  - [ ] Implement floodFill() function
  - [ ] 4-connected fill algorithm
  - [ ] Tile limit for performance (10000)
  - [ ] Return fill result with count
- [ ] Update `src/editor/tools/select.ts`
  - [ ] Add fill mode handling
  - [ ] Tap without selection triggers fill
- [ ] Update `src/editor/panels/selectionBar.ts`
  - [ ] Add Fill button
- [ ] Update `src/editor/init.ts`
  - [ ] Wire fill functionality
  - [ ] Show fill result toast if limit reached
- [ ] Test all layer types
- [ ] Test edge cases (bounds, empty, large areas)
- [ ] Update `INDEX.md` with new files
  - [ ] Add `src/editor/tools/select.ts`
  - [ ] Add `src/editor/tools/clipboard.ts`
  - [ ] Add `src/editor/tools/floodFill.ts`
  - [ ] Add `src/editor/panels/selectionBar.ts`
- [ ] Update `context/active-track.md` to mark Track 15 complete
- [ ] Append summary to `context/history.md`

### Files Touched

- `src/editor/tools/floodFill.ts` (new)
- `src/editor/tools/select.ts` (modify)
- `src/editor/panels/selectionBar.ts` (modify)
- `src/editor/init.ts` (modify)
- `INDEX.md` (modify)
- `context/active-track.md` (modify)
- `context/history.md` (modify)

### Verification

- [ ] Tap with fill mode fills connected area
- [ ] Fill respects tile boundaries
- [ ] Fill uses selected tile
- [ ] Fill works on all layer types
- [ ] Fill limit prevents performance issues
- [ ] Warning shown if limit reached
- [ ] All selection actions work correctly
- [ ] Full manual test on mobile device
- [ ] INDEX.md lists new files
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Phase complete. Track 15 done.

---

## Risk Checkpoints

### Before Phase 1

- Confirm gesture handling can support selection
- Read renderer code for overlay patterns
- Review touch offset implementation

### Before Phase 2

- Test selection UX on mobile device
- Verify selection bounds calculation
- Review clipboard patterns

### Before Phase 3

- Test long-press detection
- Verify move preview is understandable
- Consider UX for move cancellation

### Before Phase 4

- Profile flood fill performance
- Test with various scene sizes
- Review tile limit appropriateness

### End of Track

- Full manual test cycle:
  1. Select tool active
  2. Drag to create selection
  3. Verify action bar appears
  4. Copy selection
  5. Move to new position, paste
  6. Delete selection
  7. Long-press to move selection
  8. Tap empty area to flood fill
  9. Switch layers, verify layer-specific
  10. Refresh page, verify changes persist

---

## Rollback Plan

If issues arise:
- Phase 1: Remove select.ts, revert renderer/init changes
- Phase 2: Keep selection, disable copy/paste/delete
- Phase 3: Keep actions, disable move
- Phase 4: Keep move, disable flood fill

---

## INDEX.md Updates

After Phase 4, add:

```markdown
- `src/editor/tools/select.ts`
  - Role: Selection and manipulation tool.
  - Lists of truth: SelectToolMode

- `src/editor/tools/clipboard.ts`
  - Role: Copy/paste clipboard for selections.
  - Lists of truth: none

- `src/editor/tools/floodFill.ts`
  - Role: Flood fill algorithm for tile filling.
  - Lists of truth: none

- `src/editor/panels/selectionBar.ts`
  - Role: Floating action bar for selection operations.
  - Lists of truth: none
```

---

## Notes

- Selection is active-layer only
- Move = cut + paste atomically
- Flood fill uses 4-connectivity
- Clipboard is session-only
- Long-press threshold uses existing LONG_PRESS_MS
- Consider selection size indicator for UX
- Undo/redo integration in Track 16
