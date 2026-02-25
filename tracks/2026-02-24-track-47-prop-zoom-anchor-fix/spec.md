# Track 47 — Multi-tile Prop Zoom Anchor Fix

## Intent

Fix multi-tile prop sprites shifting position when the viewport zoom changes. Single-tile props are stable; the bug is isolated to multi-tile props and is reproducible with any asset whose source rect is larger than one tile (e.g. a tree spanning 2×3 tiles).

Authority: `src/editor/canvas/renderer.ts` (`drawPropSprite`, `resolveSpriteSize`), `src/editor/canvas/viewport.ts` (`worldToTile`, `tileToWorld`).

## Scope

### In scope

1. **Root-cause fix in `drawPropSprite`** (`renderer.ts` ~line 231) — the draw origin currently computes `worldX/Y` from `propSprite.x/y` directly, then scales by `viewport.zoom`. For multi-tile sprites this produces a sub-pixel offset when `tileSize × zoom` is not an integer. The fix must snap the draw origin to the nearest world grid boundary before applying zoom.

2. **`resolveSpriteSize` audit** — confirm the returned `width`/`height` values for atlas slices are always in world-pixel (unzoomed) units, not screen-pixel units. If they are already screen-pixel by accident the selection highlight box (lines ~818–820) will also be misaligned.

3. **Selection highlight rectangle** — the bounding box drawn when a prop is selected must use the same corrected origin and dimensions to avoid visual drift from the actual prop.

4. **Manual repro check** — place a multi-tile tree prop, zoom in and out. Position must not change. Place a single-tile rock prop and confirm it remains stable too.

### Out of scope

- Prop placement snapping UX redesign.
- Any changes to `viewport.ts` coordinate utility functions (they are correct — the bug is in the caller).
- Animated tile or entity placement anchoring.

## Acceptance criteria

- [ ] Multi-tile prop (e.g. tree, 2×3 tiles) placed at world coordinate (4, 6) renders at the same screen position at zoom 0.5, 1.0, and 2.0
- [ ] Single-tile prop (e.g. rock) continues to render stably at all zoom levels
- [ ] Selection highlight rectangle matches the prop sprite bounds at all zoom levels
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `context/active-track.md` cleared after completion
- [ ] `context/history.md` updated with Track 47 entry

## Risks

- **Atlas vs image code path** — `drawPropSprite` has two branches (atlas slice vs `tileCache` image). The anchor fix must be applied to both branches, or the bug will re-appear when using non-atlased assets. (MEDIUM)
- **Prop placement coordinate storage** — `propSprite.x/y` are stored as world-unit floats in `Scene.propSprites`. If the fix introduces rounding at draw time only (not at storage time), placements will remain accurate but may look slightly different from what was intended. This is acceptable for this track. (LOW)
