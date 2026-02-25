# Track 53 — Asset Grouping System + Painting Palette Integration

## Intent

Introduce a named-group system within each asset type (Tiles, Props, Entities) so related assets can be kept together and browsed as a visual grid. The right berry painting palette and the expandable bottom bar respect these groupings when presenting tiles for paint selection.

Authority: `src/editor/assets/assetGroup.ts` (`AssetGroup`, `createAssetGroup`), `src/editor/assets/assetRegistry.ts`, `src/editor/panels/assetPalette.ts`, `src/editor/panels/tilePicker.ts`, `src/editor/panels/bottomPanel.ts`.

Depends on: Track 49 (source classification), Track 50 (subtabs).

## Scope

### In scope

1. **Named groups within each asset type** — the existing `AssetGroup` structure (name, slug, assets) is already present. This track surfaces it fully in the UI:
   - Create group: "+" button in each subtab → prompts for group name
   - Rename group: long-press group header → popup with Rename / Delete options
   - Delete group: assets in the deleted group fall back to `'ungrouped'`
   - Drag assets between groups (from Track 52 organize mode — Track 53 adds the group-drop target)

2. **Visual grid layout per group** — each group's assets are displayed in a `grid-template-columns: repeat(auto-fill, minmax(64px, 1fr))` grid (not a horizontal strip), mirroring how you'd paint them. Group header is collapsible.

3. **Group metadata: `gridHint`** — add an optional `gridHint?: { cols: number }` field to `AssetGroup` to allow a group to be presented in a fixed-column grid. Default is `auto-fill`. A "Set grid width" option in the group popup sets this.

4. **Right berry painting palette respects group order** — `assetPalette.ts` renders groups in the same order as the asset library, not raw asset order. Group header is shown as a section separator in the palette.

5. **Expandable bottom bar tile switcher** — while a paint tool is active with a tile selected, pulling up the bottom bar reveals a horizontally scrollable strip of tiles from the currently selected group. Tapping a tile switches the active paint tile without exiting paint mode.

### Out of scope

- Random paint group (Track 56).
- Animated tile groups (Track 55).
- Group export/import or sync across scenes.

## Acceptance criteria

- [ ] Groups can be created, renamed, and deleted in the asset library
- [ ] Deleting a group moves its assets to the ungrouped group
- [ ] Assets display in a grid layout within each group
- [ ] Group headers are collapsible (tap to toggle)
- [ ] `gridHint.cols` option lets a group render in a fixed-column grid
- [ ] `assetPalette.ts` (right berry) renders groups in the same order as the asset library
- [ ] Group separator labels appear in the painting palette
- [ ] While painting, expanding the bottom bar shows the active group's tiles
- [ ] Tapping a tile in the bottom bar strip switches the active paint tile
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `context/active-track.md` cleared after completion
- [ ] `context/history.md` updated with Track 53 entry
- [ ] `context/schema-registry.md` updated with `gridHint` field

## Risks

- **Bottom bar integration with paint tool state** — the paint tool (`src/editor/tools/paint.ts`) manages the active tile. The bottom bar must subscribe to active tile changes and call back to change it. Coordinate via `editorEventBus` to avoid tight coupling. (MEDIUM)
- **Group ordering persistence** — `AssetGroup[]` order in `AssetRegistryState` determines palette order. The registry save/load path must preserve array order (not sort alphabetically). Confirm this is already the case. (LOW)
- **`gridHint` schema migration** — existing groups without `gridHint` default to `auto-fill`. No migration needed; field is optional. (LOW)
