# Track 55 — Animated Tile Lifecycle — Blueprint

## Technical Design

### Schema changes

**`AssetEntry`** (`assetRegistry.ts`):
```ts
isAnimatedTile?: boolean;
animationId?: string;      // References an AnimationAsset.id
```

**Tilemap cell** (wherever `TileCell` or equivalent is defined in `src/types/`):
```ts
animRef?: string;   // AnimationAsset.id — present only for animated tiles
```

### Paint tool animated tile path

In `paint.ts`, when the user paints with an `isAnimatedTile` asset:
1. Look up `asset.animationId`
2. Write `animRef: animationId` to the tilemap cell (in addition to the tile index for the static poster frame)
3. The static tile index is used as a fallback if the animation hasn't loaded

### Renderer animated tile playback

In `renderer.ts`, when drawing a cell with `animRef`:
1. Look up the current frame from `animationClock.getCurrentFrame(animRef)`
2. Draw the frame from the atlas/tileCache instead of the static tile
3. If `animRef` is unknown or clock not started, draw the static tile (graceful fallback)

`AnimationClock` (`src/editor/canvas/animationClock.ts`) already exists. Confirm it supports multiple concurrent animation ids.

### "Mark as animated tile" popup action

The asset settings popup (Track 52) calls:
```ts
// Show a picker to select/create an AnimationAsset
const animationId = await pickAnimationAsset(registry);
if (animationId) {
  registry.setAssetAnimated(assetId, animationId);
}
```

`registry.setAssetAnimated(id, animationId)` sets `isAnimatedTile: true; animationId`.

### Animated tiles section in Tiles subtab

The Tiles subtab (Track 50) renders two sections when any animated tiles exist:
1. Static tiles — `isAnimatedTile !== true` (existing rendering)
2. Animated tiles — `isAnimatedTile === true` (new section, uses AssetCapsule with play indicator badge)

### Files touched

#### Modified files
- `src/editor/assets/assetRegistry.ts` — `isAnimatedTile`, `animationId` fields; `setAssetAnimated` method
- `src/types/` — `animRef` on tilemap cell type
- `src/editor/tools/paint.ts` — write `animRef` for animated tiles
- `src/editor/canvas/renderer.ts` — read `animRef`, look up current frame from clock
- `src/editor/panels/tilePicker.ts` — filter out `isAnimatedTile` from static list
- `src/editor/panels/assetPalette.ts` — same filter
- `src/editor/panels/assetLibraryTab.ts` — animated tiles section in Tiles subtab
- `context/schema-registry.md` — document new fields

---

# Track 55 — Plan

## Phase 1 — Schema + Registry

### Tasks
- [ ] Add `isAnimatedTile?: boolean` and `animationId?: string` to `AssetEntry`
- [ ] Add `animRef?: string` to tilemap cell type
- [ ] Add `setAssetAnimated(id, animationId)` and `clearAssetAnimated(id)` to `AssetRegistry`
- [ ] Update `context/schema-registry.md`

### Files touched
- `src/editor/assets/assetRegistry.ts`
- `src/types/` (tilemap cell)
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
- [ ] `paint.ts`: when painting `isAnimatedTile` asset, write `animRef: animationId` to cell
- [ ] `renderer.ts`: when drawing cell with `animRef`, get current frame from `animationClock`; fallback to static tile if unknown
- [ ] Confirm `animationClock.ts` supports multiple concurrent animation IDs

### Files touched
- `src/editor/tools/paint.ts`
- `src/editor/canvas/renderer.ts`

### Verification
- [ ] Paint an animated tile: cell shows animation playing in editor
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
