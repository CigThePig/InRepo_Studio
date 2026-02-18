/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Editor-side preset config read/write to hot storage.
 *
 * Defines:
 * - PresetConfigStore — get/set/reset preset config, profile switching, change subscriptions
 *
 * Canonical key set:
 * - Keys come from: @/types/preset (PresetSavedConfig, PresetCategoryConfig, PresetCategoryId)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (changes auto-save to hot storage)
 *
 * Verification:
 * - [ ] load/save round-trips cleanly
 * - [ ] onChange fires on every mutation
 * - [ ] isModified detects knob changes vs defaults
 * - [ ] getConflicts detects incompatible active presets
 */

import type {
  PresetCategoryId,
  PresetSavedConfig,
  PresetCategoryConfig,
  PresetDefinition,
} from '@/types/preset';
import type { GameProfile } from '@/types/presetDefaults';
import {
  createDefaultPresetConfig,
  createDefaultCategoryConfig,
  isCategoryConfigModified,
} from '@/types/presetDefaults';
import { getProfileRecommendations } from '@/runtime/presets/gameProfiles';
import type { PresetRegistry } from '@/runtime/presets/presetRegistry';
import type { PresetConflict } from '@/runtime/presets/presetManager';
import { savePresetConfig, loadPresetConfig } from '@/storage/hot';

const LOG_PREFIX = '[PresetConfigStore]';

/** Editor-side preset configuration manager. */
export interface PresetConfigStore {
  /** Get the full current config. */
  getConfig(): PresetSavedConfig;

  /** Get config for a specific category. Returns default if not present. */
  getCategoryConfig(categoryId: PresetCategoryId): PresetCategoryConfig;

  /** Switch the active profile. Applies recommended presets. Returns updated config. */
  setProfile(profile: GameProfile): PresetSavedConfig;

  /** Enable a category with a specific preset. */
  enableCategory(categoryId: PresetCategoryId, presetId: string): void;

  /** Disable a category. */
  disableCategory(categoryId: PresetCategoryId): void;

  /** Set a single knob value for a category. */
  setKnobValue(categoryId: PresetCategoryId, knobId: string, value: unknown): void;

  /** Reset a category's knob config to preset defaults. */
  resetCategory(categoryId: PresetCategoryId): void;

  /** Check if a category's knobs differ from their defaults. */
  isModified(categoryId: PresetCategoryId): boolean;

  /** Detect conflicts between active presets. */
  getConflicts(): PresetConflict[];

  /** Persist config to hot storage. */
  save(): Promise<void>;

  /** Load config from hot storage (or create default). */
  load(): Promise<void>;

  /** Subscribe to config changes. Returns unsubscribe function. */
  onChange(callback: () => void): () => void;

  /** Take a snapshot for undo. */
  snapshot(): PresetSavedConfig;

  /** Restore a previous snapshot. */
  restore(config: PresetSavedConfig): void;
}

/** Extract knob defaults from a definition. */
function extractKnobDefaults(def: PresetDefinition): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const knob of def.knobs) {
    defaults[knob.id] = knob.default;
  }
  return defaults;
}

/** Deep-clone a config for snapshot/restore. */
function cloneConfig(config: PresetSavedConfig): PresetSavedConfig {
  return JSON.parse(JSON.stringify(config)) as PresetSavedConfig;
}

export function createPresetConfigStore(registry: PresetRegistry): PresetConfigStore {
  let config: PresetSavedConfig = createDefaultPresetConfig();
  const listeners: Array<() => void> = [];
  const PROFILE_CATEGORY_IDS: readonly PresetCategoryId[] = ['controls', 'movement', 'camera', 'animation', 'entity-animation'];

  function notify(): void {
    for (const cb of listeners) {
      cb();
    }
  }

  /** Get a mutable copy of a category config, initializing if needed. */
  function ensureCategoryConfig(categoryId: PresetCategoryId): PresetCategoryConfig {
    const existing = config.categories[categoryId];
    if (existing) return existing;

    // Find first available preset for this category
    const entries = registry.getByCategory(categoryId);
    const firstId = entries[0]?.definition.id ?? categoryId;
    return createDefaultCategoryConfig(firstId);
  }

  /** Write a category config back into the config. */
  function setCategoryConfig(categoryId: PresetCategoryId, catConfig: PresetCategoryConfig): void {
    config = {
      ...config,
      categories: {
        ...config.categories,
        [categoryId]: catConfig,
      },
    };
  }

  const store: PresetConfigStore = {
    getConfig(): PresetSavedConfig {
      return config;
    },

    getCategoryConfig(categoryId: PresetCategoryId): PresetCategoryConfig {
      return config.categories[categoryId] ?? ensureCategoryConfig(categoryId);
    },

    setProfile(profile: GameProfile): PresetSavedConfig {
      console.log(`${LOG_PREFIX} setProfile start`, { from: config.profile, to: profile });
      const recommendations = getProfileRecommendations(profile);
      const newCategories: Record<string, PresetCategoryConfig> = { ...config.categories };

      for (const catId of PROFILE_CATEGORY_IDS) {
        const presetId = recommendations[catId];
        if (!presetId) continue;
        const entry = registry.getById(presetId);
        if (!entry) continue;

        const existing = newCategories[catId];
        newCategories[catId] = {
          enabled: true,
          presetId,
          config: existing?.presetId === presetId ? (existing.config ?? {}) : {},
        };
      }

      config = {
        ...config,
        profile,
        categories: newCategories,
      };

      notify();
      void store.save();
      console.log(`${LOG_PREFIX} setProfile complete`, { profile, categories: config.categories });
      return config;
    },

    enableCategory(categoryId: PresetCategoryId, presetId: string): void {
      const existing = config.categories[categoryId];
      const keepConfig = existing?.presetId === presetId;

      setCategoryConfig(categoryId, {
        enabled: true,
        presetId,
        config: keepConfig ? (existing.config ?? {}) : {},
      });

      notify();
      void store.save();
    },

    disableCategory(categoryId: PresetCategoryId): void {
      const existing = ensureCategoryConfig(categoryId);
      setCategoryConfig(categoryId, {
        ...existing,
        enabled: false,
      });

      notify();
      void store.save();
    },

    setKnobValue(categoryId: PresetCategoryId, knobId: string, value: unknown): void {
      const existing = ensureCategoryConfig(categoryId);
      setCategoryConfig(categoryId, {
        ...existing,
        config: {
          ...existing.config,
          [knobId]: value,
        },
      });

      notify();
      void store.save();
    },

    resetCategory(categoryId: PresetCategoryId): void {
      const existing = ensureCategoryConfig(categoryId);
      setCategoryConfig(categoryId, {
        ...existing,
        config: {},
      });

      notify();
      void store.save();
    },

    isModified(categoryId: PresetCategoryId): boolean {
      const catConfig = config.categories[categoryId];
      if (!catConfig) return false;

      const entry = registry.getById(catConfig.presetId);
      if (!entry) return false;

      const defaults = extractKnobDefaults(entry.definition);
      return isCategoryConfigModified(catConfig.config, defaults);
    },

    getConflicts(): PresetConflict[] {
      const conflicts: PresetConflict[] = [];
      const enabledCategories = Object.entries(config.categories)
        .filter(([, cat]) => cat.enabled) as [PresetCategoryId, PresetCategoryConfig][];

      for (let i = 0; i < enabledCategories.length; i++) {
        const [catIdA, catA] = enabledCategories[i];
        const entryA = registry.getById(catA.presetId);
        if (!entryA) continue;

        const conflictsList = entryA.definition.compatibility.conflictsWith ?? [];

        for (let j = i + 1; j < enabledCategories.length; j++) {
          const [catIdB, catB] = enabledCategories[j];
          if (conflictsList.includes(catB.presetId)) {
            conflicts.push({
              categoryA: catIdA as PresetCategoryId,
              presetA: catA.presetId,
              categoryB: catIdB as PresetCategoryId,
              presetB: catB.presetId,
              suggestion: entryA.definition.compatibility.suggestedAlternative,
            });
          }
        }
      }

      return conflicts;
    },

    async save(): Promise<void> {
      try {
        await savePresetConfig(config);
      } catch (err) {
        console.error(`${LOG_PREFIX} Failed to save config:`, err);
      }
    },

    async load(): Promise<void> {
      try {
        const saved = await loadPresetConfig();
        if (saved) {
          config = saved;
          console.log(`${LOG_PREFIX} Config loaded`);
        } else {
          config = createDefaultPresetConfig();
          console.log(`${LOG_PREFIX} No saved config, using defaults`);
        }
        notify();
      } catch (err) {
        console.error(`${LOG_PREFIX} Failed to load config:`, err);
        config = createDefaultPresetConfig();
        notify();
      }
    },

    onChange(callback: () => void): () => void {
      listeners.push(callback);
      return () => {
        const idx = listeners.indexOf(callback);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },

    snapshot(): PresetSavedConfig {
      return cloneConfig(config);
    },

    restore(prev: PresetSavedConfig): void {
      console.log(`${LOG_PREFIX} restore snapshot`, { from: config.profile, to: prev.profile });
      config = cloneConfig(prev);
      notify();
      void store.save();
    },
  };

  return store;
}
