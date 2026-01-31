# Track 5: Canvas System — Plan

## Overview

This plan breaks Track 5 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 3

---

## Phase 1: Viewport Foundation

**Goal**: Create viewport state management and coordinate transform functions.

### Tasks

- [ ] Create `src/editor/canvas/viewport.ts`
  - [ ] Define `ViewportState` interface (re-export from storage)
  - [ ] Implement `createViewport()` with defaults
  - [ ] Implement `screenToWorld()` transform
  - [ ] Implement `worldToScreen()` transform
  - [ ] Implement `worldToTile()` transform
  - [ ] Implement `tileToWorld()` transform
  - [ ] Implement `clampZoom()` with MIN/MAX constants
- [ ] Create `src/editor/canvas/index.ts` with exports
- [ ] Add unit tests for transform functions

### Files Touched

- `src/editor/canvas/viewport.ts` (new)
- `src/editor/canvas/index.ts` (new)

### Verification

- [ ] `screenToWorld` and `worldToScreen` are inverses
- [ ] `worldToTile` correctly converts to grid coordinates
- [ ] `clampZoom` enforces 0.25-4.0 range
- [ ] TypeScript compiles without errors
- [ ] Unit tests pass

### Stop Point

Pause for review. Viewport transforms are foundational — verify correctness before proceeding.

---

## Phase 2: Canvas Container + Gestures

**Goal**: Create the canvas element and gesture handling for pan/zoom.

### Tasks

- [ ] Create `src/editor/canvas/gestures.ts`
  - [ ] Define `GestureHandler` interface
  - [ ] Implement `createGestureHandler()` with pointer event listeners
  - [ ] Handle 1-pointer vs 2-pointer gesture discrimination
  - [ ] Implement pan calculation (average delta of pointers)
  - [ ] Implement zoom calculation (pinch distance ratio)
  - [ ] Return cleanup function
- [ ] Create `src/editor/canvas/Canvas.ts`
  - [ ] Create canvas element and get 2D context
  - [ ] Set up resize observer for responsive sizing
  - [ ] Integrate gesture handler
  - [ ] Manage viewport state
  - [ ] Implement render loop (requestAnimationFrame)
  - [ ] Debounced viewport save to IndexedDB
- [ ] Update `src/editor/canvas/index.ts` with new exports
- [ ] Integrate canvas into `src/editor/init.ts`
  - [ ] Replace placeholder with actual canvas
  - [ ] Load viewport from EditorState
  - [ ] Wire up viewport persistence

### Files Touched

- `src/editor/canvas/gestures.ts` (new)
- `src/editor/canvas/Canvas.ts` (new)
- `src/editor/canvas/index.ts` (modify)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Canvas fills the space between panels
- [ ] Two-finger drag pans the viewport
- [ ] Pinch zooms in/out
- [ ] Zoom is clamped to 0.25-4.0 range
- [ ] Zoom centers on pinch location
- [ ] Pan/zoom feels smooth (no jitter)
- [ ] Viewport is saved to IndexedDB
- [ ] Viewport is restored on page reload
- [ ] No console errors

### Stop Point

Pause for review. Test on real mobile device before proceeding.

---

## Phase 3: Grid Rendering

**Goal**: Add grid overlay that scales with zoom.

### Tasks

- [ ] Create `src/editor/canvas/grid.ts`
  - [ ] Define `GridConfig` interface
  - [ ] Implement `drawGrid()` function
  - [ ] Calculate visible tile range for culling
  - [ ] Draw vertical and horizontal grid lines
  - [ ] Apply color and opacity
- [ ] Integrate grid into `Canvas.ts` render loop
- [ ] Add grid toggle (keyboard 'G' for now, UI in Track 6)
- [ ] Update `src/editor/canvas/index.ts` with GridConfig export
- [ ] Update `INDEX.md` with new canvas files
- [ ] Update `context/schema-registry.md` if needed

### Files Touched

- `src/editor/canvas/grid.ts` (new)
- `src/editor/canvas/Canvas.ts` (modify)
- `src/editor/canvas/index.ts` (modify)
- `INDEX.md` (modify)

### Verification

- [ ] Grid renders on canvas
- [ ] Grid lines align with tile boundaries
- [ ] Grid scales correctly when zooming
- [ ] Grid pans correctly with viewport
- [ ] Grid visibility can be toggled
- [ ] Grid does not cause frame drops
- [ ] `INDEX.md` updated with new files
- [ ] TypeScript compiles without errors

### Stop Point

Phase complete. Track 5 done. Ready for Track 6 (Panels + Tile Picker).

---

## Risk Checkpoints

### Before Phase 2

- Confirm transform functions are correct with unit tests
- Check that existing EditorState schema is compatible

### Before Phase 3

- Test gesture handling on actual mobile device
- Verify no touch event conflicts with browser

### End of Track

- Full manual test of pan/zoom/grid on mobile
- Viewport persistence verified
- Performance acceptable (no frame drops during interaction)

---

## Rollback Plan

If issues arise:
- Phase 1: Low risk, can iterate on transforms
- Phase 2: Keep placeholder UI, debug gestures separately
- Phase 3: Grid can be disabled if performance issues

---

## INDEX.md Updates

After Phase 3, add:

```markdown
### Editor Canvas (Track 5 — exists)
- `src/editor/canvas/viewport.ts`
  - Role: Viewport state and coordinate transforms.
  - Lists of truth: ViewportStateSchema (re-exported from storage)

- `src/editor/canvas/gestures.ts`
  - Role: Pan/zoom gesture handling.
  - Lists of truth: none

- `src/editor/canvas/grid.ts`
  - Role: Grid rendering.
  - Lists of truth: GridConfig (internal)

- `src/editor/canvas/Canvas.ts`
  - Role: Main canvas controller.
  - Lists of truth: none

- `src/editor/canvas/index.ts`
  - Role: Public exports for canvas module.
  - Lists of truth: none
```

---

## Notes

- Grid settings (color, opacity) are hardcoded in this track. User configuration comes in Track 28.
- Touch offset system is deferred to Track 9. Tools will work without it initially.
- Tile rendering is not part of this track (Track 7).
