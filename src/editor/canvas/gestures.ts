/**
 * Gesture Handler for Canvas
 *
 * Handles multi-touch gestures for pan and zoom on the canvas.
 * Distinguishes between:
 * - 1 pointer: tool action (delegated to handler)
 * - 2+ pointers: pan/zoom (handled internally)
 */

// --- Types ---

export interface GestureCallbacks {
  /** Called when viewport should pan by delta pixels */
  onPan: (deltaX: number, deltaY: number) => void;

  /** Called when viewport should zoom by scale factor, centered on screen point */
  onZoom: (scale: number, centerX: number, centerY: number) => void;

  /** Called when a tool gesture starts (single finger) */
  onToolStart?: (x: number, y: number) => void;

  /** Called when a tool gesture moves (single finger) */
  onToolMove?: (x: number, y: number) => void;

  /** Called when a tool gesture ends */
  onToolEnd?: () => void;
}

export interface GestureHandler {
  /** Clean up event listeners */
  destroy: () => void;
}

// --- Internal State ---

interface PointerInfo {
  x: number;
  y: number;
}

type GestureState = 'idle' | 'pending' | 'tool' | 'pan_zoom';

// --- Constants ---

/** Time to wait before confirming single-finger as tool gesture */
const TOOL_CONFIRM_DELAY = 150;

/** Movement threshold to confirm gesture without waiting for delay */
const MOVEMENT_THRESHOLD = 5;

// --- Gesture Handler Factory ---

export function createGestureHandler(
  element: HTMLElement,
  callbacks: GestureCallbacks
): GestureHandler {
  const activePointers: Map<number, PointerInfo> = new Map();
  let gestureState: GestureState = 'idle';
  let toolConfirmTimeout: number | null = null;

  // For pinch-zoom tracking
  let initialPinchDistance: number | null = null;
  let lastPinchCenter: { x: number; y: number } | null = null;

  // For pan tracking
  let lastPanCenter: { x: number; y: number } | null = null;

  // --- Helper Functions ---

  function getDistance(p1: PointerInfo, p2: PointerInfo): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getCenter(p1: PointerInfo, p2: PointerInfo): { x: number; y: number } {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  }

  function getAverageCenter(): { x: number; y: number } {
    let sumX = 0;
    let sumY = 0;
    activePointers.forEach((p) => {
      sumX += p.x;
      sumY += p.y;
    });
    const count = activePointers.size;
    return {
      x: sumX / count,
      y: sumY / count,
    };
  }

  function clearToolConfirmTimeout(): void {
    if (toolConfirmTimeout !== null) {
      window.clearTimeout(toolConfirmTimeout);
      toolConfirmTimeout = null;
    }
  }

  function startPanZoom(): void {
    gestureState = 'pan_zoom';
    clearToolConfirmTimeout();

    if (activePointers.size >= 2) {
      const pointers = Array.from(activePointers.values());
      initialPinchDistance = getDistance(pointers[0], pointers[1]);
      lastPinchCenter = getCenter(pointers[0], pointers[1]);
      lastPanCenter = lastPinchCenter;
    } else {
      lastPanCenter = getAverageCenter();
    }
  }

  function startTool(x: number, y: number): void {
    gestureState = 'tool';
    clearToolConfirmTimeout();
    callbacks.onToolStart?.(x, y);
  }

  // --- Event Handlers ---

  function handlePointerDown(e: PointerEvent): void {
    // Prevent default to avoid browser gestures (scroll, zoom)
    e.preventDefault();

    // Capture pointer for reliable tracking
    element.setPointerCapture(e.pointerId);

    // Store pointer
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pointerCount = activePointers.size;

    if (pointerCount === 1) {
      // First finger - start pending, may become tool or pan/zoom
      gestureState = 'pending';

      const startX = e.clientX;
      const startY = e.clientY;

      // Set timeout to confirm tool gesture
      toolConfirmTimeout = window.setTimeout(() => {
        if (gestureState === 'pending' && activePointers.size === 1) {
          startTool(startX, startY);
        }
      }, TOOL_CONFIRM_DELAY);
    } else if (pointerCount >= 2) {
      // Second+ finger - switch to pan/zoom mode
      // If we were in tool mode, end it first
      if (gestureState === 'tool') {
        callbacks.onToolEnd?.();
      }
      startPanZoom();
    }
  }

  function handlePointerMove(e: PointerEvent): void {
    const pointer = activePointers.get(e.pointerId);
    if (!pointer) return;

    const prevX = pointer.x;
    const prevY = pointer.y;
    const newX = e.clientX;
    const newY = e.clientY;

    // Update pointer position
    pointer.x = newX;
    pointer.y = newY;

    if (gestureState === 'pending') {
      // Check if movement exceeds threshold - confirm as tool
      const dx = newX - prevX;
      const dy = newY - prevY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > MOVEMENT_THRESHOLD) {
        startTool(newX, newY);
      }
      return;
    }

    if (gestureState === 'tool') {
      callbacks.onToolMove?.(newX, newY);
      return;
    }

    if (gestureState === 'pan_zoom') {
      const pointerCount = activePointers.size;

      if (pointerCount >= 2) {
        // Two+ fingers: pan + zoom
        const pointers = Array.from(activePointers.values());
        const currentDistance = getDistance(pointers[0], pointers[1]);
        const currentCenter = getCenter(pointers[0], pointers[1]);

        // Calculate zoom
        if (initialPinchDistance !== null && lastPinchCenter !== null) {
          const scale = currentDistance / initialPinchDistance;

          // Only trigger zoom if scale change is significant
          if (Math.abs(scale - 1) > 0.01) {
            callbacks.onZoom(scale, currentCenter.x, currentCenter.y);
            initialPinchDistance = currentDistance;
          }
        }

        // Calculate pan
        if (lastPanCenter !== null) {
          const deltaX = currentCenter.x - lastPanCenter.x;
          const deltaY = currentCenter.y - lastPanCenter.y;

          if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
            callbacks.onPan(deltaX, deltaY);
          }
        }

        lastPinchCenter = currentCenter;
        lastPanCenter = currentCenter;
      } else if (pointerCount === 1) {
        // Single finger pan (if started as pan/zoom and lost a finger)
        const currentCenter = getAverageCenter();

        if (lastPanCenter !== null) {
          const deltaX = currentCenter.x - lastPanCenter.x;
          const deltaY = currentCenter.y - lastPanCenter.y;

          if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
            callbacks.onPan(deltaX, deltaY);
          }
        }

        lastPanCenter = currentCenter;
      }
    }
  }

  function handlePointerUp(e: PointerEvent): void {
    // Release pointer capture
    try {
      element.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if already released
    }

    // Remove pointer
    activePointers.delete(e.pointerId);

    const pointerCount = activePointers.size;

    if (pointerCount === 0) {
      // All fingers lifted
      if (gestureState === 'tool') {
        callbacks.onToolEnd?.();
      }
      clearToolConfirmTimeout();
      gestureState = 'idle';
      initialPinchDistance = null;
      lastPinchCenter = null;
      lastPanCenter = null;
    } else if (pointerCount === 1 && gestureState === 'pan_zoom') {
      // Went from 2+ to 1 finger - continue pan mode
      initialPinchDistance = null;
      lastPanCenter = getAverageCenter();
    }
  }

  function handlePointerCancel(e: PointerEvent): void {
    handlePointerUp(e);
  }

  // Prevent context menu on long press
  function handleContextMenu(e: Event): void {
    e.preventDefault();
  }

  // --- Attach Event Listeners ---

  element.addEventListener('pointerdown', handlePointerDown);
  element.addEventListener('pointermove', handlePointerMove);
  element.addEventListener('pointerup', handlePointerUp);
  element.addEventListener('pointercancel', handlePointerCancel);
  element.addEventListener('contextmenu', handleContextMenu);

  // Set touch-action to none to prevent browser handling
  element.style.touchAction = 'none';

  // --- Cleanup ---

  function destroy(): void {
    clearToolConfirmTimeout();
    element.removeEventListener('pointerdown', handlePointerDown);
    element.removeEventListener('pointermove', handlePointerMove);
    element.removeEventListener('pointerup', handlePointerUp);
    element.removeEventListener('pointercancel', handlePointerCancel);
    element.removeEventListener('contextmenu', handleContextMenu);
  }

  return { destroy };
}
