# Track 8: Paint Tool — Blueprint

## Overview

This blueprint details the technical design for the paint tool, enabling tile placement via touch input. The tool integrates with the existing gesture system, scene data, and auto-save.

---

## Architecture

### Module Structure

```
src/editor/tools/
├── paint.ts         # NEW - Paint tool logic
└── AGENTS.md        # EXISTING - Tool rules
```

### Data Flow

```
Touch Start/Move (Canvas gesture handler)
    ↓
Check: is currentTool === 'paint'?
    ↓
If yes:
    Screen position → Apply touch offset → Tile coordinates
    ↓
    Get tile value from selectedTile
    ↓
    Update scene.layers[activeLayer][y][x]
    ↓
    Trigger canvas re-render
    ↓
    Schedule auto-save (debounced)
```

---

## Detailed Design

### 1. Paint Tool Module (`paint.ts`)

**Interface:**

```typescript
interface PaintToolConfig {
  /** Get current editor state */
  getEditorState: () => EditorState;

  /** Get current scene */
  getScene: () => Scene | null;

  /** Callback to trigger scene save */
  onSceneChange: (scene: Scene) => void;

  /** Touch offset in pixels (negative = above finger) */
  touchOffsetY: number;
}

interface PaintTool {
  /** Handle paint start (tap or drag begin) */
  start(screenX: number, screenY: number, viewport: ViewportState): void;

  /** Handle paint move (drag) */
  move(screenX: number, screenY: number, viewport: ViewportState): void;

  /** Handle paint end (finger lift) */
  end(): void;
}

function createPaintTool(config: PaintToolConfig): PaintTool;
```

**Constants:**

```typescript
const TOUCH_OFFSET_Y = -48; // Matches renderer constant
```

### 2. Tile Value Calculation

**For Ground/Props Layers:**
- Tile value = `selectedTile.index + 1`
- Value 0 means empty; tile indices are 1-based in layer data

**For Collision/Trigger Layers:**
- Tile value = `1` (filled)
- These layers don't use tile images, just on/off state

**Code:**

```typescript
function getTileValue(layer: LayerType, selectedTile: SelectedTile | null): number {
  if (layer === 'collision' || layer === 'triggers') {
    return 1; // Binary filled state
  }

  if (!selectedTile) {
    return 0; // No tile selected, do nothing
  }

  return selectedTile.index + 1; // 1-indexed tile value
}
```

### 3. Position Calculation

**Screen to Tile with Offset:**

```typescript
function screenToTileWithOffset(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  tileSize: number,
  offsetY: number
): Point {
  // Apply touch offset (position above finger)
  const offsetScreenY = screenY + offsetY;

  // Convert to tile coordinates
  return screenToTile(viewport, screenX, offsetScreenY, tileSize);
}
```

### 4. Line Interpolation (Bresenham)

When dragging quickly, we need to fill gaps between touch points:

```typescript
function interpolateLine(
  x0: number, y0: number,
  x1: number, y1: number
): Point[] {
  const points: Point[] = [];

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    points.push({ x, y });

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return points;
}
```

### 5. Scene Mutation

The paint tool mutates the scene's layer data directly:

```typescript
function paintTile(
  scene: Scene,
  layer: LayerType,
  x: number,
  y: number,
  value: number
): boolean {
  // Bounds check
  if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) {
    return false;
  }

  // Get the layer data
  const layerData = scene.layers[layer];

  // Only paint if value changed
  if (layerData[y][x] === value) {
    return false;
  }

  // Mutate layer
  layerData[y][x] = value;
  return true;
}
```

### 6. Integration with Canvas

**Canvas.ts Modifications:**

```typescript
interface CanvasController {
  // ... existing

  /** Set paint tool callbacks */
  onToolGesture(callbacks: {
    onStart?: (x: number, y: number) => void;
    onMove?: (x: number, y: number) => void;
    onEnd?: () => void;
  }): void;
}
```

The gesture handler already calls these; we just need to wire them up in `init.ts`.

### 7. Editor Init Integration

**init.ts Modifications:**

```typescript
// After canvas initialization
const paintTool = createPaintTool({
  getEditorState: () => editorState,
  getScene: () => currentScene,
  onSceneChange: (scene) => {
    currentScene = scene;
    canvasController.invalidateScene();
    scheduleSceneSave(scene);
  },
  touchOffsetY: TOUCH_OFFSET_Y,
});

// Wire up tool gestures
canvasController.onToolGesture({
  onStart: (x, y) => {
    if (editorState?.currentTool === 'paint') {
      paintTool.start(x, y, canvasController.getViewport());
    }
  },
  onMove: (x, y) => {
    if (editorState?.currentTool === 'paint') {
      paintTool.move(x, y, canvasController.getViewport());
    }
  },
  onEnd: () => {
    if (editorState?.currentTool === 'paint') {
      paintTool.end();
    }
  },
});
```

### 8. Auto-save Debouncing

```typescript
let sceneSaveTimeout: number | null = null;
const SCENE_SAVE_DEBOUNCE_MS = 500;

function scheduleSceneSave(scene: Scene): void {
  if (sceneSaveTimeout !== null) {
    window.clearTimeout(sceneSaveTimeout);
  }
  sceneSaveTimeout = window.setTimeout(async () => {
    sceneSaveTimeout = null;
    await saveScene(scene);
    console.log(`[Editor] Scene auto-saved`);
  }, SCENE_SAVE_DEBOUNCE_MS);
}
```

---

## State Management

### Paint Tool State

```typescript
interface PaintToolState {
  isPainting: boolean;
  lastTileX: number | null;
  lastTileY: number | null;
}
```

- `isPainting`: true during active paint gesture
- `lastTileX/Y`: last painted tile position (for interpolation)

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/tools/paint.ts` | Create | Paint tool logic |
| `src/editor/init.ts` | Modify | Wire paint tool to canvas gestures |
| `src/editor/canvas/Canvas.ts` | Minor | Already has onToolGesture |

---

## API Contracts

### PaintTool

```typescript
// Create tool
const tool = createPaintTool({
  getEditorState: () => state,
  getScene: () => scene,
  onSceneChange: (scene) => { /* save */ },
  touchOffsetY: -48,
});

// Use in gesture callbacks
tool.start(screenX, screenY, viewport);
tool.move(screenX, screenY, viewport);
tool.end();
```

---

## Edge Cases

1. **No Tile Selected**: Skip painting for ground/props; collision/trigger still paint value 1
2. **Outside Scene Bounds**: Skip tile, don't crash
3. **Same Tile Painted Multiple Times**: Skip if value unchanged (reduces saves)
4. **Paint Tool Not Active**: Ignore gestures
5. **Scene Not Loaded**: Skip painting, log warning

---

## Performance Considerations

1. **Debounced Save**: 500ms delay prevents save spam during drag
2. **Skip Unchanged Tiles**: Don't re-paint same value
3. **Direct Mutation**: Mutate scene.layers in place (no deep clone per tile)
4. **Batch Re-render**: Canvas uses requestAnimationFrame

---

## Testing Strategy

### Manual Tests

1. Select paint tool and a tile → tap canvas → tile appears
2. Drag across canvas → continuous line painted
3. Switch layer → paint goes to that layer
4. Refresh page → tiles persist
5. Use two fingers → pan/zoom, not paint

### Unit Tests

1. `getTileValue`: Returns correct value for each layer type
2. `interpolateLine`: Returns all points between two tiles
3. `paintTile`: Correctly updates layer data
4. Bounds checking: Out-of-bounds returns false

---

## Notes

- Touch offset must match renderer's TOUCH_OFFSET_Y for consistent UX
- Collision/trigger use value 1, not tile indices
- Consider adding visual feedback (tile preview) in Track 9
