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
import type { AssetRegistry, AnimationFrameRef } from '@/editor/assets/assetRegistry';
import type { AnimationClock } from './animationClock';

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

/** Resolved sprite draw information */
interface SpriteDrawInfo {
  image: HTMLImageElement;
  /** Source rect within the image (for spritesheets) */
  srcRect?: { x: number; y: number; w: number; h: number };
  /** Draw width in tiles (can be >1 for larger sprites) */
  tileWidth: number;
  /** Draw height in tiles (can be >1 for larger sprites) */
  tileHeight: number;
}

interface SpriteCache {
  getImage(source: string): HTMLImageElement | null;
}

function createSpriteCache(config: EntityRendererConfig): SpriteCache {
  const cache = new Map<string, HTMLImageElement>();
  const pending = new Set<string>();

  function loadImage(source: string): void {
    if (cache.has(source) || pending.has(source)) return;
    pending.add(source);

    const img = new Image();
    img.onload = () => {
      cache.set(source, img);
      pending.delete(source);
      config.onSpriteLoad?.();
    };
    img.onerror = () => {
      pending.delete(source);
      console.warn(`${LOG_PREFIX} Failed to load sprite: ${source}`);
    };
    img.src = resolveAssetUrl(source);
  }

  return {
    getImage(source: string): HTMLImageElement | null {
      if (!cache.has(source)) {
        loadImage(source);
        return null;
      }
      return cache.get(source) ?? null;
    },
  };
}

export interface EntityRenderer {
  setEntityTypes(types: EntityType[]): void;
  setAssetRegistry(assetRegistry: AssetRegistry | null): void;
  setAnimationClock(animationClock: AnimationClock | null): void;
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
  let assetRegistry: AssetRegistry | null = null;
  let animationClock: AnimationClock | null = null;
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

  function isCulledRect(
    screenX: number,
    screenY: number,
    drawW: number,
    drawH: number,
    canvasWidth: number,
    canvasHeight: number
  ): boolean {
    return (
      screenX + drawW / 2 < 0 ||
      screenY + drawH / 2 < 0 ||
      screenX - drawW / 2 > canvasWidth ||
      screenY - drawH / 2 > canvasHeight
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

  function drawHighlightRect(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    drawW: number,
    drawH: number,
    zoom: number
  ): void {
    ctx.save();
    ctx.strokeStyle = HIGHLIGHT_STROKE;
    ctx.lineWidth = HIGHLIGHT_LINE_WIDTH / Math.max(1, zoom);
    ctx.strokeRect(
      screenX - drawW / 2 - 2,
      screenY - drawH / 2 - 2,
      drawW + 4,
      drawH + 4
    );
    ctx.restore();
  }

  /** Compute tile dimensions from a rect relative to tileSize */
  function rectToTileDims(
    rect: { w: number; h: number },
    tileSize: number
  ): { tw: number; th: number } {
    return {
      tw: Math.max(1, rect.w / tileSize),
      th: Math.max(1, rect.h / tileSize),
    };
  }

  /** Try to resolve a sprite asset (slice or standalone) from entity properties */
  function getSpriteAssetInfo(entity: EntityInstance, tileSize: number): SpriteDrawInfo | null {
    const spriteAssetId = entity.properties?.spriteAssetId;
    if (typeof spriteAssetId !== 'string' || !spriteAssetId.trim() || !assetRegistry) {
      return null;
    }

    const asset = assetRegistry.getAsset(spriteAssetId);
    if (!asset?.dataUrl) return null;

    // Slice asset: crop from source sheet
    if (asset.sourceAssetId && asset.rect) {
      const image = spriteCache.getImage(asset.dataUrl);
      if (!image) return null;
      const dims = rectToTileDims(asset.rect, tileSize);
      return {
        image,
        srcRect: asset.rect,
        tileWidth: dims.tw,
        tileHeight: dims.th,
      };
    }

    // Standalone asset: draw the whole image
    const image = spriteCache.getImage(asset.dataUrl);
    if (!image) return null;
    const tw = Math.max(1, asset.width / tileSize);
    const th = Math.max(1, asset.height / tileSize);
    return { image, tileWidth: tw, tileHeight: th };
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
    const baseTileScreen = tileSize * viewport.zoom;

    // Try animation frame first
    const animationFrame = getAnimationFrame(entity);
    if (animationFrame) {
      const sprite = spriteCache.getImage(animationFrame.source);
      if (sprite) {
        const dims = rectToTileDims(animationFrame.frame.rect, tileSize);
        const drawW = dims.tw * baseTileScreen;
        const drawH = dims.th * baseTileScreen;
        const offset = animationFrame.frame.offset;
        const offsetX = (offset?.x ?? 0) * viewport.zoom;
        const offsetY = (offset?.y ?? 0) * viewport.zoom;
        const pivot = animationFrame.pivot;
        const drawX = screenPos.x - drawW * pivot.x + offsetX;
        const drawY = screenPos.y - drawH * pivot.y + offsetY;

        if (!isCulledRect(screenPos.x, screenPos.y, drawW, drawH, canvasWidth, canvasHeight)) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            sprite,
            animationFrame.frame.rect.x,
            animationFrame.frame.rect.y,
            animationFrame.frame.rect.w,
            animationFrame.frame.rect.h,
            drawX,
            drawY,
            drawW,
            drawH
          );
          ctx.restore();

          if (highlight) {
            drawHighlightRect(ctx, screenPos.x, screenPos.y, drawW, drawH, viewport.zoom);
          }
        }
        return;
      }
    }

    // Try sprite asset (slice or standalone from entity properties)
    const spriteInfo = getSpriteAssetInfo(entity, tileSize);
    if (spriteInfo) {
      const drawW = spriteInfo.tileWidth * baseTileScreen;
      const drawH = spriteInfo.tileHeight * baseTileScreen;

      if (!isCulledRect(screenPos.x, screenPos.y, drawW, drawH, canvasWidth, canvasHeight)) {
        ctx.save();
        ctx.globalAlpha = alpha;
        if (spriteInfo.srcRect) {
          ctx.drawImage(
            spriteInfo.image,
            spriteInfo.srcRect.x,
            spriteInfo.srcRect.y,
            spriteInfo.srcRect.w,
            spriteInfo.srcRect.h,
            screenPos.x - drawW / 2,
            screenPos.y - drawH / 2,
            drawW,
            drawH
          );
        } else {
          ctx.drawImage(
            spriteInfo.image,
            screenPos.x - drawW / 2,
            screenPos.y - drawH / 2,
            drawW,
            drawH
          );
        }
        ctx.restore();

        if (highlight) {
          drawHighlightRect(ctx, screenPos.x, screenPos.y, drawW, drawH, viewport.zoom);
        }
      }
      return;
    }

    // Fallback: entity type sprite or placeholder (1×1 tile)
    const size = baseTileScreen;
    const halfSize = size / 2;

    if (isCulledRect(screenPos.x, screenPos.y, size, size, canvasWidth, canvasHeight)) {
      return;
    }

    if (entityType?.sprite) {
      const sprite = spriteCache.getImage(entityType.sprite);
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
      drawHighlightRect(ctx, screenPos.x, screenPos.y, size, size, viewport.zoom);
    }
  }

  function getAnimationFrame(
    entity: EntityInstance
  ): { source: string; frame: AnimationFrameRef; pivot: { x: number; y: number } } | null {
    const animationId = entity.properties?.animationId;
    if (typeof animationId !== 'string' || !animationId.trim() || !assetRegistry) {
      return null;
    }

    const frameSnapshot = animationClock?.getCurrentFrameSnapshot(animationId);
    const fallbackAnimation = frameSnapshot ? null : assetRegistry.getAnimation(animationId);
    const frame = frameSnapshot?.frame ?? fallbackAnimation?.frames?.[0] ?? null;
    const pivot = frameSnapshot?.pivot ?? fallbackAnimation?.pivot ?? { x: 0.5, y: 0.5 };

    if (!frame || frame.rect.w <= 0 || frame.rect.h <= 0) {
      return null;
    }

    const sourceAsset = assetRegistry.getAsset(frame.sourceAssetId);
    if (!sourceAsset?.dataUrl) {
      return null;
    }

    return { source: sourceAsset.dataUrl, frame, pivot };
  }

  return {
    setEntityTypes(types: EntityType[]): void {
      entityTypes = types;
    },
    setAssetRegistry(nextRegistry: AssetRegistry | null): void {
      assetRegistry = nextRegistry;
    },
    setAnimationClock(nextAnimationClock: AnimationClock | null): void {
      animationClock = nextAnimationClock;
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
