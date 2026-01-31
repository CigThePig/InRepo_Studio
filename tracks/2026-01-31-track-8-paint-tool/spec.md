# Track 8: Paint Tool — Spec

## Goal

Enable tile painting on the map with touch input, including single-tap placement and drag-to-paint continuous lines. Changes auto-save to IndexedDB.

## User Story

As a mobile game developer using InRepo Studio, I want to paint tiles onto my map by touching the canvas so that I can build my level design efficiently.

## Scope

### In Scope

1. **Single Tile Paint**: Tap to place a tile at the touch position
2. **Drag Painting**: Paint continuous tiles while dragging
3. **Paint to Active Layer**: Tiles go on the currently selected layer
4. **Touch Offset System**: Paint position is offset above finger for visibility
5. **Auto-save After Paint**: Changes persist to IndexedDB automatically

### Out of Scope (deferred)

- Erasing tiles (Track 14)
- Undo/redo (Track 16)
- Brush size (Track 9/14)
- Fill tool (Track 15)
- Entity placement (Track 20)

## Acceptance Criteria

1. **Tile Placement**
   - [ ] Tapping canvas places the selected tile at the offset position
   - [ ] Selected tile comes from EditorState.selectedTile
   - [ ] Painting only works when paint tool is active
   - [ ] Paint position respects touch offset (above finger)

2. **Drag Painting**
   - [ ] Dragging paints tiles continuously along the path
   - [ ] No gaps when dragging quickly (line interpolation)
   - [ ] Drag painting ends when finger lifts

3. **Layer Behavior**
   - [ ] Tiles paint to the active layer (EditorState.activeLayer)
   - [ ] Ground/props layers accept tile values
   - [ ] Collision layer accepts value 1 (filled) when painting
   - [ ] Trigger layer accepts value 1 (filled) when painting

4. **Persistence**
   - [ ] Scene data updates in memory immediately
   - [ ] Scene auto-saves to IndexedDB after paint operation
   - [ ] Save is debounced (not every pixel)
   - [ ] Data persists across page reload

5. **Canvas Update**
   - [ ] Canvas re-renders immediately after painting
   - [ ] Painted tiles appear in correct position
   - [ ] Hover highlight shows where tile will be placed

6. **Tool Integration**
   - [ ] Paint tool activates when toolbar "paint" button is selected
   - [ ] Other tools do not paint tiles

## Risks

1. **Touch Offset Feels Wrong**: May need calibration
   - Mitigation: Use same offset as hover highlight (Track 7); make configurable in Track 28

2. **Accidental Paints When Panning**: May paint when trying to pan
   - Mitigation: Gesture handler already distinguishes single vs two-finger

3. **Gaps in Drag Paint**: Fast drags may skip tiles
   - Mitigation: Implement Bresenham line algorithm for interpolation

4. **Performance**: Many tiles painted quickly could cause lag
   - Mitigation: Debounce save; batch render updates

## Verification

- Manual: Select tile, tap canvas, verify tile appears
- Manual: Drag across canvas, verify continuous line
- Manual: Refresh page, verify tiles persist
- Manual: Switch layers, verify paint goes to correct layer
- Automated: Unit test for tile placement logic
- Automated: Unit test for line interpolation

## Dependencies

- Track 6 (Panels + Tile Picker): tile selection, tool state
- Track 7 (Tilemap Rendering): canvas rendering, hover highlight
- Track 2 (Hot Storage): scene persistence

## Notes

- Collision/trigger layers use value 1 for "filled" (not tile indices)
- For ground/props, tile value = selectedTile.index + 1 (0 is empty)
- Touch offset should match the hover highlight offset from Track 7
