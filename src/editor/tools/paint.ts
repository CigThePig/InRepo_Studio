/**
 * Paint Tool
 *
 * Handles tile painting operations on the canvas. Supports single-tap
 * and drag painting with Bresenham line interpolation for smooth lines.
 *
 * Uses the touch offset from renderer to paint above the finger.
 */

import { getGidForTile, type Scene, type LayerType } from '@/types';
import type { ViewportState } from '@/editor/canvas/viewport';
import type { EditorState, SelectedTile } from '@/storage/hot';
import { TOUCH_OFFSET_Y } from '@/editor/canvas/renderer';
import { interpolateLine, screenToTileWithOffset } from '@/editor/tools/common';

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

/**
 * Get the tile value to paint based on layer type and selected tile.
 * - Ground/Props: global tile GID computed from scene.tilesets (0 is empty)
 * - Collision/Triggers: 1 (binary filled state)
 */
function getTileValue(scene: Scene, layer: LayerType, selectedTile: SelectedTile | null): number {
  if (layer === 'collision' || layer === 'triggers') {
    return 1; // Binary filled state
  }

  if (!selectedTile) {
    return 0; // No tile selected, do nothing
  }

  const gid = getGidForTile(scene, selectedTile.category, selectedTile.index);
  if (gid === null) {
    // This should not happen if scenes are normalized with ensureSceneTilesets().
    console.warn(
      `${LOG_PREFIX} No tileset mapping for category "${selectedTile.category}". ` +
        `Paint skipped (scene.tilesets missing category).`
    );
    return 0;
  }

  return gid;
}

/**
 * Convert screen coordinates to tile coordinates with touch offset.
 */
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
    const value = getTileValue(scene, activeLayer, selectedTile);

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

      const tile = screenToTileWithOffset(screenX, screenY, viewport, tileSize, TOUCH_OFFSET_Y);
      lastTileX = tile.x;
      lastTileY = tile.y;

      paintAt(tile.x, tile.y);

      console.log(`${LOG_PREFIX} Start paint at (${tile.x}, ${tile.y})`);
    },

    move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void {
      if (!painting) return;

      const tile = screenToTileWithOffset(screenX, screenY, viewport, tileSize, TOUCH_OFFSET_Y);

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
