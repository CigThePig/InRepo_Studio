/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Default factories for preset configuration.
 *
 * Defines:
 * - createDefaultPresetConfig — produces a valid empty /game/presets.json
 * - createDefaultCategoryConfig — produces a default category config entry
 *
 * Canonical key set:
 * - Keys come from ./preset.ts PresetSavedConfig / PresetCategoryConfig
 *
 * Apply/Rebuild semantics:
 * - Apply mode: used when no /game/presets.json exists (cold-to-hot migration)
 *
 * Verification:
 * - [ ] createDefaultPresetConfig() produces valid JSON matching PresetSavedConfig
 * - [ ] Round-trips cleanly through JSON.parse(JSON.stringify(...))
 */

import type { PresetSavedConfig, PresetCategoryConfig } from './preset';

/** Current format version for /game/presets.json. */
export const PRESET_CONFIG_FORMAT_VERSION = 1;

/** Valid profile names for v1. */
export const VALID_PROFILES = ['topdown', 'platformer', 'custom'] as const;
export type GameProfile = (typeof VALID_PROFILES)[number];

/** Create a default empty preset saved config. */
export function createDefaultPresetConfig(): PresetSavedConfig {
  return {
    formatVersion: PRESET_CONFIG_FORMAT_VERSION,
    profile: 'custom',
    categories: {},
  };
}

/** Create a default category config entry for a given preset. */
export function createDefaultCategoryConfig(
  presetId: string,
): PresetCategoryConfig {
  return {
    enabled: false,
    presetId,
    config: {},
  };
}

/**
 * Merge user-saved category config with preset defaults.
 * Missing keys fall back to preset defaults. Unknown keys are preserved.
 */
export function mergeCategoryConfig(
  saved: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...defaults };
  for (const [key, value] of Object.entries(saved)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

/**
 * Check if a category config differs from defaults.
 * Returns true if any key in config has a value different from defaults.
 */
export function isCategoryConfigModified(
  config: Record<string, unknown>,
  defaults: Record<string, unknown>,
): boolean {
  for (const [key, value] of Object.entries(config)) {
    if (JSON.stringify(value) !== JSON.stringify(defaults[key])) {
      return true;
    }
  }
  return false;
}
