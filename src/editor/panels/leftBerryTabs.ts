/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Left berry tab definitions for asset workflows.
 *
 * Defines:
 * - LEFT_BERRY_TABS — left berry tab metadata (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (tabs render immediately)
 */

export type LeftBerryTabId = 'sprites' | 'animation' | 'assets' | 'tools';

export interface LeftBerryTab {
  id: LeftBerryTabId;
  label: string;
  icon: string;
}

export const LEFT_BERRY_TABS: LeftBerryTab[] = [
  { id: 'sprites', label: 'Sprites', icon: 'S' },
  { id: 'animation', label: 'Animation', icon: '▶' },
  { id: 'assets', label: 'Assets', icon: 'A' },
  { id: 'tools', label: 'Tools', icon: 'T' },
];
