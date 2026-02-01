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
import { createTileChangeOperation, type HistoryManager, type TileChange } from '@/editor/history';

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

  /** History manager for undo/redo */
  history: HistoryManager;
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
  const { getEditorState, getScene, onSceneChange, getBrushSize, history } = config;

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

    // Skip if layer is locked
    if (editorState.layerLocks?.[activeLayer]) {
      return false;
    }

    const brushSize = getBrushSize();
    const layerData = scene.layers[activeLayer];
    if (!layerData) {
      return false;
    }

    const changesMap = new Map<string, TileChange>();

    for (const point of points) {
      const footprint = getBrushFootprint(point.x, point.y, brushSize);
      for (const tile of footprint) {
        if (tile.x < 0 || tile.x >= scene.width || tile.y < 0 || tile.y >= scene.height) {
          continue;
        }

        const key = `${tile.x},${tile.y}`;
        if (changesMap.has(key)) {
          continue;
        }

        const oldValue = layerData[tile.y]?.[tile.x] ?? 0;
        if (oldValue === 0) {
          continue;
        }

        changesMap.set(key, {
          layer: activeLayer,
          x: tile.x,
          y: tile.y,
          oldValue,
          newValue: 0,
        });
      }
    }

    const changes = Array.from(changesMap.values());

    if (changes.length === 0) {
      return false;
    }

    for (const change of changes) {
      eraseTile(scene, activeLayer, change.x, change.y);
    }

    const operation = createTileChangeOperation({
      scene,
      changes,
      type: 'erase',
      description: 'Erase tiles',
      onApply: () => onSceneChange(scene),
    });

    if (operation) {
      history.push(operation);
    }

    onSceneChange(scene);

    return true;
  }

  const tool: EraseTool = {
    start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void {
      const editorState = getEditorState();
      if (!editorState || editorState.currentTool !== 'erase') {
        return;
      }

      erasing = true;
      history.beginGroup('Erase tiles');

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
      history.endGroup();
    },

    isErasing(): boolean {
      return erasing;
    },
  };

  console.log(`${LOG_PREFIX} Erase tool created`);

  return tool;
}
