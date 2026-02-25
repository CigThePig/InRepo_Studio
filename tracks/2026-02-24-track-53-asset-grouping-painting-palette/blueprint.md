# Track 53 — Asset Grouping System + Painting Palette Integration — Blueprint

## Technical Design

### Schema change: `gridHint` on `AssetGroup`

```ts
export interface AssetGroup {
  type: AssetGroupType;
  name: string;
  slug: string;
  assets: AssetEntry[];
  gridHint?: { cols: number };   // Optional fixed-column grid override
}
```

### Group management UI

Group header:
```
[▼ Forest Tiles  (12)] [+ add] [⋯ group menu]
```
- `▼ / ▶` toggle — collapses/expands asset grid
- `+ add` — opens asset import / attach existing asset to this group
- `⋯ group menu` — Rename, Set grid width, Delete

Group header long-press could reuse `assetSettingsPopup` pattern from Track 52 if appropriate.

### Grid layout

```css
.irs-asset-group__grid {
  display: grid;
  grid-template-columns: repeat(var(--irs-group-cols, auto-fill), minmax(64px, 1fr));
  gap: 8px;
  padding: 8px 0;
}
```

`--irs-group-cols` set inline from `gridHint.cols` when present.

### Palette group integration

`assetPalette.ts` iterates `assetRegistry.getGroups(activeGroupType)` — the same ordered array as the library — and renders each group as a labelled section. This replaces the current flat asset list in the palette.

### Bottom bar tile strip

New component `createBottomBarTileStrip(container, opts)` in `src/editor/panels/bottomPanel.ts` (or a new `tileStrip.ts`):
- Renders a horizontal scroll strip of `AssetCapsule` elements (64px width each) from the active group
- Subscribes to `editorEventBus` event `'paint:active-tile-changed'`
- On tile tap: emits `editorEventBus.emit('paint:select-tile', assetId)`
- The paint tool listens for `'paint:select-tile'` and updates its active tile

The strip is shown/hidden by the bottom panel's expand gesture (already in `bottomPanel.ts`).

### Files touched

#### Modified files
- `src/editor/assets/assetGroup.ts` — add `gridHint` to `AssetGroup`
- `src/editor/panels/assetLibraryTab.ts` — group create/rename/delete UI; grid layout; `gridHint` rendering
- `src/editor/panels/assetPalette.ts` — group-ordered rendering with section separators
- `src/editor/panels/bottomPanel.ts` (or new `tileStrip.ts`) — tile switcher strip
- `src/editor/tools/paint.ts` — listen for `'paint:select-tile'` event
- `context/schema-registry.md` — document `gridHint`

---

# Track 53 — Plan

## Phase 1 — Group Create / Rename / Delete UI

### Tasks
- [ ] Add `gridHint?: { cols: number }` to `AssetGroup` in `assetGroup.ts`
- [ ] Add group header to asset library rendering: collapse toggle + "+" button + group menu button
- [ ] Group menu (long-press popup): Rename, Set grid width, Delete
- [ ] Rename: inline edit or modal prompt
- [ ] Delete: move assets to ungrouped, `uxFeedback.undo` for recovery
- [ ] Grid layout: apply `--irs-group-cols` from `gridHint.cols`
- [ ] Collapsible group body (default: expanded)
- [ ] Update `context/schema-registry.md` with `gridHint`

### Files touched
- `src/editor/assets/assetGroup.ts`
- `src/editor/panels/assetLibraryTab.ts`
- `context/schema-registry.md`

### Verification
- [ ] Create a group, rename it, add assets, collapse it — all work
- [ ] Delete a group: assets fall back to ungrouped
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 2 — Palette Group Order

### Tasks
- [ ] `assetPalette.ts`: render groups in registry order with section label separators
- [ ] Confirm paint palette re-renders when registry group order changes

### Files touched
- `src/editor/panels/assetPalette.ts`

### Verification
- [ ] Groups appear in palette in the same order as library
- [ ] Group label visible in palette between sections

### Stop point ✋

---

## Phase 3 — Bottom Bar Tile Strip

### Tasks
- [ ] Add tile strip component (inline in `bottomPanel.ts` or new `tileStrip.ts`)
- [ ] Strip renders tiles from currently active paint group
- [ ] Wire `editorEventBus` events: `'paint:active-tile-changed'` → update strip; `'paint:select-tile'` → paint tool selects tile
- [ ] Strip is shown when bottom panel is expanded during paint mode
- [ ] Strip is hidden when not in paint mode

### Files touched
- `src/editor/panels/bottomPanel.ts` (or `tileStrip.ts`)
- `src/editor/tools/paint.ts`

### Verification
- [ ] Active paint tool: expand bottom bar → tile strip visible
- [ ] Tap tile in strip: active paint tile changes
- [ ] Not in paint mode: strip not shown

### Stop point ✋

---

## Phase 4 — Closeout

### Tasks
- [ ] Update `context/active-track.md`
- [ ] Append Track 53 entry to `context/history.md`

### Stop point ✋
