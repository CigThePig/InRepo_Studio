/**
 * Core block loader — discovers and registers all built-in block definitions.
 *
 * Uses import.meta.glob to auto-discover block files in ./blocks/*.ts.
 * Each file exports a `coreBlockPack: BlockPack` that gets registered
 * into the BlockRegistry.
 *
 * Core blocks are always available (no preset dependency required).
 * They should be registered before schema-driven preset blocks.
 */

import type { BlockRegistry } from './blockRegistry';
import type { BlockPack } from './schemaToBlocks';
import { generateBlockPack } from './schemaToBlocks';
import { createPresetRegistry } from '../presets/presetRegistry';

export interface RegisterCoreBlocksOptions {
  includePresets?: boolean;
}

/** Type guard for modules that export a coreBlockPack. */
function isCoreBlockModule(
  mod: unknown,
): mod is { coreBlockPack: BlockPack } {
  return (
    mod !== null &&
    typeof mod === 'object' &&
    'coreBlockPack' in mod &&
    (mod as Record<string, unknown>).coreBlockPack !== null &&
    typeof (mod as Record<string, unknown>).coreBlockPack === 'object'
  );
}

/**
 * All core block modules discovered via import.meta.glob.
 * Each module exports { coreBlockPack: BlockPack }.
 * Typed as Record<string, unknown> to match the pattern used by presetRegistry.ts.
 */
const coreBlockModules: Record<string, unknown> = import.meta.glob(
  './blocks/*.ts',
  { eager: true },
) as Record<string, unknown>;

/**
 * Register all core block packs into the given registry.
 *
 * Call this once at startup, before registering schema-driven preset blocks.
 * Safe to call multiple times (but will warn about duplicate block types).
 */
export function registerCoreBlocks(
  registry: BlockRegistry,
  options: RegisterCoreBlocksOptions = {},
): void {
  for (const [path, mod] of Object.entries(coreBlockModules)) {
    if (!isCoreBlockModule(mod)) {
      console.warn(
        `[coreBlocks] Module ${path} does not export coreBlockPack, skipping`,
      );
      continue;
    }
    registry.registerPack(mod.coreBlockPack);
  }

  if (options.includePresets) {
    registerPresetBlocks(registry);
  }
}

/** Register schema-generated preset blocks into the given registry. */
export function registerPresetBlocks(registry: BlockRegistry): void {
  const presetRegistry = createPresetRegistry();
  for (const presetDef of presetRegistry.getAllDefinitions()) {
    registry.registerPack(generateBlockPack(presetDef));
  }
}

/**
 * Get all discovered core block packs (without registering them).
 * Useful for inspection/testing.
 */
export function getCoreBlockPacks(): BlockPack[] {
  const packs: BlockPack[] = [];
  for (const mod of Object.values(coreBlockModules)) {
    if (isCoreBlockModule(mod)) {
      packs.push(mod.coreBlockPack);
    }
  }
  return packs;
}
