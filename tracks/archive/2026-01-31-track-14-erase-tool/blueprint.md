# Track 14: Erase Tool — Blueprint

## Overview

This blueprint details the technical design for the erase tool, enabling tile removal via touch input. The tool shares significant architecture with the paint tool, promoting code reuse and consistency.

---

## Architecture

### Module Structure

```
src/editor/tools/
├── erase.ts         # NEW - Erase tool logic
├── paint.ts         # EXISTING - Paint tool (reference)
├── common.ts        # NEW - Shared tool utilities
└── AGENTS.md        # EXISTING - Tool rules
```

### Data Flow

```
Touch Start/Move (Canvas gesture handler)
    ↓
Check: is currentTool === 'erase'?
    ↓
If yes:
    Screen position → Apply touch offset → Tile coordinates
    ↓
    Calculate brush footprint (1x1, 2x2, 3x3)
    ↓
    For each tile in footprint:
        Set scene.layers[activeLayer][y][x] = 0
    ↓
    Trigger canvas re-render
    ↓
    Schedule auto-save (debounced)
```

---

## Detailed Design

### 1. Common Tool Utilities (`common.ts`)

Shared between paint and erase tools.

**Interface:**

```typescript
/** Brush size options */
export type BrushSize = 1 | 2 | 3;

/** Point in tile coordinates */
export interface TilePoint {
  x: number;
  y: number;
}

/** Calculate all tile positions affected by a brush centered at (x, y) */
export function getBrushFootprint(
  centerX: number,
  centerY: number,
  brushSize: BrushSize
): TilePoint[];

/** Bresenham line interpolation (shared with paint) */
export function interpolateLine(
  x0: number, y0: number,
  x1: number, y1: number
): TilePoint[];

/** Screen to tile with offset */
export function screenToTileWithOffset(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  tileSize: number,
  offsetY: number
): TilePoint;
```

**Brush Footprint Logic:**

```typescript
export function getBrushFootprint(
  centerX: number,
  centerY: number,
  brushSize: BrushSize
): TilePoint[] {
  const points: TilePoint[] = [];

  if (brushSize === 1) {
    points.push({ x: centerX, y: centerY });
  } else if (brushSize === 2) {
    // 2x2: center is top-left
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        points.push({ x: centerX + dx, y: centerY + dy });
      }
    }
  } else if (brushSize === 3) {
    // 3x3: center is actual center
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        points.push({ x: centerX + dx, y: centerY + dy });
      }
    }
  }

  return points;
}
```

### 2. Erase Tool Module (`erase.ts`)

**Interface:**

```typescript
interface EraseToolConfig {
  /** Get current editor state */
  getEditorState: () => EditorState | null;

  /** Get current scene */
  getScene: () => Scene | null;

  /** Callback when scene data changes */
  onSceneChange: (scene: Scene) => void;

  /** Get current brush size */
  getBrushSize: () => BrushSize;
}

interface EraseTool {
  /** Handle erase start (tap or drag begin) */
  start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;

  /** Handle erase move (drag) */
  move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;

  /** Handle erase end (finger lift) */
  end(): void;

  /** Check if currently erasing */
  isErasing(): boolean;
}

function createEraseTool(config: EraseToolConfig): EraseTool;
```

### 3. Erase Operation

**Core Logic:**

```typescript
function eraseTile(
  scene: Scene,
  layer: LayerType,
  x: number,
  y: number
): boolean {
  // Bounds check
  if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) {
    return false;
  }

  const layerData = scene.layers[layer];
  if (!layerData) {
    return false;
  }

  // Only erase if not already empty
  if (layerData[y][x] === 0) {
    return false;
  }

  // Set to empty
  layerData[y][x] = 0;
  return true;
}
```

### 4. Brush Size UI

**Location**: Bottom panel toolbar area

**Approach**: Add a brush size selector next to the tool buttons when erase tool is active.

```typescript
interface BrushSizeSelector {
  /** Get current size */
  getSize(): BrushSize;

  /** Set current size */
  setSize(size: BrushSize): void;

  /** Show/hide the selector */
  setVisible(visible: boolean): void;

  /** Register size change callback */
  onSizeChange(callback: (size: BrushSize) => void): void;
}
```

**UI Design:**

```
+------------------------------------+
| [Select] [Paint] [Erase] [Entity]  |
|                                    |
|      Brush: [1] [2] [3]            | <- Only visible when erase active
+------------------------------------+
```

### 5. Brush Cursor

**Enhancement to existing brush cursor system:**

```typescript
interface BrushCursorConfig {
  visible: boolean;
  position: { x: number; y: number };
  size: BrushSize;  // NEW: brush size
  color: string;
}
```

The brush cursor should render a rectangle preview showing the affected tiles.

### 6. Integration with Canvas

**gestures.ts / Canvas.ts Modifications:**

No changes needed - reuses existing onToolGesture callbacks.

### 7. Editor Init Integration

**init.ts Modifications:**

```typescript
// After paint tool initialization
const eraseTool = createEraseTool({
  getEditorState: () => editorState,
  getScene: () => currentScene,
  onSceneChange: (scene) => {
    currentScene = scene;
    canvasController?.invalidateScene();
    scheduleSceneSave(scene);
  },
  getBrushSize: () => currentBrushSize,
});

// Extend tool gesture handlers
canvasController.onToolGesture({
  onStart: (x, y) => {
    if (editorState?.currentTool === 'paint' && paintTool) {
      paintTool.start(x, y, canvasController!.getViewport(), tileSize);
    } else if (editorState?.currentTool === 'erase' && eraseTool) {
      eraseTool.start(x, y, canvasController!.getViewport(), tileSize);
    }
  },
  // ... similar for onMove and onEnd
});
```

---

## State Management

### Erase Tool State

```typescript
interface EraseToolState {
  isErasing: boolean;
  lastTileX: number | null;
  lastTileY: number | null;
}
```

### Editor State Addition

```typescript
// In EditorState (storage/hot.ts)
interface EditorState {
  // ... existing fields
  brushSize: BrushSize;  // NEW: persisted brush size (default: 1)
}
```

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/tools/erase.ts` | Create | Erase tool logic |
| `src/editor/tools/common.ts` | Create | Shared tool utilities |
| `src/editor/tools/paint.ts` | Modify | Use common utilities |
| `src/editor/init.ts` | Modify | Wire erase tool to canvas gestures |
| `src/editor/panels/bottomPanel.ts` | Modify | Add brush size selector |
| `src/editor/canvas/brushCursor.ts` | Modify | Support brush size rendering |
| `src/storage/hot.ts` | Modify | Add brushSize to EditorState |

---

## API Contracts

### EraseTool

```typescript
// Create tool
const tool = createEraseTool({
  getEditorState: () => state,
  getScene: () => scene,
  onSceneChange: (scene) => { /* save */ },
  getBrushSize: () => brushSize,
});

// Use in gesture callbacks
tool.start(screenX, screenY, viewport, tileSize);
tool.move(screenX, screenY, viewport, tileSize);
tool.end();
```

### BrushSizeSelector

```typescript
const selector = createBrushSizeSelector(container, {
  initialSize: 1,
  visible: false,
});

selector.onSizeChange((size) => {
  currentBrushSize = size;
  saveEditorState(editorState);
});
```

---

## Edge Cases

1. **Outside Scene Bounds**: Skip tile, don't crash
2. **Erase Tool Not Active**: Ignore gestures
3. **Scene Not Loaded**: Skip erasing, log warning
4. **Already Empty Tile**: Skip (reduces unnecessary saves)
5. **Brush Extends Past Bounds**: Only erase tiles within bounds

---

## Performance Considerations

1. **Debounced Save**: 500ms delay prevents save spam during drag
2. **Skip Empty Tiles**: Don't re-erase already empty tiles
3. **Direct Mutation**: Mutate scene.layers in place
4. **Batch Re-render**: Canvas uses requestAnimationFrame

---

## Testing Strategy

### Manual Tests

1. Select erase tool → tap canvas → tile erased
2. Drag across canvas → continuous erasure
3. Switch layer → erase works on that layer
4. Refresh page → erasures persist
5. Select 2x2 brush → erases 4 tiles per tap
6. Select 3x3 brush → erases 9 tiles per tap
7. Use two fingers → pan/zoom, not erase

### Unit Tests

1. `eraseTile`: Correctly sets tile to 0
2. `getBrushFootprint`: Returns correct tile positions for each size
3. `interpolateLine`: Returns all points between two tiles (shared test)
4. Bounds checking: Out-of-bounds returns false

---

## Notes

- Erase always sets tile value to 0
- Touch offset must match paint tool's TOUCH_OFFSET_Y
- Brush size selector only visible when erase tool active
- Consider applying brush size to paint tool in future track
- Prepare for undo/redo by designing clear operation boundaries
