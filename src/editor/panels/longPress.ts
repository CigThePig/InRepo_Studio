/**
 * Long-press gesture utility for asset capsules.
 *
 * Detects hold (400ms), drag (>8px after hold), and short tap on a DOM element.
 * Does NOT call setPointerCapture on pointerdown — callers are responsible for
 * capture once drag is confirmed, to avoid blocking scroll.
 */

const LONG_PRESS_MS = 400;
const DRAG_THRESHOLD_PX = 8;

export interface LongPressOpts {
  /** Called when the 400ms hold threshold is reached (pointer still down). */
  onSelectionLit: () => void;
  /** Called when the pointer moves >8px after a confirmed long-press. */
  onDragStart: (e: PointerEvent) => void;
  /** Called on pointer-up after a confirmed long-press with no drag. */
  onPopupOpen: (e: PointerEvent) => void;
  /** Called on short tap (pointer-up before 400ms with no drag). */
  onTap: (e: PointerEvent) => void;
  /** Called on pointercancel or when gesture is otherwise aborted. */
  onCancel?: () => void;
  /**
   * When false, movement after long-press will not escalate into drag-start.
   * This is useful for long-press-to-open-menu surfaces where drift should still
   * resolve to popup on release.
   *
   * Default: true.
   */
  allowDragAfterLongPress?: boolean;
}

/**
 * Attaches long-press gesture detection to `el`.
 * Returns a cleanup function that removes all listeners.
 */
export function attachLongPress(el: HTMLElement, opts: LongPressOpts): () => void {
  let timerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let didLongPress = false;
  let activePointerId = -1;
  const allowDragAfterLongPress = opts.allowDragAfterLongPress ?? true;

  const onPointerDown = (e: PointerEvent): void => {
    // Only track one pointer at a time; ignore if already tracking
    if (activePointerId !== -1) return;
    startX = e.clientX;
    startY = e.clientY;
    didLongPress = false;
    activePointerId = e.pointerId;

    timerId = window.setTimeout(() => {
      timerId = null;
      didLongPress = true;
      opts.onSelectionLit();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== activePointerId) return;
    const moved = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (moved > DRAG_THRESHOLD_PX) {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      if (didLongPress && allowDragAfterLongPress) {
        // Long-press drag: transfer tracking to caller
        didLongPress = false;
        activePointerId = -1;
        opts.onDragStart(e);
      } else if (didLongPress) {
        // Long-press was confirmed and this surface does not support drag.
        // Keep gesture active so pointerup resolves to popup-open.
      } else {
        // Moved too far before long-press fired — cancel gesture entirely
        if (timerId !== null) {
          clearTimeout(timerId);
          timerId = null;
        }
        activePointerId = -1;
        opts.onCancel?.();
      }
    }
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== activePointerId) return;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    activePointerId = -1;
    if (didLongPress) {
      didLongPress = false;
      opts.onPopupOpen(e);
    } else {
      opts.onTap(e);
    }
  };

  const onPointerCancel = (e: PointerEvent): void => {
    if (e.pointerId !== activePointerId) return;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    didLongPress = false;
    activePointerId = -1;
    opts.onCancel?.();
  };

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerCancel);

  return (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerCancel);
  };
}
