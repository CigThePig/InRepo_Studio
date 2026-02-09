/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Safe timer wrappers for the Game API.
 *
 * Implements:
 * - TimeHelpers (from src/types/gameApi.ts)
 *
 * Guardrails:
 * - Minimum interval for every(): 50ms
 * - Hard cap on active timers: 64 per SceneHost
 *
 * Apply/Rebuild semantics:
 * - Apply mode: scene-scoped (all timers auto-cancel on dispose)
 *
 * Verification:
 * - [ ] after/every/clear work correctly
 * - [ ] dispose() cancels all active timers
 * - [ ] Minimum interval enforced
 * - [ ] Timer cap enforced
 */

import type { Disposer, TimeHelpers, TimerHandle } from '../../types/gameApi';

const MIN_INTERVAL_MS = 50;
const MAX_ACTIVE_TIMERS = 64;

export interface DisposableTimeHelpers extends TimeHelpers {
  dispose(): void;
  readonly activeCount: number;
}

/**
 * Create safe timer wrappers.
 *
 * All timers are tracked and auto-cancelled on dispose.
 * Uses standard setTimeout/setInterval (Phaser time integration deferred to SceneHost wiring).
 */
export function createTimeHelpers(): DisposableTimeHelpers {
  const activeTimers = new Set<Disposer>();
  let disposed = false;

  function trackTimer(cancel: Disposer): TimerHandle {
    activeTimers.add(cancel);
    const handle: TimerHandle = () => {
      cancel();
      activeTimers.delete(handle);
    };
    // Replace the tracked entry so handle === the disposer we return
    activeTimers.delete(cancel);
    activeTimers.add(handle);
    return handle;
  }

  const helpers: DisposableTimeHelpers = {
    after(ms: number, fn: () => void): TimerHandle {
      if (disposed) return () => {};
      if (activeTimers.size >= MAX_ACTIVE_TIMERS) {
        console.warn('[TimeHelpers] Timer cap reached, ignoring after()');
        return () => {};
      }

      const id = setTimeout(() => {
        activeTimers.delete(handle);
        if (!disposed) {
          try {
            fn();
          } catch (err) {
            console.error('[TimeHelpers] Error in after() callback:', err);
          }
        }
      }, ms);

      const cancel: Disposer = () => clearTimeout(id);
      const handle = trackTimer(cancel);
      return handle;
    },

    every(ms: number, fn: () => void): TimerHandle {
      if (disposed) return () => {};
      if (activeTimers.size >= MAX_ACTIVE_TIMERS) {
        console.warn('[TimeHelpers] Timer cap reached, ignoring every()');
        return () => {};
      }

      const interval = Math.max(ms, MIN_INTERVAL_MS);
      if (ms < MIN_INTERVAL_MS) {
        console.warn(
          `[TimeHelpers] Interval ${ms}ms below minimum, clamped to ${MIN_INTERVAL_MS}ms`,
        );
      }

      const id = setInterval(() => {
        if (!disposed) {
          try {
            fn();
          } catch (err) {
            console.error('[TimeHelpers] Error in every() callback:', err);
          }
        }
      }, interval);

      const cancel: Disposer = () => clearInterval(id);
      const handle = trackTimer(cancel);
      return handle;
    },

    clear(handle: TimerHandle): void {
      handle();
      activeTimers.delete(handle);
    },

    get activeCount() {
      return activeTimers.size;
    },

    dispose(): void {
      disposed = true;
      for (const cancel of activeTimers) {
        cancel();
      }
      activeTimers.clear();
    },
  };

  return helpers;
}
