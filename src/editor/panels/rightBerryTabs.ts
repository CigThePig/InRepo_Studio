/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Right berry tab definitions for Editor V2 modes.
 *
 * Defines:
 * - RIGHT_BERRY_TABS — right berry tab metadata (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (tabs render immediately)
 */

import type { EditorMode } from '@/editor/v2/editorMode';

export interface RightBerryTab {
  mode: EditorMode;
  label: string;
  icon: string;
}

export const RIGHT_BERRY_TABS: RightBerryTab[] = [
  { mode: 'ground', label: 'Ground', icon: 'G' },
  { mode: 'props', label: 'Props', icon: 'P' },
  { mode: 'entities', label: 'Entities', icon: 'E' },
  { mode: 'collision', label: 'Collision', icon: 'C' },
  { mode: 'triggers', label: 'Triggers', icon: 'T' },
];
