# Track 56 — Random Paint Group (Backlog)

## Status: BACKLOG — implement after Track 53 is complete

## Intent

Allow a set of tiles (e.g. four flower variants) to be grouped into a "random paint group." When this group is the active paint selection, each placement picks a random tile from the group automatically, eliminating the need to manually switch variants.

Authority: `src/editor/assets/assetGroup.ts` (`AssetGroup`), `src/editor/tools/paint.ts`, `src/editor/panels/assetPalette.ts`.

Depends on: Track 53 (asset grouping system complete).

## Scope

### In scope

1. **`isRandomGroup` flag on `AssetGroup`** — add `isRandomGroup?: boolean` to `AssetGroup`. When true, the group is a "random paint group."

2. **Random group creation** — the group settings popup (Track 53) includes a "Mark as random paint group" toggle.

3. **Paint tool random selection** — when the active paint asset belongs to a group where `isRandomGroup === true`, each call to `paint.placeAtCell(x, y)` picks a random `AssetEntry` from the group instead of using the explicitly selected one.

4. **Visual indicator** — random groups are shown with a "🎲" badge in the asset library and palette. When a random group tile is selected in the palette, a small indicator shows "Random: Forest Flowers (4 tiles)".

5. **Seeded randomness** — use `Math.random()` per placement. No seed persistence required.

### Out of scope

- Weighted probability (all tiles equally likely in v1).
- Multi-tile random groups (random selection among sets of multi-tile stamps).
- Runtime random tile variation (for game playback, not editor placement).

## Acceptance criteria

- [ ] `AssetGroup` has `isRandomGroup?: boolean`
- [ ] Group settings popup includes "Mark as random paint group" toggle
- [ ] Random group shown with 🎲 badge in library and palette
- [ ] Painting with a random group tile: each placement uses a random tile from the group
- [ ] Selecting the group in the palette highlights it as random (indicator label visible)
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `context/active-track.md` cleared after completion
- [ ] `context/history.md` updated with Track 56 entry

## Risks

- **Group membership changes after painting** — if the user removes a tile from a random group after placing tiles that reference it, those cells keep their already-placed tile. No retroactive change needed. (LOW)
- **Interaction with multi-select** — if the user has multi-selected tiles from different groups and paints, the random group logic should apply only to cells within the random group's tiles. Simplest approach: if any selected tile is in a random group, apply random selection for that tile's placements only. (LOW)
