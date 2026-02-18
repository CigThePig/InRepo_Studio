import type { ViewportState } from '@/editor/canvas/viewport';
import type { HistoryManager } from '@/editor/history';
import { generateOperationId, type Operation } from '@/editor/history';
import { screenToTileWithOffset } from '@/editor/tools/common';
import { TOUCH_OFFSET_Y } from '@/editor/canvas/renderer';
import type { EditorState } from '@/storage/hot';
import type { Scene, SpriteRef, PropSpriteInstance } from '@/types';
import type { PropSpriteManager } from '@/editor/props/propSpriteManager';

export interface PropSpritePreview {
  sprite: SpriteRef;
  x: number;
  y: number;
}

export interface PropSpriteToolConfig {
  getEditorState: () => EditorState | null;
  getScene: () => Scene | null;
  propSpriteManager: PropSpriteManager;
  history: HistoryManager;
  onPreviewChange?: (preview: PropSpritePreview | null) => void;
}

export interface PropSpriteTool {
  start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;
  move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;
  end(): void;
}

function createAddOperation(
  manager: PropSpriteManager,
  instance: PropSpriteInstance,
): Operation {
  return {
    id: generateOperationId(),
    type: 'entity_add',
    description: 'Place prop sprite',
    execute: () => {
      manager.addPropSpriteInstance(instance);
    },
    undo: () => {
      manager.removePropSprites([instance.id]);
    },
  };
}

export function createPropSpriteTool(config: PropSpriteToolConfig): PropSpriteTool {
  const { getEditorState, getScene, propSpriteManager, history, onPreviewChange } = config;

  return {
    start(screenX, screenY, viewport, tileSize): void {
      const editorState = getEditorState();
      const scene = getScene();
      if (!editorState || !scene || editorState.currentTool !== 'paint') return;
      if (editorState.domain !== 'props' || editorState.payload?.kind !== 'propSprite') return;
      if (!editorState.selectedTile) return;

      const tile = screenToTileWithOffset(screenX, screenY, viewport, tileSize, TOUCH_OFFSET_Y);
      const x = tile.x * scene.tileSize;
      const y = tile.y * scene.tileSize;
      const sprite = editorState.selectedTile;
      const placed = propSpriteManager.addPropSprite(sprite, x, y);
      if (!placed) return;
      history.push(createAddOperation(propSpriteManager, placed));
      onPreviewChange?.({ sprite, x, y });
    },

    move(screenX, screenY, viewport, tileSize): void {
      const editorState = getEditorState();
      const scene = getScene();
      if (!editorState || !scene || editorState.domain !== 'props' || editorState.payload?.kind !== 'propSprite') {
        onPreviewChange?.(null);
        return;
      }
      if (!editorState.selectedTile) return;
      const tile = screenToTileWithOffset(screenX, screenY, viewport, tileSize, TOUCH_OFFSET_Y);
      onPreviewChange?.({
        sprite: editorState.selectedTile,
        x: tile.x * scene.tileSize,
        y: tile.y * scene.tileSize,
      });
    },

    end(): void {
      onPreviewChange?.(null);
    },
  };
}
