/**
 * Canvas Module - Public Exports
 *
 * This module provides the canvas system for the InRepo Studio editor,
 * including viewport management, coordinate transforms, and rendering.
 */

// Viewport state and transforms
export {
  createViewport,
  clampZoom,
  screenToWorld,
  worldToScreen,
  worldToTile,
  tileToWorld,
  screenToTile,
  tileToScreen,
  applyPan,
  applyZoom,
  getVisibleBounds,
  getVisibleTileRange,
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_ZOOM,
} from './viewport';

export type { ViewportState, Point } from './viewport';

// Canvas controller
export { createCanvas } from './Canvas';
export type { CanvasController, CanvasOptions } from './Canvas';

// Grid
export { drawGrid, createDefaultGridConfig } from './grid';
export type { GridConfig } from './grid';

// Gestures
export { createGestureHandler } from './gestures';
export type { GestureCallbacks, GestureHandler } from './gestures';
