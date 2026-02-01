/**
 * Brush Cursor
 *
 * Renders a visual indicator showing where the tool action will occur.
 * The cursor appears above the finger position to avoid occlusion.
 */

import type { ViewportState } from './viewport';
import { tileToScreen, screenToTile } from './viewport';
import { getTouchConfig } from './touchConfig';
import type { BrushSize } from '@/storage/hot';

// --- Constants ---

/** Cursor outline style */
const CURSOR_BORDER_COLOR = 'rgba(255, 255, 255, 0.9)';
const CURSOR_BORDER_WIDTH = 2;
const CURSOR_DASH_PATTERN = [4, 4];

/** Preview tile opacity */
const PREVIEW_OPACITY = 0.6;

// --- Types ---

export interface BrushCursorState {
  /** Whether cursor is visible */
  visible: boolean;

  /** Tile X coordinate */
  tileX: number;

  /** Tile Y coordinate */
  tileY: number;

  /** Optional preview tile image */
  previewImage: HTMLImageElement | null;

  /** Brush size */
  brushSize: BrushSize;

  /** Cursor color */
  color: string;
}

export interface BrushCursor {
  /** Set cursor position from screen coordinates */
  setPosition(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;

  /** Set cursor position from tile coordinates */
  setTilePosition(tileX: number, tileY: number): void;

  /** Set visibility */
  setVisible(visible: boolean): void;

  /** Set optional tile preview image */
  setPreviewImage(image: HTMLImageElement | null): void;

  /** Set brush size */
  setBrushSize(size: BrushSize): void;

  /** Set cursor color */
  setColor(color: string): void;

  /** Get current state */
  getState(): BrushCursorState;

  /** Render the cursor to canvas */
  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    tileSize: number,
    sceneWidth: number,
    sceneHeight: number
  ): void;
}

// --- Factory ---

export function createBrushCursor(): BrushCursor {
  const state: BrushCursorState = {
    visible: false,
    tileX: 0,
    tileY: 0,
    previewImage: null,
    brushSize: 1,
    color: CURSOR_BORDER_COLOR,
  };

  const cursor: BrushCursor = {
    setPosition(
      screenX: number,
      screenY: number,
      viewport: ViewportState,
      tileSize: number
    ): void {
      const config = getTouchConfig();

      // Apply touch offset (position above finger)
      const offsetScreenY = screenY + config.offsetY;

      // Convert to tile coordinates
      const tile = screenToTile(viewport, screenX, offsetScreenY, tileSize);

      state.tileX = tile.x;
      state.tileY = tile.y;
    },

    setTilePosition(tileX: number, tileY: number): void {
      state.tileX = tileX;
      state.tileY = tileY;
    },

    setVisible(visible: boolean): void {
      state.visible = visible;
    },

    setPreviewImage(image: HTMLImageElement | null): void {
      state.previewImage = image;
    },

    setBrushSize(size: BrushSize): void {
      state.brushSize = size;
    },

    setColor(color: string): void {
      state.color = color;
    },

    getState(): BrushCursorState {
      return { ...state };
    },

    render(
      ctx: CanvasRenderingContext2D,
      viewport: ViewportState,
      tileSize: number,
      sceneWidth: number,
      sceneHeight: number
    ): void {
      if (!state.visible) return;

      const { tileX, tileY, previewImage } = state;

      // Clamp to scene bounds
      if (tileX < 0 || tileX >= sceneWidth || tileY < 0 || tileY >= sceneHeight) {
        return;
      }

      const screenTileSize = tileSize * viewport.zoom;
      const brushSize = state.brushSize;

      const offsetX = brushSize === 3 ? -1 : 0;
      const offsetY = brushSize === 3 ? -1 : 0;
      const widthTiles = brushSize === 2 ? 2 : brushSize === 3 ? 3 : 1;
      const heightTiles = widthTiles;
      const screenPos = tileToScreen(viewport, tileX + offsetX, tileY + offsetY, tileSize);
      const brushWidth = screenTileSize * widthTiles;
      const brushHeight = screenTileSize * heightTiles;

      // Draw preview tile (semi-transparent) if available
      if (previewImage) {
        ctx.globalAlpha = PREVIEW_OPACITY;
        ctx.drawImage(
          previewImage,
          screenPos.x,
          screenPos.y,
          screenTileSize,
          screenTileSize
        );
        ctx.globalAlpha = 1.0;
      }

      // Draw dashed cursor outline
      ctx.strokeStyle = state.color;
      ctx.lineWidth = CURSOR_BORDER_WIDTH;
      ctx.setLineDash(CURSOR_DASH_PATTERN);
      ctx.strokeRect(
        screenPos.x + 1,
        screenPos.y + 1,
        brushWidth - 2,
        brushHeight - 2
      );
      ctx.setLineDash([]); // Reset dash pattern
    },
  };

  return cursor;
}
