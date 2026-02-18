# Track 6: Panels + Tile Picker — Blueprint

## Overview

This blueprint describes the technical design for the panel system and tile picker. It covers file structure, APIs, state management, and integration points.

**NO CODE** — Implementation details only.

---

## File Structure

```
src/editor/panels/
├── AGENTS.md          # (exists) Local rules for panels module
├── topPanel.ts        # Top panel (scene info, layers)
├── bottomPanel.ts     # Bottom panel (tools, tile picker)
├── tilePicker.ts      # Tile picker component
├── toolbar.ts         # Tool button bar
└── index.ts           # Public exports
```

---

## Module Responsibilities

### topPanel.ts

**Purpose**: Render and manage the top panel UI.

**State**:
```
TopPanelState {
  expanded: boolean        // From EditorState.panelStates.topExpanded
  activeLayer: LayerType   // 'ground' | 'objects' | 'collision' | 'trigger'
}
```

**DOM Structure**:
```html
<div id="top-panel" class="panel panel--top">
  <div class="panel__header" (click)="toggleExpand">
    <span class="panel__title">Scene: {sceneName}</span>
    <span class="panel__chevron">{expanded ? '▲' : '▼'}</span>
  </div>
  <div class="panel__content" [hidden]="!expanded">
    <div class="layer-tabs">
      <button class="layer-tab" [active]="activeLayer === 'ground'">Ground</button>
      <button class="layer-tab" [active]="activeLayer === 'objects'">Objects</button>
      <button class="layer-tab" [active]="activeLayer === 'collision'">Collision</button>
      <button class="layer-tab" [active]="activeLayer === 'trigger'">Trigger</button>
    </div>
  </div>
</div>
```

**Functions**:
- `createTopPanel(container, initialState): TopPanelController`
- `TopPanelController.setSceneName(name)`
- `TopPanelController.setActiveLayer(layer)`
- `TopPanelController.setExpanded(expanded)`
- `TopPanelController.onLayerChange(callback)`
- `TopPanelController.onExpandToggle(callback)`
- `TopPanelController.destroy()`

---

### bottomPanel.ts

**Purpose**: Render and manage the bottom panel UI (toolbar + tile picker).

**State**:
```
BottomPanelState {
  expanded: boolean           // From EditorState.panelStates.bottomExpanded
  currentTool: ToolType       // 'select' | 'paint' | 'erase' | 'entity'
  selectedTileIndex: number   // Index within current category
  selectedCategory: string    // Current tile category name
}
```

**DOM Structure**:
```html
<div id="bottom-panel" class="panel panel--bottom">
  <div class="panel__header" (click)="toggleExpand">
    <span class="panel__chevron">{expanded ? '▼' : '▲'}</span>
  </div>
  <div class="panel__content">
    <div class="toolbar">
      <!-- Tool buttons -->
    </div>
    <div class="tile-picker-container" [hidden]="tool !== 'paint' && tool !== 'erase'">
      <!-- Tile picker -->
    </div>
  </div>
</div>
```

**Functions**:
- `createBottomPanel(container, initialState, project): BottomPanelController`
- `BottomPanelController.setCurrentTool(tool)`
- `BottomPanelController.setExpanded(expanded)`
- `BottomPanelController.getSelectedTile(): { category, index } | null`
- `BottomPanelController.onToolChange(callback)`
- `BottomPanelController.onTileSelect(callback)`
- `BottomPanelController.onExpandToggle(callback)`
- `BottomPanelController.destroy()`

---

### toolbar.ts

**Purpose**: Render tool selection buttons.

**Functions**:
- `createToolbar(container, initialTool): ToolbarController`
- `ToolbarController.setActiveTool(tool)`
- `ToolbarController.onToolSelect(callback)`
- `ToolbarController.destroy()`

**Tool Buttons**:
| Tool | Icon | Description |
|------|------|-------------|
| select | ⬚ | Selection mode |
| paint | ✎ | Paint tiles |
| erase | ⌫ | Erase tiles |
| entity | ◆ | Entity mode |

**Styling**:
```css
.toolbar {
  display: flex;
  gap: 8px;
  padding: 8px;
}

.tool-button {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: #2a2a4e;
  color: #fff;
  font-size: 18px;
}

.tool-button--active {
  border-color: #4a9eff;
  background: #3a3a6e;
}
```

---

### tilePicker.ts

**Purpose**: Display tile categories and allow tile selection.

**State**:
```
TilePickerState {
  categories: TileCategory[]     // From project.tileCategories
  selectedCategory: string       // Active category name
  selectedTileIndex: number      // Selected tile within category (-1 for none)
  loadedImages: Map<string, HTMLImageElement>  // Cache
}
```

**DOM Structure**:
```html
<div class="tile-picker">
  <div class="category-tabs">
    <button class="category-tab" [active]="selected">terrain</button>
    <button class="category-tab" [active]="selected">props</button>
  </div>
  <div class="tile-grid">
    <div class="tile-cell" [selected]="index === selectedTileIndex">
      <img src="{assetPath}" />
    </div>
    <!-- More tiles... -->
  </div>
</div>
```

**Functions**:
- `createTilePicker(container, categories, assetBasePath): TilePickerController`
- `TilePickerController.setSelectedCategory(categoryName)`
- `TilePickerController.setSelectedTile(index)`
- `TilePickerController.getSelectedTile(): { category, index, path } | null`
- `TilePickerController.onTileSelect(callback)`
- `TilePickerController.onCategoryChange(callback)`
- `TilePickerController.destroy()`

**Image Loading**:
- Load images lazily when category selected
- Use intersection observer for visible tiles (optional, v1 can load all)
- Cache loaded images to avoid re-fetching

**Styling**:
```css
.tile-picker {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.category-tabs {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  overflow-x: auto;
}

.category-tab {
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 6px;
  background: #2a2a4e;
  color: #fff;
  white-space: nowrap;
}

.category-tab--active {
  background: #4a9eff;
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 48px);
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}

.tile-cell {
  width: 48px;
  height: 48px;
  border: 2px solid transparent;
  border-radius: 4px;
  background: #1a1a3a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-cell--selected {
  border-color: #4a9eff;
  background: #2a2a5e;
}

.tile-cell img {
  max-width: 32px;
  max-height: 32px;
  image-rendering: pixelated;
}
```

---

### index.ts

**Public Exports**:
```typescript
export { createTopPanel } from './topPanel';
export type { TopPanelController, TopPanelState } from './topPanel';

export { createBottomPanel } from './bottomPanel';
export type { BottomPanelController, BottomPanelState } from './bottomPanel';

export { createToolbar } from './toolbar';
export type { ToolbarController, ToolType } from './toolbar';

export { createTilePicker } from './tilePicker';
export type { TilePickerController, TileSelection } from './tilePicker';
```

---

## Integration Points

### With src/editor/init.ts

```typescript
// In initEditor():
import { createTopPanel, createBottomPanel } from '@/editor/panels';

// After loading editorState and project...
const topPanel = createTopPanel(
  document.getElementById('top-panel-container'),
  {
    expanded: editorState.panelStates.topExpanded,
    sceneName: currentScene?.name ?? 'No Scene',
    activeLayer: 'ground', // Default, not yet in EditorState
  }
);

const bottomPanel = createBottomPanel(
  document.getElementById('bottom-panel-container'),
  {
    expanded: editorState.panelStates.bottomExpanded,
    currentTool: editorState.currentTool,
  },
  project
);

// Wire up persistence
topPanel.onExpandToggle((expanded) => {
  editorState.panelStates.topExpanded = expanded;
  scheduleSave();
});

bottomPanel.onExpandToggle((expanded) => {
  editorState.panelStates.bottomExpanded = expanded;
  scheduleSave();
});

bottomPanel.onToolChange((tool) => {
  editorState.currentTool = tool;
  scheduleSave();
});
```

### With src/storage/hot.ts

EditorState already includes:
- `panelStates.topExpanded: boolean`
- `panelStates.bottomExpanded: boolean`
- `currentTool: 'select' | 'paint' | 'erase' | 'entity'`

**Addition needed for Track 6**:
- `activeLayer: LayerType` — add to EditorState (schema change)
- `selectedTile: { category: string, index: number } | null` — add to EditorState

---

## State Flow

```
User Tap (tool button)
    ↓
Toolbar callback → onToolSelect
    ↓
BottomPanel updates internal state + visual
    ↓
BottomPanel emits onToolChange
    ↓
init.ts updates EditorState.currentTool
    ↓
scheduleSave() → debounced IndexedDB write
```

```
User Tap (tile cell)
    ↓
TilePicker callback → update selection
    ↓
TilePicker emits onTileSelect(category, index)
    ↓
BottomPanel stores selection
    ↓
init.ts updates EditorState (if persisting)
    ↓
Paint tool can query getSelectedTile()
```

---

## Schema Changes

### EditorState (hot.ts)

Add new fields:
```typescript
interface EditorState {
  // existing...
  activeLayer: 'ground' | 'objects' | 'collision' | 'trigger';
  selectedTile: {
    category: string;
    index: number;
  } | null;
}
```

Update default:
```typescript
const DEFAULT_EDITOR_STATE: EditorState = {
  // existing...
  activeLayer: 'ground',
  selectedTile: null,
};
```

**Note**: This is a schema change (Medium risk). Ensure migration handles missing fields gracefully.

---

## Error Handling

- **No tile categories**: Show message "No tile categories defined"
- **Image load failure**: Show placeholder tile icon
- **Missing asset path**: Skip tile with console warning

---

## Performance Considerations

1. **Image Loading**
   - Load images when category is selected, not all at once
   - Cache loaded images across category switches
   - Use image placeholder while loading

2. **Panel Animations**
   - Use CSS transitions for expand/collapse
   - Avoid layout thrashing during animation

3. **Touch Responsiveness**
   - Button taps should respond immediately (< 100ms)
   - Use touch-action: manipulation to avoid 300ms delay

---

## Accessibility Notes

- Tool buttons should have aria-label
- Active tool should have aria-pressed="true"
- Tab through tools with keyboard (stretch goal)

---

## Testing Strategy

### Unit Tests
- Toolbar tool selection
- TilePicker category switching
- Panel expand/collapse state

### Integration Tests
- Panel state persistence round-trip
- Tool selection persists

### Manual Tests
- Touch targets reachable on phone
- Panels usable in portrait and landscape
- Tile images load correctly

---

## Open Questions

1. **Should tile selection persist across reload?**
   - Decision: Yes, add to EditorState (schema change)

2. **Should layer selection persist?**
   - Decision: Yes, add activeLayer to EditorState (schema change)

3. **Should we show layer lock/visibility controls?**
   - Decision: Defer to Track 18. This track just shows layer tabs.
