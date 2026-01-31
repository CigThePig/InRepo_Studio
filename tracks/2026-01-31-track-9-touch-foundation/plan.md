# Track 9: Touch Foundation — Plan

## Overview

This plan breaks Track 9 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 2

---

## Phase 1: Touch Configuration + Brush Cursor

**Goal**: Centralize touch configuration and add brush cursor display.

### Tasks

- [ ] Create `src/editor/canvas/touchConfig.ts`
  - [ ] Define TouchConfig interface
  - [ ] Define DEFAULT_TOUCH_CONFIG constant
  - [ ] Export getTouchConfig() function
  - [ ] Add SCHEMA INVENTORY header
- [ ] Create `src/editor/canvas/brushCursor.ts`
  - [ ] Implement BrushCursor interface
  - [ ] createBrushCursor() factory function
  - [ ] setPosition() for screen coordinates
  - [ ] setVisible() for show/hide
  - [ ] setPreviewTile() for tile preview
  - [ ] render() for canvas drawing
  - [ ] Use dashed outline style
- [ ] Update `src/editor/canvas/renderer.ts`
  - [ ] Import TOUCH_OFFSET_Y from touchConfig
  - [ ] Remove local TOUCH_OFFSET_Y constant
- [ ] Update `src/editor/canvas/Canvas.ts`
  - [ ] Create brush cursor instance
  - [ ] Render cursor after grid
  - [ ] Add setBrushPreview() method
  - [ ] Add setBrushVisible() method (or reuse hover logic)
- [ ] Update `src/editor/canvas/index.ts` with new exports

### Files Touched

- `src/editor/canvas/touchConfig.ts` (new)
- `src/editor/canvas/brushCursor.ts` (new)
- `src/editor/canvas/renderer.ts` (modify)
- `src/editor/canvas/Canvas.ts` (modify)
- `src/editor/canvas/index.ts` (modify)

### Verification

- [ ] TouchConfig constants are accessible
- [ ] Brush cursor renders at correct position
- [ ] Cursor shows dashed outline style
- [ ] Cursor follows touch position with offset
- [ ] Cursor respects viewport transforms
- [ ] Cursor visible during tool gesture
- [ ] Cursor hidden when not touching
- [ ] TypeScript compiles without errors

### Stop Point

Pause for review. Test brush cursor visuals before adding long-press.

---

## Phase 2: Long-press Detection + Polish

**Goal**: Add long-press detection and complete integration.

### Tasks

- [ ] Update `src/editor/canvas/gestures.ts`
  - [ ] Add onLongPress callback to GestureCallbacks
  - [ ] Implement long-press timeout (500ms)
  - [ ] Track start position for movement threshold
  - [ ] Cancel long-press if moved too much
  - [ ] Don't trigger tool action on long-press
  - [ ] Use constants from touchConfig
- [ ] Update `src/editor/canvas/Canvas.ts`
  - [ ] Add onLongPress callback setter
  - [ ] Wire long-press to gesture handler
- [ ] Update `src/editor/init.ts`
  - [ ] Wire brush preview to tile selection
  - [ ] Update brush preview when tile changes
- [ ] Update `INDEX.md` with new files
- [ ] Update `context/active-track.md` to mark Track 9 complete
- [ ] Append summary to `context/history.md`

### Files Touched

- `src/editor/canvas/gestures.ts` (modify)
- `src/editor/canvas/Canvas.ts` (modify)
- `src/editor/init.ts` (modify)
- `INDEX.md` (modify)
- `context/active-track.md` (modify)
- `context/history.md` (modify)

### Verification

- [ ] Long-press (500ms) triggers callback
- [ ] Long-press does NOT trigger paint
- [ ] Moving during long-press cancels it
- [ ] Normal tap still works for painting
- [ ] Brush shows selected tile preview
- [ ] Tile preview updates when selection changes
- [ ] Constants centralized in touchConfig
- [ ] `INDEX.md` lists touchConfig.ts and brushCursor.ts
- [ ] Full manual test on mobile device
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Phase complete. Track 9 done.

---

## Risk Checkpoints

### Before Phase 1

- Review existing hover highlight rendering
- Confirm canvas render order
- Read `src/editor/canvas/AGENTS.md` rules

### Before Phase 2

- Test brush cursor on mobile for visibility
- Verify touch offset feels natural
- Test gesture disambiguation

### End of Track

- Full manual test cycle:
  1. Touch canvas → brush cursor appears
  2. Move finger → cursor follows smoothly
  3. Quick tap → paint occurs at cursor position
  4. Long-press → no paint, long-press detected (log)
  5. Two-finger gesture → pan/zoom, no cursor
  6. Change tile selection → brush preview updates

---

## Rollback Plan

If issues arise:
- Phase 1: Remove touchConfig.ts and brushCursor.ts, revert TOUCH_OFFSET_Y to renderer
- Phase 2: Keep brush cursor, disable long-press detection

---

## INDEX.md Updates

After Phase 2, add:

```markdown
- `src/editor/canvas/touchConfig.ts`
  - Role: Touch offset and gesture configuration constants.
  - Lists of truth: TouchConfig, DEFAULT_TOUCH_CONFIG

- `src/editor/canvas/brushCursor.ts`
  - Role: Brush cursor rendering for tool actions.
  - Lists of truth: none
```

---

## Notes

- Long-press callback is placeholder for future context menu
- Touch offset can be made user-configurable in Track 28
- Brush cursor reuses existing coordinate transform functions
- Consider adding tile preview alpha (60%) for visibility
