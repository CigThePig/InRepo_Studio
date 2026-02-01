# Phase 4: Entity System — Blueprint (Tracks 19-22 Bundle)

## Overview

This blueprint details the technical design for the complete Entity System, covering entity palette, placement, manipulation, and property editing. The system integrates with existing editor infrastructure (panels, canvas, tools, storage) while introducing new components for entity-specific workflows.

---

## Architecture

### Module Structure

```
src/editor/
├── panels/
│   ├── entityPalette.ts      # NEW - Entity browsing and selection
│   ├── propertyInspector.ts  # NEW - Entity property editing
│   ├── bottomPanel.ts        # MODIFY - Add entity tool
│   └── topPanel.ts           # MODIFY - Scene entity count display
├── tools/
│   ├── entity.ts             # NEW - Entity placement tool
│   └── select.ts             # MODIFY - Add entity selection mode
├── canvas/
│   ├── entityRenderer.ts     # NEW - Entity rendering on canvas
│   └── renderer.ts           # MODIFY - Integrate entity layer
├── entities/
│   ├── entityManager.ts      # NEW - CRUD operations for entities
│   ├── entitySelection.ts    # NEW - Selection state management
│   └── entityClipboard.ts    # NEW - Duplicate/copy operations
└── init.ts                   # MODIFY - Wire entity system

src/storage/
└── hot.ts                    # MODIFY - Add entity-related editor state

src/types/
├── entity.ts                 # EXISTS - Property definitions
└── scene.ts                  # EXISTS - EntityInstance schema
```

### Data Flow

```
Entity Palette Flow:
  1. Load project.entityTypes
  2. Group by category (if categories exist) or flat list
  3. User selects entity type
  4. Store selected type in EditorState.selectedEntityType
  5. Activate entity placement tool

Entity Placement Flow:
  1. User taps canvas (entity tool active)
  2. Calculate world position (with touch offset)
  3. Apply grid snap if enabled
  4. Create EntityInstance with default properties
  5. Add to scene.entities
  6. Render entity on canvas
  7. Schedule auto-save

Entity Selection Flow:
  1. User taps canvas (select tool, near entity)
  2. Hit-test against entity bounds
  3. Update EditorState.selectedEntities
  4. Show selection visual
  5. Enable manipulation controls

Property Edit Flow:
  1. Entity selected → show inspector
  2. Display property editors by type
  3. User edits value
  4. Validate against constraints
  5. Update entity.properties
  6. Schedule auto-save
```

---

## Track 19: Entity Palette — Detailed Design

### 1. Entity Palette Component

**Interface:**

```typescript
interface EntityPaletteConfig {
  entityTypes: EntityType[];
  selectedType: string | null;
  onEntitySelect: (typeName: string) => void;
}

interface EntityPalette {
  /** Update the list of entity types */
  setEntityTypes(types: EntityType[]): void;

  /** Set the currently selected entity type */
  setSelectedType(typeName: string | null): void;

  /** Clean up */
  destroy(): void;
}

function createEntityPalette(
  container: HTMLElement,
  config: EntityPaletteConfig
): EntityPalette;
```

**UI Layout:**

```
+------------------------------------------+
| Entities                            [X]  |
+------------------------------------------+
| [All] [NPCs] [Items] [Triggers]          |  <- Category tabs (if >1 category)
+------------------------------------------+
| +------+  +------+  +------+             |
| |  👤  |  |  👻  |  |  🎁  |             |  <- Entity type grid
| |Player|  |Enemy |  | Chest|             |
| +------+  +------+  +------+             |
|                                          |
| +------+  +------+                       |
| |  🚪  |  |  ⭐  |                       |
| | Door |  | Star |                       |
| +------+  +------+                       |
+------------------------------------------+
```

**Entity Type Item:**

```typescript
interface EntityTypeItemConfig {
  type: EntityType;
  isSelected: boolean;
  onSelect: () => void;
}

// Renders as touch-friendly card with:
// - Icon (first letter or emoji from name, or custom icon if defined)
// - Name (truncated if long)
// - Selection highlight
```

### 2. Category System

```typescript
interface EntityCategory {
  name: string;
  types: EntityType[];
}

function groupEntityTypesByCategory(types: EntityType[]): EntityCategory[] {
  // Group by type.category if defined, else use "All"
  const groups = new Map<string, EntityType[]>();

  for (const type of types) {
    const category = type.category ?? 'All';
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(type);
  }

  return Array.from(groups.entries()).map(([name, types]) => ({ name, types }));
}
```

### 3. Editor State Additions

```typescript
interface EditorState {
  // ... existing fields

  /** Selected entity type for placement (null = none) */
  selectedEntityType: string | null;

  /** Entity palette panel state */
  entityPaletteExpanded: boolean;
}
```

---

## Track 20: Entity Placement — Detailed Design

### 1. Entity Tool

**Interface:**

```typescript
interface EntityToolConfig {
  canvas: HTMLCanvasElement;
  getViewport: () => ViewportState;
  getSelectedEntityType: () => string | null;
  getSnapToGrid: () => boolean;
  getTileSize: () => number;
  onEntityPlace: (x: number, y: number, typeName: string) => void;
  touchOffset: number;
}

interface EntityTool {
  /** Handle pointer down */
  onPointerDown(e: PointerEvent): void;

  /** Handle pointer move (preview position) */
  onPointerMove(e: PointerEvent): void;

  /** Handle pointer up */
  onPointerUp(e: PointerEvent): void;

  /** Get current preview position */
  getPreviewPosition(): { x: number; y: number } | null;

  /** Clean up */
  destroy(): void;
}

function createEntityTool(config: EntityToolConfig): EntityTool;
```

### 2. Grid Snap Logic

```typescript
function snapToGrid(x: number, y: number, tileSize: number): { x: number; y: number } {
  return {
    x: Math.round(x / tileSize) * tileSize,
    y: Math.round(y / tileSize) * tileSize,
  };
}

// Optionally snap to tile center:
function snapToTileCenter(x: number, y: number, tileSize: number): { x: number; y: number } {
  const halfTile = tileSize / 2;
  return {
    x: Math.floor(x / tileSize) * tileSize + halfTile,
    y: Math.floor(y / tileSize) * tileSize + halfTile,
  };
}
```

### 3. Entity Instance Creation

```typescript
function createEntityInstance(
  typeName: string,
  x: number,
  y: number,
  project: Project
): EntityInstance | null {
  const entityType = project.entityTypes.find(t => t.name === typeName);
  if (!entityType) return null;

  return {
    id: generateEntityId(),
    type: typeName,
    x,
    y,
    properties: createDefaultProperties(entityType.properties),
  };
}
```

### 4. Entity Renderer

**Interface:**

```typescript
interface EntityRendererConfig {
  ctx: CanvasRenderingContext2D;
  viewport: ViewportState;
  entities: EntityInstance[];
  entityTypes: EntityType[];
  selectedEntityIds: string[];
  previewEntity?: { x: number; y: number; typeName: string };
}

function renderEntities(config: EntityRendererConfig): void;

function renderEntity(
  ctx: CanvasRenderingContext2D,
  entity: EntityInstance,
  entityType: EntityType,
  viewport: ViewportState,
  isSelected: boolean
): void;
```

**Rendering Strategy:**

```typescript
// Entity rendering order:
// 1. All non-selected entities
// 2. Selection boxes
// 3. Selected entities (on top)
// 4. Preview entity (ghost/translucent)

function renderEntity(ctx, entity, entityType, viewport, isSelected) {
  const screenX = (entity.x - viewport.panX) * viewport.zoom;
  const screenY = (entity.y - viewport.panY) * viewport.zoom;
  const size = (entityType.size ?? 32) * viewport.zoom;

  // Draw entity visual (icon, sprite, or placeholder)
  if (entityType.icon) {
    // Draw icon/sprite
  } else {
    // Draw placeholder (colored rectangle with first letter)
    ctx.fillStyle = entityType.color ?? '#4a9eff';
    ctx.fillRect(screenX - size/2, screenY - size/2, size, size);

    ctx.fillStyle = '#fff';
    ctx.font = `${size * 0.6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(entityType.name[0].toUpperCase(), screenX, screenY);
  }

  // Draw selection box if selected
  if (isSelected) {
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2 / viewport.zoom;
    ctx.strokeRect(screenX - size/2 - 2, screenY - size/2 - 2, size + 4, size + 4);
  }
}
```

---

## Track 21: Entity Manipulation — Detailed Design

### 1. Entity Manager

**Interface:**

```typescript
interface EntityManager {
  /** Add entity to scene */
  addEntity(entity: EntityInstance): void;

  /** Remove entity by ID */
  removeEntity(id: string): boolean;

  /** Remove multiple entities */
  removeEntities(ids: string[]): void;

  /** Update entity position */
  moveEntity(id: string, x: number, y: number): boolean;

  /** Move multiple entities by delta */
  moveEntities(ids: string[], deltaX: number, deltaY: number): void;

  /** Duplicate entity */
  duplicateEntity(id: string): EntityInstance | null;

  /** Duplicate multiple entities */
  duplicateEntities(ids: string[]): EntityInstance[];

  /** Get entity by ID */
  getEntity(id: string): EntityInstance | null;

  /** Get all entities at position */
  getEntitiesAtPosition(x: number, y: number, tolerance: number): EntityInstance[];
}
```

### 2. Entity Selection State

```typescript
interface EntitySelectionState {
  /** Currently selected entity IDs */
  selectedIds: string[];

  /** Is multi-select mode active */
  isMultiSelectMode: boolean;
}

interface EditorState {
  // ... existing fields

  /** Entity selection state */
  entitySelection: EntitySelectionState;
}

// Selection helpers
function selectEntity(id: string): void;
function deselectEntity(id: string): void;
function toggleEntitySelection(id: string): void;
function selectEntities(ids: string[]): void;
function clearEntitySelection(): void;
function isEntitySelected(id: string): boolean;
```

### 3. Hit Testing

```typescript
interface EntityHitTestConfig {
  entities: EntityInstance[];
  entityTypes: EntityType[];
  worldX: number;
  worldY: number;
  tolerance: number;  // Extra hit area around entities
}

function hitTestEntity(config: EntityHitTestConfig): EntityInstance | null {
  // Test from top to bottom (last added = on top)
  for (let i = config.entities.length - 1; i >= 0; i--) {
    const entity = config.entities[i];
    const entityType = config.entityTypes.find(t => t.name === entity.type);
    const size = entityType?.size ?? 32;
    const halfSize = size / 2 + config.tolerance;

    if (
      config.worldX >= entity.x - halfSize &&
      config.worldX <= entity.x + halfSize &&
      config.worldY >= entity.y - halfSize &&
      config.worldY <= entity.y + halfSize
    ) {
      return entity;
    }
  }
  return null;
}

function hitTestEntitiesInRect(
  entities: EntityInstance[],
  entityTypes: EntityType[],
  rect: { x1: number; y1: number; x2: number; y2: number }
): EntityInstance[] {
  // For box selection
}
```

### 4. Drag-to-Move

```typescript
interface EntityDragState {
  isDragging: boolean;
  startWorldX: number;
  startWorldY: number;
  entityStartPositions: Map<string, { x: number; y: number }>;
}

function startEntityDrag(selectedIds: string[], worldX: number, worldY: number): void;
function updateEntityDrag(worldX: number, worldY: number, snapToGrid: boolean): void;
function endEntityDrag(): void;
function cancelEntityDrag(): void;
```

### 5. Undo/Redo Integration

```typescript
// New operation types for entity system
type EntityOperationType =
  | 'entity_add'
  | 'entity_delete'
  | 'entity_move'
  | 'entity_duplicate'
  | 'entity_property_change';

interface EntityOperation {
  type: EntityOperationType;
  entityIds: string[];

  // For move operations
  oldPositions?: Map<string, { x: number; y: number }>;
  newPositions?: Map<string, { x: number; y: number }>;

  // For add/delete operations
  entities?: EntityInstance[];

  // For property change
  propertyName?: string;
  oldValues?: Map<string, unknown>;
  newValues?: Map<string, unknown>;
}

function pushEntityOperation(operation: EntityOperation): void;
function undoEntityOperation(operation: EntityOperation): void;
function redoEntityOperation(operation: EntityOperation): void;
```

---

## Track 22: Property Inspector — Detailed Design

### 1. Property Inspector Component

**Interface:**

```typescript
interface PropertyInspectorConfig {
  entities: EntityInstance[];
  entityTypes: EntityType[];
  onPropertyChange: (entityIds: string[], propertyName: string, value: unknown) => void;
  onClose: () => void;
}

interface PropertyInspector {
  /** Update displayed entities */
  setEntities(entities: EntityInstance[]): void;

  /** Refresh property values */
  refresh(): void;

  /** Close inspector */
  close(): void;

  /** Clean up */
  destroy(): void;
}

function createPropertyInspector(
  container: HTMLElement,
  config: PropertyInspectorConfig
): PropertyInspector;
```

**UI Layout:**

```
+------------------------------------------+
| Entity: Player                      [X]  |
| ID: e_1706745600000_abc123               |
+------------------------------------------+
| Properties                               |
+------------------------------------------+
| Name                                     |
| [Player 1                          ]     |
+------------------------------------------+
| Health                                   |
| [100                               ]     |
| (min: 0, max: 999)                       |
+------------------------------------------+
| Is Active                                |
| [======●] ON                             |
+------------------------------------------+
| Sprite                                   |
| [player_idle ▼]                          |
+------------------------------------------+
```

### 2. Property Editors

**String Editor:**

```typescript
interface StringEditorConfig {
  property: PropertyDefinition;
  value: string;
  onChange: (value: string) => void;
}

function createStringEditor(container: HTMLElement, config: StringEditorConfig): void {
  // Create text input
  // Apply minLength/maxLength/pattern validation
  // Show error state if invalid
}
```

**Number Editor:**

```typescript
interface NumberEditorConfig {
  property: PropertyDefinition;
  value: number;
  onChange: (value: number) => void;
}

function createNumberEditor(container: HTMLElement, config: NumberEditorConfig): void {
  // Create number input
  // Apply min/max validation
  // Optional: slider for bounded ranges
}
```

**Boolean Editor:**

```typescript
interface BooleanEditorConfig {
  property: PropertyDefinition;
  value: boolean;
  onChange: (value: boolean) => void;
}

function createBooleanEditor(container: HTMLElement, config: BooleanEditorConfig): void {
  // Create toggle switch
  // Immediate update on toggle
}
```

**Asset Reference Editor:**

```typescript
interface AssetRefEditorConfig {
  property: PropertyDefinition;
  value: string;
  assetType: string;
  availableAssets: string[];
  onChange: (value: string) => void;
}

function createAssetRefEditor(container: HTMLElement, config: AssetRefEditorConfig): void {
  // Create dropdown/picker
  // Filter assets by type
  // Show current selection
}
```

### 3. Multi-Select Editing

```typescript
function getCommonProperties(
  entities: EntityInstance[],
  entityTypes: EntityType[]
): PropertyDefinition[] {
  // Find properties that exist on all selected entities
  // (Only if all entities are same type, or have overlapping properties)
}

function getMixedPropertyValue(
  entities: EntityInstance[],
  propertyName: string
): { isMixed: boolean; value: unknown } {
  const values = entities.map(e => e.properties[propertyName]);
  const firstValue = values[0];
  const isMixed = values.some(v => v !== firstValue);
  return { isMixed, value: isMixed ? undefined : firstValue };
}

// When editing mixed values, apply to all selected entities
function applyPropertyToAll(
  entities: EntityInstance[],
  propertyName: string,
  value: unknown
): void;
```

### 4. Validation Display

```typescript
interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

function validateProperty(
  value: unknown,
  definition: PropertyDefinition
): ValidationResult {
  if (!validatePropertyValue(value, definition)) {
    return {
      isValid: false,
      errorMessage: getValidationErrorMessage(value, definition),
    };
  }
  return { isValid: true };
}

function getValidationErrorMessage(
  value: unknown,
  definition: PropertyDefinition
): string {
  const c = definition.constraints;

  if (definition.type === 'number' && typeof value === 'number') {
    if (c?.min !== undefined && value < c.min) {
      return `Minimum value is ${c.min}`;
    }
    if (c?.max !== undefined && value > c.max) {
      return `Maximum value is ${c.max}`;
    }
  }

  if (definition.type === 'string' && typeof value === 'string') {
    if (c?.minLength !== undefined && value.length < c.minLength) {
      return `Minimum length is ${c.minLength}`;
    }
    if (c?.maxLength !== undefined && value.length > c.maxLength) {
      return `Maximum length is ${c.maxLength}`;
    }
    if (c?.pattern !== undefined && !new RegExp(c.pattern).test(value)) {
      return `Value must match pattern: ${c.pattern}`;
    }
  }

  return 'Invalid value';
}
```

---

## State Management

### Entity-Related Editor State

```typescript
interface EditorState {
  // ... existing fields

  // Track 19: Entity Palette
  selectedEntityType: string | null;
  entityPaletteExpanded: boolean;

  // Track 21: Entity Selection
  selectedEntityIds: string[];

  // Track 20/21: Placement settings
  entitySnapToGrid: boolean;
}

// Defaults
const DEFAULT_ENTITY_STATE = {
  selectedEntityType: null,
  entityPaletteExpanded: false,
  selectedEntityIds: [],
  entitySnapToGrid: true,
};
```

---

## Files Created/Modified

| File | Action | Track | Purpose |
|------|--------|-------|---------|
| `src/editor/panels/entityPalette.ts` | Create | 19 | Entity browsing and selection |
| `src/editor/tools/entity.ts` | Create | 20 | Entity placement tool |
| `src/editor/canvas/entityRenderer.ts` | Create | 20 | Entity rendering |
| `src/editor/entities/entityManager.ts` | Create | 21 | Entity CRUD operations |
| `src/editor/entities/entitySelection.ts` | Create | 21 | Selection state |
| `src/editor/panels/propertyInspector.ts` | Create | 22 | Property editing UI |
| `src/editor/tools/select.ts` | Modify | 21 | Add entity selection |
| `src/editor/canvas/renderer.ts` | Modify | 20 | Integrate entity layer |
| `src/editor/panels/bottomPanel.ts` | Modify | 19-20 | Add entity tool button |
| `src/storage/hot.ts` | Modify | 19-22 | Add entity editor state |
| `src/editor/history/operations.ts` | Modify | 21 | Add entity operations |
| `src/editor/init.ts` | Modify | 19-22 | Wire entity system |

---

## API Contracts

### Entity Palette
```typescript
const palette = createEntityPalette(container, {
  entityTypes: project.entityTypes,
  selectedType: null,
  onEntitySelect: (typeName) => {
    setSelectedEntityType(typeName);
    setCurrentTool('entity');
  },
});
```

### Entity Tool
```typescript
const entityTool = createEntityTool({
  canvas,
  getViewport: () => viewportState,
  getSelectedEntityType: () => editorState.selectedEntityType,
  getSnapToGrid: () => editorState.entitySnapToGrid,
  getTileSize: () => currentScene.tileSize,
  onEntityPlace: (x, y, typeName) => {
    const entity = createEntityInstance(typeName, x, y, project);
    if (entity) {
      entityManager.addEntity(entity);
      pushEntityOperation({ type: 'entity_add', entityIds: [entity.id], entities: [entity] });
    }
  },
  touchOffset: editorState.touchOffset,
});
```

### Property Inspector
```typescript
const inspector = createPropertyInspector(container, {
  entities: selectedEntities,
  entityTypes: project.entityTypes,
  onPropertyChange: (entityIds, propertyName, value) => {
    const oldValues = new Map(entityIds.map(id => [id, getEntity(id)?.properties[propertyName]]));
    for (const id of entityIds) {
      entityManager.setProperty(id, propertyName, value);
    }
    pushEntityOperation({
      type: 'entity_property_change',
      entityIds,
      propertyName,
      oldValues,
      newValues: new Map(entityIds.map(id => [id, value])),
    });
  },
  onClose: () => clearEntitySelection(),
});
```

---

## Edge Cases

1. **No Entity Types in Project**: Show empty state in palette with guidance
2. **Entity Deleted While Selected**: Clear selection, close inspector
3. **Invalid Entity Type Reference**: Skip rendering, show warning
4. **Overlapping Entities**: Select topmost (last in array)
5. **Entity Outside Scene Bounds**: Allow (entities aren't grid-locked)
6. **Property Type Mismatch**: Validate on load, use default if invalid
7. **Large Number of Entities**: Implement render culling
8. **Multi-Select Different Types**: Show only shared type properties

---

## Performance Considerations

1. **Entity Rendering**: Cull off-screen entities
2. **Hit Testing**: Spatial indexing for many entities
3. **Property Inspector**: Lazy render property editors
4. **Selection Updates**: Batch selection state changes
5. **Auto-Save**: Debounce after entity operations

---

## Testing Strategy

### Manual Tests
1. Browse entity palette, select types
2. Place entities at various positions
3. Select, move, delete entities
4. Edit all property types
5. Multi-select and batch edit
6. Undo/redo all operations
7. Reload, verify persistence

### Unit Tests
1. Entity instance creation
2. Property validation
3. Hit testing
4. Selection state management
5. Undo/redo operations

---

## Notes

- Entity visual size defaults to 32px if not specified in type
- Entity positions are pixel coordinates, not tile coordinates
- Grid snap aligns to tile boundaries by default
- Property inspector auto-focuses first editable field
- Undo/redo groups consecutive property edits
- EntityType.category field is optional (falls back to "All")
