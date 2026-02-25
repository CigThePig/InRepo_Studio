# Track 47 — Multi-tile Prop Zoom Anchor Fix — Plan

## Phase 1 — Audit + Fix

**Goal**: Understand both code paths in `drawPropSprite` and apply the grid-snap fix to both.

### Tasks

- [ ] Read `renderer.ts` lines 223–260 (`resolveSpriteSize` + `drawPropSprite`) in full
- [ ] Confirm both the atlas-slice branch and the `tileCache` image branch exist
- [ ] Apply tile-grid snap to `x/y` before `worldX/Y` computation — same fix in both branches
- [ ] Audit `resolveSpriteSize` — confirm returned units are world-pixels (not screen-pixels); add comment
- [ ] Fix selection highlight rect (lines ~818–825) to use snapped origin

### Files touched
- `src/editor/canvas/renderer.ts`

### Verification
- [ ] Multi-tile prop stable across zoom levels (manual test)
- [ ] Single-tile prop still stable (regression check)
- [ ] Selection box matches prop bounds at all zoom levels
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 2 — Closeout

### Tasks

- [ ] Update `context/active-track.md` — clear active track
- [ ] Append Track 47 entry to `context/history.md`

### Files touched
- `context/active-track.md`
- `context/history.md`

### Stop point ✋
