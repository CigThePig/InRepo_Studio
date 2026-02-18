import { screenToTile } from '@/editor/canvas/viewport';
import type { ViewportState } from '@/editor/canvas/viewport';
import type { BrushSize } from '@/storage/hot';

export type { BrushSize } from '@/storage/hot';

/** Point in tile coordinates */
export interface TilePoint {
  x: number;
  y: number;
}

/**
 * Bresenham line algorithm for interpolating between two points.
 * Returns all tile positions along the line (inclusive).
 */
export function interpolateLine(x0: number, y0: number, x1: number, y1: number): TilePoint[] {
  const points: TilePoint[] = [];

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  for (;;) {
    points.push({ x, y });

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return points;
}

/**
 * Convert screen coordinates to tile coordinates with touch offset.
 */
export function screenToTileWithOffset(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  tileSize: number,
  offsetY: number
): TilePoint {
  // Apply touch offset (position above finger)
  const offsetScreenY = screenY + offsetY;

  // Convert to tile coordinates
  return screenToTile(viewport, screenX, offsetScreenY, tileSize);
}

/**
 * Calculate all tile positions affected by a brush centered at (x, y).
 */
export function getBrushFootprint(
  centerX: number,
  centerY: number,
  brushSize: BrushSize
): TilePoint[] {
  const points: TilePoint[] = [];

  if (brushSize === 1) {
    points.push({ x: centerX, y: centerY });
  } else if (brushSize === 2) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        points.push({ x: centerX + dx, y: centerY + dy });
      }
    }
  } else {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        points.push({ x: centerX + dx, y: centerY + dy });
      }
    }
  }

  return points;
}
