/**
 * Editor Blockly module — workspace UI, Logic Target switching, block insertion.
 *
 * Owns:
 * - Blockly workspace container and configuration
 * - Workspace lifecycle (create on enter Blockly Mode, save on exit)
 * - Logic Target switching (swap workspace file, handle empty state)
 * - Block insertion from Presets Hooks and palette
 *
 * See /src/editor/blockly/AGENTS.md for full rules.
 */

// Blockly Mode state
export {
  isBlocklyModeActive,
  enterBlocklyMode,
  exitBlocklyMode,
  onBlocklyModeChange,
  getCurrentLogicTarget,
  getBlocklyModeState,
  setWorkspaceReady,
  setScriptStatus,
  setHasUnsavedChanges,
  setScriptExists,
  setCurrentLogicTarget,
} from './blocklyMode';
export type { ScriptStatus, BlocklyModeState } from './blocklyMode';

// Blockly Workspace
export { createBlocklyWorkspace } from './blocklyWorkspace';
export type { BlocklyWorkspaceController } from './blocklyWorkspace';

// Workspace Manager
export { createWorkspaceManager } from './workspaceManager';
export type { WorkspaceManagerController } from './workspaceManager';

// Blockly Top Bar
export { createBlocklyTopBar } from './blocklyTopBar';
export type { BlocklyTopBarController, LogicTargetItem } from './blocklyTopBar';

// Blockly Cockpit (full orchestrator)
export { createBlocklyCockpit } from './blocklyCockpit';
export type { BlocklyCockpitController, BlocklyCockpitDeps } from './blocklyCockpit';

// Palette Categories
export { PALETTE_CATEGORIES, getCategoryBlocks, isCategoryEnabled, isCategoryVisible } from './paletteCategories';
export type { PaletteCategoryDef } from './paletteCategories';

// Blockly Berry Tabs
export { BLOCKLY_BERRY_TABS } from './blocklyBerryTabs';
export type { BlocklyBerryTab } from './blocklyBerryTabs';

// Blocks Palette
export { createBlocksPalette } from './blocksPalette';
export type { BlocksPaletteController, BlocksPaletteDeps } from './blocksPalette';

// Inspect Panel (Track 42)
export { createInspectPanel } from './inspectPanel';
export type {
  InspectPanelController,
  InspectPanelOptions,
  InspectState,
  ScriptInspectEntry,
  LogEntry,
} from './inspectPanel';
