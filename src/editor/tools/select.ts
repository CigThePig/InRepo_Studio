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
import { screenToWorld, type ViewportState } from '@/editor/canvas/viewport';
import type { EditorState, SelectedTile } from '@/storage/hot';
import { TOUCH_OFFSET_Y } from '@/editor/canvas/renderer';
import { screenToTileWithOffset, type TilePoint } from '@/editor/tools/common';
import { floodFill, type FloodFillResult } from '@/editor/tools/floodFill';
import type { EntityInstance } from '@/types';
import type { EntityManager } from '@/editor/entities/entityManager';
import type { EntitySelection } from '@/editor/entities/entitySelection';
import {
  createTileChangeOperation,
  generateOperationId,
  type HistoryManager,
  type Operation,
  type TileChange,
} from '@/editor/history';

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
  onEntitySelectionChange?: (selectedIds: string[]) => void;
  clipboard: SelectClipboard;
  onFillResult?: (result: FloodFillResult) => void;
  history: HistoryManager;
  entityManager: EntityManager;
  entitySelection: EntitySelection;
}

export interface SelectTool {
  start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;
  move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;
  end(): void;
  handleLongPress(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;
  getSelection(): SelectionBounds | null;
  clearSelection(): void;
  startMove(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;
  armMove(): void;
  deleteSelection(): void;
  copySelection(): void;
  armPaste(): void;
  armFill(): void;
  deleteEntities(): void;
  duplicateEntities(): void;
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

function screenToWorldWithOffset(
  viewport: ViewportState,
  screenX: number,
  screenY: number
): { x: number; y: number } {
  return screenToWorld(viewport, screenX, screenY + TOUCH_OFFSET_Y);
}

function getEntityHitTolerance(tileSize: number): number {
  return Math.max(8, tileSize * 0.2);
}

function hitTestEntity(
  scene: Scene,
  viewport: ViewportState,
  screenX: number,
  screenY: number,
  tileSize: number
): EntityInstance | null {
  const world = screenToWorldWithOffset(viewport, screenX, screenY);
  const halfSize = tileSize / 2 + getEntityHitTolerance(tileSize);
  let bestMatch: EntityInstance | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const entity of scene.entities) {
    const dx = Math.abs(world.x - entity.x);
    const dy = Math.abs(world.y - entity.y);
    if (dx <= halfSize && dy <= halfSize) {
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = entity;
      }
    }
  }

  return bestMatch;
}

function snapEntityPosition(
  position: { x: number; y: number },
  tileSize: number,
  snapToGridEnabled: boolean
): { x: number; y: number } {
  if (!snapToGridEnabled) return position;
  return {
    x: Math.floor(position.x / tileSize) * tileSize,
    y: Math.floor(position.y / tileSize) * tileSize,
  };
}

function clampEntityPosition(
  scene: Scene,
  position: { x: number; y: number },
  tileSize: number
): { x: number; y: number } {
  const maxX = scene.width * tileSize;
  const maxY = scene.height * tileSize;
  return {
    x: Math.max(0, Math.min(position.x, maxX)),
    y: Math.max(0, Math.min(position.y, maxY)),
  };
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

function collectMoveChanges(
  scene: Scene,
  selection: SelectionBounds,
  selectionData: SelectionData,
  moveOffset: { x: number; y: number }
): TileChange[] {
  const layerData = scene.layers[selection.layer];
  const changesMap = new Map<string, TileChange>();

  const setChange = (x: number, y: number, newValue: number): void => {
    if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) {
      return;
    }

    const key = `${x},${y}`;
    const existing = changesMap.get(key);
    const oldValue = existing?.oldValue ?? layerData[y][x];
    changesMap.set(key, {
      layer: selection.layer,
      x,
      y,
      oldValue,
      newValue,
    });
  };

  for (let y = 0; y < selection.height; y += 1) {
    for (let x = 0; x < selection.width; x += 1) {
      const srcX = selection.startX + x;
      const srcY = selection.startY + y;
      setChange(srcX, srcY, 0);
    }
  }

  for (let y = 0; y < selection.height; y += 1) {
    for (let x = 0; x < selection.width; x += 1) {
      const destX = selection.startX + moveOffset.x + x;
      const destY = selection.startY + moveOffset.y + y;
      setChange(destX, destY, selectionData.tiles[y][x]);
    }
  }

  return Array.from(changesMap.values()).filter((change) => change.oldValue !== change.newValue);
}

function collectPasteChanges(
  scene: Scene,
  data: SelectionData,
  target: TilePoint,
  layer: LayerType
): TileChange[] {
  const layerData = scene.layers[layer];
  const changes: TileChange[] = [];

  for (let y = 0; y < data.selection.height; y += 1) {
    for (let x = 0; x < data.selection.width; x += 1) {
      const destX = target.x + x;
      const destY = target.y + y;
      if (destX < 0 || destX >= scene.width || destY < 0 || destY >= scene.height) {
        continue;
      }

      const oldValue = layerData[destY][destX];
      const newValue = data.tiles[y][x];
      if (oldValue === newValue) continue;

      changes.push({
        layer,
        x: destX,
        y: destY,
        oldValue,
        newValue,
      });
    }
  }

  return changes;
}

// --- Factory ---

export function createSelectTool(config: SelectToolConfig): SelectTool {
  const {
    getEditorState,
    getScene,
    onSceneChange,
    onSelectionChange,
    onEntitySelectionChange,
    clipboard,
    onFillResult,
    history,
    entityManager,
    entitySelection,
  } =
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
  let entityDrag:
    | {
        startWorld: { x: number; y: number };
        startPositions: Map<string, { x: number; y: number }>;
        moved: boolean;
      }
    | null = null;

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

  function notifyEntitySelection(): void {
    onEntitySelectionChange?.(entitySelection.getSelectedIds());
  }

  function setEntitySelection(ids: string[]): void {
    entitySelection.setSelection(ids);
    notifyEntitySelection();
  }

  function clearEntitySelection(): void {
    if (entitySelection.getSelectedIds().length === 0) return;
    entitySelection.clear();
    entityDrag = null;
    notifyEntitySelection();
  }

  function beginEntityDrag(
    scene: Scene,
    viewport: ViewportState,
    screenX: number,
    screenY: number
  ): void {
    const selectedIds = entitySelection.getSelectedIds();
    if (selectedIds.length === 0) return;

    const startPositions = new Map<string, { x: number; y: number }>();
    for (const entity of scene.entities) {
      if (!selectedIds.includes(entity.id)) continue;
      startPositions.set(entity.id, { x: entity.x, y: entity.y });
    }

    entityDrag = {
      startWorld: screenToWorldWithOffset(viewport, screenX, screenY),
      startPositions,
      moved: false,
    };
  }

  function updateEntityDrag(
    scene: Scene,
    viewport: ViewportState,
    screenX: number,
    screenY: number,
    tileSize: number,
    editorState: EditorState
  ): void {
    if (!entityDrag) return;

    const world = screenToWorldWithOffset(viewport, screenX, screenY);
    const deltaX = world.x - entityDrag.startWorld.x;
    const deltaY = world.y - entityDrag.startWorld.y;
    const snapEnabled = editorState.entitySnapToGrid ?? true;

    const updates = Array.from(entityDrag.startPositions.entries()).map(([id, start]) => {
      const offsetPosition = { x: start.x + deltaX, y: start.y + deltaY };
      const snapped = snapEntityPosition(offsetPosition, tileSize, snapEnabled);
      const clamped = clampEntityPosition(scene, snapped, tileSize);
      return { id, x: clamped.x, y: clamped.y };
    });

    const changed = updates.some((update) => {
      const start = entityDrag?.startPositions.get(update.id);
      return start ? start.x !== update.x || start.y !== update.y : false;
    });

    if (changed) {
      entityDrag.moved = true;
    }

    entityManager.moveEntities(updates);
    notifyEntitySelection();
  }

  function finalizeEntityDrag(scene: Scene): void {
    if (!entityDrag) return;

    const startPositions = entityDrag.startPositions;
    const updatedPositions: Array<{ id: string; x: number; y: number }> = [];
    const originalPositions: Array<{ id: string; x: number; y: number }> = [];

    for (const [id, start] of startPositions.entries()) {
      const entity = entityManager.getEntity(id);
      if (!entity) continue;
      originalPositions.push({ id, x: start.x, y: start.y });
      updatedPositions.push({ id, x: entity.x, y: entity.y });
    }

    const changed = updatedPositions.some((update, index) => {
      const original = originalPositions[index];
      return !original || original.x !== update.x || original.y !== update.y;
    });

    if (entityDrag.moved && changed && updatedPositions.length > 0) {
      const description =
        updatedPositions.length > 1 ? 'Move entities' : 'Move entity';
      const operation: Operation = {
        id: generateOperationId(),
        type: 'entity_move',
        description,
        execute: () => {
          entityManager.moveEntities(updatedPositions);
          notifyEntitySelection();
        },
        undo: () => {
          entityManager.moveEntities(originalPositions);
          notifyEntitySelection();
        },
      };

      history.push(operation);
    }

    entityDrag = null;
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

  function applyTileChanges(scene: Scene, changes: TileChange[]): void {
    for (const change of changes) {
      if (change.x < 0 || change.x >= scene.width || change.y < 0 || change.y >= scene.height) {
        continue;
      }
      scene.layers[change.layer][change.y][change.x] = change.newValue;
    }
  }

  function refreshSelection(scene: Scene): void {
    if (selection) {
      selectionData = extractSelectionData(scene, selection);
    } else {
      selectionData = null;
    }
    notifySelectionChange();
  }

  function applySelectionState(
    scene: Scene,
    nextSelection: SelectionBounds | null,
    nextMode: SelectToolMode
  ): void {
    selection = nextSelection;
    selectionData = nextSelection ? extractSelectionData(scene, nextSelection) : null;
    selectionStart = null;
    moveOffset = null;
    moveAnchor = null;
    pendingPaste = false;
    pendingFill = false;
    selectingMoved = false;
    selectionStartedFromExisting = false;
    mode = nextMode;
    notifySelectionChange();
  }

  function pushSelectionOperation(operation: Operation | null): void {
    if (!operation) return;
    history.push(operation);
  }

  function applyMove(scene: Scene): void {
    if (!selection || !selectionData || !moveOffset) return;

    // Skip if layer is locked
    const editorState = getEditorState();
    if (editorState?.layerLocks?.[selection.layer]) {
      applySelectionState(scene, selection, 'selected');
      return;
    }

    const previousSelection = { ...selection };
    const previousMode: SelectToolMode = previousSelection ? 'selected' : 'idle';
    const nextSelection: SelectionBounds = {
      ...selection,
      startX: selection.startX + moveOffset.x,
      startY: selection.startY + moveOffset.y,
    };
    const changes = collectMoveChanges(scene, selection, selectionData, moveOffset);

    if (changes.length === 0) {
      applySelectionState(scene, selection, 'selected');
      return;
    }

    applyTileChanges(scene, changes);
    applySelectionState(scene, nextSelection, 'selected');
    onSceneChange(scene);

    const baseOperation = createTileChangeOperation({
      scene,
      changes,
      type: 'move',
      description: 'Move selection',
    });

    if (!baseOperation) return;

    const operation: Operation = {
      ...baseOperation,
      execute: () => {
        baseOperation.execute();
        applySelectionState(scene, nextSelection, 'selected');
        onSceneChange(scene);
      },
      undo: () => {
        baseOperation.undo();
        applySelectionState(scene, previousSelection, previousMode);
        onSceneChange(scene);
      },
    };

    pushSelectionOperation(operation);
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
      const changes: TileChange[] = result.changes.map((change) => ({
        layer,
        x: change.x,
        y: change.y,
        oldValue: result.targetValue ?? 0,
        newValue: fillValue,
      }));

      const operation = createTileChangeOperation({
        scene,
        changes,
        type: 'fill',
        description: 'Fill tiles',
        onApply: () => onSceneChange(scene),
      });

      if (operation) {
        history.push(operation);
      }

      onSceneChange(scene);
    }

    onFillResult?.(result);
  }

  function deleteSelectedEntities(): void {
    const scene = getScene();
    if (!scene) return;
    const selectedIds = entitySelection.getSelectedIds();
    if (selectedIds.length === 0) return;

    const removed = entityManager.removeEntities(selectedIds);
    if (removed.length === 0) return;

    const previousSelection = [...selectedIds];
    clearEntitySelection();

    const description = removed.length > 1 ? 'Delete entities' : 'Delete entity';
    const operation: Operation = {
      id: generateOperationId(),
      type: 'entity_delete',
      description,
      execute: () => {
        entityManager.removeEntities(removed.map((entity) => entity.id));
        clearEntitySelection();
      },
      undo: () => {
        for (const entity of removed) {
          entityManager.addEntityInstance(entity);
        }
        setEntitySelection(previousSelection);
      },
    };

    history.push(operation);
  }

  function duplicateSelectedEntities(tileSize: number): void {
    const scene = getScene();
    if (!scene) return;
    const selectedIds = entitySelection.getSelectedIds();
    if (selectedIds.length === 0) return;

    const duplicates = entityManager.duplicateEntities(selectedIds, {
      x: tileSize,
      y: tileSize,
    });

    if (duplicates.length === 0) return;

    const previousSelection = [...selectedIds];
    const duplicateIds = duplicates.map((entity) => entity.id);
    setEntitySelection(duplicateIds);

    const description = duplicates.length > 1 ? 'Duplicate entities' : 'Duplicate entity';
    const operation: Operation = {
      id: generateOperationId(),
      type: 'entity_duplicate',
      description,
      execute: () => {
        for (const entity of duplicates) {
          entityManager.addEntityInstance(entity);
        }
        setEntitySelection(duplicateIds);
      },
      undo: () => {
        entityManager.removeEntities(duplicateIds);
        setEntitySelection(previousSelection);
      },
    };

    history.push(operation);
  }

  const tool: SelectTool = {
    start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void {
      const editorState = getEditorState();
      const scene = getScene();

      if (!editorState || !scene || editorState.currentTool !== 'select') {
        return;
      }

      const hitEntity = hitTestEntity(scene, viewport, screenX, screenY, tileSize);
      if (hitEntity) {
        clearSelection();
        if (!entitySelection.isSelected(hitEntity.id)) {
          entitySelection.setSelection([hitEntity.id]);
        }
        beginEntityDrag(scene, viewport, screenX, screenY);
        notifyEntitySelection();
        return;
      }

      if (entitySelection.getSelectedIds().length > 0) {
        clearEntitySelection();
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

        // Skip if layer is locked
        if (editorState.layerLocks?.[activeLayer]) {
          setMode(selection ? 'selected' : 'idle');
          return;
        }

        const previousSelection = selection ? { ...selection } : null;
        const previousMode: SelectToolMode = previousSelection ? 'selected' : 'idle';
        const changes = collectPasteChanges(scene, data, tile, activeLayer);

        if (changes.length === 0) {
          setMode(selection ? 'selected' : 'idle');
          return;
        }

        applyTileChanges(scene, changes);

        const pastedSelection: SelectionBounds = {
          startX: tile.x,
          startY: tile.y,
          width: data.selection.width,
          height: data.selection.height,
          layer: activeLayer,
        };

        applySelectionState(scene, pastedSelection, 'selected');
        onSceneChange(scene);

        const baseOperation = createTileChangeOperation({
          scene,
          changes,
          type: 'paste',
          description: 'Paste selection',
        });

        if (baseOperation) {
          const operation: Operation = {
            ...baseOperation,
            execute: () => {
              baseOperation.execute();
              applySelectionState(scene, pastedSelection, 'selected');
              onSceneChange(scene);
            },
            undo: () => {
              baseOperation.undo();
              applySelectionState(scene, previousSelection, previousMode);
              onSceneChange(scene);
            },
          };

          pushSelectionOperation(operation);
        }
        return;
      }

      if (pendingFill) {
        pendingFill = false;
        // Skip if layer is locked
        if (!editorState.layerLocks?.[activeLayer]) {
          fillAt(scene, activeLayer, tile, editorState.selectedTile);
        }
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

      if (entityDrag) {
        updateEntityDrag(scene, viewport, screenX, screenY, tileSize, editorState);
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

      if (entityDrag) {
        finalizeEntityDrag(scene);
        return;
      }

      if (mode === 'moving') {
        applyMove(scene);
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

    handleLongPress(
      screenX: number,
      screenY: number,
      viewport: ViewportState,
      tileSize: number
    ): void {
      const editorState = getEditorState();
      const scene = getScene();
      if (!editorState || !scene || editorState.currentTool !== 'select') {
        return;
      }

      const hitEntity = hitTestEntity(scene, viewport, screenX, screenY, tileSize);
      if (hitEntity) {
        clearSelection();
        if (!entitySelection.isSelected(hitEntity.id)) {
          entitySelection.addToSelection(hitEntity.id);
        }
        notifyEntitySelection();
        return;
      }

      if (selection) {
        tool.startMove(screenX, screenY, viewport, tileSize);
      }
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

      // Skip if layer is locked
      if (editorState.layerLocks?.[selection.layer]) {
        return;
      }

      const layerData = scene.layers[selection.layer];
      let modified = false;
      const changes: TileChange[] = [];

      for (let y = 0; y < selection.height; y += 1) {
        for (let x = 0; x < selection.width; x += 1) {
          const tileY = selection.startY + y;
          const tileX = selection.startX + x;
          const oldValue = layerData[tileY]?.[tileX] ?? 0;
          if (oldValue === 0) continue;
          layerData[tileY][tileX] = 0;
          modified = true;
          changes.push({
            layer: selection.layer,
            x: tileX,
            y: tileY,
            oldValue,
            newValue: 0,
          });
        }
      }

      if (modified) {
        const operation = createTileChangeOperation({
          scene,
          changes,
          type: 'delete',
          description: 'Delete selection',
          onApply: () => {
            onSceneChange(scene);
            refreshSelection(scene);
          },
        });

        if (operation) {
          history.push(operation);
        }

        onSceneChange(scene);
      }

      refreshSelection(scene);
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

    deleteEntities(): void {
      deleteSelectedEntities();
    },

    duplicateEntities(): void {
      const scene = getScene();
      if (!scene) return;
      duplicateSelectedEntities(scene.tileSize);
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
