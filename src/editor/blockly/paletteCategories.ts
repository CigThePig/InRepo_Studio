/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Palette category definitions and query helpers for the Blocks Palette.
 *
 * Defines:
 * - PALETTE_CATEGORIES — ordered list of palette category metadata (type: lookup)
 * - PaletteCategoryDef — shape of a palette category definition
 * - getCategoryBlocks() — query BlockRegistry by category with Logic Target + advanced filtering
 * - isCategoryEnabled() — check if a preset-driven category is active
 *
 * Canonical key set:
 * - Category IDs: events, controls, movement, camera, animation, logic, math, variables, time, debug, map
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (palette re-renders when Logic Target or preset state changes)
 */

import type { BlockRegistry } from '@/runtime/blockly/blockRegistry';
import type { BlockPackEntry } from '@/runtime/blockly/schemaToBlocks';
import type { PresetSavedConfig } from '@/types/preset';

// --- Types ---

export interface PaletteCategoryDef {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly presetDriven: boolean;
  readonly categoryId?: string;
  readonly alwaysVisible?: boolean;
  readonly logicTargetFilter?: 'game' | 'map';
  readonly defaultCollapsed?: boolean;
}

// --- Category definitions (v1) ---

export const PALETTE_CATEGORIES: readonly PaletteCategoryDef[] = [
  { id: 'events',    label: 'Events',     icon: 'E',  presetDriven: false, alwaysVisible: true },
  { id: 'controls',  label: 'Controls',   icon: 'Ct', presetDriven: true,  categoryId: 'controls' },
  { id: 'movement',  label: 'Movement',   icon: 'Mv', presetDriven: true,  categoryId: 'movement' },
  { id: 'camera',    label: 'Camera',     icon: 'Ca', presetDriven: true,  categoryId: 'camera' },
  { id: 'animation', label: 'Animation',  icon: 'An', presetDriven: true,  categoryId: 'animation' },
  { id: 'logic',     label: 'Logic',      icon: 'L',  presetDriven: false, alwaysVisible: true },
  { id: 'math',      label: 'Math',       icon: 'M',  presetDriven: false, alwaysVisible: true },
  { id: 'variables', label: 'Variables',  icon: 'V',  presetDriven: false, alwaysVisible: true },
  { id: 'time',      label: 'Time',       icon: 'T',  presetDriven: false, alwaysVisible: true },
  { id: 'debug',     label: 'Debug',      icon: 'D',  presetDriven: false, alwaysVisible: true, defaultCollapsed: true },
  { id: 'map',       label: 'Map',        icon: 'Mp', presetDriven: false, logicTargetFilter: 'map' },
];

// --- Query helpers ---

/**
 * Get blocks for a category from the BlockRegistry, filtered by Logic Target and advanced toggle.
 */
export function getCategoryBlocks(
  registry: BlockRegistry,
  categoryId: string,
  logicTarget: 'game' | 'map' | null,
  showAdvanced: boolean,
): BlockPackEntry[] {
  const entries = registry.getByCategory(categoryId);
  return entries.filter((entry) => {
    // Filter by Logic Target
    if (logicTarget && entry.logicTargetFilter) {
      if (entry.logicTargetFilter !== logicTarget) return false;
    }
    // Filter advanced blocks
    if (!showAdvanced && entry.advanced) return false;
    return true;
  });
}

/**
 * Check if a preset-driven category is enabled in the current preset configuration.
 * Returns true for non-preset-driven categories (always enabled).
 */
export function isCategoryEnabled(
  categoryDef: PaletteCategoryDef,
  presetConfig: PresetSavedConfig | null,
): boolean {
  if (!categoryDef.presetDriven) return true;
  if (!presetConfig) return false;
  const catConfig = presetConfig.categories[categoryDef.categoryId ?? categoryDef.id];
  return catConfig?.enabled ?? false;
}

/**
 * Check if a category should be visible given the current Logic Target.
 */
export function isCategoryVisible(
  categoryDef: PaletteCategoryDef,
  logicTarget: 'game' | 'map' | null,
): boolean {
  if (!categoryDef.logicTargetFilter) return true;
  return categoryDef.logicTargetFilter === logicTarget;
}
