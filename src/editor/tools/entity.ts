/**
 * Entity Tool
 *
 * Handles placing entity instances on the canvas.
 * Uses touch offset so placement appears above the finger.
 */

import { screenToWorld, type ViewportState } from '@/editor/canvas/viewport';
import { TOUCH_OFFSET_Y } from '@/editor/canvas/renderer';
import type { EntityPreview } from '@/editor/canvas/entityRenderer';
import type { EditorState } from '@/storage/hot';
import type { Scene, Project } from '@/types';
import type { EntityManager } from '@/editor/entities/entityManager';

const LOG_PREFIX = '[EntityTool]';

// --- Types ---

export interface EntityToolConfig {
  /** Get current editor state */
  getEditorState: () => EditorState | null;
  /** Get current scene */
  getScene: () => Scene | null;
  /** Get current project */
  getProject: () => Project | null;
  /** Entity manager for CRUD operations */
  entityManager: EntityManager;
  /** Callback for preview updates */
  onPreviewChange?: (preview: EntityPreview | null) => void;
  /** Callback when entity is placed */
  onEntityPlaced?: (entityId: string) => void;
}

export interface EntityTool {
  /** Handle placement start (tap) */
  start(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;
  /** Handle pointer move (preview position) */
  move(screenX: number, screenY: number, viewport: ViewportState, tileSize: number): void;
  /** Handle pointer end */
  end(): void;
}

// --- Helpers ---

function snapToGrid(x: number, y: number, tileSize: number): { x: number; y: number } {
  return {
    x: Math.floor(x / tileSize) * tileSize,
    y: Math.floor(y / tileSize) * tileSize,
  };
}

function clampToScene(
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

function getPlacementPosition(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  tileSize: number,
  scene: Scene,
  snapToGridEnabled: boolean
): { x: number; y: number } {
  const world = screenToWorld(viewport, screenX, screenY + TOUCH_OFFSET_Y);
  const basePosition = snapToGridEnabled
    ? snapToGrid(world.x, world.y, tileSize)
    : { x: world.x, y: world.y };

  return clampToScene(scene, basePosition, tileSize);
}

// --- Factory ---

export function createEntityTool(config: EntityToolConfig): EntityTool {
  const {
    getEditorState,
    getScene,
    getProject,
    entityManager,
    onPreviewChange,
    onEntityPlaced,
  } = config;

  function resolveEntityType(editorState: EditorState, project: Project | null): string | null {
    if (editorState.selectedEntityType) {
      return editorState.selectedEntityType;
    }

    const fallback = project?.entityTypes?.[0]?.name ?? null;
    if (fallback && !editorState.selectedEntityType) {
      editorState.selectedEntityType = fallback;
    }
    return fallback;
  }

  function updatePreview(
    screenX: number,
    screenY: number,
    viewport: ViewportState,
    tileSize: number,
    scene: Scene,
    editorState: EditorState,
    typeName: string
  ): void {
    const snapEnabled = editorState.entitySnapToGrid ?? true;
    const position = getPlacementPosition(
      screenX,
      screenY,
      viewport,
      tileSize,
      scene,
      snapEnabled
    );
    onPreviewChange?.({
      x: position.x,
      y: position.y,
      type: typeName,
    });
  }

  const tool: EntityTool = {
    start(screenX, screenY, viewport, tileSize) {
      const editorState = getEditorState();
      if (!editorState || editorState.currentTool !== 'entity') {
        onPreviewChange?.(null);
        return;
      }

      const scene = getScene();
      if (!scene) {
        onPreviewChange?.(null);
        return;
      }

      const project = getProject();
      const entityType = resolveEntityType(editorState, project);
      if (!entityType) {
        console.warn(`${LOG_PREFIX} No entity type selected`);
        onPreviewChange?.(null);
        return;
      }

      updatePreview(screenX, screenY, viewport, tileSize, scene, editorState, entityType);
      const snapEnabled = editorState.entitySnapToGrid ?? true;
      const position = getPlacementPosition(screenX, screenY, viewport, tileSize, scene, snapEnabled);

      const placed = entityManager.addEntity(entityType, position.x, position.y);
      if (placed) {
        onEntityPlaced?.(placed.id);
        console.log(
          `${LOG_PREFIX} Placed entity "${entityType}" at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`
        );
      }
    },

    move(screenX, screenY, viewport, tileSize) {
      const editorState = getEditorState();
      if (!editorState || editorState.currentTool !== 'entity') {
        onPreviewChange?.(null);
        return;
      }

      const scene = getScene();
      if (!scene) {
        onPreviewChange?.(null);
        return;
      }

      const project = getProject();
      const entityType = resolveEntityType(editorState, project);
      if (!entityType) {
        onPreviewChange?.(null);
        return;
      }

      updatePreview(screenX, screenY, viewport, tileSize, scene, editorState, entityType);
    },

    end() {
      onPreviewChange?.(null);
    },
  };

  return tool;
}
