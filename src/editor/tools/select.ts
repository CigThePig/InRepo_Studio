/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Selection tool state machine and tile manipulation helpers
 *
 * Defines:
 * - SelectToolMode — select tool sub-states (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (selection updates are immediate)
 */

import { getGidForTile, type LayerType, type Scene } from '@/types';
import type { ViewportState } from '@/editor/canvas/viewport';
import type { EditorState, SelectedTile } from '@/storage/hot';
import { TOUCH_OFFSET_Y } from '@/editor/canvas/renderer';
import { screenToTileWithOffset, type TilePoint } from '@/editor/tools/common';
import { floodFill, type FloodFillResult } from '@/editor/tools/floodFill';

const LOG_PREFIX = '[SelectTool]';

// --- Types ---

export type SelectToolMode = 'idle' | 'selecting' | 'selected' | 'moving' | 'pasting';

export interface SelectionBounds {
  startX: number;
  startY: number;
  width: number;
  height: number;
  layer: LayerType;
}

export interface SelectionData {
  selection: SelectionBounds;
  tiles: number[][];
}

export interface SelectionOverlayState {
  selection: SelectionBounds | null;
  moveOffset: { x: number; y: number } | null;
  previewTiles: number[][] | null;
  mode: SelectToolMode;
}

export interface SelectClipboard {
  copy(data: SelectionData): void;
  paste(): SelectionData | null;
  hasData(): boolean;
  clear(): void;
}

export interface SelectToolConfig {
  getEditorState: () => EditorState | null;
  getScene: () => Scene | null;
  onSceneChange: (scene: Scene) => void;
  onSelectionChange: (state: SelectionOverlayState) => void;
  clipboard: SelectClipboard;
  onFillResult?: (result: FloodFillResult) => void;
}

export interface SelectTool {
  start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;
  move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;
  end(): void;
  getSelection(): SelectionBounds | null;
  clearSelection(): void;
  startMove(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;
  armMove(): void;
  deleteSelection(): void;
  copySelection(): void;
  armPaste(): void;
  armFill(): void;
  isSelecting(): boolean;
  isMoving(): boolean;
}

// --- Helpers ---

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getTileValue(scene: Scene, layer: LayerType, selectedTile: SelectedTile | null): number {
  if (layer === 'collision' || layer === 'triggers') {
    return 1;
  }

  if (!selectedTile) {
    return 0;
  }

  const gid = getGidForTile(scene, selectedTile.category, selectedTile.index);
  if (gid === null) {
    console.warn(
      `${LOG_PREFIX} No tileset mapping for category "${selectedTile.category}". Fill skipped.`
    );
    return 0;
  }

  return gid;
}

function createSelectionBounds(
  scene: Scene,
  layer: LayerType,
  start: TilePoint,
  end: TilePoint
): SelectionBounds | null {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);

  const clampedMinX = clamp(minX, 0, scene.width - 1);
  const clampedMaxX = clamp(maxX, 0, scene.width - 1);
  const clampedMinY = clamp(minY, 0, scene.height - 1);
  const clampedMaxY = clamp(maxY, 0, scene.height - 1);

  if (clampedMinX > clampedMaxX || clampedMinY > clampedMaxY) {
    return null;
  }

  return {
    startX: clampedMinX,
    startY: clampedMinY,
    width: clampedMaxX - clampedMinX + 1,
    height: clampedMaxY - clampedMinY + 1,
    layer,
  };
}

function extractSelectionData(scene: Scene, selection: SelectionBounds): SelectionData {
  const layerData = scene.layers[selection.layer];
  const tiles: number[][] = [];

  for (let y = 0; y < selection.height; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < selection.width; x += 1) {
      const tileValue = layerData[selection.startY + y]?.[selection.startX + x] ?? 0;
      row.push(tileValue);
    }
    tiles.push(row);
  }

  return { selection, tiles };
}

function isTileInsideSelection(tile: TilePoint, selection: SelectionBounds): boolean {
  return (
    tile.x >= selection.startX &&
    tile.x < selection.startX + selection.width &&
    tile.y >= selection.startY &&
    tile.y < selection.startY + selection.height
  );
}

// --- Factory ---

export function createSelectTool(config: SelectToolConfig): SelectTool {
  const { getEditorState, getScene, onSceneChange, onSelectionChange, clipboard, onFillResult } =
    config;

  let mode: SelectToolMode = 'idle';
  let selection: SelectionBounds | null = null;
  let selectionData: SelectionData | null = null;
  let selectionStart: TilePoint | null = null;
  let moveOffset: { x: number; y: number } | null = null;
  let moveAnchor: { x: number; y: number } | null = null;
  let pendingPaste = false;
  let pendingFill = false;
  let selectingMoved = false;
  let selectionStartedFromExisting = false;

  function notifySelectionChange(): void {
    onSelectionChange({
      selection,
      moveOffset,
      previewTiles: mode === 'moving' ? selectionData?.tiles ?? null : null,
      mode,
    });
  }

  function setMode(nextMode: SelectToolMode): void {
    if (mode !== nextMode) {
      mode = nextMode;
      notifySelectionChange();
    }
  }

  function clearSelectionState(): void {
    selection = null;
    selectionData = null;
    selectionStart = null;
    moveOffset = null;
    moveAnchor = null;
    pendingPaste = false;
    pendingFill = false;
    selectingMoved = false;
    selectionStartedFromExisting = false;
  }

  function clearSelection(): void {
    clearSelectionState();
    setMode('idle');
  }

  function finalizeSelection(scene: Scene, newSelection: SelectionBounds | null): void {
    if (!newSelection) {
      clearSelection();
      return;
    }

    selection = newSelection;
    selectionData = extractSelectionData(scene, newSelection);
    moveOffset = null;
    moveAnchor = null;
    setMode('selected');
  }

  function applyPaste(scene: Scene, data: SelectionData, target: TilePoint, layer: LayerType): void {
    const layerData = scene.layers[layer];
    const width = data.selection.width;
    const height = data.selection.height;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const destX = target.x + x;
        const destY = target.y + y;
        if (destX < 0 || destX >= scene.width || destY < 0 || destY >= scene.height) {
          continue;
        }
        layerData[destY][destX] = data.tiles[y][x];
      }
    }
  }

  function applyMove(scene: Scene): void {
    if (!selection || !selectionData || !moveOffset) return;

    const layerData = scene.layers[selection.layer];
    const newStartX = selection.startX + moveOffset.x;
    const newStartY = selection.startY + moveOffset.y;

    for (let y = 0; y < selection.height; y += 1) {
      for (let x = 0; x < selection.width; x += 1) {
        const srcX = selection.startX + x;
        const srcY = selection.startY + y;
        if (srcX < 0 || srcX >= scene.width || srcY < 0 || srcY >= scene.height) {
          continue;
        }
        layerData[srcY][srcX] = 0;
      }
    }

    for (let y = 0; y < selection.height; y += 1) {
      for (let x = 0; x < selection.width; x += 1) {
        const destX = newStartX + x;
        const destY = newStartY + y;
        if (destX < 0 || destX >= scene.width || destY < 0 || destY >= scene.height) {
          continue;
        }
        layerData[destY][destX] = selectionData.tiles[y][x];
      }
    }

    selection = {
      ...selection,
      startX: newStartX,
      startY: newStartY,
    };
    selectionData = extractSelectionData(scene, selection);
    moveOffset = null;
    moveAnchor = null;
    setMode('selected');
  }

  function updateMoveOffset(scene: Scene, tile: TilePoint): void {
    if (!selection) return;

    if (!moveAnchor) {
      moveAnchor = {
        x: tile.x - selection.startX,
        y: tile.y - selection.startY,
      };
    }

    const rawOffset = {
      x: tile.x - selection.startX - moveAnchor.x,
      y: tile.y - selection.startY - moveAnchor.y,
    };

    const minOffsetX = -selection.startX;
    const minOffsetY = -selection.startY;
    const maxOffsetX = scene.width - selection.width - selection.startX;
    const maxOffsetY = scene.height - selection.height - selection.startY;

    moveOffset = {
      x: clamp(rawOffset.x, minOffsetX, maxOffsetX),
      y: clamp(rawOffset.y, minOffsetY, maxOffsetY),
    };

    notifySelectionChange();
  }

  function fillAt(scene: Scene, layer: LayerType, tile: TilePoint, selectedTile: SelectedTile | null): void {
    const fillValue = getTileValue(scene, layer, selectedTile);
    if (fillValue === 0 && (layer === 'ground' || layer === 'props')) {
      return;
    }

    const result = floodFill({
      scene,
      layer,
      startX: tile.x,
      startY: tile.y,
      fillValue,
      maxTiles: 10000,
    });

    if (result.count > 0) {
      onSceneChange(scene);
    }

    onFillResult?.(result);
  }

  const tool: SelectTool = {
    start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void {
      const editorState = getEditorState();
      const scene = getScene();

      if (!editorState || !scene || editorState.currentTool !== 'select') {
        return;
      }

      const tile = screenToTileWithOffset(screenX, screenY, viewport, tileSize, TOUCH_OFFSET_Y);
      const activeLayer = editorState.activeLayer;

      if (pendingPaste) {
        const data = clipboard.paste();
        pendingPaste = false;
        if (!data) {
          setMode(selection ? 'selected' : 'idle');
          return;
        }

        applyPaste(scene, data, tile, activeLayer);
        onSceneChange(scene);

        const pastedSelection: SelectionBounds = {
          startX: tile.x,
          startY: tile.y,
          width: data.selection.width,
          height: data.selection.height,
          layer: activeLayer,
        };

        finalizeSelection(scene, pastedSelection);
        return;
      }

      if (pendingFill) {
        pendingFill = false;
        fillAt(scene, activeLayer, tile, editorState.selectedTile);
        return;
      }

      if (mode === 'moving') {
        updateMoveOffset(scene, tile);
        return;
      }

      if (selection && !isTileInsideSelection(tile, selection)) {
        selectionStartedFromExisting = true;
        selectingMoved = false;
        selectionStart = tile;
        selection = null;
        selectionData = null;
        moveOffset = null;
        moveAnchor = null;
        setMode('selecting');
        return;
      }

      if (!selection) {
        selectionStartedFromExisting = false;
        selectingMoved = false;
        selectionStart = tile;
        const nextSelection = createSelectionBounds(scene, activeLayer, tile, tile);
        selection = nextSelection;
        selectionData = nextSelection ? extractSelectionData(scene, nextSelection) : null;
        setMode('selecting');
      }
    },

    move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void {
      const editorState = getEditorState();
      const scene = getScene();
      if (!editorState || !scene || editorState.currentTool !== 'select') {
        return;
      }

      const tile = screenToTileWithOffset(screenX, screenY, viewport, tileSize, TOUCH_OFFSET_Y);

      if (mode === 'moving') {
        updateMoveOffset(scene, tile);
        return;
      }

      if (mode !== 'selecting' || !selectionStart) {
        return;
      }

      selectingMoved = true;
      const nextSelection = createSelectionBounds(scene, editorState.activeLayer, selectionStart, tile);
      selection = nextSelection;
      selectionData = nextSelection ? extractSelectionData(scene, nextSelection) : null;
      notifySelectionChange();
    },

    end(): void {
      const scene = getScene();
      const editorState = getEditorState();
      if (!scene || !editorState || editorState.currentTool !== 'select') {
        return;
      }

      if (mode === 'moving') {
        applyMove(scene);
        onSceneChange(scene);
        return;
      }

      if (mode !== 'selecting') {
        return;
      }

      if (!selectingMoved && selectionStartedFromExisting) {
        clearSelection();
        return;
      }

      if (!selection && selectionStart) {
        selection = createSelectionBounds(scene, editorState.activeLayer, selectionStart, selectionStart);
      }

      finalizeSelection(scene, selection);
    },

    getSelection(): SelectionBounds | null {
      return selection;
    },

    clearSelection(): void {
      clearSelection();
    },

    startMove(
      screenX: number,
      screenY: number,
      viewport: ViewportState,
      tileSize: number
    ): void {
      const scene = getScene();
      const editorState = getEditorState();
      if (!scene || !editorState || editorState.currentTool !== 'select') {
        return;
      }

      if (!selection) return;

      const tile = screenToTileWithOffset(screenX, screenY, viewport, tileSize, TOUCH_OFFSET_Y);
      if (!isTileInsideSelection(tile, selection)) return;

      moveAnchor = {
        x: tile.x - selection.startX,
        y: tile.y - selection.startY,
      };
      moveOffset = { x: 0, y: 0 };
      setMode('moving');
    },

    armMove(): void {
      if (!selection) return;
      moveAnchor = null;
      moveOffset = { x: 0, y: 0 };
      setMode('moving');
    },

    deleteSelection(): void {
      const scene = getScene();
      const editorState = getEditorState();
      if (!scene || !editorState || !selection) {
        return;
      }

      const layerData = scene.layers[selection.layer];
      let modified = false;

      for (let y = 0; y < selection.height; y += 1) {
        for (let x = 0; x < selection.width; x += 1) {
          const tileY = selection.startY + y;
          const tileX = selection.startX + x;
          if (layerData[tileY]?.[tileX] !== 0) {
            layerData[tileY][tileX] = 0;
            modified = true;
          }
        }
      }

      if (modified) {
        onSceneChange(scene);
      }

      selectionData = extractSelectionData(scene, selection);
      notifySelectionChange();
    },

    copySelection(): void {
      if (!selectionData) return;
      clipboard.copy(selectionData);
      notifySelectionChange();
    },

    armPaste(): void {
      if (!clipboard.hasData()) return;
      pendingPaste = true;
      pendingFill = false;
      setMode('pasting');
    },

    armFill(): void {
      clearSelectionState();
      pendingFill = true;
      pendingPaste = false;
      setMode('idle');
    },

    isSelecting(): boolean {
      return mode === 'selecting';
    },

    isMoving(): boolean {
      return mode === 'moving';
    },
  };

  console.log(`${LOG_PREFIX} Select tool created`);

  return tool;
}
