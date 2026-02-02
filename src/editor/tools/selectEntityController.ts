import { screenToWorld, type ViewportState } from '@/editor/canvas/viewport';
import { TOUCH_OFFSET_Y } from '@/editor/canvas/renderer';
import type { EditorState } from '@/storage/hot';
import type { EntityInstance, Scene } from '@/types';
import type { EntityManager } from '@/editor/entities/entityManager';
import type { EntitySelection } from '@/editor/entities/entitySelection';
import { generateOperationId, type HistoryManager, type Operation } from '@/editor/history';

const LOG_PREFIX = '[SelectTool/Entities]';

interface EntityDragState {
  startWorld: { x: number; y: number };
  startPositions: Map<string, { x: number; y: number }>;
  moved: boolean;
}

export interface SelectEntityControllerConfig {
  getEditorState: () => EditorState | null;
  getScene: () => Scene | null;
  onSelectionChange?: (selectedIds: string[]) => void;
  entityManager: EntityManager;
  entitySelection: EntitySelection;
  history: HistoryManager;
  allowedTools?: Array<EditorState['currentTool']>;
}

export interface SelectEntityController {
  handlePointerStart(
    viewport: ViewportState,
    screenX: number,
    screenY: number,
    tileSize: number
  ): boolean;
  handlePointerMove(
    viewport: ViewportState,
    screenX: number,
    screenY: number,
    tileSize: number
  ): boolean;
  handlePointerEnd(): boolean;
  handleLongPress(
    viewport: ViewportState,
    screenX: number,
    screenY: number,
    tileSize: number
  ): boolean;
  clearSelection(): void;
  hasSelection(): boolean;
  getSelectedIds(): string[];
  deleteSelected(): void;
  duplicateSelected(tileSize: number): void;
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

export function createSelectEntityController(
  config: SelectEntityControllerConfig
): SelectEntityController {
  const {
    getEditorState,
    getScene,
    onSelectionChange,
    entityManager,
    entitySelection,
    history,
    allowedTools,
  } = config;

  const allowedToolSet = new Set<EditorState['currentTool']>(allowedTools ?? ['select']);

  function isToolAllowed(editorState: EditorState | null): boolean {
    if (!editorState) return false;
    return allowedToolSet.has(editorState.currentTool);
  }

  let entityDrag: EntityDragState | null = null;

  function notifySelection(): void {
    onSelectionChange?.(entitySelection.getSelectedIds());
  }

  function setSelection(ids: string[]): void {
    entitySelection.setSelection(ids);
    notifySelection();
  }

  function clearSelection(): void {
    if (entitySelection.getSelectedIds().length === 0) return;
    entitySelection.clear();
    entityDrag = null;
    notifySelection();
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
    notifySelection();
  }

  function finalizeEntityDrag(): void {
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
      const description = updatedPositions.length > 1 ? 'Move entities' : 'Move entity';
      const operation: Operation = {
        id: generateOperationId(),
        type: 'entity_move',
        description,
        execute: () => {
          entityManager.moveEntities(updatedPositions);
          notifySelection();
        },
        undo: () => {
          entityManager.moveEntities(originalPositions);
          notifySelection();
        },
      };

      history.push(operation);
    }

    entityDrag = null;
  }

  function deleteSelected(): void {
    const scene = getScene();
    if (!scene) return;
    const selectedIds = entitySelection.getSelectedIds();
    if (selectedIds.length === 0) return;

    const removed = entityManager.removeEntities(selectedIds);
    if (removed.length === 0) return;

    const previousSelection = [...selectedIds];
    clearSelection();

    const description = removed.length > 1 ? 'Delete entities' : 'Delete entity';
    const operation: Operation = {
      id: generateOperationId(),
      type: 'entity_delete',
      description,
      execute: () => {
        entityManager.removeEntities(removed.map((entity) => entity.id));
        clearSelection();
      },
      undo: () => {
        for (const entity of removed) {
          entityManager.addEntityInstance(entity);
        }
        setSelection(previousSelection);
      },
    };

    history.push(operation);
  }

  function duplicateSelected(tileSize: number): void {
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
    setSelection(duplicateIds);

    const description = duplicates.length > 1 ? 'Duplicate entities' : 'Duplicate entity';
    const operation: Operation = {
      id: generateOperationId(),
      type: 'entity_duplicate',
      description,
      execute: () => {
        for (const entity of duplicates) {
          entityManager.addEntityInstance(entity);
        }
        setSelection(duplicateIds);
      },
      undo: () => {
        entityManager.removeEntities(duplicateIds);
        setSelection(previousSelection);
      },
    };

    history.push(operation);
  }

  return {
    handlePointerStart(viewport, screenX, screenY, tileSize): boolean {
      const editorState = getEditorState();
      const scene = getScene();

      if (!scene || !isToolAllowed(editorState)) {
        return false;
      }

      const hitEntity = hitTestEntity(scene, viewport, screenX, screenY, tileSize);
      if (!hitEntity) {
        return false;
      }

      if (!entitySelection.isSelected(hitEntity.id)) {
        setSelection([hitEntity.id]);
      }

      beginEntityDrag(scene, viewport, screenX, screenY);
      notifySelection();
      return true;
    },

    handlePointerMove(viewport, screenX, screenY, tileSize): boolean {
      const editorState = getEditorState();
      const scene = getScene();
      if (!scene || !isToolAllowed(editorState)) {
        return false;
      }

      if (!entityDrag) {
        return false;
      }

      updateEntityDrag(scene, viewport, screenX, screenY, tileSize, editorState);
      return true;
    },

    handlePointerEnd(): boolean {
      if (!entityDrag) {
        return false;
      }
      finalizeEntityDrag();
      return true;
    },

    handleLongPress(viewport, screenX, screenY, tileSize): boolean {
      const editorState = getEditorState();
      const scene = getScene();
      if (!scene || !isToolAllowed(editorState)) {
        return false;
      }

      const hitEntity = hitTestEntity(scene, viewport, screenX, screenY, tileSize);
      if (!hitEntity) {
        return false;
      }

      if (!entitySelection.isSelected(hitEntity.id)) {
        entitySelection.addToSelection(hitEntity.id);
      }
      notifySelection();
      return true;
    },

    clearSelection,

    hasSelection(): boolean {
      return entitySelection.getSelectedIds().length > 0;
    },

    getSelectedIds(): string[] {
      return entitySelection.getSelectedIds();
    },

    deleteSelected(): void {
      deleteSelected();
      console.log(`${LOG_PREFIX} Deleted selected entities`);
    },

    duplicateSelected(tileSize: number): void {
      duplicateSelected(tileSize);
      console.log(`${LOG_PREFIX} Duplicated selected entities`);
    },
  };
}
