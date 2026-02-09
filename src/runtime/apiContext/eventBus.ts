/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Scene-scoped event pub/sub implementation for the Game API.
 *
 * Implements:
 * - EventBus (from src/types/gameApi.ts)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: scene-scoped (one per SceneHost, disposed on shutdown)
 *
 * Verification:
 * - [ ] on/once/off/emit/list work correctly
 * - [ ] dispose() clears all handlers
 * - [ ] Payloads are plain JSON objects
 */

import type { Disposer, EventBus } from '../../types/gameApi';

type Handler = (payload: Record<string, unknown>) => void;

/**
 * Create a scene-scoped EventBus.
 *
 * Each SceneHost gets its own instance — no shared mutable state.
 * All subscriptions return a Disposer for clean teardown.
 */
export function createEventBus(): EventBus & { dispose(): void } {
  const listeners = new Map<string, Set<Handler>>();
  let disposed = false;

  function getOrCreate(eventId: string): Set<Handler> {
    let set = listeners.get(eventId);
    if (!set) {
      set = new Set();
      listeners.set(eventId, set);
    }
    return set;
  }

  const bus: EventBus & { dispose(): void } = {
    on(eventId: string, handler: Handler): Disposer {
      if (disposed) return () => {};
      const set = getOrCreate(eventId);
      set.add(handler);
      return () => {
        set.delete(handler);
        if (set.size === 0) listeners.delete(eventId);
      };
    },

    once(eventId: string, handler: Handler): Disposer {
      if (disposed) return () => {};
      const wrapper: Handler = (payload) => {
        dispose();
        handler(payload);
      };
      const dispose = bus.on(eventId, wrapper);
      return dispose;
    },

    off(eventId: string, handler: Handler): void {
      const set = listeners.get(eventId);
      if (set) {
        set.delete(handler);
        if (set.size === 0) listeners.delete(eventId);
      }
    },

    emit(eventId: string, payload?: Record<string, unknown>): void {
      if (disposed) return;
      const set = listeners.get(eventId);
      if (!set) return;
      const resolved = payload ?? {};
      // Iterate over a copy to allow handlers to unsubscribe during emit
      for (const handler of [...set]) {
        try {
          handler(resolved);
        } catch (err) {
          console.error(`[EventBus] Error in handler for "${eventId}":`, err);
        }
      }
    },

    list(): string[] {
      return Array.from(listeners.keys());
    },

    dispose(): void {
      disposed = true;
      listeners.clear();
    },
  };

  return bus;
}
