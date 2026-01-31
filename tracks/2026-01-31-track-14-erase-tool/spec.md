# Track 14: Erase Tool — Spec

## Goal

Enable tile erasing on the map with touch input, mirroring the paint tool's behavior but clearing tiles instead of placing them. Supports single-tap erase, drag erasing, and erase brush size.

## User Story

As a mobile game developer using InRepo Studio, I want to erase tiles from my map by touching the canvas so that I can correct mistakes and refine my level design.

## Scope

### In Scope

1. **Single Tile Erase**: Tap to remove a tile at the touch position
2. **Drag Erasing**: Erase continuous tiles while dragging
3. **Erase on Active Layer**: Erasing affects the currently selected layer
4. **Touch Offset System**: Erase position is offset above finger for visibility
5. **Erase Brush Size**: Optional 1x1, 2x2, 3x3 brush sizes (default 1x1)
6. **Auto-save After Erase**: Changes persist to IndexedDB automatically
7. **Undo/Redo Integration**: Prepare for Track 16 integration

### Out of Scope (deferred)

- Undo/redo implementation (Track 16)
- Erasing entities (Track 21)
- Layer-wide clear (Track 17 or future)

## Acceptance Criteria

1. **Tile Erasing**
   - [ ] Tapping canvas erases the tile at the offset position
   - [ ] Erasing only works when erase tool is active
   - [ ] Erase position respects touch offset (above finger)

2. **Drag Erasing**
   - [ ] Dragging erases tiles continuously along the path
   - [ ] No gaps when dragging quickly (line interpolation)
   - [ ] Drag erasing ends when finger lifts

3. **Layer Behavior**
   - [ ] Erases from the active layer (EditorState.activeLayer)
   - [ ] Ground/props layers: tile value set to 0 (empty)
   - [ ] Collision layer: value set to 0 (cleared)
   - [ ] Trigger layer: value set to 0 (cleared)

4. **Brush Size**
   - [ ] Default brush size is 1x1
   - [ ] UI control to switch between 1x1, 2x2, 3x3
   - [ ] Brush size applies to both tap and drag operations
   - [ ] Brush preview shows affected area

5. **Persistence**
   - [ ] Scene data updates in memory immediately
   - [ ] Scene auto-saves to IndexedDB after erase operation
   - [ ] Save is debounced (not every pixel)
   - [ ] Data persists across page reload

6. **Canvas Update**
   - [ ] Canvas re-renders immediately after erasing
   - [ ] Erased tiles disappear from correct position
   - [ ] Hover highlight shows where erasing will occur

7. **Tool Integration**
   - [ ] Erase tool activates when toolbar "erase" button is selected
   - [ ] Other tools do not erase tiles
   - [ ] Tile picker remains visible for erase tool (per existing behavior)

## Risks

1. **Accidental Erases When Panning**: May erase when trying to pan
   - Mitigation: Gesture handler distinguishes single vs two-finger (same as paint)

2. **Brush Size UI Space**: Toolbar may get crowded with brush size control
   - Mitigation: Use compact selector or move to expanded panel content

3. **Undo Integration Complexity**: Need to capture erase operations for Track 16
   - Mitigation: Design operation capture pattern now, implement in Track 16

4. **Brush Cursor Performance**: Large brush preview may lag
   - Mitigation: Simple rectangle overlay, not per-tile rendering

## Verification

- Manual: Select erase tool, tap canvas, verify tile removed
- Manual: Drag across canvas, verify continuous erasure
- Manual: Refresh page, verify erasures persist
- Manual: Switch layers, verify erase works on correct layer
- Manual: Test 2x2 and 3x3 brush sizes
- Automated: Unit test for tile erasing logic
- Automated: Unit test for brush size calculations

## Dependencies

- Track 8 (Paint Tool): Similar architecture, reuse patterns
- Track 7 (Tilemap Rendering): canvas rendering, hover highlight
- Track 2 (Hot Storage): scene persistence

## Notes

- Erase always sets tile value to 0 regardless of layer type
- Touch offset should match the paint tool offset for consistency
- Brush size UI can be added to the bottom panel toolbar area
- Consider shared tool utilities module for paint/erase common code
