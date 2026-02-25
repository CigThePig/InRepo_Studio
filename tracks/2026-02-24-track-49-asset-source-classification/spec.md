# Track 49 — Asset Source Classification + "Can't Paint" Silence

## Intent

Introduce a first-class concept of **source assets** (full spritesheets / raw imports) versus **paintable assets** (sliced tiles, sprites, entities) in the asset registry. This eliminates the persistent "Can't paint atlas tile yet…" error that fires on every refresh because source spritesheets are treated as paintable by the tile picker and paint validation logic.

Authority: `src/editor/assets/assetRegistry.ts` (`AssetEntry`, `AssetRegistryState`), `src/editor/assets/assetGroup.ts` (`AssetGroupType`), `src/editor/init.ts` (atlas mismatch notice, `showAtlasMismatchNotice`), `src/editor/panels/assetLibraryTab.ts`.

## Scope

### In scope

1. **`isSource` flag on `AssetEntry`** — add `isSource?: boolean` to the `AssetEntry` interface. An asset is a source if it has no `sourceAssetId` (i.e. it is not a region/slice of another asset) and its image dimensions cover more than one tile in either axis. This is the "full spritesheet" concept.

2. **`AssetGroupType` extension** — add `'sources'` to the `AssetGroupType` union in `assetGroup.ts`. Add a `DEFAULT_ASSET_GROUPS` entry for sources. Add `ASSET_GROUP_PATHS.sources` pointing to the existing raw-import folder.

3. **Exclude source assets from paint/palette contexts** — the tile picker (`tilePicker.ts`) and asset palette (`assetPalette.ts`) must filter out assets where `isSource === true`. They should never appear in a paint or placement context.

4. **Silence the `showAtlasMismatchNotice` on source assets** — in `init.ts` at line ~628, before calling `showAtlasMismatchNotice`, check `selectedAsset.isSource`. If true, skip the notice entirely. The user intentionally selected a source sheet; no paint operation should be attempted.

5. **Sources section in the asset library tab** — `assetLibraryTab.ts` renders a "Sources" section (read-only, no paint, no placement affordance). Assets auto-migrate into the sources group on registry load if they match the source heuristic.

6. **`spriteAtlasRehydrate.ts` and `atlasImporter.ts` audit** — confirm that after slicing a spritesheet, the parent sheet asset has `isSource: true` set. If it does not, set it at import time.

### Out of scope

- The full subtabs UI redesign (Tiles / Props / Entities / Animations / Sources) — that is Track 50.
- Moving assets between groups via a settings popup — Track 50.
- Changing how atlas slices are stored or named.

## Acceptance criteria

- [ ] `AssetEntry` has `isSource?: boolean` field
- [ ] `AssetGroupType` includes `'sources'`; default groups include a Sources entry
- [ ] Source assets (full spritesheets) do not appear in tile picker palette
- [ ] Source assets do not appear in the right berry asset palette
- [ ] On refresh, "Can't paint atlas tile yet…" notice does not fire for source assets
- [ ] Source assets appear in a dedicated "Sources" section in the left berry asset library tab
- [ ] Slicing a spritesheet marks the parent as `isSource: true` automatically
- [ ] Existing sliced tiles are not marked as source
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `context/active-track.md` cleared after completion
- [ ] `context/history.md` updated with Track 49 entry
- [ ] `context/schema-registry.md` updated with `isSource` field

## Risks

- **Heuristic mis-classification** — a large single sprite (e.g. a boss character image) might trigger `isSource` incorrectly if it spans multiple tiles. The heuristic should also require `sourceAssetId` to be absent AND `type === 'tile'` (spritesheets are type tile, not entity). An override mechanism (`isSource` explicitly set by the user) provides an escape hatch. (MEDIUM)
- **Migration of existing registries** — existing `AssetRegistryState` objects in IndexedDB do not have `isSource`. The registry loader must apply the heuristic retroactively on load to populate the field. (MEDIUM)
- **Atlas mismatch notice guard** — `init.ts` calls `showAtlasMismatchNotice` for two different reasons (can't paint yet, and "placing as prop object"). The source check should only suppress the first case; the second case ("Placing as Prop object") is valid even for source assets. Use the `atlasMismatchReason` string to distinguish. (LOW)
