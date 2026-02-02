/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Mapping between Editor V2 modes and legacy tool/layer state.
 *
 * Defines:
 * - MODE_TO_LAYER — mode to layer mapping (type: lookup)
 * - MODE_TO_TOOL — mode to tool mapping (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (used when translating modes)
 */

import type { LayerType } from '@/types';
import type { ToolType } from '@/editor/panels/bottomPanel';
import type { EditorMode } from './editorMode';

export const MODE_TO_LAYER: Record<EditorMode, LayerType | null> = {
  select: null,
  ground: 'ground',
  props: 'props',
  entities: null,
  collision: 'collision',
  triggers: 'triggers',
};

export const MODE_TO_TOOL: Record<EditorMode, ToolType> = {
  select: 'select',
  ground: 'paint',
  props: 'paint',
  entities: 'entity',
  collision: 'paint',
  triggers: 'entity',
};

export function getLegacyState(mode: EditorMode): { tool: ToolType; layer: LayerType | null } {
  return {
    tool: MODE_TO_TOOL[mode],
    layer: MODE_TO_LAYER[mode],
  };
}
