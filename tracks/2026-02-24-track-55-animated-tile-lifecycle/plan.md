# Track 55 — Plan

## Phase 1 — Schema + Registry

### Tasks
- [ ] Add `isAnimatedTile?: boolean` and `animationId?: string` to `AssetEntry`
- [ ] Explicitly keep `TileLayer` as `number[][]` (no tile cell schema expansion for animation refs)
- [ ] Add `setAssetAnimated(id, animationId)` and `clearAssetAnimated(id)` to `AssetRegistry`
- [ ] Update `context/schema-registry.md`

### Files touched
- `src/editor/assets/assetRegistry.ts`
- `context/schema-registry.md`

### Verification
- [ ] `tsc --noEmit` passes
- [ ] `setAssetAnimated` correctly sets both fields

### Stop point ✋

---

## Phase 2 — Filter + Animated Tiles Section

### Tasks
- [ ] `tilePicker.ts`: filter out `isAnimatedTile === true` from static tile list
- [ ] `assetPalette.ts`: same filter
- [ ] In Tiles subtab: add "Animated" section showing `isAnimatedTile === true` assets
- [ ] Animated tile capsule: show a play-indicator badge (▶)

### Files touched
- `src/editor/panels/tilePicker.ts`
- `src/editor/panels/assetPalette.ts`
- `src/editor/panels/assetLibraryTab.ts`

### Verification
- [ ] Marked animated tiles absent from static paint palette
- [ ] Animated section visible in Tiles subtab with correct assets
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 3 — Paint + Renderer Playback

### Tasks
- [ ] `paint.ts`: when painting `isAnimatedTile` asset, keep standard numeric GID writes (same persistence path as static tiles)
- [ ] `renderer.ts`: resolve each painted GID with `resolveTileGid`, lookup matching `AssetEntry`, and when `isAnimatedTile` + `animationId` are present render `animationClock` current frame; fallback to static tile otherwise
- [ ] Confirm `animationClock.ts` supports multiple concurrent animation IDs

### Files touched
- `src/editor/tools/paint.ts`
- `src/editor/canvas/renderer.ts`

### Verification
- [ ] Paint an animated tile: persisted `TileLayer` cell remains numeric GID and animation plays in editor
- [ ] Animation loops correctly in the renderer
- [ ] Static tiles unaffected (no regression)
- [ ] `npm run build` succeeds

### Stop point ✋

---

## Phase 4 — "Mark as animated tile" Popup Action + Closeout

### Tasks
- [ ] Add "Mark as animated tile" option to asset settings popup (Track 52)
- [ ] Opens animation picker: select existing `AnimationAsset` or navigate to animation tab
- [ ] On confirm: call `registry.setAssetAnimated(id, animationId)`
- [ ] Add "Remove animated flag" option when asset is already animated: calls `registry.clearAssetAnimated(id)`
- [ ] Update `context/active-track.md`
- [ ] Append Track 55 entry to `context/history.md`

### Files touched
- `src/editor/panels/assetSettingsPopup.ts` (Track 52)
- `context/active-track.md`
- `context/history.md`

### Stop point ✋
