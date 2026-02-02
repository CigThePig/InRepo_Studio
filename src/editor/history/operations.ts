/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Undo/redo operation definitions and tile change deltas
 *
 * Defines:
 * - OperationType — history operation categories (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (undo/redo applies immediately)
 */

import type { LayerType, Scene } from '@/types';

export type OperationType =
  | 'paint'
  | 'erase'
  | 'move'
  | 'delete'
  | 'paste'
  | 'fill'
  | 'composite'
  | 'entity_add'
  | 'entity_delete'
  | 'entity_move'
  | 'entity_duplicate';

export interface Operation {
  id: string;
  type: OperationType;
  description: string;
  execute: () => void;
  undo: () => void;
}

export interface TileChange {
  layer: LayerType;
  x: number;
  y: number;
  oldValue: number;
  newValue: number;
}

export interface TileChangeOperationConfig {
  scene: Scene;
  changes: TileChange[];
  type: OperationType;
  description: string;
  onApply?: () => void;
}

export interface CompositeOperation extends Operation {
  type: 'composite';
  operations: Operation[];
}

let operationCounter = 0;

export function generateOperationId(): string {
  operationCounter += 1;
  return `${Date.now()}-${operationCounter}`;
}

function applyTileChanges(
  scene: Scene,
  changes: TileChange[],
  valueKey: 'oldValue' | 'newValue'
): void {
  for (const change of changes) {
    if (change.x < 0 || change.x >= scene.width || change.y < 0 || change.y >= scene.height) {
      continue;
    }

    const layerData = scene.layers[change.layer];
    if (!layerData) continue;

    layerData[change.y][change.x] = change[valueKey];
  }
}

export function createTileChangeOperation(config: TileChangeOperationConfig): Operation | null {
  const filteredChanges = config.changes.filter(
    (change) => change.oldValue !== change.newValue
  );

  if (filteredChanges.length === 0) {
    return null;
  }

  const onApply = config.onApply ?? (() => undefined);

  return {
    id: generateOperationId(),
    type: config.type,
    description: config.description,
    execute: () => {
      applyTileChanges(config.scene, filteredChanges, 'newValue');
      onApply();
    },
    undo: () => {
      applyTileChanges(config.scene, filteredChanges, 'oldValue');
      onApply();
    },
  };
}

export function createCompositeOperation(
  operations: Operation[],
  description: string
): CompositeOperation | null {
  if (operations.length === 0) {
    return null;
  }

  return {
    id: generateOperationId(),
    type: 'composite',
    description,
    operations,
    execute: () => {
      for (const operation of operations) {
        operation.execute();
      }
    },
    undo: () => {
      for (let i = operations.length - 1; i >= 0; i -= 1) {
        operations[i].undo();
      }
    },
  };
}
