/**
 * Panels Module - Public Exports
 *
 * This module provides the panel components for the InRepo Studio editor,
 * including the top panel (layers) and bottom panel (tools).
 */

// Top Panel
export { createTopPanel } from './topPanel';
export type { TopPanelController, TopPanelState } from './topPanel';

// Bottom Panel
export { createBottomPanel } from './bottomPanel';
export type { BottomPanelController, BottomPanelState, ToolType } from './bottomPanel';
