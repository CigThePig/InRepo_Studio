/**
 * Select Tool
 *
 * Coordinates tile selection workflows and entity selection/manipulation.
 */

import type { ViewportState } from '@/editor/canvas/viewport';
import type { EditorState } from '@/storage/hot';
import type { Scene } from '@/types';
import type { EntityManager } from '@/editor/entities/entityManager';
import type { EntitySelection } from '@/editor/entities/entitySelection';
import {
  createSelectEntityController,
  type SelectEntityController,
} from '@/editor/tools/selectEntityController';
import {
  createSelectTileController,
  type SelectTileController,
} from '@/editor/tools/selectTileController';
import type { FloodFillResult } from '@/editor/tools/floodFill';
import type { HistoryManager } from '@/editor/history';
import type {
  SelectClipboard,
  SelectionBounds,
  SelectionOverlayState,
} from '@/editor/tools/selectTypes';

export type {
  SelectClipboard,
  SelectionBounds,
  SelectionOverlayState,
  SelectToolMode,
} from '@/editor/tools/selectTypes';

const LOG_PREFIX = '[SelectTool]';

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
  armResize(): void;
  deleteEntities(): void;
  duplicateEntities(): void;
  isSelecting(): boolean;
  isMoving(): boolean;
}

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
  } = config;

  const tileController: SelectTileController = createSelectTileController({
    getEditorState,
    getScene,
    onSceneChange,
    onSelectionChange,
    clipboard,
    onFillResult,
    history,
  });

  const entityController: SelectEntityController = createSelectEntityController({
    getEditorState,
    getScene,
    onSelectionChange: (ids) => {
      onEntitySelectionChange?.(ids);
    },
    entityManager,
    entitySelection,
    history,
  });

  const tool: SelectTool = {
    start(screenX, screenY, viewport, tileSize): void {
      const editorState = getEditorState();
      const scene = getScene();
      if (!editorState || !scene || editorState.currentTool !== 'select') {
        return;
      }

      if (entityController.handlePointerStart(viewport, screenX, screenY, tileSize)) {
        tileController.clearSelection();
        return;
      }

      if (entityController.hasSelection()) {
        entityController.clearSelection();
        return;
      }

      tileController.start(screenX, screenY, viewport, tileSize);
    },

    move(screenX, screenY, viewport, tileSize): void {
      const editorState = getEditorState();
      const scene = getScene();
      if (!editorState || !scene || editorState.currentTool !== 'select') {
        return;
      }

      if (entityController.handlePointerMove(viewport, screenX, screenY, tileSize)) {
        return;
      }

      tileController.move(screenX, screenY, viewport, tileSize);
    },

    end(): void {
      const editorState = getEditorState();
      if (!editorState || editorState.currentTool !== 'select') {
        return;
      }

      if (entityController.handlePointerEnd()) {
        return;
      }

      tileController.end();
    },

    handleLongPress(screenX, screenY, viewport, tileSize): void {
      const editorState = getEditorState();
      if (!editorState || editorState.currentTool !== 'select') {
        return;
      }

      if (entityController.handleLongPress(viewport, screenX, screenY, tileSize)) {
        tileController.clearSelection();
        return;
      }

      tileController.handleLongPress(screenX, screenY, viewport, tileSize);
    },

    getSelection(): SelectionBounds | null {
      return tileController.getSelection();
    },

    clearSelection(): void {
      tileController.clearSelection();
    },

    startMove(screenX, screenY, viewport, tileSize): void {
      tileController.startMove(screenX, screenY, viewport, tileSize);
    },

    armMove(): void {
      tileController.armMove();
    },

    deleteSelection(): void {
      tileController.deleteSelection();
    },

    copySelection(): void {
      tileController.copySelection();
    },

    armPaste(): void {
      tileController.armPaste();
    },

    armFill(): void {
      tileController.armFill();
    },

    armResize(): void {
      tileController.armResize();
    },

    deleteEntities(): void {
      entityController.deleteSelected();
    },

    duplicateEntities(): void {
      const scene = getScene();
      if (!scene) return;
      entityController.duplicateSelected(scene.tileSize);
    },

    isSelecting(): boolean {
      return tileController.isSelecting();
    },

    isMoving(): boolean {
      return tileController.isMoving();
    },
  };

  console.log(`${LOG_PREFIX} Select tool created`);

  return tool;
}
