/**
 * Panels Module - Public Exports
 *
 * This module provides the panel components for the InRepo Studio editor,
 * including the top panel (layers), bottom panel (tools), and tile picker.
 */

// Top Panel
export { createTopPanel } from './topPanel';
export type { TopPanelController, TopPanelState } from './topPanel';

// Bottom Panel
export { createBottomPanel } from './bottomPanel';
export type { BottomPanelController, BottomPanelState, ToolType } from './bottomPanel';

// Deploy Panel
export { createDeployPanel } from './deployPanel';
export type { DeployPanelController } from './deployPanel';

// Tile Picker
export { createTilePicker } from './tilePicker';
export type { TilePickerController, TilePickerState, TileSelection } from './tilePicker';
