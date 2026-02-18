# Track 18: Layer System — Blueprint

## Overview

This blueprint details the technical design for the full layer management system, replacing the simple layer tabs with a comprehensive layer panel supporting visibility, locking, and selection.

---

## Architecture

### Module Structure

```
src/editor/panels/
├── layerPanel.ts        # NEW - Full layer management UI
├── topPanel.ts          # MODIFY - Integrate layer panel
└── ...

src/storage/
├── hot.ts               # MODIFY - Add layer states to EditorState
└── ...
```

### Data Flow

```
User Toggles Visibility:
  1. Click eye icon on layer
  2. Update EditorState.layerVisibility[layer]
  3. Trigger canvas re-render
  4. Schedule save

User Toggles Lock:
  1. Click lock icon on layer
  2. Update EditorState.layerLocks[layer]
  3. No immediate visual change
  4. Schedule save

User Selects Layer:
  1. Tap layer row
  2. Check if layer is locked
  3. If unlocked: update EditorState.activeLayer
  4. Update UI highlighting
  5. Schedule save
```

---

## Detailed Design

### 1. Layer State Schema

**EditorState additions:**

```typescript
interface LayerStates {
  /** Visibility per layer (true = visible) */
  visibility: Record<LayerType, boolean>;

  /** Lock per layer (true = locked) */
  locks: Record<LayerType, boolean>;
}

interface EditorState {
  // ... existing fields
  currentSceneId: string;
  currentTool: ToolType;
  activeLayer: LayerType;
  selectedTile: SelectedTile | null;
  viewport: ViewportState;
  panelStates: PanelStates;
  brushSize: BrushSize;

  // NEW
  layerVisibility: Record<LayerType, boolean>;
  layerLocks: Record<LayerType, boolean>;
}
```

**Defaults:**

```typescript
function getDefaultLayerVisibility(): Record<LayerType, boolean> {
  return {
    ground: true,
    props: true,
    collision: true,
    triggers: true,
  };
}

function getDefaultLayerLocks(): Record<LayerType, boolean> {
  return {
    ground: false,
    props: false,
    collision: false,
    triggers: false,
  };
}
```

### 2. Layer Panel Component

**Interface:**

```typescript
interface LayerPanelConfig {
  activeLayer: LayerType;
  visibility: Record<LayerType, boolean>;
  locks: Record<LayerType, boolean>;
  onLayerSelect: (layer: LayerType) => void;
  onVisibilityToggle: (layer: LayerType, visible: boolean) => void;
  onLockToggle: (layer: LayerType, locked: boolean) => void;
}

interface LayerPanel {
  /** Update active layer highlight */
  setActiveLayer(layer: LayerType): void;

  /** Update visibility state */
  setVisibility(layer: LayerType, visible: boolean): void;

  /** Update lock state */
  setLock(layer: LayerType, locked: boolean): void;

  /** Clean up */
  destroy(): void;
}
```

**UI Design:**

```
+------------------------------------------+
| Layers                                   |
+------------------------------------------+
| [👁] [🔓] ● Ground                        |
| [👁] [🔓]   Props                         |
| [👁] [🔒]   Collision                     |
| [  ] [🔓]   Triggers (hidden)            |
+------------------------------------------+

Legend:
- [👁] = Visible (eye open)
- [  ] = Hidden (eye closed/empty)
- [🔓] = Unlocked
- [🔒] = Locked
- ● = Active layer indicator
```

**Layer Row Component:**

```typescript
interface LayerRowConfig {
  layer: LayerType;
  displayName: string;
  icon?: string;
  isActive: boolean;
  isVisible: boolean;
  isLocked: boolean;
  onSelect: () => void;
  onVisibilityToggle: () => void;
  onLockToggle: () => void;
}
```

### 3. Visibility Control

**Canvas Integration:**

```typescript
// In renderer.ts
function renderTilemap(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  viewport: ViewportState,
  config: RenderConfig
): void {
  for (const layer of LAYER_RENDER_ORDER) {
    // Skip hidden layers
    if (!config.layerVisibility[layer]) {
      continue;
    }

    renderLayer(ctx, scene, layer, viewport, config);
  }
}
```

### 4. Lock Control

**Tool Integration:**

```typescript
// In paint tool
function paintAt(tileX: number, tileY: number): boolean {
  const editorState = getEditorState();
  const activeLayer = editorState.activeLayer;

  // Check lock
  if (editorState.layerLocks[activeLayer]) {
    onLockedLayerAction?.();
    return false;
  }

  // ... existing paint logic
}
```

**Feedback for locked layer:**

```typescript
interface ToolConfig {
  // ... existing
  onLockedLayerAction?: () => void;
}
```

Show toast or visual indicator when user tries to edit locked layer.

### 5. Active Layer Selection

**Validation:**

```typescript
function setActiveLayer(layer: LayerType): boolean {
  const editorState = getEditorState();

  // Cannot select locked layer as active
  if (editorState.layerLocks[layer]) {
    return false;
  }

  editorState.activeLayer = layer;
  return true;
}
```

**If current active layer becomes locked:**

```typescript
function onLockChange(layer: LayerType, locked: boolean): void {
  if (locked && editorState.activeLayer === layer) {
    // Find first unlocked layer
    const unlocked = LAYER_ORDER.find(l => !editorState.layerLocks[l]);
    if (unlocked) {
      setActiveLayer(unlocked);
    }
  }
}
```

### 6. Top Panel Integration

**Replace existing layer tabs with layer panel:**

```typescript
// In topPanel.ts
function createLayerSection(container: HTMLElement, config: LayerPanelConfig): LayerPanel {
  // Remove old layer tabs
  // Add new layer panel
}
```

**Layout adjustment:**

```
Top Panel (expanded):
+------------------------------------------+
| ▼ Scene: Level 1                         |
+------------------------------------------+
| Layers:                                  |
| [👁] [🔓] ● Ground                        |
| [👁] [🔓]   Props                         |
| [👁] [🔒]   Collision                     |
| [  ] [🔓]   Triggers                      |
+------------------------------------------+
```

### 7. Icons

**Icon definitions:**

```typescript
const LAYER_ICONS = {
  visibility: {
    visible: '👁',    // or custom SVG
    hidden: '◯',      // empty circle
  },
  lock: {
    locked: '🔒',
    unlocked: '🔓',
  },
  active: '●',
};

const LAYER_TYPE_ICONS: Record<LayerType, string> = {
  ground: '▦',     // grid
  props: '🏠',     // or object
  collision: '⊞',  // blocked
  triggers: '⚡',  // event
};
```

---

## State Management

### Layer States

```typescript
interface LayerUIState {
  activeLayer: LayerType;
  visibility: Record<LayerType, boolean>;
  locks: Record<LayerType, boolean>;
}
```

All states persisted in EditorState.

### State Updates

```typescript
function updateLayerVisibility(layer: LayerType, visible: boolean): void {
  editorState.layerVisibility[layer] = visible;
  canvasController.setLayerVisibility(layer, visible);
  scheduleSave();
}

function updateLayerLock(layer: LayerType, locked: boolean): void {
  editorState.layerLocks[layer] = locked;

  // If locking active layer, switch to another
  if (locked && editorState.activeLayer === layer) {
    const unlocked = LAYER_ORDER.find(l => !editorState.layerLocks[l]);
    if (unlocked) {
      updateActiveLayer(unlocked);
    }
  }

  scheduleSave();
}

function updateActiveLayer(layer: LayerType): boolean {
  if (editorState.layerLocks[layer]) {
    showLockedLayerToast();
    return false;
  }

  editorState.activeLayer = layer;
  canvasController.setActiveLayer(layer);
  layerPanel.setActiveLayer(layer);
  scheduleSave();
  return true;
}
```

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/panels/layerPanel.ts` | Create | Layer management UI |
| `src/editor/panels/topPanel.ts` | Modify | Integrate layer panel |
| `src/storage/hot.ts` | Modify | Add layer states to EditorState |
| `src/editor/canvas/renderer.ts` | Modify | Respect visibility |
| `src/editor/tools/paint.ts` | Modify | Respect locks |
| `src/editor/tools/erase.ts` | Modify | Respect locks |
| `src/editor/tools/select.ts` | Modify | Respect locks |
| `src/editor/init.ts` | Modify | Wire layer panel |

---

## API Contracts

### LayerPanel

```typescript
const panel = createLayerPanel(container, {
  activeLayer: 'ground',
  visibility: { ground: true, props: true, collision: true, triggers: true },
  locks: { ground: false, props: false, collision: false, triggers: false },
  onLayerSelect: (layer) => updateActiveLayer(layer),
  onVisibilityToggle: (layer, visible) => updateLayerVisibility(layer, visible),
  onLockToggle: (layer, locked) => updateLayerLock(layer, locked),
});

// Updates
panel.setActiveLayer('props');
panel.setVisibility('triggers', false);
panel.setLock('collision', true);
```

---

## Edge Cases

1. **All Layers Locked**: Prevent by always keeping one unlocked
2. **All Layers Hidden**: Allow, but warn
3. **Lock Active Layer**: Switch to first unlocked
4. **No Unlocked Layers**: Prevent (validation)
5. **Hidden Active Layer**: Still active, just not visible

---

## Performance Considerations

1. **Render Skipping**: Hidden layers not rendered (saves draw calls)
2. **State Caching**: Layer states checked once per operation
3. **UI Updates**: Only update changed layer rows

---

## Testing Strategy

### Manual Tests

1. Toggle visibility for each layer
2. Toggle lock for each layer
3. Attempt to paint on locked layer
4. Select locked layer (should fail)
5. Lock active layer (should switch)
6. Reload, verify states persist

### Unit Tests

1. Visibility affects rendering
2. Lock prevents editing
3. Cannot select locked layer
4. Lock active layer switches active
5. State persistence

---

## Notes

- Layer order is fixed (no reordering in this track)
- Use simple icons, consider custom SVGs later
- Toast message for locked layer feedback
- Consider "show all" / "hide all" buttons (future)
- Consider per-scene layer states (future)
