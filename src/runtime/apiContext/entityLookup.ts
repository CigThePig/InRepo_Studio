/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Entity lookup stub for v1 Game API.
 *
 * Implements:
 * - EntityLookup (from src/types/gameApi.ts)
 *
 * v1 stub: Returns empty results. Full entity integration is a future track.
 *
 * Apply/Rebuild semantics:
 * - Apply mode: scene-scoped (one per SceneHost)
 *
 * Verification:
 * - [ ] Stub methods return expected empty/null values
 * - [ ] setTag is a no-op but doesn't throw
 */

import type { EntityHandle, EntityLookup } from '../../types/gameApi';

/**
 * Create a stub EntityLookup for v1.
 *
 * Returns empty results for all queries.
 * Full entity system integration will be added in a future track.
 */
export function createEntityLookupStub(): EntityLookup {
  return {
    getById(_id: string): EntityHandle | null {
      return null;
    },

    getByTag(_tag: string): EntityHandle[] {
      return [];
    },

    setTag(_entityId: string, _tag: string, _enabled: boolean): void {
      // No-op in v1 stub
    },

    exists(_id: string): boolean {
      return false;
    },
  };
}
