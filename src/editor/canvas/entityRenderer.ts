/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Render entity instances on the editor canvas
 *
 * Defines:
 * - EntityRendererConfig — renderer configuration (type: interface)
 * - EntityPreview — preview state for placement (type: interface)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (render updates on preview/entity changes)
 */

import type { EntityInstance, EntityType } from '@/types';
import { worldToScreen, type ViewportState } from './viewport';
import { resolveAssetUrl } from '@/shared/paths';

const LOG_PREFIX = '[EntityRenderer]';

const DEFAULT_ENTITY_COLOR = '#4a9eff';
const PREVIEW_ALPHA = 0.55;
const HIGHLIGHT_STROKE = 'rgba(74, 158, 255, 0.95)';
const HIGHLIGHT_LINE_WIDTH = 2;

export interface EntityRendererConfig {
  onSpriteLoad?: () => void;
}

export interface EntityPreview {
  x: number;
  y: number;
  type: string;
}

interface SpriteCache {
  getSprite(path: string): HTMLImageElement | null;
}

function createSpriteCache(config: EntityRendererConfig): SpriteCache {
  const cache = new Map<string, HTMLImageElement>();
  const pending = new Set<string>();

  function loadSprite(path: string): void {
    if (cache.has(path) || pending.has(path)) return;
    pending.add(path);

    const img = new Image();
    img.onload = () => {
      cache.set(path, img);
      pending.delete(path);
      config.onSpriteLoad?.();
    };
    img.onerror = () => {
      pending.delete(path);
      console.warn(`${LOG_PREFIX} Failed to load sprite: ${path}`);
    };
    img.src = resolveAssetUrl(path);
  }

  return {
    getSprite(path: string): HTMLImageElement | null {
      if (!cache.has(path)) {
        loadSprite(path);
        return null;
      }
      return cache.get(path) ?? null;
    },
  };
}

export interface EntityRenderer {
  setEntityTypes(types: EntityType[]): void;
  setPreview(preview: EntityPreview | null): void;
  setHighlightId(id: string | null): void;
  setSelectedIds(ids: string[]): void;
  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    entities: EntityInstance[],
    tileSize: number,
    canvasWidth: number,
    canvasHeight: number
  ): void;
}

export function createEntityRenderer(config: EntityRendererConfig): EntityRenderer {
  let entityTypes: EntityType[] = [];
  let preview: EntityPreview | null = null;
  let highlightId: string | null = null;
  let selectedIds = new Set<string>();
  const spriteCache = createSpriteCache(config);

  function getEntityType(typeName: string): EntityType | null {
    return entityTypes.find((type) => type.name === typeName) ?? null;
  }

  function getEntityLabel(entityType: EntityType | null, fallback: string): string {
    const label = entityType?.displayName ?? entityType?.name ?? fallback;
    return label.trim().charAt(0).toUpperCase() || '?';
  }

  function isCulled(
    screenX: number,
    screenY: number,
    halfSize: number,
    canvasWidth: number,
    canvasHeight: number
  ): boolean {
    return (
      screenX + halfSize < 0 ||
      screenY + halfSize < 0 ||
      screenX - halfSize > canvasWidth ||
      screenY - halfSize > canvasHeight
    );
  }

  function drawPlaceholder(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    size: number,
    label: string,
    alpha: number
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = DEFAULT_ENTITY_COLOR;
    ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(10, size * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, screenX, screenY);
    ctx.restore();
  }

  function drawHighlight(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    size: number,
    zoom: number
  ): void {
    ctx.save();
    ctx.strokeStyle = HIGHLIGHT_STROKE;
    ctx.lineWidth = HIGHLIGHT_LINE_WIDTH / Math.max(1, zoom);
    ctx.strokeRect(screenX - size / 2 - 2, screenY - size / 2 - 2, size + 4, size + 4);
    ctx.restore();
  }

  function drawEntity(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    entity: EntityInstance,
    tileSize: number,
    canvasWidth: number,
    canvasHeight: number,
    alpha: number,
    highlight: boolean
  ): void {
    const entityType = getEntityType(entity.type);
    const screenPos = worldToScreen(viewport, entity.x, entity.y);
    const size = tileSize * viewport.zoom;
    const halfSize = size / 2;

    if (isCulled(screenPos.x, screenPos.y, halfSize, canvasWidth, canvasHeight)) {
      return;
    }

    if (entityType?.sprite) {
      const sprite = spriteCache.getSprite(entityType.sprite);
      if (sprite) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(sprite, screenPos.x - halfSize, screenPos.y - halfSize, size, size);
        ctx.restore();
      } else {
        drawPlaceholder(ctx, screenPos.x, screenPos.y, size, getEntityLabel(entityType, entity.type), alpha);
      }
    } else {
      drawPlaceholder(ctx, screenPos.x, screenPos.y, size, getEntityLabel(entityType, entity.type), alpha);
    }

    if (highlight) {
      drawHighlight(ctx, screenPos.x, screenPos.y, size, viewport.zoom);
    }
  }

  return {
    setEntityTypes(types: EntityType[]): void {
      entityTypes = types;
    },
    setPreview(nextPreview: EntityPreview | null): void {
      preview = nextPreview;
    },
    setHighlightId(id: string | null): void {
      highlightId = id;
    },
    setSelectedIds(ids: string[]): void {
      selectedIds = new Set(ids);
    },
    render(
      ctx: CanvasRenderingContext2D,
      viewport: ViewportState,
      entities: EntityInstance[],
      tileSize: number,
      canvasWidth: number,
      canvasHeight: number
    ): void {
      if (!entities?.length && !preview) return;

      for (const entity of entities) {
        const isHighlighted = highlightId === entity.id || selectedIds.has(entity.id);
        drawEntity(
          ctx,
          viewport,
          entity,
          tileSize,
          canvasWidth,
          canvasHeight,
          1,
          isHighlighted
        );
      }

      if (preview) {
        drawEntity(
          ctx,
          viewport,
          { id: 'preview', type: preview.type, x: preview.x, y: preview.y, properties: {} },
          tileSize,
          canvasWidth,
          canvasHeight,
          PREVIEW_ALPHA,
          false
        );
      }
    },
  };
}
