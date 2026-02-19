# Track 16: Undo/Redo System — Blueprint

## Overview

This blueprint details the technical design for a comprehensive undo/redo system using the Command pattern. Operations are captured as reversible commands that can be undone and redone.

---

## Architecture

### Module Structure

```
src/editor/history/
├── index.ts            # Public exports
├── historyManager.ts   # NEW - Undo/redo stack management
├── operations.ts       # NEW - Operation type definitions
└── AGENTS.md           # NEW - History module rules

src/editor/tools/
├── paint.ts            # MODIFY - Capture operations
├── erase.ts            # MODIFY - Capture operations
├── select.ts           # MODIFY - Capture operations
└── ...
```

### Command Pattern

```
Operation Interface:
  - execute(): Apply the operation (for redo)
  - undo(): Reverse the operation
  - getDescription(): Human-readable description

History Manager:
  - push(operation): Add new operation
  - undo(): Pop from undo, push to redo
  - redo(): Pop from redo, push to undo
  - beginGroup(): Start grouping operations
  - endGroup(): End grouping (creates composite operation)
```

---

## Detailed Design

### 1. Operation Interface

**Base types:**

```typescript
interface Operation {
  /** Unique operation ID */
  id: string;

  /** Operation type for debugging */
  type: OperationType;

  /** Human-readable description */
  description: string;

  /** Apply the operation (for redo) */
  execute(): void;

  /** Reverse the operation */
  undo(): void;
}

type OperationType =
  | 'paint'
  | 'erase'
  | 'move'
  | 'delete'
  | 'paste'
  | 'fill'
  | 'composite';
```

### 2. Tile Operations

**TileChangeOperation:**

```typescript
interface TileChange {
  layer: LayerType;
  x: number;
  y: number;
  oldValue: number;
  newValue: number;
}

interface TileChangeOperationConfig {
  scene: Scene;
  changes: TileChange[];
  type: OperationType;
  description: string;
  onApply: () => void;  // Trigger re-render/save
}

function createTileChangeOperation(config: TileChangeOperationConfig): Operation {
  const { scene, changes, type, description, onApply } = config;

  return {
    id: generateOperationId(),
    type,
    description,

    execute() {
      for (const change of changes) {
        scene.layers[change.layer][change.y][change.x] = change.newValue;
      }
      onApply();
    },

    undo() {
      for (const change of changes) {
        scene.layers[change.layer][change.y][change.x] = change.oldValue;
      }
      onApply();
    },
  };
}
```

### 3. Composite Operations

For grouping drag operations:

```typescript
interface CompositeOperation extends Operation {
  type: 'composite';
  operations: Operation[];
}

function createCompositeOperation(
  operations: Operation[],
  description: string
): CompositeOperation {
  return {
    id: generateOperationId(),
    type: 'composite',
    description,
    operations,

    execute() {
      for (const op of operations) {
        op.execute();
      }
    },

    undo() {
      // Undo in reverse order
      for (let i = operations.length - 1; i >= 0; i--) {
        operations[i].undo();
      }
    },
  };
}
```

### 4. History Manager

```typescript
interface HistoryManagerConfig {
  maxSize?: number;  // Default: 50
  onStateChange?: (canUndo: boolean, canRedo: boolean) => void;
}

interface HistoryManager {
  /** Add new operation to history */
  push(operation: Operation): void;

  /** Begin grouping operations */
  beginGroup(description: string): void;

  /** End grouping and create composite operation */
  endGroup(): void;

  /** Undo last operation */
  undo(): boolean;

  /** Redo last undone operation */
  redo(): boolean;

  /** Check if undo is available */
  canUndo(): boolean;

  /** Check if redo is available */
  canRedo(): boolean;

  /** Get undo stack size */
  getUndoCount(): number;

  /** Get redo stack size */
  getRedoCount(): number;

  /** Clear all history */
  clear(): void;
}
```

**Implementation:**

```typescript
function createHistoryManager(config: HistoryManagerConfig = {}): HistoryManager {
  const maxSize = config.maxSize ?? 50;
  const undoStack: Operation[] = [];
  const redoStack: Operation[] = [];

  let grouping = false;
  let groupDescription = '';
  let groupOperations: Operation[] = [];

  function notifyStateChange(): void {
    config.onStateChange?.(undoStack.length > 0, redoStack.length > 0);
  }

  return {
    push(operation) {
      if (grouping) {
        groupOperations.push(operation);
        return;
      }

      undoStack.push(operation);
      redoStack.length = 0;  // Clear redo on new operation

      // Enforce size limit
      while (undoStack.length > maxSize) {
        undoStack.shift();
      }

      notifyStateChange();
    },

    beginGroup(description) {
      grouping = true;
      groupDescription = description;
      groupOperations = [];
    },

    endGroup() {
      if (!grouping) return;

      grouping = false;

      if (groupOperations.length > 0) {
        const composite = createCompositeOperation(groupOperations, groupDescription);
        this.push(composite);
      }

      groupOperations = [];
    },

    undo() {
      if (undoStack.length === 0) return false;

      const operation = undoStack.pop()!;
      operation.undo();
      redoStack.push(operation);

      notifyStateChange();
      return true;
    },

    redo() {
      if (redoStack.length === 0) return false;

      const operation = redoStack.pop()!;
      operation.execute();
      undoStack.push(operation);

      notifyStateChange();
      return true;
    },

    canUndo() {
      return undoStack.length > 0;
    },

    canRedo() {
      return redoStack.length > 0;
    },

    getUndoCount() {
      return undoStack.length;
    },

    getRedoCount() {
      return redoStack.length;
    },

    clear() {
      undoStack.length = 0;
      redoStack.length = 0;
      grouping = false;
      groupOperations = [];
      notifyStateChange();
    },
  };
}
```

### 5. Tool Integration

**Paint Tool Modification:**

```typescript
interface PaintToolConfig {
  // ... existing fields
  history: HistoryManager;
}

// In createPaintTool:
function start(...) {
  history.beginGroup('Paint tiles');
  // ... existing logic
}

function paintAt(tileX, tileY) {
  // Capture old value before changing
  const oldValue = scene.layers[activeLayer][tileY][tileX];
  const newValue = getTileValue(scene, activeLayer, selectedTile);

  if (oldValue !== newValue) {
    const op = createTileChangeOperation({
      scene,
      changes: [{ layer: activeLayer, x: tileX, y: tileY, oldValue, newValue }],
      type: 'paint',
      description: 'Paint tile',
      onApply: () => onSceneChange(scene),
    });

    // Don't execute - we're already applying the change
    scene.layers[activeLayer][tileY][tileX] = newValue;
    history.push(op);
  }
}

function end() {
  history.endGroup();
  // ... existing logic
}
```

**Erase Tool Modification:**

Similar pattern to paint, capturing old values before erasing.

**Select Tool Modification:**

For move, copy, paste, delete, and fill operations.

### 6. Undo/Redo UI

**Toolbar addition:**

```typescript
interface UndoRedoButtons {
  updateState(canUndo: boolean, canRedo: boolean): void;
  onUndo: () => void;
  onRedo: () => void;
}
```

**Visual design:**

```
+----------------------------------------+
| [←] [→] | [Select] [Paint] [Erase] ... |
+----------------------------------------+
  undo redo

- Disabled state: grayed out, no interaction
- Active state: full color
```

### 7. Integration Flow

```
User drags to paint:
  1. start() → beginGroup('Paint tiles')
  2. paintAt() × N → push individual operations to group
  3. end() → endGroup() creates composite, pushes to undo stack

User taps undo:
  1. historyManager.undo()
  2. Composite.undo() → reverts all tiles in drag
  3. Canvas re-renders
  4. Scene auto-saves

User taps redo:
  1. historyManager.redo()
  2. Composite.execute() → re-applies all tiles
  3. Canvas re-renders
  4. Scene auto-saves
```

---

## State Management

### History State

```typescript
interface HistoryState {
  undoStack: Operation[];
  redoStack: Operation[];
  grouping: boolean;
  groupOperations: Operation[];
}
```

Not persisted - session only.

### UI State

```typescript
interface UndoRedoUIState {
  canUndo: boolean;
  canRedo: boolean;
}
```

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/history/index.ts` | Create | Public exports |
| `src/editor/history/historyManager.ts` | Create | Undo/redo stack |
| `src/editor/history/operations.ts` | Create | Operation types |
| `src/editor/history/AGENTS.md` | Create | Module rules |
| `src/editor/tools/paint.ts` | Modify | Capture operations |
| `src/editor/tools/erase.ts` | Modify | Capture operations |
| `src/editor/tools/select.ts` | Modify | Capture operations |
| `src/editor/panels/bottomPanel.ts` | Modify | Add undo/redo buttons |
| `src/editor/init.ts` | Modify | Wire history manager |

---

## API Contracts

### HistoryManager

```typescript
const history = createHistoryManager({
  maxSize: 50,
  onStateChange: (canUndo, canRedo) => {
    updateUndoButton(canUndo);
    updateRedoButton(canRedo);
  },
});

// In tool:
history.beginGroup('Paint tiles');
history.push(operation);
history.endGroup();

// In UI:
history.undo();
history.redo();
```

---

## Edge Cases

1. **Undo with No History**: Button disabled, no-op
2. **Redo After New Operation**: Redo stack cleared
3. **Grouping Without Operations**: No composite created
4. **Max Size Exceeded**: Oldest operations dropped
5. **Scene Change During Edit**: Clear history on scene switch

---

## Performance Considerations

1. **Delta Storage**: Only store changed tiles, not full layers
2. **Lazy Execution**: Operations captured but scene already modified
3. **Batch Updates**: Composite undo applies all at once
4. **Memory Limit**: 50 operation cap prevents bloat

---

## Testing Strategy

### Manual Tests

1. Paint tiles, undo, verify restored
2. Redo after undo, verify re-applied
3. Drag paint, single undo undoes all
4. New operation clears redo
5. Exceed 50 operations, verify limit

### Unit Tests

1. `createHistoryManager`: push/undo/redo flow
2. `createTileChangeOperation`: execute/undo
3. `createCompositeOperation`: grouped undo
4. Stack size limit enforcement

---

## Notes

- Operations store deltas, not snapshots
- Drag operations group automatically
- Clear history on scene switch
- Redo cleared on any new operation
- Consider extending to entity operations (Track 21)
- Consider persistent history (future track)
