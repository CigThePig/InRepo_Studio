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
  type ViewportState,
} from './viewport';
import { createGestureHandler, type GestureHandler } from './gestures';
import { drawGrid, createDefaultGridConfig, type GridConfig } from './grid';

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
}

export interface CanvasOptions {
  /** Initial viewport state */
  viewport?: Partial<ViewportState>;

  /** Tile size in pixels (for grid alignment) */
  tileSize?: number;

  /** Initial grid configuration */
  gridConfig?: Partial<GridConfig>;
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

  // --- Gesture Handler ---

  const gestureHandler: GestureHandler = createGestureHandler(canvas, {
    onPan: handlePan,
    onZoom: handleZoom,
    onToolStart: (x, y) => {
      const rect = canvas.getBoundingClientRect();
      toolCallbacks.onStart?.(x - rect.left, y - rect.top);
    },
    onToolMove: (x, y) => {
      const rect = canvas.getBoundingClientRect();
      toolCallbacks.onMove?.(x - rect.left, y - rect.top);
    },
    onToolEnd: () => {
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

    // Draw grid
    drawGrid(ctx, viewport, tileSize, width, height, gridConfig);

    // Future: Draw tiles, entities, selection, etc.

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
  };

  console.log(`${LOG_PREFIX} Canvas created (${container.clientWidth}x${container.clientHeight})`);

  return controller;
}
