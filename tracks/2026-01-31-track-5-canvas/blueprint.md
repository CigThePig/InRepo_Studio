# Track 5: Canvas System — Blueprint

## Overview

This blueprint describes the technical design for the canvas system. It covers file structure, APIs, state management, and integration points.

**NO CODE** — Implementation details only.

---

## File Structure

```
src/editor/canvas/
├── AGENTS.md          # (exists) Local rules for canvas module
├── viewport.ts        # Viewport state and transforms
├── gestures.ts        # Pan/zoom gesture handling
├── grid.ts            # Grid rendering
├── Canvas.ts          # Main canvas component/controller
└── index.ts           # Public exports
```

---

## Module Responsibilities

### viewport.ts

**Purpose**: Manage viewport state and coordinate transforms.

**State**:
```
ViewportState {
  panX: number      // World offset X (pixels)
  panY: number      // World offset Y (pixels)
  zoom: number      // Zoom level (0.25 to 4.0)
}
```

**Functions**:
- `createViewport(initial?: Partial<ViewportState>): ViewportState`
- `screenToWorld(viewport, screenX, screenY): { x, y }`
- `worldToScreen(viewport, worldX, worldY): { x, y }`
- `worldToTile(worldX, worldY, tileSize): { x, y }`
- `tileToWorld(tileX, tileY, tileSize): { x, y }`
- `clampZoom(zoom): number` — Enforce 0.25-4.0 range
- `clampPan(viewport, bounds): ViewportState` — Optional bounds enforcement

**Constants**:
- `MIN_ZOOM = 0.25`
- `MAX_ZOOM = 4.0`
- `DEFAULT_ZOOM = 1.0`

---

### gestures.ts

**Purpose**: Handle multi-touch gestures for pan and zoom.

**State (internal)**:
- Active pointer map: `Map<pointerId, { x, y }>`
- Gesture state: `'idle' | 'pan' | 'zoom' | 'tool'`
- Initial pinch distance (for zoom calculation)
- Initial pinch center (for zoom-toward-center)

**Interface**:
```
GestureHandler {
  onPan(deltaX, deltaY): void
  onZoom(scale, centerX, centerY): void
  onToolStart(x, y): void
  onToolMove(x, y): void
  onToolEnd(): void
}

createGestureHandler(canvas: HTMLElement, handler: GestureHandler): Cleanup
```

**Behavior**:
1. `pointerdown`: Add to active pointers
   - 1 pointer: Start tool gesture (after 150ms or movement threshold)
   - 2 pointers: Start pan/zoom gesture
2. `pointermove`: Update positions
   - 1 pointer: Tool move (if in tool mode)
   - 2 pointers: Calculate pan delta + zoom scale
3. `pointerup` / `pointercancel`: Remove from active pointers
   - If returning to 1 pointer from 2+: Reset gesture state

**Pan Calculation**:
- Delta = average movement of all active pointers
- Apply delta to viewport.panX, viewport.panY

**Zoom Calculation**:
- Distance = distance between two touch points
- Scale = currentDistance / initialDistance
- Zoom toward center of the two touches

---

### grid.ts

**Purpose**: Render grid lines on the canvas.

**State**:
```
GridConfig {
  visible: boolean
  color: string       // CSS color (e.g., '#ffffff')
  opacity: number     // 0.0 to 1.0
  lineWidth: number   // In screen pixels
}
```

**Functions**:
- `drawGrid(ctx, viewport, tileSize, canvasWidth, canvasHeight, config): void`

**Algorithm**:
1. Calculate visible tile range based on viewport
2. Only draw lines for visible tiles (culling)
3. Transform tile coordinates to screen coordinates
4. Draw vertical lines for each tile column
5. Draw horizontal lines for each tile row
6. Apply opacity and color from config

**Performance**:
- Skip rendering if not visible
- Batch line drawing
- Use integer coordinates for crisp lines

---

### Canvas.ts

**Purpose**: Main canvas controller that orchestrates viewport, gestures, and rendering.

**State**:
- `viewport: ViewportState`
- `gridConfig: GridConfig`
- `isDirty: boolean` — Tracks if re-render is needed
- `canvasEl: HTMLCanvasElement`
- `ctx: CanvasRenderingContext2D`

**Lifecycle**:
1. `createCanvas(container: HTMLElement): CanvasController`
2. `destroy(): void` — Cleanup listeners

**Methods**:
- `setViewport(viewport: ViewportState): void`
- `getViewport(): ViewportState`
- `setGridConfig(config: Partial<GridConfig>): void`
- `resize(): void` — Handle container size changes
- `render(): void` — Main render loop (called on RAF when dirty)

**Integration with gestures.ts**:
- Creates gesture handler with callbacks that update viewport
- Marks dirty and triggers render on changes

**Integration with storage**:
- Load initial viewport from EditorState
- Save viewport on changes (debounced)

---

### index.ts

**Public Exports**:
```
export { createCanvas, type CanvasController } from './Canvas'
export { screenToWorld, worldToScreen, worldToTile, tileToWorld } from './viewport'
export type { ViewportState, GridConfig } from './viewport'
```

---

## Integration Points

### With src/editor/init.ts

```
// In initEditor():
import { createCanvas } from '@/editor/canvas'

const canvasContainer = document.getElementById('canvas-container')
const canvas = createCanvas(canvasContainer)

// Load saved viewport
const editorState = await loadEditorState()
canvas.setViewport(editorState.viewport)

// Save viewport on changes
canvas.onViewportChange((viewport) => {
  editorState.viewport = viewport
  saveEditorState(editorState)  // debounced
})
```

### With src/storage/hot.ts

- `ViewportState` interface already exists
- `loadEditorState()` returns viewport
- `saveEditorState()` persists viewport

---

## State Flow

```
User Touch
    ↓
gestures.ts (pointer events)
    ↓
Gesture Detection (1 finger vs 2+ fingers)
    ↓
  ┌─────────────────┐
  │ 2+ fingers      │ → Pan/Zoom callbacks
  │ 1 finger        │ → Tool callbacks (passed up)
  └─────────────────┘
    ↓
Canvas.ts updates viewport
    ↓
Mark dirty → requestAnimationFrame
    ↓
render() → clear → drawGrid → (future: drawTiles, drawEntities)
    ↓
Debounced save to IndexedDB
```

---

## Error Handling

- **Canvas creation fails**: Show error message, allow retry
- **Context unavailable**: Fallback error state
- **Pointer events unsupported**: Fallback to touch/mouse events (not expected on modern mobile)

---

## Performance Considerations

1. **Render Loop**
   - Use `requestAnimationFrame` for smooth updates
   - Only render when dirty flag is set
   - Clear dirty flag after render

2. **Grid Rendering**
   - Cull lines outside visible area
   - Use Path2D for batched drawing if beneficial
   - Avoid re-creating paths every frame

3. **Viewport Saves**
   - Debounce to avoid excessive IndexedDB writes
   - Only save on significant changes (pan > 1px, zoom > 0.01)

4. **Gesture Handling**
   - Use passive event listeners where possible
   - Batch pointer updates in animation frame

---

## Testing Strategy

### Unit Tests
- `viewport.ts`: Transform function correctness
- `grid.ts`: Culling logic (which lines should be drawn)

### Integration Tests
- Canvas creation and initialization
- Viewport persistence round-trip

### Manual Tests
- Pan/zoom on real mobile device
- Grid visibility toggle
- Viewport restoration after reload
- Performance profiling during rapid pan/zoom

---

## Schema Updates

### ViewportState (already exists in hot.ts)

No changes needed — existing schema is compatible:
```
interface ViewportState {
  panX: number
  panY: number
  zoom: number
}
```

### GridConfig (new, internal to canvas)

Not persisted in this track. Grid settings will be added in Track 28 (Editor Settings).

---

## Open Questions

1. **Should grid config be part of EditorState now or later?**
   - Decision: Later (Track 28). Use hardcoded defaults for now.

2. **Should we support keyboard pan/zoom for desktop?**
   - Decision: Not in this track. Focus on touch-first mobile experience.

3. **Should viewport bounds be enforced?**
   - Decision: Optional. Allow free panning initially, can add bounds later.
