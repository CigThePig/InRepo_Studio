/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Shared selection tool types for tile selection workflow
 *
 * Defines:
 * - SelectToolMode — select tool sub-states (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (selection updates are immediate)
 */

import type { LayerType } from '@/types';

export type SelectToolMode = 'idle' | 'selecting' | 'selected' | 'moving' | 'pasting';

export interface SelectionBounds {
  startX: number;
  startY: number;
  width: number;
  height: number;
  layer: LayerType;
}

export interface SelectionData {
  selection: SelectionBounds;
  tiles: number[][];
}

export interface SelectionOverlayState {
  selection: SelectionBounds | null;
  moveOffset: { x: number; y: number } | null;
  previewTiles: number[][] | null;
  mode: SelectToolMode;
}

export interface SelectClipboard {
  copy(data: SelectionData): void;
  paste(): SelectionData | null;
  hasData(): boolean;
  clear(): void;
}
