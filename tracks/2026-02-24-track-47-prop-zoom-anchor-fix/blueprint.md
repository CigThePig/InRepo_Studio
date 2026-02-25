# Track 47 — Multi-tile Prop Zoom Anchor Fix — Blueprint

## Technical Design

### Root cause

`drawPropSprite` in `renderer.ts` (line ~231) computes the screen draw position as:

```ts
const worldX = (x - viewport.panX) * viewport.zoom;
const worldY = (y - viewport.panY) * viewport.zoom;
```

`x` and `y` here are raw world-float coordinates from `propSprite.x/y`. For a single tile this is fine because any sub-pixel drift is invisible at the 1 tile scale. For a multi-tile sprite (e.g. a 96×128 image at tileSize=32), the accumulated floating-point error across the sprite's width/height becomes visible as the sprite "shifts" relative to the underlying tile grid when zoom changes.

The fix is to snap `x` and `y` to the tile grid (in world units) before applying zoom:

```ts
// Snap to tile grid in world units to prevent sub-pixel drift on multi-tile sprites
const snappedX = Math.round(x / tileSize) * tileSize;
const snappedY = Math.round(y / tileSize) * tileSize;
const worldX = (snappedX - viewport.panX) * viewport.zoom;
const worldY = (snappedY - viewport.panY) * viewport.zoom;
```

This matches how the tilemap renderer handles tile origin snapping (see `screenTileSize = tileSize * viewport.zoom` at lines ~358, ~432, ~467).

### Files touched

#### Modified files

- **`src/editor/canvas/renderer.ts`**
  - `drawPropSprite` — snap `x/y` to tile grid before computing `worldX/Y`
  - Selection highlight rect (lines ~818–825) — use the same snapped origin when computing the selection bounding box
  - `resolveSpriteSize` — read-only audit; no change expected, but add a comment confirming units are world-pixels

### State flow

No state changes. This is a pure render-path fix. `propSprite.x/y` values in `Scene.propSprites` are unchanged.

### Edge cases

| Scenario | Expected behaviour |
|---|---|
| Prop placed at non-tile-aligned world float (e.g. x=4.7) | Snapped to nearest tile at draw time; stored value unchanged |
| Multi-tile prop with atlas slice | Both atlas and `tileCache` branches apply same snap |
| Single-tile prop (1×1 tile) | Snap is a no-op since floats are already near-integer; no visual change |
| Zoom < 0.5 (very zoomed out) | Same snap logic; no visible impact |

### Verification approach

1. Manual: Place tree (multi-tile) at zoom 1.0. Note position. Zoom to 0.5. Position must match. Zoom to 2.0. Position must match.
2. Manual: Place rock (single-tile). Repeat. Must remain stable.
3. `tsc --noEmit` — no new errors.
