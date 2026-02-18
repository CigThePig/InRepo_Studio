/**
 * Grid Rendering
 *
 * Draws a grid overlay on the canvas to help with tile placement.
 * Features:
 * - Culling: Only draws visible grid lines
 * - Proper scaling with viewport zoom
 * - Configurable color and opacity
 */

import { getVisibleTileRange, type ViewportState } from './viewport';

// --- Types ---

export interface GridConfig {
  /** Whether the grid is visible */
  visible: boolean;

  /** Grid line color (CSS color) */
  color: string;

  /** Grid line opacity (0.0 to 1.0) */
  opacity: number;

  /** Grid line width in screen pixels */
  lineWidth: number;
}

// --- Defaults ---

const DEFAULT_GRID_CONFIG: GridConfig = {
  visible: true,
  color: '#ffffff',
  opacity: 0.15,
  lineWidth: 1,
};

export function createDefaultGridConfig(overrides?: Partial<GridConfig>): GridConfig {
  return {
    ...DEFAULT_GRID_CONFIG,
    ...overrides,
  };
}

// --- Grid Drawing ---

/**
 * Draw grid lines on the canvas.
 *
 * Algorithm:
 * 1. Calculate visible tile range based on viewport
 * 2. Draw vertical lines for each tile column
 * 3. Draw horizontal lines for each tile row
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  tileSize: number,
  canvasWidth: number,
  canvasHeight: number,
  config: GridConfig
): void {
  if (!config.visible) return;

  // Calculate visible tile range (with 1 tile padding for smooth scrolling)
  const range = getVisibleTileRange(viewport, canvasWidth, canvasHeight, tileSize);
  const startX = range.minX - 1;
  const endX = range.maxX + 1;
  const startY = range.minY - 1;
  const endY = range.maxY + 1;

  // Save context state
  ctx.save();

  // Set up line style
  ctx.strokeStyle = config.color;
  ctx.globalAlpha = config.opacity;
  ctx.lineWidth = config.lineWidth;

  // Use integer coordinates for crisp lines (important at low DPI)
  ctx.imageSmoothingEnabled = false;

  // Begin path for all grid lines (batched for performance)
  ctx.beginPath();

  // Draw vertical lines
  for (let tileX = startX; tileX <= endX; tileX++) {
    const worldX = tileX * tileSize;
    const screenX = worldX * viewport.zoom + viewport.panX;

    // Skip if off-screen
    if (screenX < -1 || screenX > canvasWidth + 1) continue;

    // Round to nearest 0.5 for crisp lines on non-retina displays
    const x = Math.round(screenX) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
  }

  // Draw horizontal lines
  for (let tileY = startY; tileY <= endY; tileY++) {
    const worldY = tileY * tileSize;
    const screenY = worldY * viewport.zoom + viewport.panY;

    // Skip if off-screen
    if (screenY < -1 || screenY > canvasHeight + 1) continue;

    // Round to nearest 0.5 for crisp lines
    const y = Math.round(screenY) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
  }

  // Stroke all lines at once
  ctx.stroke();

  // Restore context state
  ctx.restore();
}

/**
 * Draw origin indicator (where tile 0,0 is located).
 * Helps with orientation when panning far from origin.
 */
export function drawOriginMarker(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  _tileSize: number
): void {
  const screenX = viewport.panX;
  const screenY = viewport.panY;

  // Only draw if origin is reasonably close to visible area
  const margin = 50;
  if (
    screenX < -margin ||
    screenY < -margin ||
    screenX > ctx.canvas.width + margin ||
    screenY > ctx.canvas.height + margin
  ) {
    return;
  }

  ctx.save();

  // Draw origin crosshair
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;

  const size = 20;

  ctx.beginPath();
  ctx.moveTo(screenX - size, screenY);
  ctx.lineTo(screenX + size, screenY);
  ctx.moveTo(screenX, screenY - size);
  ctx.lineTo(screenX, screenY + size);
  ctx.stroke();

  ctx.restore();
}
