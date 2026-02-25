# Track 49 — Asset Source Classification + "Can't Paint" Silence — Blueprint

## Technical Design

### Schema changes

**`AssetEntry` (`assetRegistry.ts`)**:
```ts
export interface AssetEntry {
  // ... existing fields ...
  isSource?: boolean;   // True for full spritesheets / raw imports that aren't paintable
}
```

**`AssetGroupType` (`assetGroup.ts`)**:
```ts
export type AssetGroupType = 'tilesets' | 'props' | 'entities' | 'sources';
```

**`DEFAULT_ASSET_GROUPS`** — append:
```ts
{ type: 'sources', name: 'Ungrouped', slug: 'ungrouped', assets: [] }
```

**`ASSET_GROUP_PATHS`** — `sources` should map to the same directory as the raw import landing zone (likely `TILESETS_DIR` for now; can be refined later).

### Source heuristic

An asset is auto-classified as a source if ALL of the following are true at registry load or import time:
1. `entry.sourceAssetId == null` — it is not a slice of another asset
2. The asset image's natural pixel dimensions span more than one tile in either axis (i.e. `width > tileSize || height > tileSize`)
3. `entry.type === 'tile'` — spritesheets are tile-type imports

Stored as `isSource: true`. Can be explicitly overridden by the user later (Track 50 reclassification popup).

### Paint guard in `init.ts`

Current code (line ~627–634):
```ts
const atlasMismatchReason = getAtlasTileSizeMismatchReason(selection);
if (atlasMismatchReason) {
  if (condition) {
    showAtlasMismatchNotice(`Can't paint atlas tile yet: ${atlasMismatchReason}`);
  } else {
    showAtlasMismatchNotice(`Placing as Prop object: ${atlasMismatchReason}`);
  }
}
```

Fix — add early return for source assets:
```ts
const selectedAsset = getSelectedAssetEntry(selection); // resolve from registry
if (selectedAsset?.isSource) return; // source sheets are never paintable, no notice

const atlasMismatchReason = getAtlasTileSizeMismatchReason(selection);
// ... rest unchanged
```

### Tile picker + asset palette filter

In `tilePicker.ts` and `assetPalette.ts`, wherever asset entries are iterated for display, add:
```ts
.filter(entry => !entry.isSource)
```

This is a read-time filter — the source assets remain in the registry, they are just excluded from paint contexts.

### `atlasImporter.ts` + `spriteAtlasRehydrate.ts`

After creating the parent (source) entry and the slice entries, set `isSource: true` on the parent:
```ts
const parentEntry: AssetEntry = {
  id: sourceId,
  name: ...,
  type: 'tile',
  isSource: true,     // ← add this
  // ...
};
```

### Migration on registry load

In the registry load path (`assetRegistry.ts`), after deserialising stored entries, run a retroactive classification pass:
```ts
function applySourceHeuristic(entry: AssetEntry, tileSize: number): AssetEntry {
  if (entry.isSource != null) return entry; // already classified, skip
  const isSourceCandidate =
    entry.sourceAssetId == null &&
    entry.type === 'tile' &&
    (entry.naturalWidth ?? 0) > tileSize || (entry.naturalHeight ?? 0) > tileSize;
  return isSourceCandidate ? { ...entry, isSource: true } : entry;
}
```

Note: `naturalWidth/naturalHeight` may need to be looked up from `tileCache` or stored on the entry. If not available at migration time, fall back to `!entry.sourceAssetId && entry.type === 'tile'` as a conservative approximation.

### Files touched

#### Modified files
- `src/editor/assets/assetRegistry.ts` — add `isSource` field, migration pass
- `src/editor/assets/assetGroup.ts` — add `'sources'` type, default group, path
- `src/editor/assets/atlasImporter.ts` — set `isSource: true` on parent entry
- `src/editor/assets/spriteAtlasRehydrate.ts` — same
- `src/editor/panels/tilePicker.ts` — filter out source assets
- `src/editor/panels/assetPalette.ts` — filter out source assets
- `src/editor/panels/assetLibraryTab.ts` — render Sources section
- `src/editor/init.ts` — guard `showAtlasMismatchNotice` for source assets
- `context/schema-registry.md` — document `isSource`
