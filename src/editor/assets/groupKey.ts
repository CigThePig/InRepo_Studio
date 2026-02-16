/**
 * Group key helpers for the "type:slug" format used in SpriteAtlas
 * defaultGroup / slice.group fields.
 *
 * Format: "<AssetGroupType>:<slug>" e.g. "tilesets:base", "props:decor"
 * This compact string avoids bloating project.json with nested objects.
 */

import type { AssetGroupType } from './assetGroup';

const VALID_TYPES: ReadonlySet<string> = new Set<AssetGroupType>(['tilesets', 'props', 'entities']);

/** Build a group key string from type + slug. */
export function makeGroupKey(type: AssetGroupType, slug: string): string {
  return `${type}:${slug}`;
}

/** Parse a "type:slug" key. Returns null if the format or type is invalid. */
export function parseGroupKey(key: string): { type: AssetGroupType; slug: string } | null {
  const colonIndex = key.indexOf(':');
  if (colonIndex <= 0 || colonIndex === key.length - 1) return null;
  const type = key.slice(0, colonIndex);
  const slug = key.slice(colonIndex + 1);
  if (!VALID_TYPES.has(type)) return null;
  return { type: type as AssetGroupType, slug };
}
