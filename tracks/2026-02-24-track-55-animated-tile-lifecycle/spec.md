# Track 55 — Animated Tile Lifecycle: Paint + Hide from Static List

## Intent

Allow animated assets (campfires, waterfalls, etc.) to be painted directly onto the world tilemap without routing through the entity system. Provide a mechanism to hide an asset from the static tile palette once it has been flagged as animated, keeping the static list clean.

Authority: `src/editor/assets/assetRegistry.ts` (`AnimationAsset`), `src/editor/panels/tilePicker.ts`, `src/editor/tools/paint.ts`, `src/editor/canvas/renderer.ts`.

Depends on: Track 49 (isSource), Track 51 (AssetCapsule), Track 54 (AnimationAsset creation from repo assets).

## Scope

### In scope

1. **`isAnimatedTile` flag on `AssetEntry`** — add `isAnimatedTile?: boolean` to `AssetEntry`. When true, the asset is rendered in the tilemap using its associated `AnimationAsset` id (`animationId?: string`).

2. **Hide from static palette** — `tilePicker.ts` and `assetPalette.ts` filter out entries where `isAnimatedTile === true`, preventing them from cluttering static tile paint mode.

3. **Animated tiles subtab** — in the Tiles subtab (Track 50), add an "Animated" filter toggle or a dedicated "Animated Tiles" sub-section that shows only animated-tile assets. This is where you paint them.

4. **Paint animated tile to tilemap** — the paint tool, when the selected asset has `isAnimatedTile === true`, writes the tile to the tilemap layer with an `animRef: animationId` field. The renderer reads this and plays the animation frame from `AnimationClock` instead of a static tile image.

5. **"Mark as animated tile" action** — in the asset settings popup (Track 52), add a "Mark as animated tile" option. This sets `isAnimatedTile: true` and prompts to associate an `AnimationAsset` id (or create one via Track 54 flow).

6. **Unmark flow** — "Remove animated flag" action in the same popup restores the asset to the static palette.

### Out of scope

- Full entity-based animated placement (entities remain a separate system).
- Animated prop sprites (props have their own placement system; this track is for tilemap-layer animation only).
- Frame editor / animation timeline.

## Acceptance criteria

- [ ] `AssetEntry` has `isAnimatedTile?: boolean` and `animationId?: string`
- [ ] Static tile picker and palette hide assets where `isAnimatedTile === true`
- [ ] Animated tiles section in the Tiles subtab shows `isAnimatedTile` assets
- [ ] Painting an animated tile writes `animRef` to the tilemap cell
- [ ] The renderer plays the associated animation in the painted cell
- [ ] "Mark as animated tile" in asset settings popup works
- [ ] Marked asset disappears from static tile list, appears in animated section
- [ ] "Remove animated flag" restores asset to static list
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `context/active-track.md` cleared after completion
- [ ] `context/history.md` updated with Track 55 entry

## Risks

- **Tilemap schema extension** — adding `animRef` to a tilemap cell requires updating the tilemap cell type in `src/types/`. This is a schema change; existing tilemaps without the field are valid (undefined = static). (MEDIUM)
- **Renderer animation clock integration** — the renderer must read the current frame from `AnimationClock` for each animated tile cell. This is per-cell work; perf impact must be benchmarked at 20×20 visible tile grids. (MEDIUM)
- **AnimationAsset id association** — when marking an asset as animated, it must be linked to an existing `AnimationAsset`. If no animation exists yet, the popup should offer a shortcut to the animation tab. (LOW)
