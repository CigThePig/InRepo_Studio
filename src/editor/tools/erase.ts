/**
 * Erase Tool
 *
 * Handles tile erasing operations on the canvas. Supports single-tap
 * and drag erasing with Bresenham line interpolation for smooth lines.
 *
 * Uses the touch offset from renderer to erase above the finger.
 */

import type { LayerType, Scene } from '@/types';
import type { ViewportState } from '@/editor/canvas/viewport';
import type { BrushSize, EditorState } from '@/storage/hot';
import { TOUCH_OFFSET_Y } from '@/editor/canvas/renderer';
import { getBrushFootprint, interpolateLine, screenToTileWithOffset } from '@/editor/tools/common';

const LOG_PREFIX = '[EraseTool]';

// --- Types ---

export interface EraseToolConfig {
  /** Get current editor state */
  getEditorState: () => EditorState | null;

  /** Get current scene */
  getScene: () => Scene | null;

  /** Callback when scene data changes */
  onSceneChange: (scene: Scene) => void;

  /** Get current brush size */
  getBrushSize: () => BrushSize;
}

export interface EraseTool {
  /** Handle erase start (tap or drag begin) */
  start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;

  /** Handle erase move (drag) */
  move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;

  /** Handle erase end (finger lift) */
  end(): void;

  /** Check if currently erasing */
  isErasing(): boolean;
}

// --- Helpers ---

/**
 * Erase a single tile at the given position.
 * Returns true if the scene was modified.
 */
function eraseTile(scene: Scene, layer: LayerType, x: number, y: number): boolean {
  if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) {
    return false;
  }

  const layerData = scene.layers[layer];
  if (!layerData) {
    return false;
  }

  if (layerData[y][x] === 0) {
    return false;
  }

  layerData[y][x] = 0;
  return true;
}

// --- Factory ---

export function createEraseTool(config: EraseToolConfig): EraseTool {
  const { getEditorState, getScene, onSceneChange, getBrushSize } = config;

  let erasing = false;
  let lastTileX: number | null = null;
  let lastTileY: number | null = null;

  function applyErase(points: { x: number; y: number }[]): boolean {
    const scene = getScene();
    const editorState = getEditorState();

    if (!scene || !editorState) {
      return false;
    }

    const activeLayer = editorState.activeLayer;
    const brushSize = getBrushSize();
    let modified = false;

    for (const point of points) {
      const footprint = getBrushFootprint(point.x, point.y, brushSize);
      for (const tile of footprint) {
        if (eraseTile(scene, activeLayer, tile.x, tile.y)) {
          modified = true;
        }
      }
    }

    if (modified) {
      onSceneChange(scene);
    }

    return modified;
  }

  const tool: EraseTool = {
    start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void {
      const editorState = getEditorState();
      if (!editorState || editorState.currentTool !== 'erase') {
        return;
      }

      erasing = true;

      const tile = screenToTileWithOffset(screenX, screenY, viewport, tileSize, TOUCH_OFFSET_Y);
      applyErase([tile]);

      lastTileX = tile.x;
      lastTileY = tile.y;

      console.log(`${LOG_PREFIX} Start erase at (${tile.x}, ${tile.y})`);
    },

    move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void {
      if (!erasing) return;

      const tile = screenToTileWithOffset(screenX, screenY, viewport, tileSize, TOUCH_OFFSET_Y);

      if (lastTileX === null || lastTileY === null) {
        applyErase([tile]);
        lastTileX = tile.x;
        lastTileY = tile.y;
        return;
      }

      const points = interpolateLine(lastTileX, lastTileY, tile.x, tile.y);
      applyErase(points);

      lastTileX = tile.x;
      lastTileY = tile.y;
    },

    end(): void {
      if (erasing) {
        console.log(`${LOG_PREFIX} End erase`);
      }
      erasing = false;
      lastTileX = null;
      lastTileY = null;
    },

    isErasing(): boolean {
      return erasing;
    },
  };

  console.log(`${LOG_PREFIX} Erase tool created`);

  return tool;
}
