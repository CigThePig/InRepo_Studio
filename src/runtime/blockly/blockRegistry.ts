/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Block registry — collects generated BlockPacks and provides lookup/search.
 *
 * Defines:
 * - BlockRegistry — runtime registry of all Blockly blocks (schema-generated + built-in)
 * - createBlockRegistry() — factory
 *
 * Canonical key set:
 * - Keys: block type strings (e.g., "inrepo_when_movement.landed")
 *
 * Apply/Rebuild semantics:
 * - Apply mode: rebuilt when preset configuration changes (enable/disable presets)
 *
 * Verification:
 * - [ ] All block packs registered without duplicates
 * - [ ] Search returns results across keywords + labels
 * - [ ] Logic Target filtering excludes map-only blocks for game targets
 * - [ ] Dependency lookup works for all registered blocks
 */

import type { BlockPack, BlockPackEntry, BlockDependency } from './schemaToBlocks';

/** Read-only block registry for Blockly workspace and palette. */
export interface BlockRegistry {
  /** Register a block pack (from schema-driven generation). */
  registerPack(pack: BlockPack): void;

  /** Remove all blocks for a given preset ID. */
  removePack(presetId: string): void;

  /** Get all registered block entries. */
  getAllEntries(): BlockPackEntry[];

  /** Get entries by category (e.g., "movement"). */
  getByCategory(categoryId: string): BlockPackEntry[];

  /** Look up dependency for a block type. */
  getDependency(blockType: string): BlockDependency | null;

  /** Get a block entry by its type ID. */
  getByType(blockType: string): BlockPackEntry | null;

  /**
   * Search blocks by query string.
   * Matches against keywords and labels (case-insensitive).
   * Filters by Logic Target if provided.
   */
  search(query: string, logicTarget?: 'game' | 'map'): BlockPackEntry[];

  /** Get all registered block type IDs. */
  getAllTypes(): string[];

  /** Clear all registered blocks. */
  clear(): void;
}

/**
 * Create a new block registry.
 *
 * v1 uses runtime generation (Option A per Part 14.10):
 * Read preset registry → generateBlockPack() → registerPack() for each preset.
 */
export function createBlockRegistry(): BlockRegistry {
  const byType = new Map<string, BlockPackEntry>();
  const byCategory = new Map<string, BlockPackEntry[]>();
  const byPreset = new Map<string, string[]>(); // presetId → block types

  function registerPack(pack: BlockPack): void {
    const types: string[] = [];

    for (const entry of pack.entries) {
      const blockType = entry.definition.type;

      if (byType.has(blockType)) {
        console.warn(
          `[BlockRegistry] Duplicate block type "${blockType}", skipping`,
        );
        continue;
      }

      byType.set(blockType, entry);
      types.push(blockType);

      // Index by category
      const catList = byCategory.get(pack.categoryId) ?? [];
      catList.push(entry);
      byCategory.set(pack.categoryId, catList);
    }

    byPreset.set(pack.presetId, types);
  }

  function removePack(presetId: string): void {
    const types = byPreset.get(presetId);
    if (!types) return;

    for (const blockType of types) {
      const entry = byType.get(blockType);
      if (entry) {
        // Remove from category index
        const catId = entry.dependency.requiresCategoryEnabled;
        const catList = byCategory.get(catId);
        if (catList) {
          const idx = catList.indexOf(entry);
          if (idx >= 0) catList.splice(idx, 1);
          if (catList.length === 0) byCategory.delete(catId);
        }
      }
      byType.delete(blockType);
    }

    byPreset.delete(presetId);
  }

  function getAllEntries(): BlockPackEntry[] {
    return Array.from(byType.values());
  }

  function getByCategory(categoryId: string): BlockPackEntry[] {
    return byCategory.get(categoryId) ?? [];
  }

  function getDependency(blockType: string): BlockDependency | null {
    return byType.get(blockType)?.dependency ?? null;
  }

  function getByType(blockType: string): BlockPackEntry | null {
    return byType.get(blockType) ?? null;
  }

  function search(
    query: string,
    logicTarget?: 'game' | 'map',
  ): BlockPackEntry[] {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const results: BlockPackEntry[] = [];

    for (const entry of byType.values()) {
      // Filter by Logic Target
      if (logicTarget && entry.logicTargetFilter) {
        if (entry.logicTargetFilter !== logicTarget) continue;
      }

      // Match against label (from message0) and keywords
      const label = entry.definition.message0.toLowerCase();
      const keywordMatch = entry.keywords.some((kw) =>
        kw.toLowerCase().includes(lowerQuery),
      );
      const labelMatch = label.includes(lowerQuery);

      if (keywordMatch || labelMatch) {
        results.push(entry);
      }
    }

    return results;
  }

  function getAllTypes(): string[] {
    return Array.from(byType.keys());
  }

  function clear(): void {
    byType.clear();
    byCategory.clear();
    byPreset.clear();
  }

  return {
    registerPack,
    removePack,
    getAllEntries,
    getByCategory,
    getDependency,
    getByType,
    search,
    getAllTypes,
    clear,
  };
}
