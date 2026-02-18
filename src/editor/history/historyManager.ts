import type { Operation } from './operations';
import { createCompositeOperation } from './operations';

export interface HistoryManagerConfig {
  maxSize?: number;
  onStateChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export interface HistoryManager {
  push(operation: Operation): void;
  beginGroup(description: string): void;
  endGroup(): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  getUndoCount(): number;
  getRedoCount(): number;
  clear(): void;
}

interface GroupState {
  description: string;
  operations: Operation[];
}

export function createHistoryManager(config: HistoryManagerConfig = {}): HistoryManager {
  const maxSize = config.maxSize ?? 50;
  const undoStack: Operation[] = [];
  const redoStack: Operation[] = [];
  const groupStack: GroupState[] = [];

  function notifyStateChange(): void {
    config.onStateChange?.(undoStack.length > 0, redoStack.length > 0);
  }

  function pushToUndoStack(operation: Operation): void {
    undoStack.push(operation);
    redoStack.length = 0;

    while (undoStack.length > maxSize) {
      undoStack.shift();
    }

    notifyStateChange();
  }

  function pushToGroup(operation: Operation): void {
    const group = groupStack[groupStack.length - 1];
    if (!group) return;

    if (group.operations.length === 0) {
      redoStack.length = 0;
    }

    group.operations.push(operation);
  }

  return {
    push(operation: Operation): void {
      if (groupStack.length > 0) {
        pushToGroup(operation);
        return;
      }

      pushToUndoStack(operation);
    },

    beginGroup(description: string): void {
      groupStack.push({ description, operations: [] });
    },

    endGroup(): void {
      const group = groupStack.pop();
      if (!group) return;

      if (group.operations.length === 0) {
        return;
      }

      const composite = createCompositeOperation(group.operations, group.description);
      if (!composite) {
        return;
      }

      if (groupStack.length > 0) {
        pushToGroup(composite);
        return;
      }

      pushToUndoStack(composite);
    },

    undo(): boolean {
      if (undoStack.length === 0) {
        return false;
      }

      const operation = undoStack.pop();
      if (!operation) {
        return false;
      }

      operation.undo();
      redoStack.push(operation);
      notifyStateChange();
      return true;
    },

    redo(): boolean {
      if (redoStack.length === 0) {
        return false;
      }

      const operation = redoStack.pop();
      if (!operation) {
        return false;
      }

      operation.execute();
      undoStack.push(operation);
      notifyStateChange();
      return true;
    },

    canUndo(): boolean {
      return undoStack.length > 0;
    },

    canRedo(): boolean {
      return redoStack.length > 0;
    },

    getUndoCount(): number {
      return undoStack.length;
    },

    getRedoCount(): number {
      return redoStack.length;
    },

    clear(): void {
      undoStack.length = 0;
      redoStack.length = 0;
      groupStack.length = 0;
      notifyStateChange();
    },
  };
}
