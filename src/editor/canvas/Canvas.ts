/**
 * Canvas Controller
 *
 * Main orchestrator for the canvas system. Manages:
 * - Canvas element creation and sizing
 * - Viewport state
 * - Gesture handling (pan/zoom)
 * - Render loop
 * - Viewport persistence
 */

import {
  createViewport,
  applyPan,
  applyZoom,
  screenToTile,
  type ViewportState,
} from './viewport';
import { createGestureHandler, type GestureHandler } from './gestures';
import { drawGrid, createDefaultGridConfig, type GridConfig } from './grid';
import {
  createTilemapRenderer,
  TOUCH_OFFSET_Y,
  type TilemapRenderer,
} from './renderer';
import { createTileCache, type TileImageCache } from './tileCache';
import type { Scene, LayerType, TileCategory } from '@/types';

const LOG_PREFIX = '[Canvas]';

// --- Types ---

export interface CanvasController {
  /** Get the current viewport state */
  getViewport(): ViewportState;

  /** Set the viewport state */
  setViewport(viewport: ViewportState): void;

  /** Get the grid configuration */
  getGridConfig(): GridConfig;

  /** Update grid configuration */
  setGridConfig(config: Partial<GridConfig>): void;

  /** Toggle grid visibility */
  toggleGrid(): void;

  /** Force a re-render */
  render(): void;

  /** Handle container resize */
  resize(): void;

  /** Clean up resources */
  destroy(): void;

  /** Set callback for viewport changes */
  onViewportChange(callback: (viewport: ViewportState) => void): void;

  /** Set callback for tool gestures */
  onToolGesture(callbacks: {
    onStart?: (x: number, y: number) => void;
    onMove?: (x: number, y: number) => void;
    onEnd?: () => void;
  }): void;

  /** Set the scene to render */
  setScene(scene: Scene | null): void;

  /** Get the current scene */
  getScene(): Scene | null;

  /** Set the active layer (affects dimming) */
  setActiveLayer(layer: LayerType): void;

  /** Set the selected tile category (for rendering ground/props) */
  setSelectedCategory(category: string): void;

  /** Notify that scene data changed externally */
  invalidateScene(): void;

  /** Get the tile image cache */
  getTileCache(): TileImageCache;

  /** Get the tilemap renderer */
  getRenderer(): TilemapRenderer;

  /** Preload tile images for categories */
  preloadCategories(categories: TileCategory[], basePath: string): Promise<void>;
}

export interface CanvasOptions {
  /** Initial viewport state */
  viewport?: Partial<ViewportState>;

  /** Tile size in pixels (for grid alignment) */
  tileSize?: number;

  /** Initial grid configuration */
  gridConfig?: Partial<GridConfig>;

  /** Initial scene to render */
  scene?: Scene;

  /** Initial active layer */
  activeLayer?: LayerType;

  /** Asset base path for loading tile images */
  assetBasePath?: string;
}

// --- Constants ---

const DEFAULT_TILE_SIZE = 32;

/** Debounce delay for saving viewport state (ms) */
const SAVE_DEBOUNCE_DELAY = 500;

/** Minimum change to trigger viewport save */
const MIN_PAN_CHANGE = 1;
const MIN_ZOOM_CHANGE = 0.01;

// --- Factory ---

export function createCanvas(
  container: HTMLElement,
  options: CanvasOptions = {}
): CanvasController {
  // --- State ---
  let viewport = createViewport(options.viewport);
  let gridConfig = createDefaultGridConfig(options.gridConfig);
  const tileSize = options.tileSize ?? DEFAULT_TILE_SIZE;
  const assetBasePath = options.assetBasePath ?? '';
  let isDirty = true;
  let isDestroyed = false;

  // Callbacks
  let viewportChangeCallback: ((viewport: ViewportState) => void) | null = null;
  let toolCallbacks: {
    onStart?: (x: number, y: number) => void;
    onMove?: (x: number, y: number) => void;
    onEnd?: () => void;
  } = {};

  // Debounce timer for viewport saves
  let saveDebounceTimer: number | null = null;

  // Animation frame handle
  let animationFrameId: number | null = null;

  // --- Tile Cache and Renderer ---
  const tileCache = createTileCache();
  const renderer = createTilemapRenderer({ tileCache, assetBasePath });

  // Set initial scene and active layer if provided
  if (options.scene) {
    renderer.setScene(options.scene);
  }
  if (options.activeLayer) {
    renderer.setActiveLayer(options.activeLayer);
  }

  // Re-render when tile images load
  tileCache.onImageLoad(() => {
    isDirty = true;
    scheduleRender();
  });

  // --- Create Canvas Element ---
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) {
    throw new Error(`${LOG_PREFIX} Failed to get 2D context`);
  }
  // TypeScript now knows ctx is non-null
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // --- Resize Handling ---

  function updateCanvasSize(): void {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale context for high DPI
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    isDirty = true;
  }

  // Use ResizeObserver for responsive sizing
  const resizeObserver = new ResizeObserver(() => {
    updateCanvasSize();
    scheduleRender();
  });
  resizeObserver.observe(container);

  // Initial size
  updateCanvasSize();

  // --- Viewport Management ---

  function notifyViewportChange(): void {
    if (viewportChangeCallback) {
      viewportChangeCallback(viewport);
    }
  }

  function scheduleViewportSave(): void {
    if (saveDebounceTimer !== null) {
      window.clearTimeout(saveDebounceTimer);
    }
    saveDebounceTimer = window.setTimeout(() => {
      saveDebounceTimer = null;
      notifyViewportChange();
    }, SAVE_DEBOUNCE_DELAY);
  }

  function handlePan(deltaX: number, deltaY: number): void {
    const newViewport = applyPan(viewport, deltaX, deltaY);

    // Check if change is significant
    const panChanged =
      Math.abs(newViewport.panX - viewport.panX) > MIN_PAN_CHANGE ||
      Math.abs(newViewport.panY - viewport.panY) > MIN_PAN_CHANGE;

    if (panChanged) {
      viewport = newViewport;
      isDirty = true;
      scheduleRender();
      scheduleViewportSave();
    }
  }

  function handleZoom(scale: number, centerX: number, centerY: number): void {
    // Get canvas-relative coordinates
    const rect = canvas.getBoundingClientRect();
    const canvasX = centerX - rect.left;
    const canvasY = centerY - rect.top;

    const newViewport = applyZoom(viewport, scale, canvasX, canvasY);

    // Check if change is significant
    const zoomChanged = Math.abs(newViewport.zoom - viewport.zoom) > MIN_ZOOM_CHANGE;

    if (zoomChanged || newViewport.panX !== viewport.panX || newViewport.panY !== viewport.panY) {
      viewport = newViewport;
      isDirty = true;
      scheduleRender();
      scheduleViewportSave();
    }
  }

  // --- Hover Tracking ---

  function updateHoverTile(screenX: number, screenY: number): void {
    const scene = renderer.getScene();
    if (!scene) {
      renderer.setHoverTile(null, null);
      return;
    }

    // Apply touch offset (position above finger)
    const offsetY = screenY + TOUCH_OFFSET_Y;

    // Convert screen position to tile coordinates
    const tile = screenToTile(viewport, screenX, offsetY, scene.tileSize);

    renderer.setHoverTile(tile.x, tile.y);
    isDirty = true;
    scheduleRender();
  }

  function clearHoverTile(): void {
    renderer.setHoverTile(null, null);
    isDirty = true;
    scheduleRender();
  }

  // --- Gesture Handler ---

  const gestureHandler: GestureHandler = createGestureHandler(canvas, {
    onPan: handlePan,
    onZoom: handleZoom,
    onToolStart: (x, y) => {
      const rect = canvas.getBoundingClientRect();
      const canvasX = x - rect.left;
      const canvasY = y - rect.top;
      updateHoverTile(canvasX, canvasY);
      toolCallbacks.onStart?.(canvasX, canvasY);
    },
    onToolMove: (x, y) => {
      const rect = canvas.getBoundingClientRect();
      const canvasX = x - rect.left;
      const canvasY = y - rect.top;
      updateHoverTile(canvasX, canvasY);
      toolCallbacks.onMove?.(canvasX, canvasY);
    },
    onToolEnd: () => {
      clearHoverTile();
      toolCallbacks.onEnd?.();
    },
  });

  // --- Render Loop ---

  function render(): void {
    if (isDestroyed) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Fill background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw tilemap (before grid so grid overlays tiles)
    renderer.render(ctx, viewport, width, height);

    // Draw grid
    drawGrid(ctx, viewport, tileSize, width, height, gridConfig);

    isDirty = false;
  }

  function scheduleRender(): void {
    if (animationFrameId !== null) return;

    animationFrameId = requestAnimationFrame(() => {
      animationFrameId = null;
      if (isDirty && !isDestroyed) {
        render();
      }
    });
  }

  // Initial render
  scheduleRender();

  // --- Keyboard Shortcuts ---

  function handleKeyDown(e: KeyboardEvent): void {
    // Only handle if canvas container is focused or no element is focused
    if (document.activeElement && document.activeElement !== document.body) {
      // Allow if the canvas container or its children have focus
      if (!container.contains(document.activeElement)) {
        return;
      }
    }

    // 'G' to toggle grid
    if (e.key === 'g' || e.key === 'G') {
      gridConfig = { ...gridConfig, visible: !gridConfig.visible };
      isDirty = true;
      scheduleRender();
      console.log(`${LOG_PREFIX} Grid ${gridConfig.visible ? 'shown' : 'hidden'}`);
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  // --- Public Interface ---

  const controller: CanvasController = {
    getViewport() {
      return { ...viewport };
    },

    setViewport(newViewport: ViewportState) {
      viewport = createViewport(newViewport);
      isDirty = true;
      scheduleRender();
    },

    getGridConfig() {
      return { ...gridConfig };
    },

    setGridConfig(config: Partial<GridConfig>) {
      gridConfig = { ...gridConfig, ...config };
      isDirty = true;
      scheduleRender();
    },

    toggleGrid() {
      gridConfig = { ...gridConfig, visible: !gridConfig.visible };
      isDirty = true;
      scheduleRender();
    },

    render() {
      isDirty = true;
      scheduleRender();
    },

    resize() {
      updateCanvasSize();
      scheduleRender();
    },

    destroy() {
      isDestroyed = true;

      // Cancel pending operations
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (saveDebounceTimer !== null) {
        clearTimeout(saveDebounceTimer);
      }

      // Remove event listeners
      document.removeEventListener('keydown', handleKeyDown);
      resizeObserver.disconnect();
      gestureHandler.destroy();

      // Remove canvas element
      container.removeChild(canvas);

      console.log(`${LOG_PREFIX} Canvas destroyed`);
    },

    onViewportChange(callback) {
      viewportChangeCallback = callback;
    },

    onToolGesture(callbacks) {
      toolCallbacks = callbacks;
    },

    setScene(scene: Scene | null) {
      renderer.setScene(scene);
      isDirty = true;
      scheduleRender();
    },

    getScene() {
      return renderer.getScene();
    },

    setActiveLayer(layer: LayerType) {
      renderer.setActiveLayer(layer);
      isDirty = true;
      scheduleRender();
    },

    setSelectedCategory(category: string) {
      renderer.setSelectedCategory(category);
      isDirty = true;
      scheduleRender();
    },

    invalidateScene() {
      renderer.invalidate();
      isDirty = true;
      scheduleRender();
    },

    getTileCache() {
      return tileCache;
    },

    getRenderer() {
      return renderer;
    },

    async preloadCategories(categories: TileCategory[], basePath: string) {
      for (const category of categories) {
        await tileCache.preloadCategory(category, basePath);
      }
      isDirty = true;
      scheduleRender();
    },
  };

  console.log(`${LOG_PREFIX} Canvas created (${container.clientWidth}x${container.clientHeight})`);

  return controller;
}
