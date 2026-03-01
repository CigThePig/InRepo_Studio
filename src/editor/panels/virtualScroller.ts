/**
 * DEVNOTES – virtualScroller.ts
 *
 * A momentum-based scroll engine that translates a content element vertically
 * within an overflow:hidden viewport, replacing native scroll for a panel.
 *
 * State machine:
 *   idle     → no active gesture, no animation
 *   pointer  → pointer-driven scroll (beginPointerScroll called)
 *   momentum → inertial scroll after endPointerScroll, decays via rAF
 *
 * Reuse for other panels:
 *   const scroller = createVirtualScroller({ viewportEl, contentEl, getContentSize, getViewportSize });
 *   // Set touch-action: none on viewportEl before use.
 *   // Drive via beginPointerScroll / movePointerScroll / endPointerScroll
 *   // from your gesture handler (e.g. sortableScroller).
 *   // Call scrollBy() for programmatic autoscroll (e.g. during drag).
 */

/** Velocity multiplier applied each rAF frame during inertia. */
const FRICTION = 0.94;

/** Stop momentum when |velocity| falls below this threshold (px/frame). */
const MIN_VELOCITY = 0.5;

/**
 * How many milliseconds of recent pointer movement to use when estimating
 * the throw velocity on pointerup.
 */
const SAMPLE_WINDOW_MS = 120;

export interface VirtualScrollerConfig {
  /** The clipped container element. Must have overflow:hidden and touch-action:none. */
  viewportEl: HTMLElement;
  /** The inner content wrapper that will be translated via transform. */
  contentEl: HTMLElement;
  /** Returns the current pixel height of contentEl. */
  getContentSize: () => number;
  /** Returns the current pixel height of the visible viewport. */
  getViewportSize: () => number;
  /** Optional callback fired on every offset update (after transform applied). */
  onScroll?: (offset: number) => void;
}

export interface VirtualScrollerController {
  /** Current scroll offset in pixels (0 = top, maxOffset = bottom). */
  getOffset(): number;
  /** Jump to a specific offset, clamped to valid range. Cancels momentum. */
  setOffset(offset: number): void;
  /** Add delta to the current offset (positive = scroll down). Clamped. */
  scrollBy(delta: number): void;
  /** Cancel any in-progress momentum animation. */
  stopMomentum(): void;
  /** Remove rAF loops and release resources. */
  destroy(): void;

  // Pointer-driven scroll hooks – call these from your gesture handler.
  /** Record the starting position and stop any existing momentum. */
  beginPointerScroll(pointerId: number, startClientY: number): void;
  /** Apply the pointer delta and update the transform. */
  movePointerScroll(pointerId: number, clientY: number): void;
  /** Compute throw velocity from recent samples and start inertia. */
  endPointerScroll(pointerId: number): void;
}

interface VelocitySample {
  time: number;
  delta: number;
}

export function createVirtualScroller(config: VirtualScrollerConfig): VirtualScrollerController {
  const { contentEl, getContentSize, getViewportSize, onScroll } = config;

  let offset = 0;
  let activePointerId = -1;
  let lastClientY = 0;
  let rafId: number | null = null;
  let velocity = 0;
  const samples: VelocitySample[] = [];

  function maxOffset(): number {
    return Math.max(0, getContentSize() - getViewportSize());
  }

  function clamp(v: number): number {
    return Math.max(0, Math.min(maxOffset(), v));
  }

  function applyTransform(): void {
    contentEl.style.transform = `translate3d(0,${-offset}px,0)`;
    onScroll?.(offset);
  }

  /** Schedule a single rAF to apply the transform (deduplicates calls within one frame). */
  function scheduleApply(): void {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      applyTransform();
    });
  }

  function stopMomentum(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    velocity = 0;
  }

  function setOffset(v: number): void {
    stopMomentum();
    offset = clamp(v);
    scheduleApply();
  }

  function scrollBy(delta: number): void {
    offset = clamp(offset + delta);
    scheduleApply();
  }

  function runMomentum(): void {
    if (Math.abs(velocity) < MIN_VELOCITY) {
      velocity = 0;
      return;
    }
    const next = clamp(offset + velocity);
    // Stop naturally when we hit a boundary
    if (next === offset && Math.abs(velocity) > 0) {
      velocity = 0;
      return;
    }
    offset = next;
    velocity *= FRICTION;
    applyTransform();
    rafId = requestAnimationFrame(runMomentum);
  }

  function beginPointerScroll(pointerId: number, startClientY: number): void {
    stopMomentum();
    activePointerId = pointerId;
    lastClientY = startClientY;
    samples.length = 0;
  }

  function movePointerScroll(pointerId: number, clientY: number): void {
    if (pointerId !== activePointerId) return;
    const delta = lastClientY - clientY; // positive = scroll down
    lastClientY = clientY;
    const now = performance.now();
    samples.push({ time: now, delta });
    // Prune samples outside the velocity window
    const cutoff = now - SAMPLE_WINDOW_MS;
    while (samples.length > 1 && samples[0].time < cutoff) {
      samples.shift();
    }
    offset = clamp(offset + delta);
    scheduleApply();
  }

  function endPointerScroll(pointerId: number): void {
    if (pointerId !== activePointerId) return;
    activePointerId = -1;
    // Estimate throw velocity from recent pointer samples.
    // Convert px/ms → px/frame (60fps ≈ 16.67ms/frame).
    if (samples.length >= 2) {
      const totalDelta = samples.reduce((sum, s) => sum + s.delta, 0);
      const totalTime = samples[samples.length - 1].time - samples[0].time;
      if (totalTime > 0) {
        velocity = (totalDelta / totalTime) * 16.67;
      }
    }
    samples.length = 0;
    if (Math.abs(velocity) >= MIN_VELOCITY) {
      rafId = requestAnimationFrame(runMomentum);
    }
  }

  function destroy(): void {
    stopMomentum();
  }

  return {
    getOffset: () => offset,
    setOffset,
    scrollBy,
    stopMomentum,
    destroy,
    beginPointerScroll,
    movePointerScroll,
    endPointerScroll,
  };
}
