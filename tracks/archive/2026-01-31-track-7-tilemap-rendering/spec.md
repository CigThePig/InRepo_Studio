# Track 7: Tilemap Rendering — Spec

## Goal

Display the current map state on the canvas with proper layer rendering, culling, and visual feedback for the active layer and tile hover.

## User Story

As a mobile game developer using InRepo Studio, I want to see my tilemap rendered on the canvas so that I can visualize my level design and see the tiles I've placed on each layer.

## Scope

### In Scope

1. **Tilemap Renderer**: Draw tiles from scene data onto the canvas
2. **Layer Rendering Order**: Render layers in correct z-order (ground → props → collision → triggers)
3. **Visible Tile Culling**: Only render tiles that are within the viewport
4. **Collision/Trigger Visualization**: Display collision and trigger layers with distinct visual styles
5. **Layer Opacity (Dim Inactive)**: Reduce opacity of non-active layers to focus on current editing layer
6. **Tile Hover Highlight**: Show a visual indicator for the tile under the cursor/touch

### Out of Scope (deferred)

- Tile placement/painting (Track 8)
- Erasing tiles (Track 14)
- Layer visibility toggle (Track 18)
- Layer lock toggle (Track 18)
- Entity rendering (Track 20)
- Performance optimization / chunking (Track 27)

## Acceptance Criteria

1. **Layer Rendering**
   - [ ] All four layers render in correct order (ground first, triggers last)
   - [ ] Empty tiles (value 0) are transparent
   - [ ] Tiles render at correct world positions based on tileSize

2. **Viewport Culling**
   - [ ] Only visible tiles are drawn (tiles outside viewport are skipped)
   - [ ] Culling uses existing `getVisibleTileRange()` from viewport.ts
   - [ ] Scene boundary is respected (no rendering outside scene dimensions)

3. **Collision/Trigger Visualization**
   - [ ] Collision layer renders as semi-transparent colored overlay (e.g., red)
   - [ ] Trigger layer renders as semi-transparent colored overlay (e.g., green)
   - [ ] Non-zero values in collision/trigger show the overlay

4. **Layer Dimming**
   - [ ] Non-active layers render at reduced opacity (e.g., 0.4)
   - [ ] Active layer renders at full opacity (1.0)
   - [ ] Layer dimming updates when active layer changes

5. **Hover Highlight**
   - [ ] A highlight box appears over the tile under the touch/cursor
   - [ ] Highlight respects touch offset (shows above finger)
   - [ ] Highlight updates as touch moves
   - [ ] Highlight disappears when touch ends

6. **Performance**
   - [ ] 60fps during normal pan/zoom with typical scene (20x15 tiles)
   - [ ] No visible jank when switching layers

7. **Integration**
   - [ ] Renderer integrates with existing Canvas controller
   - [ ] Uses tile images loaded by TilePicker's image cache
   - [ ] Responds to scene data changes (re-renders when scene updates)

## Risks

1. **Performance**: Large scenes or many unique tiles may cause frame drops
   - Mitigation: Implement visible-tile culling; defer chunking to Track 27

2. **Image Loading**: Tile images may not be loaded when renderer starts
   - Mitigation: Handle missing images gracefully; re-render when images load

3. **Coordinate Precision**: Rounding errors in coordinate transforms may cause tile misalignment
   - Mitigation: Use floor() consistently; test at various zoom levels

## Verification

- Manual: Pan/zoom around the map, verify tiles render correctly
- Manual: Switch active layer, verify dimming effect
- Manual: Touch canvas, verify hover highlight follows touch
- Automated: Unit test for visible tile range calculation
- Automated: Unit test for GID to tile image resolution

## Dependencies

- Track 5 (Canvas System): viewport, coordinate transforms
- Track 6 (Panels + Tile Picker): tile image loading, active layer state
- Track 2 (Hot Storage): scene data loading

## Notes

- GID (Global ID) system: Scene stores tile indices that reference tilesets
- For initial implementation, assume tiles are 1-indexed per category (0 = empty)
- Collision/trigger layers use a simple non-zero check for visualization
- Touch offset for hover highlight should use the same offset as the paint tool will use
