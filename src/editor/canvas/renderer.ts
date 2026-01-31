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

import { resolveTileGid, type Scene, type LayerType, type TileLayer } from '@/types';
import type { ViewportState } from './viewport';
import { getVisibleTileRange, tileToScreen } from './viewport';
import { getTile, LAYER_ORDER } from '@/types/scene';
import type { TileImageCache } from './tileCache';

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

// Re-export TOUCH_OFFSET_Y for backwards compatibility
export { TOUCH_OFFSET_Y } from './touchConfig';

// --- Types ---

export interface TilemapRendererConfig {
  /** Tile image cache for loading tile images */
  tileCache: TileImageCache;
  /** Base path for asset loading */
  assetBasePath: string;
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

  /** Set the current tile category for rendering */
  setSelectedCategory(category: string): void;

  /** Get the current tile category */
  getSelectedCategory(): string;

  /** Set the hover tile position (or null/null to hide) */
  setHoverTile(tileX: number | null, tileY: number | null): void;

  /** Get the current hover tile position */
  getHoverTile(): { x: number; y: number } | null;

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
  let selectedCategory = '';
  let hoverTileX: number | null = null;
  let hoverTileY: number | null = null;
  let dirty = true;

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
    // Clamp to scene bounds
    if (tileX < 0 || tileX >= sceneWidth || tileY < 0 || tileY >= sceneHeight) {
      return;
    }

    const screenPos = tileToScreen(viewport, tileX, tileY, tileSize);
    const screenTileSize = tileSize * viewport.zoom;

    // Draw fill
    ctx.fillStyle = HOVER_HIGHLIGHT_FILL;
    ctx.fillRect(screenPos.x, screenPos.y, screenTileSize, screenTileSize);

    // Draw border
    ctx.strokeStyle = HOVER_HIGHLIGHT_BORDER;
    ctx.lineWidth = HOVER_HIGHLIGHT_BORDER_WIDTH;
    ctx.strokeRect(
      screenPos.x + 1,
      screenPos.y + 1,
      screenTileSize - 2,
      screenTileSize - 2
    );
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

    getHoverTile(): { x: number; y: number } | null {
      if (hoverTileX === null || hoverTileY === null) {
        return null;
      }
      return { x: hoverTileX, y: hoverTileY };
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
      for (const layerType of LAYER_RENDER_ORDER) {
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
