# Track 50 — Asset Library Subtabs + Cross-Tab Reclassification — Blueprint

## Technical Design

### Subtab architecture

The subtab strip is a new internal component rendered at the top of the `assetLibraryTab` content area. It replaces the current single-type rendering with a tab-switched view.

```ts
type AssetSubtabId = 'tiles' | 'props' | 'entities' | 'animations' | 'sources';

interface AssetSubtab {
  id: AssetSubtabId;
  label: string;
  groupType?: AssetGroupType;   // Absent for 'animations' and 'sources'
}

const ASSET_SUBTABS: AssetSubtab[] = [
  { id: 'tiles',       label: 'Tiles',      groupType: 'tilesets'  },
  { id: 'props',       label: 'Props',      groupType: 'props'     },
  { id: 'entities',    label: 'Entities',   groupType: 'entities'  },
  { id: 'animations',  label: 'Animations'                         },
  { id: 'sources',     label: 'Sources',    groupType: 'sources'   },
];
```

Active subtab stored as a module-level `let activeSubtab: AssetSubtabId = 'tiles'`.

### `assetRegistry.moveAsset`

```ts
moveAsset(assetId: string, targetType: AssetGroupType): void {
  // 1. Find the asset's current group and remove it
  // 2. Find or create the 'ungrouped' group of targetType
  // 3. Add the asset to that group with its type updated
  // 4. Fire registry change listeners to refresh UI
}
```

The asset's `AssetEntryType` is also updated to match the new group type:
```ts
const typeMap: Record<AssetGroupType, AssetEntryType> = {
  tilesets: 'tile',
  props: 'sprite',
  entities: 'entity',
  sources: 'tile',  // sources keep their type; isSource flag is the distinguisher
};
```

### "Move to…" popup entries

The settings popup (from Track 52) receives the asset ID and its current type. It renders:
```
Move to Tiles       (hidden if already in tilesets)
Move to Props       (hidden if already in props)
Move to Entities    (hidden if already in entities)
```

Each button calls `assetRegistry.moveAsset(id, targetType)` then closes the popup.

### CSS — subtab strip

```css
.irs-asset-subtabs {
  display: flex;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  gap: 4px;
  padding: 4px 0 8px;
  border-bottom: 1px solid var(--irs-border-heavy);
  margin-bottom: 12px;
}
.irs-asset-subtabs__tab {
  flex-shrink: 0;
  min-height: var(--irs-touch-target);
  padding: 0 14px;
  border-radius: var(--irs-radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--irs-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.irs-asset-subtabs__tab--active {
  background: var(--irs-color-blue-alpha-22);
  border-color: var(--irs-accent-primary);
  color: var(--irs-text-primary);
  font-weight: 700;
}
```

### Files touched

- `src/editor/panels/assetLibraryTab.ts` — subtab strip, content switching, render per subtab
- `src/editor/assets/assetRegistry.ts` — `moveAsset` method
- `src/editor/assets/assetGroup.ts` — confirm `'sources'` is present (Track 49 prerequisite)
