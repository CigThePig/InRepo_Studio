# Track 8: Paint Tool — Plan

## Overview

This plan breaks Track 8 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 2

---

## Phase 1: Core Paint Tool

**Goal**: Implement the paint tool with single-tap and drag painting capabilities.

### Tasks

- [ ] Create `src/editor/tools/paint.ts`
  - [ ] Implement PaintTool interface
  - [ ] `createPaintTool()` factory function
  - [ ] `start()` method for tap/drag start
  - [ ] `move()` method for drag painting
  - [ ] `end()` method for gesture end
  - [ ] `getTileValue()` helper for layer-appropriate values
  - [ ] `paintTile()` helper for scene mutation
  - [ ] `interpolateLine()` for Bresenham line algorithm
  - [ ] Track lastTileX/Y for interpolation
- [ ] Update `src/editor/init.ts`
  - [ ] Import paint tool
  - [ ] Create paint tool instance with config
  - [ ] Wire canvas tool gestures to paint tool
  - [ ] Add scene save debouncing
  - [ ] Export current scene getter for paint tool
- [ ] Read local AGENTS.md files before editing

### Files Touched

- `src/editor/tools/paint.ts` (new)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Tap canvas with paint tool active → tile appears
- [ ] Tile appears at offset position (above finger)
- [ ] Drag across canvas → continuous line painted
- [ ] No gaps in painted line when dragging fast
- [ ] Scene data in memory is updated
- [ ] Painting on ground layer uses tile index + 1
- [ ] Painting on collision layer uses value 1
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test basic painting works before adding auto-save.

---

## Phase 2: Auto-save + Polish

**Goal**: Add persistence and complete integration.

### Tasks

- [ ] Update `src/editor/init.ts`
  - [ ] Implement `scheduleSceneSave()` with debouncing
  - [ ] Call scene save after paint operations
  - [ ] Ensure canvas re-renders after paint
  - [ ] Ensure hover highlight updates during paint
- [ ] Verify paint tool only activates for 'paint' tool state
- [ ] Test with all four layer types
- [ ] Update `INDEX.md` with paint.ts entry
- [ ] Update `context/active-track.md` to mark Track 8 complete
- [ ] Append summary to `context/history.md`

### Files Touched

- `src/editor/init.ts` (modify)
- `INDEX.md` (modify)
- `context/active-track.md` (modify)
- `context/history.md` (modify)

### Verification

- [ ] Painted tiles persist across page reload
- [ ] Auto-save triggers after painting ends
- [ ] Save is debounced (single save for rapid paints)
- [ ] Canvas re-renders immediately after painting
- [ ] Hover highlight follows finger during paint
- [ ] Paint only works when paint tool is selected
- [ ] Select/erase/entity tools do NOT paint
- [ ] Works on all layer types (ground, props, collision, triggers)
- [ ] `INDEX.md` lists paint.ts
- [ ] Full manual test on mobile device
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Phase complete. Track 8 done.

---

## Risk Checkpoints

### Before Phase 1

- Confirm canvas tool gesture callbacks are working
- Confirm scene data structure matches expected format
- Read `src/editor/tools/AGENTS.md` rules

### Before Phase 2

- Test paint tool on mobile device for touch feel
- Verify touch offset matches hover highlight
- Check IndexedDB save is functioning

### End of Track

- Full manual test cycle:
  1. Select paint tool
  2. Select a tile from picker
  3. Tap to paint single tile
  4. Drag to paint line
  5. Switch to props layer, paint again
  6. Switch to collision layer, paint again
  7. Refresh page, verify all tiles persist
  8. Switch to select tool, touch canvas (should NOT paint)

---

## Rollback Plan

If issues arise:
- Phase 1: Remove paint.ts, revert init.ts changes
- Phase 2: Keep paint tool, disable auto-save

---

## INDEX.md Updates

After Phase 2, add:

```markdown
- `src/editor/tools/paint.ts`
  - Role: Tile painting logic with drag support.
  - Lists of truth: none
```

---

## Notes

- Touch offset (-48px) must match renderer's TOUCH_OFFSET_Y
- Collision/trigger layers use value 1, not tile indices
- Ground/props use selectedTile.index + 1 (0 is empty)
- Undo/redo integration deferred to Track 16
- Brush size options deferred to Track 9 or 14
