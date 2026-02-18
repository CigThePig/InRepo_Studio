# Track 15: Select Tool — Spec

## Goal

Enable tile region selection and manipulation on the map, including rectangular selection, move, copy/paste, delete, and flood fill operations.

## User Story

As a mobile game developer using InRepo Studio, I want to select regions of tiles and manipulate them (move, copy, paste, delete, fill) so that I can efficiently edit large areas of my level.

## Scope

### In Scope

1. **Rectangular Selection**: Drag to create a rectangular selection box
2. **Move Selection**: Drag selected tiles to a new position
3. **Copy/Paste Selection**: Copy selected tiles and paste them elsewhere
4. **Delete Selection**: Remove all tiles in the selection
5. **Flood Fill**: Fill an area with the selected tile (respects boundaries)
6. **Selection Visualization**: Clear visual indication of selected region
7. **Clipboard Management**: Internal clipboard for copy/paste operations

### Out of Scope (deferred)

- Multi-layer selection (select affects active layer only)
- Cross-scene copy/paste
- Selection from multiple rectangles
- Undo/redo of selection operations (Track 16)
- Entity selection (Track 21)
- Lasso or irregular selection shapes

## Acceptance Criteria

1. **Rectangular Selection**
   - [ ] Drag creates a visible selection rectangle
   - [ ] Selection respects touch offset for visibility
   - [ ] Selection snaps to tile boundaries
   - [ ] Selection can be cancelled by tapping outside

2. **Move Selection**
   - [ ] Long-press on selection enables move mode
   - [ ] Dragging moves the selection preview
   - [ ] Releasing places tiles at new position
   - [ ] Original tiles are cleared (cut behavior)

3. **Copy/Paste**
   - [ ] Copy button captures selected tiles to clipboard
   - [ ] Paste places clipboard contents at tap position
   - [ ] Multiple pastes possible from single copy
   - [ ] Clipboard persists until next copy

4. **Delete Selection**
   - [ ] Delete button clears all tiles in selection
   - [ ] Sets all selected tile values to 0
   - [ ] Auto-saves after delete

5. **Flood Fill**
   - [ ] Tap with fill mode fills connected area
   - [ ] Fill respects tile boundaries (same tile type)
   - [ ] Fill uses currently selected tile
   - [ ] Works on active layer only

6. **Selection Actions UI**
   - [ ] Action buttons appear when selection exists
   - [ ] Actions: Move, Copy, Paste, Delete, Fill
   - [ ] Actions bar positioned near selection or in panel

7. **Persistence**
   - [ ] All operations auto-save to IndexedDB
   - [ ] Selection state does not persist across reload

## Risks

1. **Large Selection Performance**: Moving many tiles may lag
   - Mitigation: Limit selection size or warn for large operations

2. **Touch UX Complexity**: Many gestures needed (select, move, pan)
   - Mitigation: Clear mode indicators, long-press for move

3. **Flood Fill Performance**: Large fills could be slow
   - Mitigation: Limit fill area or use async batching

4. **Clipboard Size**: Large selections in memory
   - Mitigation: Only store affected region, not full scene

## Verification

- Manual: Drag to select region, verify visual feedback
- Manual: Move selected tiles to new position
- Manual: Copy selection, paste elsewhere
- Manual: Delete selection, verify tiles removed
- Manual: Flood fill area, verify boundaries respected
- Automated: Unit tests for selection bounds calculation
- Automated: Unit tests for flood fill algorithm

## Dependencies

- Track 8 (Paint Tool): tile placement patterns
- Track 14 (Erase Tool): tile clearing patterns
- Track 7 (Tilemap Rendering): canvas rendering
- Track 2 (Hot Storage): scene persistence

## Notes

- Selection operates on active layer only
- Move is effectively cut+paste in one operation
- Flood fill uses standard 4-connected algorithm
- Consider selection handles for resize (future enhancement)
- Copy/paste clipboard is session-only, not persisted
