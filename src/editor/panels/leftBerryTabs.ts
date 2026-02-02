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

export type LeftBerryTabId = 'sprites' | 'assets';

export interface LeftBerryTab {
  id: LeftBerryTabId;
  label: string;
  icon: string;
}

export const LEFT_BERRY_TABS: LeftBerryTab[] = [
  { id: 'sprites', label: 'Sprites', icon: 'S' },
  { id: 'assets', label: 'Assets', icon: 'A' },
];
