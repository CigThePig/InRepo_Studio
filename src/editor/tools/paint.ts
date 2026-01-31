/**
 * Paint Tool
 *
 * Handles tile painting operations on the canvas. Supports single-tap
 * and drag painting with Bresenham line interpolation for smooth lines.
 *
 * Uses the touch offset from renderer to paint above the finger.
 */

import type { Scene, LayerType } from '@/types';
import type { ViewportState } from '@/editor/canvas/viewport';
import type { EditorState, SelectedTile } from '@/storage/hot';
import { screenToTile } from '@/editor/canvas/viewport';
import { TOUCH_OFFSET_Y } from '@/editor/canvas/renderer';

const LOG_PREFIX = '[PaintTool]';

// --- Types ---

export interface PaintToolConfig {
  /** Get current editor state */
  getEditorState: () => EditorState | null;

  /** Get current scene */
  getScene: () => Scene | null;

  /** Callback when scene data changes */
  onSceneChange: (scene: Scene) => void;
}

export interface PaintTool {
  /** Handle paint start (tap or drag begin) */
  start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;

  /** Handle paint move (drag) */
  move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;

  /** Handle paint end (finger lift) */
  end(): void;

  /** Check if currently painting */
  isPainting(): boolean;
}

// --- Helpers ---

interface Point {
  x: number;
  y: number;
}

/**
 * Get the tile value to paint based on layer type and selected tile.
 * - Ground/Props: selectedTile.index + 1 (0 is empty)
 * - Collision/Triggers: 1 (binary filled state)
 */
function getTileValue(layer: LayerType, selectedTile: SelectedTile | null): number {
  if (layer === 'collision' || layer === 'triggers') {
    return 1; // Binary filled state
  }

  if (!selectedTile) {
    return 0; // No tile selected, do nothing
  }

  return selectedTile.index + 1; // 1-indexed tile value
}

/**
 * Convert screen coordinates to tile coordinates with touch offset.
 */
function screenToTileWithOffset(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  tileSize: number
): Point {
  // Apply touch offset (position above finger)
  const offsetScreenY = screenY + TOUCH_OFFSET_Y;

  // Convert to tile coordinates
  return screenToTile(viewport, screenX, offsetScreenY, tileSize);
}

/**
 * Bresenham line algorithm for interpolating between two points.
 * Returns all tile positions along the line (inclusive).
 */
function interpolateLine(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = [];

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
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
 * Paint a single tile at the given position.
 * Returns true if the scene was modified.
 */
function paintTile(
  scene: Scene,
  layer: LayerType,
  x: number,
  y: number,
  value: number
): boolean {
  // Bounds check
  if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) {
    return false;
  }

  // Get the layer data
  const layerData = scene.layers[layer];
  if (!layerData) {
    return false;
  }

  // Only paint if value changed
  if (layerData[y][x] === value) {
    return false;
  }

  // Mutate layer
  layerData[y][x] = value;
  return true;
}

// --- Factory ---

export function createPaintTool(config: PaintToolConfig): PaintTool {
  const { getEditorState, getScene, onSceneChange } = config;

  // Paint state
  let painting = false;
  let lastTileX: number | null = null;
  let lastTileY: number | null = null;

  function paintAt(tileX: number, tileY: number): boolean {
    const scene = getScene();
    const editorState = getEditorState();

    if (!scene || !editorState) {
      return false;
    }

    const activeLayer = editorState.activeLayer;
    const selectedTile = editorState.selectedTile;
    const value = getTileValue(activeLayer, selectedTile);

    // Skip if no tile to paint (ground/props without selection)
    if (value === 0 && (activeLayer === 'ground' || activeLayer === 'props')) {
      return false;
    }

    const modified = paintTile(scene, activeLayer, tileX, tileY, value);

    if (modified) {
      onSceneChange(scene);
    }

    return modified;
  }

  function paintLine(fromX: number, fromY: number, toX: number, toY: number): boolean {
    const points = interpolateLine(fromX, fromY, toX, toY);
    let modified = false;

    for (const point of points) {
      if (paintAt(point.x, point.y)) {
        modified = true;
      }
    }

    return modified;
  }

  const tool: PaintTool = {
    start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void {
      const editorState = getEditorState();
      if (!editorState || editorState.currentTool !== 'paint') {
        return;
      }

      painting = true;

      const tile = screenToTileWithOffset(screenX, screenY, viewport, tileSize);
      lastTileX = tile.x;
      lastTileY = tile.y;

      paintAt(tile.x, tile.y);

      console.log(`${LOG_PREFIX} Start paint at (${tile.x}, ${tile.y})`);
    },

    move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void {
      if (!painting) return;

      const tile = screenToTileWithOffset(screenX, screenY, viewport, tileSize);

      // Paint from last position to current (interpolate line)
      if (lastTileX !== null && lastTileY !== null) {
        if (tile.x !== lastTileX || tile.y !== lastTileY) {
          paintLine(lastTileX, lastTileY, tile.x, tile.y);
        }
      } else {
        paintAt(tile.x, tile.y);
      }

      lastTileX = tile.x;
      lastTileY = tile.y;
    },

    end(): void {
      if (painting) {
        console.log(`${LOG_PREFIX} End paint`);
      }
      painting = false;
      lastTileX = null;
      lastTileY = null;
    },

    isPainting(): boolean {
      return painting;
    },
  };

  console.log(`${LOG_PREFIX} Paint tool created`);

  return tool;
}
