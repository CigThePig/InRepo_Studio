/**
 * ApiContext module — concrete implementations of Game API subsystems.
 *
 * Owns:
 * - EventBus: scene-scoped event pub/sub
 * - TimeHelpers: safe timer wrappers with guardrails
 * - LogApi: structured logging with source attribution
 * - EntityLookup: entity query stub (v1)
 * - createApiContext: factory assembling all subsystems
 */

export { createEventBus } from './eventBus';
export { createTimeHelpers } from './timeHelpers';
export type { DisposableTimeHelpers } from './timeHelpers';
export { createLogApi } from './logApi';
export type { LogApiOptions } from './logApi';
export { createEntityLookupStub } from './entityLookup';
export { createApiContext } from './createApiContext';
export type {
  CreateApiContextOptions,
  DisposableApiContext,
} from './createApiContext';
