# Track 9: Touch Foundation — Blueprint

## Overview

This blueprint details the technical design for enhanced touch handling, including brush cursor, touch offset configuration, and gesture refinements.

---

## Architecture

### Module Structure

```
src/editor/canvas/
├── touchConfig.ts     # NEW - Touch offset and gesture configuration
├── brushCursor.ts     # NEW - Brush cursor rendering
├── gestures.ts        # MODIFY - Add long-press detection
├── Canvas.ts          # MODIFY - Integrate brush cursor
└── renderer.ts        # EXISTING - Uses touch offset
```

### Data Flow

```
Touch Event
    ↓
Gesture Handler
    ├─→ 1 finger: pending → tool or long-press
    │       ↓
    │   Tool callbacks (onToolStart, onToolMove, onToolEnd)
    │       ↓
    │   Paint Tool + Brush Cursor
    │
    └─→ 2+ fingers: pan/zoom
```

---

## Detailed Design

### 1. Touch Configuration (`touchConfig.ts`)

Centralized touch-related constants and configuration.

**Interface:**

```typescript
/**
 * Touch configuration for the editor.
 * These values can be made user-configurable in Track 28.
 */
export interface TouchConfig {
  /** Y offset in pixels (negative = above finger) */
  offsetY: number;

  /** Delay before confirming single-finger as tool gesture (ms) */
  toolConfirmDelay: number;

  /** Movement threshold to confirm tool without delay (px) */
  movementThreshold: number;

  /** Delay before triggering long-press (ms) */
  longPressDelay: number;

  /** Movement threshold to cancel long-press (px) */
  longPressMovementThreshold: number;
}

export const DEFAULT_TOUCH_CONFIG: TouchConfig = {
  offsetY: -48,
  toolConfirmDelay: 150,
  movementThreshold: 5,
  longPressDelay: 500,
  longPressMovementThreshold: 10,
};

export function getTouchConfig(): TouchConfig;
```

### 2. Brush Cursor (`brushCursor.ts`)

Visual indicator for where the tool action will occur.

**Interface:**

```typescript
interface BrushCursorConfig {
  tileSize: number;
  viewport: ViewportState;
}

interface BrushCursor {
  /** Set cursor position (screen coordinates) */
  setPosition(screenX: number, screenY: number): void;

  /** Set visibility */
  setVisible(visible: boolean): void;

  /** Render the cursor to canvas */
  render(ctx: CanvasRenderingContext2D): void;

  /** Set optional tile preview image */
  setPreviewTile(image: HTMLImageElement | null): void;
}

function createBrushCursor(config: BrushCursorConfig): BrushCursor;
```

**Rendering:**

```typescript
function renderBrushCursor(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  viewport: ViewportState,
  tileSize: number,
  previewImage: HTMLImageElement | null
): void {
  const screenPos = tileToScreen(viewport, tileX, tileY, tileSize);
  const screenSize = tileSize * viewport.zoom;

  // Draw preview tile (semi-transparent)
  if (previewImage) {
    ctx.globalAlpha = 0.6;
    ctx.drawImage(previewImage, screenPos.x, screenPos.y, screenSize, screenSize);
    ctx.globalAlpha = 1.0;
  }

  // Draw cursor outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(screenPos.x + 1, screenPos.y + 1, screenSize - 2, screenSize - 2);
  ctx.setLineDash([]);
}
```

### 3. Enhanced Gesture Handler

**Additions to gestures.ts:**

```typescript
interface GestureCallbacks {
  // ... existing
  onLongPress?: (x: number, y: number) => void;
}
```

**Long-press Detection:**

```typescript
let longPressTimeout: number | null = null;
let longPressStartX: number;
let longPressStartY: number;

function handlePointerDown(e: PointerEvent): void {
  // ... existing code

  if (pointerCount === 1) {
    longPressStartX = e.clientX;
    longPressStartY = e.clientY;

    longPressTimeout = window.setTimeout(() => {
      if (gestureState === 'pending' && activePointers.size === 1) {
        callbacks.onLongPress?.(e.clientX, e.clientY);
        // Don't start tool after long-press
        gestureState = 'idle';
        clearToolConfirmTimeout();
      }
    }, LONG_PRESS_DELAY);
  }
}

function handlePointerMove(e: PointerEvent): void {
  // ... existing code

  // Cancel long-press if moved too much
  if (longPressTimeout !== null) {
    const dx = e.clientX - longPressStartX;
    const dy = e.clientY - longPressStartY;
    if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVEMENT_THRESHOLD) {
      clearLongPressTimeout();
    }
  }
}
```

### 4. Canvas Integration

**Canvas.ts Modifications:**

```typescript
interface CanvasController {
  // ... existing

  /** Get/set touch configuration */
  getTouchConfig(): TouchConfig;
  setTouchConfig(config: Partial<TouchConfig>): void;

  /** Set brush cursor preview tile */
  setBrushPreview(image: HTMLImageElement | null): void;

  /** Set long-press callback */
  onLongPress(callback: (x: number, y: number) => void): void;
}
```

**Render Order Update:**

```
1. Background fill
2. Tilemap layers (renderer)
3. Grid overlay
4. Brush cursor (on top of everything)
```

### 5. Editor Init Integration

**init.ts Updates:**

```typescript
// Wire up brush cursor
canvasController.onToolGesture({
  onStart: (x, y) => {
    // Update brush cursor position
    canvasController.setBrushVisible(true);
    // ... existing paint tool code
  },
  onMove: (x, y) => {
    // Update brush cursor position
    // ... existing paint tool code
  },
  onEnd: () => {
    canvasController.setBrushVisible(false);
    // ... existing paint tool code
  },
});

// Update brush preview when tile selection changes
bottomPanelController.onTileSelect((selection) => {
  const tileCache = canvasController.getTileCache();
  const image = tileCache.getTileImage(selection.category, selection.index);
  canvasController.setBrushPreview(image);
});
```

---

## State Management

### Touch State (in gestures.ts)

```typescript
interface GestureState {
  state: 'idle' | 'pending' | 'tool' | 'pan_zoom' | 'long_press';
  longPressTimeout: number | null;
  toolConfirmTimeout: number | null;
  startX: number;
  startY: number;
}
```

### Brush Cursor State (in Canvas.ts)

```typescript
interface BrushCursorState {
  visible: boolean;
  tileX: number;
  tileY: number;
  previewImage: HTMLImageElement | null;
}
```

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/canvas/touchConfig.ts` | Create | Touch offset and gesture configuration |
| `src/editor/canvas/brushCursor.ts` | Create | Brush cursor rendering |
| `src/editor/canvas/gestures.ts` | Modify | Add long-press detection |
| `src/editor/canvas/Canvas.ts` | Modify | Integrate brush cursor, expose config |
| `src/editor/canvas/renderer.ts` | Modify | Import TOUCH_OFFSET_Y from touchConfig |
| `src/editor/canvas/index.ts` | Modify | Export new modules |
| `src/editor/init.ts` | Modify | Wire up brush preview |

---

## API Contracts

### TouchConfig

```typescript
import { getTouchConfig, DEFAULT_TOUCH_CONFIG } from './touchConfig';

const config = getTouchConfig();
console.log(config.offsetY); // -48
```

### BrushCursor

```typescript
const cursor = createBrushCursor({
  tileSize: 32,
  viewport: { panX: 0, panY: 0, zoom: 1 },
});

cursor.setPosition(100, 200);
cursor.setVisible(true);
cursor.setPreviewTile(tileImage);
cursor.render(ctx);
```

---

## Constants Consolidation

Move touch-related constants to touchConfig.ts:

**Before (scattered):**
- `renderer.ts`: `TOUCH_OFFSET_Y = -48`
- `gestures.ts`: `TOOL_CONFIRM_DELAY = 150`
- `gestures.ts`: `MOVEMENT_THRESHOLD = 5`

**After (centralized):**
- `touchConfig.ts`: `DEFAULT_TOUCH_CONFIG`

---

## Testing Strategy

### Manual Tests

1. Touch canvas → brush cursor appears above finger
2. Move finger → cursor follows smoothly
3. Lift finger → cursor disappears
4. Start two-finger gesture → no cursor, no paint
5. Long-press (500ms) → callback fires, no paint
6. Quick tap → paint occurs
7. Fast drag → continuous painting

### Unit Tests

1. `getTouchConfig()`: Returns valid configuration
2. Brush cursor position calculation
3. Long-press timeout management
4. Gesture state transitions

---

## Notes

- Touch offset should be user-configurable in Track 28
- Brush cursor reuses coordinate transforms from viewport.ts
- Long-press callback is placeholder for future context menu
- Consider adding "touch calibration" screen in Track 25
