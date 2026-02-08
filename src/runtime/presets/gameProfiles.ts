/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Game Profile definitions and apply logic.
 *
 * Defines:
 * - GameProfileDef — profile definition with recommended presets
 * - GAME_PROFILES — v1 profile list (topdown, platformer, custom)
 *
 * Canonical key set:
 * - Profile IDs: topdown, platformer, custom
 * - Category IDs: controls, movement, camera, animation
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (profile selection applies recommended presets immediately)
 */

import type { PresetCategoryId } from '../../types/preset';
import type { GameProfile } from '../../types/presetDefaults';

/** A game profile definition with recommended preset selections. */
export interface GameProfileDef {
  readonly id: GameProfile;
  readonly label: string;
  readonly description: string;
  readonly recommendations: Partial<Record<PresetCategoryId, string>>;
}

/** v1 game profiles. */
export const GAME_PROFILES: readonly GameProfileDef[] = [
  {
    id: 'topdown',
    label: 'Top-down',
    description: 'Classic top-down movement with 4/8-directional controls.',
    recommendations: {
      controls: 'controls-topdown',
      movement: 'movement-topdown',
      camera: 'camera-follow',
      animation: 'animation-driver',
    },
  },
  {
    id: 'platformer',
    label: 'Platformer',
    description: 'Side-scrolling platformer with gravity, jumping, and running.',
    recommendations: {
      controls: 'controls-platformer',
      movement: 'movement-platformer',
      camera: 'camera-follow',
      animation: 'animation-driver',
    },
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Mix and match presets freely.',
    recommendations: {},
  },
];

/** Look up a profile definition by ID. */
export function getProfileDef(id: GameProfile): GameProfileDef | null {
  return GAME_PROFILES.find((p) => p.id === id) ?? null;
}

/** Get recommendations for a profile. Returns empty record for custom. */
export function getProfileRecommendations(
  id: GameProfile,
): Partial<Record<PresetCategoryId, string>> {
  return getProfileDef(id)?.recommendations ?? {};
}
