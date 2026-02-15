import type { ViewportState } from '@/editor/canvas/viewport';
import { screenToWorld } from '@/editor/canvas/viewport';
import type { HistoryManager, Operation } from '@/editor/history';
import { generateOperationId } from '@/editor/history';
import type { EditorState } from '@/storage/hot';
import type { Scene, PropSpriteInstance, SpriteRef, Project } from '@/types';
import { getAtlasCategoryName } from '@/shared/atlasNaming';
import type { PropSpriteManager } from '@/editor/props/propSpriteManager';

export interface SelectPropSpriteControllerConfig {
  getEditorState: () => EditorState | null;
  getScene: () => Scene | null;
  getProject: () => Project | null;
  onSelectionChange?: (ids: string[]) => void;
  propSpriteManager: PropSpriteManager;
  history: HistoryManager;
}

interface DragState {
  startWorld: { x: number; y: number };
  startPositions: Map<string, { x: number; y: number }>;
  moved: boolean;
}

function resolveSpriteSize(project: Project | null, sprite: SpriteRef, fallback: number): { width: number; height: number } {
  if (!project) return { width: fallback, height: fallback };
  if (sprite.category.startsWith('atlas:')) {
    const atlas = (project.spriteAtlases ?? []).find((item) => getAtlasCategoryName(item.path) === sprite.category);
    const rect = atlas?.slices?.[sprite.index]?.rect;
    if (rect && rect.w > 0 && rect.h > 0) return { width: rect.w, height: rect.h };
    const sz = atlas?.sliceSize;
    if (sz) return { width: sz.width, height: sz.height };
  }
  const cat = project.tileCategories.find((item) => item.name === sprite.category);
  if (cat?.files?.[sprite.index]) return { width: fallback, height: fallback };
  return { width: fallback, height: fallback };
}

function hitTest(
  scene: Scene,
  project: Project | null,
  x: number,
  y: number,
): PropSpriteInstance | null {
  const list = scene.propSprites ?? [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const item = list[i];
    const size = resolveSpriteSize(project, item.sprite, scene.tileSize);
    if (x >= item.x && x <= item.x + size.width && y >= item.y && y <= item.y + size.height) {
      return item;
    }
  }
  return null;
}

export function createSelectPropSpriteController(config: SelectPropSpriteControllerConfig) {
  const { getEditorState, getScene, getProject, onSelectionChange, propSpriteManager, history } = config;
  let drag: DragState | null = null;

  function selectedIds(): string[] {
    return getEditorState()?.selectedPropSpriteIds ?? [];
  }

  function setSelection(ids: string[]): void {
    const editorState = getEditorState();
    if (!editorState) return;
    editorState.selectedPropSpriteIds = [...ids];
    onSelectionChange?.(editorState.selectedPropSpriteIds);
  }

  return {
    hasSelection(): boolean {
      return selectedIds().length > 0;
    },

    clearSelection(): void {
      if (selectedIds().length === 0) return;
      setSelection([]);
    },

    handlePointerStart(viewport: ViewportState, screenX: number, screenY: number, _tileSize: number): boolean {
      const editorState = getEditorState();
      const scene = getScene();
      if (!editorState || !scene || editorState.currentTool !== 'select' || editorState.domain !== 'props') {
        return false;
      }
      const world = screenToWorld(viewport, screenX, screenY);
      const hit = hitTest(scene, getProject(), world.x, world.y);
      if (!hit) return false;
      if (!selectedIds().includes(hit.id)) {
        setSelection([hit.id]);
      }
      const startPositions = new Map<string, { x: number; y: number }>();
      for (const item of propSpriteManager.getPropSprites(selectedIds())) {
        startPositions.set(item.id, { x: item.x, y: item.y });
      }
      drag = { startWorld: world, startPositions, moved: false };
      return true;
    },

    handlePointerMove(viewport: ViewportState, screenX: number, screenY: number, tileSize: number): boolean {
      if (!drag) return false;
      const world = screenToWorld(viewport, screenX, screenY);
      const dx = world.x - drag.startWorld.x;
      const dy = world.y - drag.startWorld.y;
      const updates = Array.from(drag.startPositions.entries()).map(([id, start]) => ({
        id,
        x: Math.round((start.x + dx) / tileSize) * tileSize,
        y: Math.round((start.y + dy) / tileSize) * tileSize,
      }));
      drag.moved = true;
      propSpriteManager.movePropSprites(updates);
      onSelectionChange?.(selectedIds());
      return true;
    },

    handlePointerEnd(): boolean {
      if (!drag) return false;
      const start = drag.startPositions;
      const current = propSpriteManager.getPropSprites(Array.from(start.keys())).map((item) => ({ id: item.id, x: item.x, y: item.y }));
      const original = Array.from(start.entries()).map(([id, pos]) => ({ id, x: pos.x, y: pos.y }));
      if (drag.moved && current.some((item, idx) => item.x !== original[idx].x || item.y !== original[idx].y)) {
        const op: Operation = {
          id: generateOperationId(),
          type: 'entity_move',
          description: 'Move prop sprite',
          execute: () => propSpriteManager.movePropSprites(current),
          undo: () => propSpriteManager.movePropSprites(original),
        };
        history.push(op);
      }
      drag = null;
      return true;
    },

    deleteSelected(): void {
      const ids = selectedIds();
      if (ids.length === 0) return;
      const removed = propSpriteManager.removePropSprites(ids);
      if (removed.length === 0) return;
      setSelection([]);
      history.push({
        id: generateOperationId(),
        type: 'entity_delete',
        description: 'Delete prop sprite',
        execute: () => {
          propSpriteManager.removePropSprites(removed.map((item) => item.id));
          setSelection([]);
        },
        undo: () => {
          removed.forEach((item) => propSpriteManager.addPropSpriteInstance(item));
          setSelection(removed.map((item) => item.id));
        },
      });
    },

    duplicateSelected(tileSize: number): void {
      const ids = selectedIds();
      if (ids.length === 0) return;
      const copies = propSpriteManager.duplicatePropSprites(ids, { x: tileSize, y: tileSize });
      if (copies.length === 0) return;
      setSelection(copies.map((item) => item.id));
      history.push({
        id: generateOperationId(),
        type: 'entity_duplicate',
        description: 'Duplicate prop sprite',
        execute: () => copies.forEach((item) => propSpriteManager.addPropSpriteInstance(item)),
        undo: () => {
          propSpriteManager.removePropSprites(copies.map((item) => item.id));
          setSelection(ids);
        },
      });
    },

    resolveSpriteSize(sprite: SpriteRef, fallback: number): { width: number; height: number } {
      return resolveSpriteSize(getProject(), sprite, fallback);
    },
  };
}
