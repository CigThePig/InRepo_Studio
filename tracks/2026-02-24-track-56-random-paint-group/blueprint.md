# Track 56 — Random Paint Group — Blueprint

## Technical Design

### Schema change

**`AssetGroup`** (`assetGroup.ts`):
```ts
isRandomGroup?: boolean;
```

### Paint tool integration

In `paint.ts`, the tile placement function currently uses the explicitly selected asset. With random groups:

```ts
function resolveActiveTile(selectedAssetId: string, registry: AssetRegistry): AssetEntry {
  const asset = registry.getAssetById(selectedAssetId);
  if (!asset) return fallback;

  const group = registry.getGroupForAsset(selectedAssetId);
  if (group?.isRandomGroup && group.assets.length > 0) {
    const idx = Math.floor(Math.random() * group.assets.length);
    return group.assets[idx];
  }
  return asset;
}
```

`resolveActiveTile` is called on each `placeAtCell` invocation (i.e., per brush stroke tile, not once per drag).

### Palette indicator

When the palette renders a tile from a random group, the group section header shows `🎲` before the group name. When a tile from a random group is selected, the tile picker status strip shows:
```
Random: [Group Name] (N tiles)
```

---

# Track 56 — Plan

## Phase 1 — Schema + Group Toggle

### Tasks
- [ ] Add `isRandomGroup?: boolean` to `AssetGroup` in `assetGroup.ts`
- [ ] Group settings popup (Track 53): add "Random paint group" toggle
- [ ] `isRandomGroup` badge (🎲) in group header in asset library
- [ ] `isRandomGroup` badge in palette group section header
- [ ] Update `context/schema-registry.md` with `isRandomGroup`

### Files touched
- `src/editor/assets/assetGroup.ts`
- `src/editor/panels/assetLibraryTab.ts`
- `src/editor/panels/assetPalette.ts`
- `context/schema-registry.md`

### Verification
- [ ] Toggle works; group persists `isRandomGroup: true`
- [ ] 🎲 badge visible in library and palette
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 2 — Paint Tool Random Selection

### Tasks
- [ ] Add `resolveActiveTile(assetId, registry)` helper in `paint.ts`
- [ ] Call `resolveActiveTile` on each `placeAtCell` to get the actual tile to paint
- [ ] For non-random groups: returns the selected asset unchanged
- [ ] For random groups: returns a random member each call
- [ ] Palette indicator: when a random-group tile is selected, status strip shows "Random: [Group] (N)"

### Files touched
- `src/editor/tools/paint.ts`
- `src/editor/panels/assetPalette.ts` (or tile picker status strip)

### Verification
- [ ] Paint with a random group tile: each brush tap places a different tile from the group
- [ ] Paint with a non-random tile: no change in behaviour
- [ ] Status strip shows "Random: [Group Name]" when applicable
- [ ] `npm run build` succeeds

### Stop point ✋

---

## Phase 3 — Closeout

### Tasks
- [ ] Update `context/active-track.md`
- [ ] Append Track 56 entry to `context/history.md`

### Stop point ✋
