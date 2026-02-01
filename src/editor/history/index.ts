export { createHistoryManager } from './historyManager';
export type { HistoryManager, HistoryManagerConfig } from './historyManager';

export { createCompositeOperation, createTileChangeOperation, generateOperationId } from './operations';
export type {
  CompositeOperation,
  Operation,
  OperationType,
  TileChange,
  TileChangeOperationConfig,
} from './operations';
