# Track 7: Tilemap Rendering — Plan

## Overview

This plan breaks Track 7 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 3

---

## Phase 1: Tile Cache + Basic Renderer

**Goal**: Create the tile image cache and basic tilemap renderer that draws ground/props layers.

### Tasks

- [ ] Create `src/editor/canvas/tileCache.ts`
  - [ ] Implement TileImageCache interface
  - [ ] Image loading with Promise
  - [ ] Cache key: `${category}:${index}`
  - [ ] `onImageLoad` callback for re-render triggers
  - [ ] Add SCHEMA INVENTORY header
- [ ] Create `src/editor/canvas/renderer.ts`
  - [ ] Implement TilemapRenderer interface
  - [ ] `setScene()` to set current scene
  - [ ] `setActiveLayer()` to track active layer
  - [ ] `render()` method for basic tile rendering
  - [ ] Render ground and props layers only (Phase 1)
  - [ ] Use `getVisibleTileRange()` for culling
  - [ ] Disable image smoothing for pixel art
  - [ ] Add SCHEMA INVENTORY header
- [ ] Update `src/editor/canvas/index.ts` with new exports
- [ ] Update `INDEX.md` with new files

### Files Touched

- `src/editor/canvas/tileCache.ts` (new)
- `src/editor/canvas/renderer.ts` (new)
- `src/editor/canvas/index.ts` (modify)
- `INDEX.md` (modify)

### Verification

- [ ] TileCache loads images from asset paths
- [ ] TileCache returns null for missing images
- [ ] Renderer draws tiles at correct screen positions
- [ ] Culling skips tiles outside viewport
- [ ] Empty tiles (value 0) are not rendered
- [ ] Tiles scale correctly with zoom
- [ ] Image rendering is pixelated (no smoothing)
- [ ] TypeScript compiles without errors

### Stop Point

Pause for review. Test basic tile rendering before adding collision/trigger layers.

---

## Phase 2: Layer Rendering + Dimming

**Goal**: Add collision/trigger layer visualization and layer dimming for inactive layers.

### Tasks

- [ ] Update `src/editor/canvas/renderer.ts`
  - [ ] Add collision layer overlay rendering (red)
  - [ ] Add trigger layer overlay rendering (green)
  - [ ] Implement layer opacity dimming
  - [ ] Apply full opacity to active layer
  - [ ] Apply INACTIVE_LAYER_OPACITY to other layers
  - [ ] Ensure correct layer render order (ground → props → collision → triggers)
- [ ] Update `src/editor/canvas/Canvas.ts`
  - [ ] Add `setScene()` method
  - [ ] Add `setActiveLayer()` method
  - [ ] Integrate renderer into render loop
  - [ ] Call renderer before grid overlay
- [ ] Update `src/editor/canvas/index.ts` if needed
- [ ] Update `src/editor/init.ts`
  - [ ] Pass scene data to canvas on load
  - [ ] Wire active layer changes from top panel to canvas

### Files Touched

- `src/editor/canvas/renderer.ts` (modify)
- `src/editor/canvas/Canvas.ts` (modify)
- `src/editor/canvas/index.ts` (modify if needed)
- `src/editor/init.ts` (modify)

### Verification

- [ ] Ground layer renders first (bottom)
- [ ] Props layer renders on top of ground
- [ ] Collision layer shows red overlay for non-zero tiles
- [ ] Trigger layer shows green overlay for non-zero tiles
- [ ] Active layer at full opacity
- [ ] Inactive layers dimmed to ~40% opacity
- [ ] Switching layer tabs updates dimming immediately
- [ ] Performance stays smooth during pan/zoom
- [ ] TypeScript compiles without errors

### Stop Point

Pause for review. Test layer rendering and dimming on mobile before adding hover.

---

## Phase 3: Hover Highlight + Integration

**Goal**: Add tile hover highlight and complete integration with editor state.

### Tasks

- [ ] Update `src/editor/canvas/renderer.ts`
  - [ ] Add `setHoverTile(x, y)` method
  - [ ] Implement hover highlight rendering
  - [ ] Clamp hover to scene bounds
  - [ ] Draw highlight after all layers
- [ ] Update `src/editor/canvas/Canvas.ts`
  - [ ] Track tool gesture position for hover
  - [ ] Apply touch offset (TOUCH_OFFSET_Y)
  - [ ] Convert screen position to tile coordinates
  - [ ] Update renderer hover on move
  - [ ] Clear hover on gesture end
  - [ ] Add `invalidateScene()` method for external updates
- [ ] Update `src/editor/init.ts`
  - [ ] Preload tile images on startup
  - [ ] Re-render canvas when images finish loading
  - [ ] Wire scene changes to canvas invalidation
- [ ] Update `INDEX.md` with complete file descriptions
- [ ] Update `context/repo-map.md` with renderer module
- [ ] Ensure TilePicker uses shared tileCache (or note as future refactor)

### Files Touched

- `src/editor/canvas/renderer.ts` (modify)
- `src/editor/canvas/Canvas.ts` (modify)
- `src/editor/init.ts` (modify)
- `INDEX.md` (modify)
- `context/repo-map.md` (modify)

### Verification

- [ ] Hover highlight appears when touching canvas
- [ ] Highlight follows touch with offset above finger
- [ ] Highlight snaps to tile grid
- [ ] Highlight stays within scene bounds
- [ ] Highlight disappears when touch ends
- [ ] Tiles re-render when images finish loading
- [ ] Scene changes trigger re-render
- [ ] `INDEX.md` lists tileCache.ts and renderer.ts
- [ ] `repo-map.md` describes renderer module
- [ ] Full manual test on mobile device
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Phase complete. Track 7 done. Ready for Track 8 (Paint Tool).

---

## Risk Checkpoints

### Before Phase 1

- Confirm asset path resolution works (e.g., `/game/assets/tiles/terrain/grass.png`)
- Verify scene data is available from hot storage

### Before Phase 2

- Test tile cache loading with actual tile images
- Confirm viewport coordinate transforms work at various zoom levels

### Before Phase 3

- Test touch event coordinates
- Verify touch offset feels natural on mobile

### End of Track

- Full manual test on mobile device
- All layers render correctly
- Hover highlight works with touch offset
- Performance is smooth (60fps target)
- Scene boundary is respected

---

## Rollback Plan

If issues arise:
- Phase 1: Remove tileCache.ts and renderer.ts, revert canvas
- Phase 2: Keep tile cache, disable layer rendering
- Phase 3: Keep layers, disable hover highlight

---

## INDEX.md Updates

After Phase 3, add/update:

```markdown
- `src/editor/canvas/tileCache.ts`
  - Role: Shared tile image cache for renderer and picker.
  - Lists of truth: none

- `src/editor/canvas/renderer.ts`
  - Role: Tilemap and layer rendering with culling and dimming.
  - Lists of truth: LAYER_RENDER_ORDER, LAYER_COLORS
```

---

## Repo Map Updates

After Phase 3, add to `context/repo-map.md` under Editor:

```markdown
- `canvas/tileCache.ts`
  - Role: Tile image loading and caching
- `canvas/renderer.ts`
  - Role: Tilemap rendering with layer support
```

---

## Notes

- TilePicker has its own image cache; consider sharing in a future refactor
- Touch offset (48px) can be made configurable in Track 28
- Collision/trigger overlays are simple colored rectangles (no tile images needed)
- Scene boundary visualization (dashed border) can be added as polish in Track 9 or later
