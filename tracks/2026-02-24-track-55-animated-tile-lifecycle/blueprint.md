# Track 55 — Animated Tile Lifecycle — Blueprint

## Technical Design

### Schema changes

**`AssetEntry`** (`assetRegistry.ts`):
```ts
isAnimatedTile?: boolean;
animationId?: string;      // References an AnimationAsset.id
```

**Tilemap persistence (`TileLayer`)** (`src/types/scene.ts`):
```ts
export type TileLayer = number[][];
```

No tilemap cell schema changes in this track. Animated tile playback is derived at render time from the painted GID + asset metadata.

### Paint tool animated tile path

In `paint.ts`, when the user paints with an `isAnimatedTile` asset:
1. Resolve and write the same numeric GID path used for static tiles
2. Do not write non-numeric data into `TileLayer`
3. The painted base tile remains the fallback when animation metadata is missing/unavailable

### Renderer animated tile playback

In `renderer.ts`, for each numeric cell GID:
1. Resolve GID → `{ category, index }` via `resolveTileGid`
2. Query `AssetRegistry` for the matching tile `AssetEntry`
3. If the entry has `isAnimatedTile === true` and `animationId`, fetch `animationClock.getCurrentFrame(animationId)`
4. Draw the animation frame when available; otherwise draw the base tile for graceful fallback

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
- `src/editor/tools/paint.ts` — preserve GID-only tile writes for animated tile assets
- `src/editor/canvas/renderer.ts` — resolve GID, look up asset metadata, and play animation frame via `animationId` when available
- `src/editor/panels/tilePicker.ts` — filter out `isAnimatedTile` from static list
- `src/editor/panels/assetPalette.ts` — same filter
- `src/editor/panels/assetLibraryTab.ts` — animated tiles section in Tiles subtab
- `context/schema-registry.md` — document new fields

---

# Track 55 — Plan

## Phase 1 — Schema + Registry

### Tasks
- [ ] Add `isAnimatedTile?: boolean` and `animationId?: string` to `AssetEntry`
- [ ] Add `setAssetAnimated(id, animationId)` and `clearAssetAnimated(id)` to `AssetRegistry`
- [ ] Explicitly document in track notes: `TileLayer` remains `number[][]` (no `src/types` schema changes)
- [ ] Update `context/schema-registry.md`

### Files touched
- `src/editor/assets/assetRegistry.ts`
- `context/schema-registry.md`
- `tracks/2026-02-24-track-55-animated-tile-lifecycle/spec.md`
- `tracks/2026-02-24-track-55-animated-tile-lifecycle/blueprint.md`
- `tracks/2026-02-24-track-55-animated-tile-lifecycle/plan.md`

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
- [ ] `paint.ts`: when painting `isAnimatedTile` asset, keep standard numeric GID writes (same path as static tiles)
- [ ] `renderer.ts`: resolve painted GID via `resolveTileGid`, look up matching `AssetEntry`, and if animated fetch frame from `animationClock` by `animationId`; fallback to static tile when lookup/frame is missing
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
