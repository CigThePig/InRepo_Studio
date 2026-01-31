# Track 14: Erase Tool — Plan

## Overview

This plan breaks Track 14 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 3

---

## Recon Summary

### Files Likely to Change

- `src/editor/tools/erase.ts` (new) - Core erase tool logic
- `src/editor/tools/common.ts` (new) - Shared utilities for paint/erase
- `src/editor/tools/paint.ts` - Refactor to use common utilities
- `src/editor/init.ts` - Wire erase tool to gesture system
- `src/editor/panels/bottomPanel.ts` - Add brush size selector UI
- `src/editor/canvas/brushCursor.ts` - Support brush size rendering
- `src/storage/hot.ts` - Add brushSize to EditorState schema

### Key Modules/Functions Involved

- `createEraseTool()` - Factory for erase tool
- `eraseTile()` - Core erase operation
- `getBrushFootprint()` - Calculate affected tiles for brush
- `interpolateLine()` - Bresenham algorithm (shared with paint)
- `createBrushSizeSelector()` - UI component for brush size

### Invariants to Respect

- Hot/Cold boundary: All changes go to IndexedDB
- No data loss: Auto-save after operations
- Touch-first interaction: Touch offset for visibility
- Offline-safe editing: No network required for erasing

### Cross-Module Side Effects

- EditorState schema change requires migration consideration
- Bottom panel layout changes may affect other tools
- Brush cursor changes affect all tools that use it

### Apply/Rebuild Semantics

- EditorState.brushSize: Live-applying (immediate effect)
- Scene layer changes: Live-applying (re-render)

### Data Migration Impact

- Adding brushSize to EditorState: Use default value (1) if missing

### File Rules Impact

- New files: erase.ts, common.ts
- paint.ts refactor should not exceed size limits

### Risks/Regressions

- Paint tool refactor could break existing functionality
- Brush size UI could affect panel layout

### Verification Commands/Checks

- `npm run build` - TypeScript compilation
- `npm run lint` - Code style
- Manual testing on mobile device

---

## Phase 1: Core Erase Tool

**Goal**: Implement the erase tool with basic 1x1 erasing, mirroring paint tool architecture.

### Tasks

- [ ] Read `src/editor/tools/AGENTS.md` before editing
- [ ] Create `src/editor/tools/common.ts`
  - [ ] Export `TilePoint` interface
  - [ ] Export `interpolateLine()` function (move from paint.ts)
  - [ ] Export `screenToTileWithOffset()` function
- [ ] Refactor `src/editor/tools/paint.ts`
  - [ ] Import shared utilities from common.ts
  - [ ] Remove duplicated code
  - [ ] Verify paint tool still works
- [ ] Create `src/editor/tools/erase.ts`
  - [ ] Implement EraseToolConfig interface
  - [ ] Implement EraseTool interface
  - [ ] `createEraseTool()` factory function
  - [ ] `start()` method for tap/drag start
  - [ ] `move()` method for drag erasing
  - [ ] `end()` method for gesture end
  - [ ] `eraseTile()` helper for scene mutation
  - [ ] Track lastTileX/Y for interpolation
- [ ] Update `src/editor/init.ts`
  - [ ] Import erase tool
  - [ ] Create erase tool instance
  - [ ] Extend onToolGesture for erase tool

### Files Touched

- `src/editor/tools/common.ts` (new)
- `src/editor/tools/paint.ts` (modify)
- `src/editor/tools/erase.ts` (new)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Paint tool still works after refactor
- [ ] Tap canvas with erase tool active → tile erased
- [ ] Tile erased at offset position (above finger)
- [ ] Drag across canvas → continuous erasure
- [ ] No gaps in erased line when dragging fast
- [ ] Scene data in memory is updated
- [ ] Erasing sets tile value to 0
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test basic erasing works before adding brush size.

---

## Phase 2: Brush Size + Persistence

**Goal**: Add brush size support and ensure proper persistence.

### Tasks

- [ ] Update `src/storage/hot.ts`
  - [ ] Add `brushSize: BrushSize` to EditorState interface
  - [ ] Add default value (1) in getDefaultEditorState()
  - [ ] Handle missing brushSize on load (migration)
- [ ] Update `src/editor/tools/common.ts`
  - [ ] Add `BrushSize` type export
  - [ ] Add `getBrushFootprint()` function
- [ ] Update `src/editor/tools/erase.ts`
  - [ ] Accept getBrushSize in config
  - [ ] Use getBrushFootprint() in start/move methods
  - [ ] Erase all tiles in footprint
- [ ] Update `src/editor/panels/bottomPanel.ts`
  - [ ] Create brush size selector component
  - [ ] Show selector only when erase tool active
  - [ ] Add onBrushSizeChange callback
- [ ] Update `src/editor/init.ts`
  - [ ] Track currentBrushSize state
  - [ ] Pass getBrushSize to erase tool
  - [ ] Wire up brush size selector callback
  - [ ] Persist brushSize to EditorState

### Files Touched

- `src/storage/hot.ts` (modify)
- `src/editor/tools/common.ts` (modify)
- `src/editor/tools/erase.ts` (modify)
- `src/editor/panels/bottomPanel.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Brush size selector appears when erase tool selected
- [ ] Brush size selector hidden for other tools
- [ ] 1x1 brush erases single tile
- [ ] 2x2 brush erases 4 tiles per tap
- [ ] 3x3 brush erases 9 tiles per tap
- [ ] Brush size persists across page reload
- [ ] Drag erasing uses current brush size
- [ ] Scene auto-saves after erasing
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test brush size before adding visual feedback.

---

## Phase 3: Brush Cursor + Polish

**Goal**: Visual feedback for brush size and finalize integration.

### Tasks

- [ ] Update `src/editor/canvas/brushCursor.ts`
  - [ ] Accept brushSize parameter
  - [ ] Render brush size preview rectangle
  - [ ] Use different color/opacity for erase vs paint
- [ ] Update `src/editor/init.ts`
  - [ ] Pass brush size to brush cursor
  - [ ] Update cursor on brush size change
- [ ] Verify erase tool only activates for 'erase' tool state
- [ ] Test with all four layer types
- [ ] Test edge cases (bounds, empty tiles)
- [ ] Update `INDEX.md` with new files
  - [ ] Add `src/editor/tools/erase.ts`
  - [ ] Add `src/editor/tools/common.ts`
- [ ] Update `context/schema-registry.md`
  - [ ] Add brushSize to EditorStateSchema
- [ ] Update `context/active-track.md` to mark Track 14 complete
- [ ] Append summary to `context/history.md`

### Files Touched

- `src/editor/canvas/brushCursor.ts` (modify)
- `src/editor/init.ts` (modify)
- `INDEX.md` (modify)
- `context/schema-registry.md` (modify)
- `context/active-track.md` (modify)
- `context/history.md` (modify)

### Verification

- [ ] Brush cursor shows correct size preview
- [ ] Cursor follows finger with touch offset
- [ ] Erase only works when erase tool selected
- [ ] Select/paint/entity tools do NOT erase
- [ ] Works on all layer types (ground, props, collision, triggers)
- [ ] Erasing at scene edges handles bounds correctly
- [ ] Erasing empty tiles doesn't cause extra saves
- [ ] Full manual test on mobile device
- [ ] INDEX.md lists new files
- [ ] schema-registry.md updated
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Phase complete. Track 14 done.

---

## Risk Checkpoints

### Before Phase 1

- Confirm canvas tool gesture callbacks are working
- Confirm paint tool architecture is suitable for reuse
- Read `src/editor/tools/AGENTS.md` rules

### Before Phase 2

- Test erase tool on mobile device
- Verify touch offset matches paint tool
- Confirm IndexedDB save is functioning

### Before Phase 3

- Test brush sizes on mobile device
- Verify no performance issues with larger brushes

### End of Track

- Full manual test cycle:
  1. Select erase tool
  2. Tap to erase single tile
  3. Drag to erase line
  4. Change brush size to 2x2, erase again
  5. Change brush size to 3x3, erase again
  6. Switch to props layer, erase again
  7. Switch to collision layer, erase again
  8. Refresh page, verify erasures persist
  9. Switch to paint tool, touch canvas (should NOT erase)

---

## Rollback Plan

If issues arise:
- Phase 1: Remove erase.ts, common.ts, revert paint.ts and init.ts changes
- Phase 2: Keep basic erase, disable brush size feature
- Phase 3: Keep functionality, skip brush cursor enhancement

---

## INDEX.md Updates

After Phase 3, add:

```markdown
- `src/editor/tools/erase.ts`
  - Role: Tile erasing logic with brush size support.
  - Lists of truth: none

- `src/editor/tools/common.ts`
  - Role: Shared utilities for paint/erase tools.
  - Lists of truth: BrushSize
```

---

## Notes

- Erase always sets tile value to 0 regardless of layer
- Touch offset (-48px) must match paint tool's TOUCH_OFFSET_Y
- Brush size is shared state - consider applying to paint tool later
- Undo/redo integration will be added in Track 16
- Consider adding erase-all for layer in Track 17 (Scene Management)
