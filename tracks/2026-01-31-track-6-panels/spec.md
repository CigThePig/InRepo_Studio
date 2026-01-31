# Track 6: Panels + Tile Picker — Specification

## Overview

**Track Number**: 6
**Phase**: 1.2, 1.3, 2.1 (Editor Shell + Tilemap Basics)
**Track Type**: Full
**Dependencies**: Track 5 (Canvas System)

---

## Goal

Create the collapsible editor panels (top and bottom) and a minimal tile picker that allows users to select tiles for painting. This establishes the UI shell for the editor.

---

## Intent

The panels provide the core navigation and tool interface for InRepo Studio:
1. **Top Panel**: Scene info, layer switcher, and (eventually) deploy button
2. **Bottom Panel**: Tool selector and tile picker for map editing
3. **Tile Picker**: Browse tile categories and select individual tiles

The UI must be mobile-first with touch-friendly controls and bottom sheets that work well on phones.

---

## Scope

### Included

1. **Top Panel**
   - Collapsible header (tap to expand/collapse)
   - Scene name display
   - Layer selector tabs (Ground, Objects, Collision, Trigger)
   - Active layer indicator
   - Collapse state persisted

2. **Bottom Panel**
   - Collapsible toolbar container
   - Tool buttons (Select, Paint, Erase, Entity)
   - Active tool indicator
   - Tile picker section (when Paint or Erase selected)
   - Collapse state persisted

3. **Tile Picker**
   - Category tabs (from project.tileCategories)
   - Scrollable tile grid
   - Tile selection (single tile)
   - Selected tile highlight
   - Tile image loading from assets

4. **Panel State Persistence**
   - Save panel expanded/collapsed states to EditorState
   - Save selected tool to EditorState
   - Restore on reload

### Excluded

- Entity palette (Track 19)
- Property inspector (Track 22)
- Deploy button functionality (Track 13)
- Scene switching (Track 17)
- Layer visibility/lock toggles (Track 18)
- Undo/redo buttons (Track 16)

---

## Acceptance Criteria

- [ ] Top panel expands/collapses with tap
- [ ] Bottom panel expands/collapses with tap
- [ ] Panel states persist across page reload
- [ ] Tool buttons are visible and tappable (44x44px min)
- [ ] Selecting a tool updates active tool indicator
- [ ] Tool selection persists across reload
- [ ] Tile categories display as tabs
- [ ] Tile grid shows tile images from the selected category
- [ ] Tapping a tile selects it (visual highlight)
- [ ] Selected tile state available for paint tool (Track 8)
- [ ] UI remains usable in portrait mode on phones
- [ ] No layout overflow or horizontal scroll

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Touch targets too small | Medium | High | Enforce 44x44px minimum |
| Panel heights conflict with keyboard | Low | Medium | Defer keyboard handling |
| Tile loading slow for many tiles | Low | Medium | Lazy load visible tiles |
| Layout breaks on narrow screens | Medium | Medium | Test on 320px width |

---

## Technical Notes

### Panel Layout Strategy

```
+------------------------+
|      Top Panel         |  48px collapsed / 120px expanded
|  [Scene] [Layers tabs] |
+------------------------+
|                        |
|       Canvas           |  flex: 1
|                        |
+------------------------+
|     Bottom Panel       |  60px collapsed / 200px expanded
| [Tools] [Tile Picker]  |
+------------------------+
```

### Touch Target Sizes

- Tool buttons: 44x44px minimum
- Tile cells: 48x48px (fits 32px tile with padding)
- Tab buttons: 44px height minimum
- Collapse toggle: Full panel width tap target

### Layer Mapping

Layers correspond to LayerType from scene schema:
- `ground` (0) — base terrain layer
- `objects` (1) — decorative/interactive layer
- `collision` (2) — physics collision layer
- `trigger` (3) — event trigger layer

### Tool Buttons

Tools to show (from EditorState.currentTool type):
- Select (default)
- Paint
- Erase
- Entity

---

## Dependencies

- **Track 5**: Canvas system provides workspace area
- **EditorState**: Panel states and tool selection already in schema
- **Project**: Tile categories from project.json
- **Assets**: Tile images loaded via fetch

---

## Success Metrics

- Panel expand/collapse is responsive (< 100ms animation)
- All tool buttons and tiles reachable without zooming
- State persists correctly across 3+ reload cycles
