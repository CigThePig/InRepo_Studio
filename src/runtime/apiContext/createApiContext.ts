/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Factory that assembles a concrete ApiContext from subsystems.
 *
 * Implements:
 * - ApiContext (from src/types/gameApi.ts)
 *
 * Wires together: EventBus, TimeHelpers, LogApi, EntityLookup, PresetSurface.
 * Generic api.call/on/read route through PresetManager via callbacks.
 *
 * Apply/Rebuild semantics:
 * - Apply mode: scene-scoped (one per SceneHost, disposed on shutdown)
 *
 * Verification:
 * - [ ] ApiContext satisfies the gameApi.ts interface
 * - [ ] call/on/read delegate correctly
 * - [ ] dispose() cleans up all subsystems
 */

import type {
  ApiContext,
  ApiMeta,
  Disposer,
  EntityLookup,
  PresetSurface,
} from '../../types/gameApi';
import { createEventBus } from './eventBus';
import { createTimeHelpers } from './timeHelpers';
import type { DisposableTimeHelpers } from './timeHelpers';
import { createLogApi } from './logApi';
import { createEntityLookupStub } from './entityLookup';

/** Options for creating an ApiContext. */
export interface CreateApiContextOptions {
  readonly meta: ApiMeta;
  /** Handler for api.call() — routes to PresetManager. */
  readonly onCall: (commandId: string, args?: Record<string, unknown>) => unknown;
  /** Handler for api.read() — routes to PresetManager. */
  readonly onRead: (stateId: string) => unknown;
  /** PresetSurface implementation (delegates to PresetManager). */
  readonly presetSurface: PresetSurface;
  /** Optional custom EntityLookup (defaults to stub). */
  readonly entityLookup?: EntityLookup;
}

/** A fully constructed ApiContext with a dispose method. */
export interface DisposableApiContext extends ApiContext {
  dispose(): void;
}

/**
 * Create a scene-scoped ApiContext.
 *
 * Assembles all subsystems and wires generic call/on/read
 * to the provided handlers (which route to PresetManager).
 */
export function createApiContext(
  options: CreateApiContextOptions,
): DisposableApiContext {
  const eventBus = createEventBus();
  const timeHelpers: DisposableTimeHelpers = createTimeHelpers();
  const log = createLogApi({ logicTarget: options.meta.logicTarget });
  const entities = options.entityLookup ?? createEntityLookupStub();

  const ctx: DisposableApiContext = {
    meta: options.meta,
    events: eventBus,
    time: timeHelpers,
    log,
    entities,
    presets: options.presetSurface,

    call(commandId: string, args?: Record<string, unknown>): unknown {
      return options.onCall(commandId, args);
    },

    on(
      eventId: string,
      handler: (payload: Record<string, unknown>) => void,
    ): Disposer {
      return eventBus.on(eventId, handler);
    },

    read(stateId: string): unknown {
      return options.onRead(stateId);
    },

    dispose(): void {
      timeHelpers.dispose();
      eventBus.dispose();
    },
  };

  return ctx;
}
