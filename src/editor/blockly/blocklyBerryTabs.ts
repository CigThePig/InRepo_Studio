/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Blockly Mode tab definitions for the right berry.
 *
 * Defines:
 * - BLOCKLY_BERRY_TABS — tab definitions for Blockly Mode (type: lookup)
 * - BlocklyBerryTab — shape of a Blockly Mode tab definition
 *
 * Canonical key set:
 * - Tab IDs: 'blocks', 'inspect'
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (tabs render when Blockly Mode enters)
 */

// --- Types ---

export interface BlocklyBerryTab {
  readonly id: string;
  readonly label: string;
}

// --- Tab definitions ---

export const BLOCKLY_BERRY_TABS: readonly BlocklyBerryTab[] = [
  { id: 'blocks',  label: 'Blocks' },
  { id: 'inspect', label: 'Inspect' },
];
