/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Tilemap rendering with layer support, culling, and visual feedback
 *
 * Defines:
 * - TilemapRenderer — interface for tilemap rendering (type: interface)
 * - LAYER_RENDER_ORDER — layer rendering order (type: constant)
 * - LAYER_COLORS — overlay colors for collision/trigger layers (type: lookup)
 *
 * Canonical key set:
 * - Layer types come from: src/types/scene.ts (LayerType)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (renders update immediately on state change)
 *
 * Verification (minimum):
 * - [ ] Layers render in correct order
 * - [ ] Visible tile culling works correctly
 * - [ ] Inactive layers are dimmed
 */

import { resolveTileGid, type Scene, type LayerType, type TileLayer, type EntityType } from '@/types';
import type { ViewportState } from './viewport';
import { getVisibleTileRange, tileToScreen } from './viewport';
import { getTile, LAYER_ORDER } from '@/types/scene';
import type { TileImageCache } from './tileCache';
import type { LayerVisibility, LayerLocks } from '@/storage/hot';
import { createEntityRenderer, type EntityPreview } from './entityRenderer';

const LOG_PREFIX = '[Renderer]';

// --- Constants ---

/** Layer render order (bottom to top) */
export const LAYER_RENDER_ORDER: LayerType[] = LAYER_ORDER;

/** Opacity for inactive layers */
const INACTIVE_LAYER_OPACITY = 0.4;

/** Overlay colors for special layers */
export const LAYER_COLORS = {
  collision: 'rgba(255, 80, 80, 0.5)',
  triggers: 'rgba(80, 255, 80, 0.5)',
} as const;

/** Hover highlight styling */
const HOVER_HIGHLIGHT_FILL = 'rgba(255, 255, 255, 0.25)';
const HOVER_HIGHLIGHT_BORDER = 'rgba(74, 158, 255, 0.9)';
const HOVER_HIGHLIGHT_BORDER_WIDTH = 2;

/** Selection styling */
const SELECTION_BORDER = 'rgba(74, 158, 255, 0.9)';
const SELECTION_FILL = 'rgba(74, 158, 255, 0.2)';
const SELECTION_BORDER_WIDTH = 2;
const SELECTION_MOVE_BORDER = 'rgba(114, 255, 196, 0.9)';

// Re-export TOUCH_OFFSET_Y for backwards compatibility
export { TOUCH_OFFSET_Y } from './touchConfig';

// --- Types ---

export interface TilemapRendererConfig {
  /** Tile image cache for loading tile images */
  tileCache: TileImageCache;
  /** Callback when entity sprites load */
  onSpriteLoad?: () => void;
}

export interface HoverStyle {
  fill: string;
  border: string;
}

interface SelectionOverlayState {
  selection: {
    startX: number;
    startY: number;
    width: number;
    height: number;
    layer: LayerType;
  } | null;
  moveOffset: { x: number; y: number } | null;
  previewTiles: number[][] | null;
}

export interface TilemapRenderer {
  /** Set the scene to render */
  setScene(scene: Scene | null): void;

  /** Get the current scene */
  getScene(): Scene | null;

  /** Set the active layer (affects dimming) */
  setActiveLayer(layer: LayerType): void;

  /** Get the active layer */
  getActiveLayer(): LayerType;

  /** Set layer visibility state (true = visible) */
  setLayerVisibility(visibility: LayerVisibility): void;

  /** Get layer visibility state */
  getLayerVisibility(): LayerVisibility;

  /** Set layer locks state (true = locked) */
  setLayerLocks(locks: LayerLocks): void;

  /** Get layer locks state */
  getLayerLocks(): LayerLocks;

  /** Set layer render order (bottom to top) */
  setLayerOrder(order: LayerType[]): void;

  /** Get the current layer render order */
  getLayerOrder(): LayerType[];

  /** Set the current tile category for rendering */
  setSelectedCategory(category: string): void;

  /** Get the current tile category */
  getSelectedCategory(): string;

  /** Set the hover tile position (or null/null to hide) */
  setHoverTile(tileX: number | null, tileY: number | null): void;

  /** Set hover brush size for the hover highlight */
  setHoverBrushSize(size: number): void;

  /** Set hover highlight style (omit to reset default) */
  setHoverStyle(style?: HoverStyle): void;

  /** Get the current hover tile position */
  getHoverTile(): { x: number; y: number } | null;

  /** Set selection overlay state */
  setSelectionOverlay(state: SelectionOverlayState): void;

  /** Set entity types used for rendering */
  setEntityTypes(types: EntityType[]): void;

  /** Set entity placement preview */
  setEntityPreview(preview: EntityPreview | null): void;

  /** Highlight a recently placed entity */
  setEntityHighlightId(id: string | null): void;

  /** Highlight selected entities */
  setEntitySelectionIds(ids: string[]): void;

  /** Render the tilemap to the canvas context */
  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    canvasWidth: number,
    canvasHeight: number
  ): void;

  /** Mark renderer as dirty (needs re-render) */
  invalidate(): void;

  /** Check if renderer needs to re-render */
  isDirty(): boolean;
}

// --- Factory ---

export function createTilemapRenderer(config: TilemapRendererConfig): TilemapRenderer {
  const { tileCache } = config;

  // Renderer state
  let scene: Scene | null = null;
  let activeLayer: LayerType = 'ground';
  let layerVisibility: LayerVisibility = {
    ground: true,
    props: true,
    collision: true,
    triggers: true,
  };
  let layerLocks: LayerLocks = {
    ground: false,
    props: false,
    collision: false,
    triggers: false,
  };
  let layerOrder: LayerType[] = [...LAYER_RENDER_ORDER];
  let selectedCategory = '';
  let hoverTileX: number | null = null;
  let hoverTileY: number | null = null;
  let hoverBrushSize = 1;
  let hoverStyle: HoverStyle = {
    fill: HOVER_HIGHLIGHT_FILL,
    border: HOVER_HIGHLIGHT_BORDER,
  };
  let selectionOverlay: SelectionOverlayState = {
    selection: null,
    moveOffset: null,
    previewTiles: null,
  };
  let entityPreview: EntityPreview | null = null;
  let dirty = true;
  const entityRenderer = createEntityRenderer({
    onSpriteLoad: () => {
      dirty = true;
      config.onSpriteLoad?.();
    },
  });

  function getHoverFootprint(
    tileX: number,
    tileY: number,
    brushSize: number
  ): { x: number; y: number }[] {
    const size = Math.max(1, Math.min(3, Math.round(brushSize)));
    const points: { x: number; y: number }[] = [];

    if (size === 1) {
      points.push({ x: tileX, y: tileY });
    } else if (size === 2) {
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          points.push({ x: tileX + dx, y: tileY + dy });
        }
      }
    } else {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          points.push({ x: tileX + dx, y: tileY + dy });
        }
      }
    }

    return points;
  }

  // --- Layer Rendering ---

  function renderTileLayer(
    ctx: CanvasRenderingContext2D,
    layer: TileLayer,
    layerType: LayerType,
    viewport: ViewportState,
    tileSize: number,
    canvasWidth: number,
    canvasHeight: number,
    sceneWidth: number,
    sceneHeight: number,
    isActive: boolean
  ): void {
    // Set opacity based on active state
    ctx.globalAlpha = isActive ? 1.0 : INACTIVE_LAYER_OPACITY;

    // Get visible tile range
    const range = getVisibleTileRange(viewport, canvasWidth, canvasHeight, tileSize);

    // Clamp to scene bounds
    const minX = Math.max(0, range.minX);
    const minY = Math.max(0, range.minY);
    const maxX = Math.min(sceneWidth - 1, range.maxX);
    const maxY = Math.min(sceneHeight - 1, range.maxY);

    const screenTileSize = tileSize * viewport.zoom;

    // Render visible tiles
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tileValue = getTile(layer, x, y);
        if (tileValue === 0) continue; // Empty tile

        const screenPos = tileToScreen(viewport, x, y, tileSize);

        // Check if this is a special layer (collision/trigger)
        if (layerType === 'collision' || layerType === 'triggers') {
          // Draw colored overlay
          ctx.fillStyle = LAYER_COLORS[layerType];
          ctx.fillRect(screenPos.x, screenPos.y, screenTileSize, screenTileSize);
        } else {
          // Draw tile image (GID -> category/index via scene.tilesets)
          if (!scene) continue;
          const resolved = resolveTileGid(scene, tileValue);
          if (!resolved) continue;
          const img = tileCache.getTileImage(resolved.category, resolved.index);
          if (img) {
            ctx.drawImage(
              img,
              screenPos.x,
              screenPos.y,
              screenTileSize,
              screenTileSize
            );
          }
          // If image not loaded, skip (will render on next frame when loaded)
        }
      }
    }

    // Reset opacity
    ctx.globalAlpha = 1.0;
  }

  function renderHoverHighlight(
    ctx: CanvasRenderingContext2D,
    tileX: number,
    tileY: number,
    viewport: ViewportState,
    tileSize: number,
    sceneWidth: number,
    sceneHeight: number
  ): void {
    const footprint = getHoverFootprint(tileX, tileY, hoverBrushSize);
    const screenTileSize = tileSize * viewport.zoom;
    ctx.lineWidth = HOVER_HIGHLIGHT_BORDER_WIDTH;

    for (const point of footprint) {
      if (point.x < 0 || point.x >= sceneWidth || point.y < 0 || point.y >= sceneHeight) {
        continue;
      }

      const screenPos = tileToScreen(viewport, point.x, point.y, tileSize);

      // Draw fill
      ctx.fillStyle = hoverStyle.fill;
      ctx.fillRect(screenPos.x, screenPos.y, screenTileSize, screenTileSize);

      // Draw border
      ctx.strokeStyle = hoverStyle.border;
      ctx.strokeRect(
        screenPos.x + 1,
        screenPos.y + 1,
        screenTileSize - 2,
        screenTileSize - 2
      );
    }
  }

  function renderSelectionOverlay(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    tileSize: number,
    sceneWidth: number,
    sceneHeight: number
  ): void {
    if (!selectionOverlay.selection) return;

    const { selection, moveOffset, previewTiles } = selectionOverlay;
    const screenTileSize = tileSize * viewport.zoom;

    const renderSelectionRect = (startX: number, startY: number, width: number, height: number, border: string) => {
      const screenPos = tileToScreen(viewport, startX, startY, tileSize);
      ctx.lineWidth = SELECTION_BORDER_WIDTH;
      ctx.fillStyle = SELECTION_FILL;
      ctx.strokeStyle = border;
      ctx.fillRect(
        screenPos.x,
        screenPos.y,
        width * screenTileSize,
        height * screenTileSize
      );
      ctx.strokeRect(
        screenPos.x + 1,
        screenPos.y + 1,
        width * screenTileSize - 2,
        height * screenTileSize - 2
      );
    };

    renderSelectionRect(
      selection.startX,
      selection.startY,
      selection.width,
      selection.height,
      SELECTION_BORDER
    );

    if (!moveOffset || !previewTiles) return;

    const previewStartX = selection.startX + moveOffset.x;
    const previewStartY = selection.startY + moveOffset.y;

    renderSelectionRect(
      previewStartX,
      previewStartY,
      selection.width,
      selection.height,
      SELECTION_MOVE_BORDER
    );

    if (!scene) return;

    ctx.save();
    ctx.globalAlpha = 0.65;

    for (let y = 0; y < previewTiles.length; y += 1) {
      for (let x = 0; x < previewTiles[y].length; x += 1) {
        const value = previewTiles[y][x];
        if (value === 0) continue;

        const destX = previewStartX + x;
        const destY = previewStartY + y;

        if (destX < 0 || destX >= sceneWidth || destY < 0 || destY >= sceneHeight) {
          continue;
        }

        const screenPos = tileToScreen(viewport, destX, destY, tileSize);

        if (selection.layer === 'collision' || selection.layer === 'triggers') {
          ctx.fillStyle = LAYER_COLORS[selection.layer];
          ctx.fillRect(screenPos.x, screenPos.y, screenTileSize, screenTileSize);
          continue;
        }

        const resolved = resolveTileGid(scene, value);
        if (!resolved) continue;
        const img = tileCache.getTileImage(resolved.category, resolved.index);
        if (img) {
          ctx.drawImage(img, screenPos.x, screenPos.y, screenTileSize, screenTileSize);
        }
      }
    }

    ctx.restore();
  }

  // --- Renderer Instance ---

  const renderer: TilemapRenderer = {
    setScene(newScene: Scene | null): void {
      if (scene !== newScene) {
        scene = newScene;
        dirty = true;
        console.log(`${LOG_PREFIX} Scene set: ${newScene?.name ?? 'null'}`);
      }
    },

    getScene(): Scene | null {
      return scene;
    },

    setActiveLayer(layer: LayerType): void {
      if (activeLayer !== layer) {
        activeLayer = layer;
        dirty = true;
      }
    },

    getActiveLayer(): LayerType {
      return activeLayer;
    },

    setLayerVisibility(visibility: LayerVisibility): void {
      const changed = Object.keys(visibility).some(
        (key) => layerVisibility[key as LayerType] !== visibility[key as LayerType]
      );
      if (changed) {
        layerVisibility = { ...visibility };
        dirty = true;
      }
    },

    getLayerVisibility(): LayerVisibility {
      return { ...layerVisibility };
    },

    setLayerLocks(locks: LayerLocks): void {
      const changed = Object.keys(locks).some(
        (key) => layerLocks[key as LayerType] !== locks[key as LayerType]
      );
      if (changed) {
        layerLocks = { ...locks };
        dirty = true;
      }
    },

    setLayerOrder(order: LayerType[]): void {
      // Validate order contains all layer types exactly once.
      const unique = Array.from(new Set(order));
      const valid = unique.length === LAYER_ORDER.length && LAYER_ORDER.every((l) => unique.includes(l));
      if (!valid) {
        console.warn(`${LOG_PREFIX} Invalid layer order, ignoring`, order);
        return;
      }
      layerOrder = [...unique];
      dirty = true;
    },

    getLayerOrder(): LayerType[] {
      return [...layerOrder];
    },


    getLayerLocks(): LayerLocks {
      return { ...layerLocks };
    },

    setSelectedCategory(category: string): void {
      if (selectedCategory !== category) {
        selectedCategory = category;
        dirty = true;
      }
    },

    getSelectedCategory(): string {
      return selectedCategory;
    },

    setHoverTile(x: number | null, y: number | null): void {
      if (hoverTileX !== x || hoverTileY !== y) {
        hoverTileX = x;
        hoverTileY = y;
        dirty = true;
      }
    },

    setHoverBrushSize(size: number): void {
      const normalized = Math.max(1, Math.min(3, Math.round(size)));
      if (hoverBrushSize !== normalized) {
        hoverBrushSize = normalized;
        dirty = true;
      }
    },

    setHoverStyle(style?: HoverStyle): void {
      const nextStyle = style ?? { fill: HOVER_HIGHLIGHT_FILL, border: HOVER_HIGHLIGHT_BORDER };
      if (hoverStyle.fill !== nextStyle.fill || hoverStyle.border !== nextStyle.border) {
        hoverStyle = nextStyle;
        dirty = true;
      }
    },

    getHoverTile(): { x: number; y: number } | null {
      if (hoverTileX === null || hoverTileY === null) {
        return null;
      }
      return { x: hoverTileX, y: hoverTileY };
    },

    setSelectionOverlay(state: SelectionOverlayState): void {
      selectionOverlay = state;
      dirty = true;
    },

    setEntityTypes(types: EntityType[]): void {
      entityRenderer.setEntityTypes(types);
      dirty = true;
    },

    setEntityPreview(preview: EntityPreview | null): void {
      entityPreview = preview;
      entityRenderer.setPreview(preview);
      dirty = true;
    },

    setEntityHighlightId(id: string | null): void {
      entityRenderer.setHighlightId(id);
      dirty = true;
    },

    setEntitySelectionIds(ids: string[]): void {
      entityRenderer.setSelectedIds(ids);
      dirty = true;
    },

    render(
      ctx: CanvasRenderingContext2D,
      viewport: ViewportState,
      canvasWidth: number,
      canvasHeight: number
    ): void {
      if (!scene) return;

      const { width: sceneWidth, height: sceneHeight, tileSize, layers } = scene;

      // Disable image smoothing for pixel art
      ctx.imageSmoothingEnabled = false;

      // Render layers in order (bottom to top)
      for (const layerType of layerOrder) {
        // Skip hidden layers
        if (!layerVisibility[layerType]) continue;

        const layer = layers[layerType];
        if (!layer) continue;

        renderTileLayer(
          ctx,
          layer,
          layerType,
          viewport,
          tileSize,
          canvasWidth,
          canvasHeight,
          sceneWidth,
          sceneHeight,
          layerType === activeLayer
        );
      }

      if (scene.entities?.length || entityPreview) {
        entityRenderer.render(
          ctx,
          viewport,
          scene.entities ?? [],
          tileSize,
          canvasWidth,
          canvasHeight
        );
      }

      // Render hover highlight (on top of everything)
      if (hoverTileX !== null && hoverTileY !== null) {
        renderHoverHighlight(
          ctx,
          hoverTileX,
          hoverTileY,
          viewport,
          tileSize,
          sceneWidth,
          sceneHeight
        );
      }

      renderSelectionOverlay(ctx, viewport, tileSize, sceneWidth, sceneHeight);

      dirty = false;
    },

    invalidate(): void {
      dirty = true;
    },

    isDirty(): boolean {
      return dirty;
    },
  };

  console.log(`${LOG_PREFIX} Renderer created`);

  return renderer;
}
