# Track 5: Canvas System — Specification

## Overview

**Track Number**: 5
**Phase**: 1.1 (Editor Shell)
**Track Type**: Full
**Dependencies**: Track 4 (Boot System)

---

## Goal

Create the central workspace canvas with pan/zoom capabilities and grid overlay. This is the foundation for all visual editing in InRepo Studio.

---

## Intent

The canvas system is the primary interaction surface for the map editor. Users will:
1. View and navigate their tile maps
2. Pan around large maps using two-finger drag
3. Zoom in/out using pinch gestures
4. See a grid overlay to guide tile placement
5. Have their viewport state persist across sessions

The canvas must be mobile-first, with touch interactions that feel native and responsive.

---

## Scope

### Included

1. **Canvas Container**
   - Responsive sizing (fills available space)
   - Touch event handling setup
   - Proper containment for rendering

2. **Pan Gesture**
   - Two-finger drag to pan viewport
   - Smooth, momentum-based feel
   - Bounded to prevent losing the map entirely

3. **Zoom Gesture**
   - Two-finger pinch to zoom
   - Zoom range: 0.25x to 4.0x
   - Zoom toward pinch center

4. **Viewport State**
   - Pan offset (x, y in world coordinates)
   - Zoom level
   - Coordinate transform functions:
     - Screen → World
     - World → Screen
     - World → Tile
     - Tile → World

5. **Grid Rendering**
   - Toggle visibility
   - Configurable color and opacity
   - Scales correctly with zoom

6. **Viewport Persistence**
   - Save viewport to EditorState on meaningful changes
   - Restore on reload

### Excluded

- Tile rendering (Track 7)
- Entity rendering (Track 7)
- Tool interactions (Track 8+)
- Touch offset system (Track 9)
- Panel interactions (Track 6)

---

## Acceptance Criteria

- [ ] Canvas fills the available space between top and bottom panels
- [ ] Two-finger drag pans the viewport smoothly
- [ ] Pinch gesture zooms toward the center of the pinch
- [ ] Zoom is clamped between 0.25x and 4.0x
- [ ] Grid renders correctly at all zoom levels
- [ ] Grid can be toggled on/off
- [ ] Viewport state is saved to IndexedDB on change
- [ ] Viewport state is restored on page reload
- [ ] Performance: Maintains 60fps during pan/zoom on mobile
- [ ] Touch interactions do not conflict with browser gestures

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Touch gesture conflicts with browser | Medium | High | Use preventDefault carefully, test on real devices |
| Performance degradation at extreme zoom | Low | Medium | Implement culling, limit zoom range |
| Viewport state saves too frequently | Medium | Low | Debounce saves |
| Coordinate transform bugs | Medium | High | Unit tests for transform functions |

---

## Technical Notes

### Coordinate Systems

1. **Screen Coordinates**: Pixels from top-left of canvas element
2. **World Coordinates**: Pixels in the virtual world (affected by pan/zoom)
3. **Tile Coordinates**: Grid position (world / tileSize)

### Transform Formulas

```
worldX = (screenX - panX) / zoom
worldY = (screenY - panY) / zoom

screenX = worldX * zoom + panX
screenY = worldY * zoom + panY

tileX = floor(worldX / tileSize)
tileY = floor(worldY / tileSize)
```

### Touch Handling Strategy

- Use pointer events (unified touch/mouse)
- Track active pointers for multi-touch
- Distinguish: 1 pointer = tool action, 2+ pointers = pan/zoom
- Prevent default on canvas to avoid browser scroll/zoom

---

## Dependencies

- **Track 4**: Boot system must initialize editor mode
- **EditorState**: Must include viewport state (already in schema)
- **Hot Storage**: Must support saving/loading EditorState

---

## Success Metrics

- Smooth pan/zoom on iPhone SE (2nd gen) or equivalent Android
- Grid renders without flicker during zoom
- Viewport persists correctly across multiple sessions
