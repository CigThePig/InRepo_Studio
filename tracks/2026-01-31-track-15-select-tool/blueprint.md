# Track 15: Select Tool — Blueprint

## Overview

This blueprint details the technical design for the select tool, enabling region selection and manipulation. The tool introduces more complex gesture handling and a floating action bar for selection operations.

---

## Architecture

### Module Structure

```
src/editor/tools/
├── select.ts           # NEW - Select tool logic
├── clipboard.ts        # NEW - Clipboard management
├── floodFill.ts        # NEW - Flood fill algorithm
├── paint.ts            # EXISTING
├── erase.ts            # EXISTING
├── common.ts           # EXISTING (shared utilities)
└── AGENTS.md           # EXISTING

src/editor/panels/
├── selectionBar.ts     # NEW - Selection action buttons
└── ...
```

### Data Flow

```
Select Mode:
Touch Start → Record start position
Touch Move → Update selection rectangle preview
Touch End → Finalize selection bounds

Move Mode (long-press on selection):
Long Press → Enter move mode
Touch Move → Update selection preview position
Touch End → Apply move (clear old, place new)

Fill Mode:
Tap → Flood fill from tap position
```

---

## Detailed Design

### 1. Selection State

**Interface:**

```typescript
interface Selection {
  /** Top-left tile coordinate */
  startX: number;
  startY: number;
  /** Width in tiles */
  width: number;
  /** Height in tiles */
  height: number;
  /** The layer this selection applies to */
  layer: LayerType;
}

interface SelectionData {
  /** Selection bounds */
  selection: Selection;
  /** 2D array of tile values within selection */
  tiles: number[][];
}
```

### 2. Select Tool Module (`select.ts`)

**Interface:**

```typescript
interface SelectToolConfig {
  getEditorState: () => EditorState | null;
  getScene: () => Scene | null;
  onSceneChange: (scene: Scene) => void;
  onSelectionChange: (selection: Selection | null) => void;
}

interface SelectTool {
  /** Start selection drag */
  start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;

  /** Continue selection drag */
  move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;

  /** End selection drag */
  end(): void;

  /** Get current selection */
  getSelection(): Selection | null;

  /** Clear selection */
  clearSelection(): void;

  /** Enter move mode (called on long-press) */
  startMove(): void;

  /** Move selection to position */
  moveSelection(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;

  /** Apply move and clear old position */
  applyMove(): void;

  /** Delete tiles in selection */
  deleteSelection(): void;

  /** Copy selection to clipboard */
  copySelection(): void;

  /** Paste from clipboard at position */
  paste(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;

  /** Check if currently selecting */
  isSelecting(): boolean;

  /** Check if in move mode */
  isMoving(): boolean;
}
```

### 3. Selection Rendering

**Canvas additions:**

```typescript
interface SelectionOverlay {
  /** Selection bounds to render */
  selection: Selection | null;

  /** Preview offset during move */
  moveOffset: { x: number; y: number } | null;

  /** Render selection rectangle */
  render(ctx: CanvasRenderingContext2D, viewport: ViewportState, tileSize: number): void;
}
```

**Visual design:**

- Blue/cyan rectangle border (2px)
- Semi-transparent fill (rgba(74, 158, 255, 0.2))
- Corner handles (future: for resize)
- Move preview shows ghost tiles at new position

### 4. Clipboard Module (`clipboard.ts`)

```typescript
interface Clipboard {
  /** Store selection data */
  copy(data: SelectionData): void;

  /** Get clipboard contents */
  paste(): SelectionData | null;

  /** Check if clipboard has data */
  hasData(): boolean;

  /** Clear clipboard */
  clear(): void;
}

function createClipboard(): Clipboard;
```

**Storage**: In-memory only, not persisted.

### 5. Flood Fill Module (`floodFill.ts`)

```typescript
interface FloodFillConfig {
  scene: Scene;
  layer: LayerType;
  startX: number;
  startY: number;
  fillValue: number;
  maxTiles?: number;  // Limit for performance (default: 10000)
}

interface FloodFillResult {
  /** Number of tiles filled */
  count: number;
  /** Whether limit was reached */
  limitReached: boolean;
}

function floodFill(config: FloodFillConfig): FloodFillResult;
```

**Algorithm**: Standard 4-connected flood fill using queue-based approach.

```typescript
function floodFill(config: FloodFillConfig): FloodFillResult {
  const { scene, layer, startX, startY, fillValue, maxTiles = 10000 } = config;
  const layerData = scene.layers[layer];

  const targetValue = layerData[startY]?.[startX];
  if (targetValue === undefined || targetValue === fillValue) {
    return { count: 0, limitReached: false };
  }

  const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  const visited = new Set<string>();
  let count = 0;

  while (queue.length > 0 && count < maxTiles) {
    const { x, y } = queue.shift()!;
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) continue;
    if (layerData[y][x] !== targetValue) continue;

    visited.add(key);
    layerData[y][x] = fillValue;
    count++;

    queue.push({ x: x + 1, y });
    queue.push({ x: x - 1, y });
    queue.push({ x, y: y + 1 });
    queue.push({ x, y: y - 1 });
  }

  return { count, limitReached: queue.length > 0 };
}
```

### 6. Selection Action Bar (`selectionBar.ts`)

**Interface:**

```typescript
interface SelectionBarConfig {
  onMove: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onFill: () => void;
  onCancel: () => void;
}

interface SelectionBar {
  show(): void;
  hide(): void;
  setPosition(x: number, y: number): void;
  setPasteEnabled(enabled: boolean): void;
  destroy(): void;
}
```

**UI Design:**

```
+------------------------------------------+
|  [Move] [Copy] [Paste] [Delete] [Fill] ✕ |
+------------------------------------------+
```

- Appears above or below selection
- Follows selection position
- Paste disabled when clipboard empty
- X button cancels selection

### 7. Gesture Integration

**Modified gesture handling for select tool:**

```typescript
// In Canvas gestures
if (currentTool === 'select') {
  if (isLongPress && selectionExists) {
    selectTool.startMove();
  } else if (isInsideSelection) {
    // Future: could start move on tap+drag inside selection
  } else {
    selectTool.start(x, y, viewport, tileSize);
  }
}
```

### 8. Mode Sub-states

The select tool has multiple sub-states:

```typescript
type SelectToolMode =
  | 'idle'           // No selection
  | 'selecting'      // Dragging to create selection
  | 'selected'       // Selection exists, waiting for action
  | 'moving'         // Moving selection to new position
  | 'pasting';       // Positioning paste preview
```

---

## State Management

### Select Tool State

```typescript
interface SelectToolState {
  mode: SelectToolMode;
  selection: Selection | null;
  selectionStart: { x: number; y: number } | null;
  moveOffset: { x: number; y: number } | null;
  copiedData: SelectionData | null;
}
```

### No EditorState Changes

Selection state is transient and not persisted.

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/tools/select.ts` | Create | Select tool logic |
| `src/editor/tools/clipboard.ts` | Create | Clipboard management |
| `src/editor/tools/floodFill.ts` | Create | Flood fill algorithm |
| `src/editor/panels/selectionBar.ts` | Create | Selection action buttons |
| `src/editor/canvas/renderer.ts` | Modify | Add selection overlay rendering |
| `src/editor/init.ts` | Modify | Wire select tool |
| `src/editor/canvas/gestures.ts` | Modify | Long-press handling for move |

---

## API Contracts

### SelectTool

```typescript
const tool = createSelectTool({
  getEditorState: () => state,
  getScene: () => scene,
  onSceneChange: (scene) => { /* save */ },
  onSelectionChange: (selection) => { /* update UI */ },
});

// Selection
tool.start(screenX, screenY, viewport, tileSize);
tool.move(screenX, screenY, viewport, tileSize);
tool.end();

// Actions
tool.copySelection();
tool.deleteSelection();
tool.startMove();
tool.applyMove();
tool.paste(screenX, screenY, viewport, tileSize);
```

---

## Edge Cases

1. **Selection Outside Bounds**: Clamp to scene dimensions
2. **Zero-Size Selection**: Ignore (no selection)
3. **Move Past Bounds**: Clamp or show warning
4. **Paste on Different Layer**: Apply to active layer
5. **Flood Fill on Empty**: Fill with selected tile
6. **Large Selection Move**: May need performance warning

---

## Performance Considerations

1. **Selection Rendering**: Simple rectangle overlay
2. **Move Preview**: Render only affected tiles
3. **Flood Fill Limit**: Cap at 10,000 tiles
4. **Clipboard Size**: Store only selection bounds data

---

## Testing Strategy

### Manual Tests

1. Drag to select region
2. Move selection to new position
3. Copy and paste selection
4. Delete selection
5. Flood fill an area
6. Cancel selection with X button
7. Test bounds clamping

### Unit Tests

1. Selection bounds calculation
2. Flood fill algorithm
3. Clipboard copy/paste
4. Move offset calculation

---

## Notes

- Selection is layer-specific
- Move = cut + paste in one operation
- Flood fill uses 4-connectivity
- Long-press triggers move mode
- Consider adding selection size indicator
- Future: multi-layer selection, resize handles
