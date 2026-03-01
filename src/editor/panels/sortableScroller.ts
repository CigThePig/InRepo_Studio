/**
 * DEVNOTES – sortableScroller.ts
 *
 * Gesture arbiter for a panel that needs both inertial scroll and
 * long-press drag-to-reorder. Owns pointer events on the viewport element
 * and routes each gesture to the correct handler.
 *
 * State machine:
 *   idle      → no active pointer
 *   pressing  → pointer down inside an item; long-press timer counting
 *   scrolling → moved > scrollStartThresholdPx (vertical) before timer fired;
 *               pointer deltas are fed to the virtual scroller
 *   confirmed → long-press timer fired; pointer still held down
 *   dragging  → moved > dragStartSlopPx after confirmed; caller owns the drag
 *               (beginDrag typically re-captures the pointer on documentElement,
 *               which causes viewportEl to receive lostpointercapture and
 *               resets this state machine back to idle automatically)
 *
 * Reuse for other panels:
 *   const s = createSortableScroller({ viewportEl, scroller, getItemEl, ...callbacks });
 *   // Set touch-action: none on viewportEl first.
 *   // The host handles ghost creation, placeholder, and reorder commit.
 *   // Call s.destroy() when the panel is unmounted.
 *
 * Pointer ownership:
 *   setPointerCapture is called on viewportEl on pointerdown so that
 *   pointermove events are reliably delivered even if the finger leaves the
 *   element boundary. When the caller's beginDrag() re-captures on
 *   documentElement, viewportEl fires lostpointercapture, which we handle
 *   by resetting the state machine.
 */

import type { VirtualScrollerController } from './virtualScroller';

const DEFAULT_LONG_PRESS_MS = 260;
const DEFAULT_SCROLL_THRESHOLD_PX = 8;
const DEFAULT_DRAG_SLOP_PX = 6;

export interface SortableScrollerConfig {
  /** The clipped viewport element (must have touch-action:none set by caller). */
  viewportEl: HTMLElement;
  /** The virtual scroller that owns scroll physics for this viewport. */
  scroller: VirtualScrollerController;
  /**
   * Resolve the closest sortable item element from an event target.
   * Return null if the pointer is not over any item.
   */
  getItemEl: (target: HTMLElement) => HTMLElement | null;

  /** Milliseconds to hold before long-press fires (default 260). */
  longPressMs?: number;
  /** Vertical movement in px before scroll intent is assumed (default 8). */
  scrollStartThresholdPx?: number;
  /** Movement in px after long-press fires before drag intent is assumed (default 6). */
  dragStartSlopPx?: number;

  /**
   * Fired when the long-press timer fires and the pointer is still held.
   * Use to show a visual "selection ready" highlight on the item.
   */
  onSelectionLit?: (event: PointerEvent, itemEl: HTMLElement) => void;
  /**
   * Fired when the pointer moves past dragStartSlopPx after long-press is confirmed.
   * The caller should call beginDrag() here; it will re-capture the pointer.
   */
  onDragStart?: (event: PointerEvent, itemEl: HTMLElement) => void;
  /**
   * Fired on pointerup after long-press is confirmed without any drag movement.
   * Typically used to enter a selection mode for the item.
   */
  onLongPressRelease?: (event: PointerEvent, itemEl: HTMLElement) => void;
  /**
   * Fired on a short tap (pointerup before the long-press timer fires).
   */
  onTap?: (event: PointerEvent, itemEl: HTMLElement) => void;
  /**
   * Fired when the gesture is cancelled (pointercancel, or scroll intent
   * detected before long-press).  itemEl may be null if a non-item touch
   * is cancelled.
   */
  onCancel?: (itemEl: HTMLElement | null) => void;
  /** Optional debug hook for state transitions and lifecycle checkpoints. */
  onStateChange?: (state: GestureState, info?: Record<string, unknown>) => void;
  /** Optional debug hook for sampled pointer diagnostics (throttled internally). */
  onDebugSample?: (info: Record<string, unknown>) => void;
}

export interface SortableScrollerController {
  destroy(): void;
}

type GestureState = 'idle' | 'pressing' | 'scrolling' | 'confirmed' | 'dragging';

export function createSortableScroller(config: SortableScrollerConfig): SortableScrollerController {
  const {
    viewportEl,
    scroller,
    getItemEl,
    longPressMs = DEFAULT_LONG_PRESS_MS,
    scrollStartThresholdPx = DEFAULT_SCROLL_THRESHOLD_PX,
    dragStartSlopPx = DEFAULT_DRAG_SLOP_PX,
  } = config;

  let state: GestureState = 'idle';
  let activePointerId = -1;
  let activeItemEl: HTMLElement | null = null;
  let startX = 0;
  let startY = 0;
  let timerId: number | null = null;
  let lastDebugMoveTs = 0;

  function emitState(stateLabel: GestureState, info?: Record<string, unknown>): void {
    config.onStateChange?.(stateLabel, info);
  }

  function setState(nextState: GestureState, info?: Record<string, unknown>): void {
    if (state === nextState) return;
    state = nextState;
    emitState(nextState, info);
  }

  function emitDebugSample(info: Record<string, unknown>): void {
    const now = performance.now();
    if (now - lastDebugMoveTs < 60) return;
    lastDebugMoveTs = now;
    config.onDebugSample?.(info);
  }

  function clearTimer(): void {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function reset(): void {
    clearTimer();
    setState('idle');
    activePointerId = -1;
    activeItemEl = null;
  }

  const onPointerDown = (e: PointerEvent): void => {
    if (state !== 'idle') return;
    // Only handle primary button (left mouse, single touch, pen press)
    if (e.button !== 0) return;

    // Always stop momentum when the user touches the viewport
    scroller.stopMomentum();

    startX = e.clientX;
    startY = e.clientY;
    activePointerId = e.pointerId;
    activeItemEl = getItemEl(e.target as HTMLElement);
    emitState(state, {
      phase: 'pointerdown',
      pointerId: e.pointerId,
      targetTag: (e.target as HTMLElement | null)?.tagName ?? 'unknown',
      targetClass: (e.target as HTMLElement | null)?.className ?? '',
      itemFound: activeItemEl !== null,
      startX,
      startY,
    });

    try {
      viewportEl.setPointerCapture(e.pointerId);
    } catch (_) {
      // Pointer already gone (race); gesture will cleanly resolve via pointerup.
    }

    if (activeItemEl !== null) {
      // Pointer is on a sortable item: start long-press detection
      setState('pressing', { pointerId: e.pointerId, longPressMs });
      const itemEl = activeItemEl;
      timerId = window.setTimeout(() => {
        timerId = null;
        if (state !== 'pressing') return;
        setState('confirmed', { pointerId: e.pointerId, reason: 'long-press-timer-fired' });
        config.onDebugSample?.({
          phase: 'long-press-fired',
          pointerId: e.pointerId,
          itemAssetId: itemEl.dataset.assetId ?? '',
        });
        config.onSelectionLit?.(e, itemEl);
      }, longPressMs);
    } else {
      // Pointer is on empty space: start scrolling immediately
      setState('scrolling', { pointerId: e.pointerId, reason: 'pointerdown-empty-space' });
      scroller.beginPointerScroll(e.pointerId, e.clientY);
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== activePointerId) return;

    const dy = e.clientY - startY;
    const totalMoved = Math.hypot(e.clientX - startX, dy);
    emitDebugSample({
      phase: 'pointermove',
      pointerId: e.pointerId,
      state,
      dx: e.clientX - startX,
      dy,
      totalMoved,
      scrollStartThresholdPx,
      dragStartSlopPx,
    });

    if (state === 'pressing') {
      // Cancel long-press and enter scroll if the finger has moved vertically
      if (Math.abs(dy) > scrollStartThresholdPx) {
        clearTimer();
        setState('scrolling', {
          pointerId: e.pointerId,
          reason: 'scroll-threshold-crossed',
          dy,
          threshold: scrollStartThresholdPx,
        });
        // Begin scroll from the current position (not the original startY) so
        // there is no discontinuous jump when the scroll threshold is crossed.
        scroller.beginPointerScroll(e.pointerId, e.clientY);
        config.onCancel?.(activeItemEl);
      }
    } else if (state === 'scrolling') {
      scroller.movePointerScroll(e.pointerId, e.clientY);
    } else if (state === 'confirmed') {
      // Long-press fired; now detect drag intent
      if (totalMoved > dragStartSlopPx && activeItemEl !== null) {
        setState('dragging', {
          pointerId: e.pointerId,
          reason: 'drag-slop-crossed',
          totalMoved,
          dragStartSlopPx,
        });
        // Caller's beginDrag() will re-capture on documentElement, which
        // fires lostpointercapture on viewportEl → reset() is called there.
        config.onDragStart?.(e, activeItemEl);
      }
    }
    // 'dragging': the drag system owns the pointer; we do nothing here.
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== activePointerId) return;
    emitState(state, { phase: 'pointerup', pointerId: e.pointerId });

    if (state === 'scrolling') {
      scroller.endPointerScroll(e.pointerId);
    } else if (state === 'pressing') {
      clearTimer();
      if (activeItemEl !== null) config.onTap?.(e, activeItemEl);
    } else if (state === 'confirmed') {
      if (activeItemEl !== null) config.onLongPressRelease?.(e, activeItemEl);
    }
    // 'dragging': drag system handles pointerup on documentElement; we reset below.
    reset();
  };

  const onPointerCancel = (e: PointerEvent): void => {
    if (e.pointerId !== activePointerId) return;
    emitState(state, { phase: 'pointercancel', pointerId: e.pointerId });
    if (state === 'scrolling') {
      scroller.endPointerScroll(e.pointerId);
    }
    const item = activeItemEl;
    reset();
    config.onCancel?.(item);
  };

  /**
   * When beginDrag() captures the pointer on documentElement, viewportEl
   * loses capture and fires lostpointercapture.  Reset here so the state
   * machine is ready for the next gesture.
   */
  const onLostPointerCapture = (e: PointerEvent): void => {
    if (e.pointerId !== activePointerId) return;
    config.onDebugSample?.({ phase: 'lostpointercapture', pointerId: e.pointerId, state });
    // Only reset if we were in dragging (capture transferred to drag system).
    // In other states the loss is unexpected; reset anyway to avoid stuck state.
    reset();
  };

  /**
   * Belt-and-suspenders prevention of browser-default scroll interpretation
   * for older Android that may not fully honour touch-action:none on the viewport.
   */
  const onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
  };

  viewportEl.addEventListener('pointerdown', onPointerDown);
  viewportEl.addEventListener('pointermove', onPointerMove);
  viewportEl.addEventListener('pointerup', onPointerUp);
  viewportEl.addEventListener('pointercancel', onPointerCancel);
  viewportEl.addEventListener('lostpointercapture', onLostPointerCapture);
  viewportEl.addEventListener('touchmove', onTouchMove, { passive: false });

  return {
    destroy(): void {
      clearTimer();
      viewportEl.removeEventListener('pointerdown', onPointerDown);
      viewportEl.removeEventListener('pointermove', onPointerMove);
      viewportEl.removeEventListener('pointerup', onPointerUp);
      viewportEl.removeEventListener('pointercancel', onPointerCancel);
      viewportEl.removeEventListener('lostpointercapture', onLostPointerCapture);
      viewportEl.removeEventListener('touchmove', onTouchMove);
    },
  };
}
