/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Preset registry — discovers and indexes PresetDefinitions via import.meta.glob.
 *
 * Defines:
 * - PresetRegistry — indexed lookup of preset definitions + factories
 * - buildPresetRegistry() — builds registry from glob imports
 *
 * Canonical key set:
 * - Keys: preset id (e.g., "controls-topdown"), category id (e.g., "controls")
 *
 * Apply/Rebuild semantics:
 * - Apply mode: startup (built once at module load, immutable after)
 *
 * Verification:
 * - [ ] All defs/*.ts files discovered and validated
 * - [ ] Invalid definitions logged and skipped (never crash)
 */

import type { PresetDefinition, PresetCategoryId } from '../../types/preset';
import { validatePresetDefinition } from '../../types/presetValidation';
import type { PresetRegistryEntry, PresetFactory } from './presetInstance';

/**
 * Read-only preset registry. Built at startup, immutable after.
 */
export interface PresetRegistry {
  /** Look up a preset by its unique id. */
  getById(presetId: string): PresetRegistryEntry | null;

  /** Get all presets for a given category. */
  getByCategory(categoryId: PresetCategoryId): PresetRegistryEntry[];

  /** Get all registered definitions. */
  getAllDefinitions(): PresetDefinition[];

  /** Get all registered preset ids. */
  getAllIds(): string[];

  /** Get the default preset id for a category (first registered entry). */
  getDefaultForCategory(categoryId: PresetCategoryId): string | null;
}

/**
 * Expected shape of a preset def module (each file in defs/).
 * Must export `definition` and `factory`.
 */
interface PresetDefModule {
  definition: PresetDefinition;
  factory: PresetFactory;
}

function isPresetDefModule(mod: unknown): mod is PresetDefModule {
  if (!mod || typeof mod !== 'object') return false;
  const m = mod as Record<string, unknown>;
  return (
    m.definition !== null &&
    typeof m.definition === 'object' &&
    typeof m.factory === 'function'
  );
}

/**
 * Build the preset registry from eagerly imported modules.
 *
 * Usage:
 * ```ts
 * const modules = import.meta.glob('./defs/*.ts', { eager: true });
 * const registry = buildPresetRegistry(modules);
 * ```
 */
export function buildPresetRegistry(
  modules: Record<string, unknown>,
): PresetRegistry {
  const byId = new Map<string, PresetRegistryEntry>();
  const byCategory = new Map<PresetCategoryId, PresetRegistryEntry[]>();

  for (const [path, mod] of Object.entries(modules)) {
    if (!isPresetDefModule(mod)) {
      console.warn(
        `[PresetRegistry] Skipping ${path}: does not export definition + factory`,
      );
      continue;
    }

    const result = validatePresetDefinition(mod.definition);
    if (!result.valid) {
      console.warn(
        `[PresetRegistry] Invalid definition in ${path}:`,
        result.errors,
      );
      continue;
    }

    const entry: PresetRegistryEntry = {
      definition: mod.definition,
      factory: mod.factory,
    };

    if (byId.has(mod.definition.id)) {
      console.warn(
        `[PresetRegistry] Duplicate preset id "${mod.definition.id}" in ${path}, skipping`,
      );
      continue;
    }

    byId.set(mod.definition.id, entry);

    const catId = mod.definition.category;
    const catList = byCategory.get(catId) ?? [];
    catList.push(entry);
    byCategory.set(catId, catList);
  }

  return {
    getById(presetId: string): PresetRegistryEntry | null {
      return byId.get(presetId) ?? null;
    },

    getByCategory(categoryId: PresetCategoryId): PresetRegistryEntry[] {
      return byCategory.get(categoryId) ?? [];
    },

    getAllDefinitions(): PresetDefinition[] {
      return Array.from(byId.values()).map((e) => e.definition);
    },

    getAllIds(): string[] {
      return Array.from(byId.keys());
    },

    getDefaultForCategory(categoryId: PresetCategoryId): string | null {
      const entries = byCategory.get(categoryId) ?? [];
      return entries[0]?.definition.id ?? null;
    },
  };
}

/**
 * Create the global preset registry.
 * This uses import.meta.glob to discover all preset definition files.
 */
export function createPresetRegistry(): PresetRegistry {
  const modules = import.meta.glob('./defs/*.ts', { eager: true });
  return buildPresetRegistry(modules);
}
