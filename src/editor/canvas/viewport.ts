/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Viewport state management and coordinate transforms
 *
 * Defines:
 * - ViewportState — pan/zoom state (type: schema, re-exported from storage)
 * - MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM — zoom constraints (type: constants)
 *
 * Canonical key set:
 * - Keys come from: src/storage/hot.ts (ViewportState)
 * - Export/Import policy: part of EditorState export
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (transforms update immediately)
 *
 * Verification (minimum):
 * - [ ] screenToWorld and worldToScreen are inverses
 * - [ ] worldToTile correctly calculates grid position
 * - [ ] clampZoom enforces MIN_ZOOM to MAX_ZOOM
 */

import type { ViewportState } from '@/storage/hot';

// Re-export ViewportState from storage to keep single source of truth
export type { ViewportState } from '@/storage/hot';

// --- Constants ---

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4.0;
export const DEFAULT_ZOOM = 1.0;

// --- Point Types ---

export interface Point {
  x: number;
  y: number;
}

export function createViewport(initial?: Partial<ViewportState>): ViewportState {
  return {
    panX: initial?.panX ?? 0,
    panY: initial?.panY ?? 0,
    zoom: clampZoom(initial?.zoom ?? DEFAULT_ZOOM),
  };
}

// --- Zoom Clamping ---

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

// --- Coordinate Transforms ---

/**
 * Convert screen coordinates (relative to canvas) to world coordinates.
 *
 * Formula: worldX = (screenX - panX) / zoom
 */
export function screenToWorld(
  viewport: ViewportState,
  screenX: number,
  screenY: number
): Point {
  return {
    x: (screenX - viewport.panX) / viewport.zoom,
    y: (screenY - viewport.panY) / viewport.zoom,
  };
}

/**
 * Convert world coordinates to screen coordinates (relative to canvas).
 *
 * Formula: screenX = worldX * zoom + panX
 */
export function worldToScreen(
  viewport: ViewportState,
  worldX: number,
  worldY: number
): Point {
  return {
    x: worldX * viewport.zoom + viewport.panX,
    y: worldY * viewport.zoom + viewport.panY,
  };
}

/**
 * Convert world coordinates to tile grid coordinates.
 *
 * Formula: tileX = floor(worldX / tileSize)
 */
export function worldToTile(
  worldX: number,
  worldY: number,
  tileSize: number
): Point {
  return {
    x: Math.floor(worldX / tileSize),
    y: Math.floor(worldY / tileSize),
  };
}

/**
 * Convert tile grid coordinates to world coordinates (top-left corner of tile).
 *
 * Formula: worldX = tileX * tileSize
 */
export function tileToWorld(
  tileX: number,
  tileY: number,
  tileSize: number
): Point {
  return {
    x: tileX * tileSize,
    y: tileY * tileSize,
  };
}

/**
 * Convert screen coordinates directly to tile coordinates.
 * Convenience function combining screenToWorld and worldToTile.
 */
export function screenToTile(
  viewport: ViewportState,
  screenX: number,
  screenY: number,
  tileSize: number
): Point {
  const world = screenToWorld(viewport, screenX, screenY);
  return worldToTile(world.x, world.y, tileSize);
}

/**
 * Convert tile coordinates directly to screen coordinates.
 * Convenience function combining tileToWorld and worldToScreen.
 */
export function tileToScreen(
  viewport: ViewportState,
  tileX: number,
  tileY: number,
  tileSize: number
): Point {
  const world = tileToWorld(tileX, tileY, tileSize);
  return worldToScreen(viewport, world.x, world.y);
}

// --- Viewport Manipulation ---

/**
 * Apply a pan delta to the viewport.
 */
export function applyPan(
  viewport: ViewportState,
  deltaX: number,
  deltaY: number
): ViewportState {
  return {
    ...viewport,
    panX: viewport.panX + deltaX,
    panY: viewport.panY + deltaY,
  };
}

/**
 * Apply zoom centered on a screen point.
 *
 * The point (centerX, centerY) should remain at the same screen position
 * after the zoom is applied.
 */
export function applyZoom(
  viewport: ViewportState,
  scale: number,
  centerX: number,
  centerY: number
): ViewportState {
  const newZoom = clampZoom(viewport.zoom * scale);

  // If zoom didn't change (clamped), return unchanged
  if (newZoom === viewport.zoom) {
    return viewport;
  }

  // Calculate the world point under the center
  const worldX = (centerX - viewport.panX) / viewport.zoom;
  const worldY = (centerY - viewport.panY) / viewport.zoom;

  // Calculate new pan to keep that world point at the same screen position
  const newPanX = centerX - worldX * newZoom;
  const newPanY = centerY - worldY * newZoom;

  return {
    panX: newPanX,
    panY: newPanY,
    zoom: newZoom,
  };
}

/**
 * Get the visible world bounds based on viewport and canvas size.
 */
export function getVisibleBounds(
  viewport: ViewportState,
  canvasWidth: number,
  canvasHeight: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  const topLeft = screenToWorld(viewport, 0, 0);
  const bottomRight = screenToWorld(viewport, canvasWidth, canvasHeight);

  return {
    minX: topLeft.x,
    minY: topLeft.y,
    maxX: bottomRight.x,
    maxY: bottomRight.y,
  };
}

/**
 * Get the visible tile range based on viewport, canvas size, and tile size.
 */
export function getVisibleTileRange(
  viewport: ViewportState,
  canvasWidth: number,
  canvasHeight: number,
  tileSize: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  const bounds = getVisibleBounds(viewport, canvasWidth, canvasHeight);

  return {
    minX: Math.floor(bounds.minX / tileSize),
    minY: Math.floor(bounds.minY / tileSize),
    maxX: Math.ceil(bounds.maxX / tileSize),
    maxY: Math.ceil(bounds.maxY / tileSize),
  };
}
