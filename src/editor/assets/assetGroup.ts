/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Asset group definitions for the Editor V2 asset library.
 *
 * Defines:
 * - AssetGroupType — asset grouping buckets (type: lookup)
 * - DEFAULT_ASSET_GROUPS — baseline groups per asset type (type: list)
 * - ASSET_GROUP_PATHS — canonical repo folder roots (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (registry and library render immediately)
 */

import type { AssetEntry } from './assetRegistry';
import { slugifyGroupName } from './groupSlugify';
import { TILESETS_DIR, PROPS_DIR, ENTITIES_DIR } from '@/shared/paths';

export type AssetGroupType = 'tilesets' | 'props' | 'entities';

export interface AssetGroup {
  type: AssetGroupType;
  name: string;
  slug: string;
  assets: AssetEntry[];
}

export const ASSET_GROUP_PATHS: Record<AssetGroupType, string> = {
  tilesets: TILESETS_DIR,
  props: PROPS_DIR,
  entities: ENTITIES_DIR,
};

export const DEFAULT_ASSET_GROUPS: AssetGroup[] = [
  {
    type: 'tilesets',
    name: 'Ungrouped',
    slug: 'ungrouped',
    assets: [],
  },
  {
    type: 'props',
    name: 'Ungrouped',
    slug: 'ungrouped',
    assets: [],
  },
  {
    type: 'entities',
    name: 'Ungrouped',
    slug: 'ungrouped',
    assets: [],
  },
];

export function normalizeGroupName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : 'Ungrouped';
}

export function createGroupSlug(name: string): string {
  return slugifyGroupName(name);
}

export function createAssetGroup(type: AssetGroupType, name: string): AssetGroup {
  const normalized = normalizeGroupName(name);
  return {
    type,
    name: normalized,
    slug: createGroupSlug(normalized),
    assets: [],
  };
}
