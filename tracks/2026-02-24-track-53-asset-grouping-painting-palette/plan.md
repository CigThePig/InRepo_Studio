# Track 53 — Asset Grouping System + Painting Palette Integration — Plan

## Phase 1 — Group Create / Rename / Delete UI

**Goal**: Full group lifecycle management in the asset library.

### Tasks

- [ ] Add `gridHint?: { cols: number }` to `AssetGroup` in `assetGroup.ts`
- [ ] Add group header to asset library rendering: collapse toggle + "+" button + group menu button
- [ ] Group menu (long-press popup or inline): Rename, Set grid width, Delete
- [ ] Rename: inline edit or modal prompt
- [ ] Delete: move assets to ungrouped, `uxFeedback.undo` for recovery
- [ ] Grid layout: apply `--irs-group-cols` CSS variable from `gridHint.cols`
- [ ] Collapsible group body (default: expanded)
- [ ] Update `context/schema-registry.md` with `gridHint`

### Files touched
- `src/editor/assets/assetGroup.ts`
- `src/editor/panels/assetLibraryTab.ts`
- `context/schema-registry.md`

### Verification
- [ ] Create group, rename, add assets, collapse — all work
- [ ] Delete group: assets fall back to ungrouped
- [ ] `gridHint.cols = 4` renders a 4-column grid
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 2 — Palette Group Order

**Goal**: Right berry painting palette respects library group order.

### Tasks

- [ ] `assetPalette.ts`: iterate `assetRegistry.getGroups(activeGroupType)` in order
- [ ] Render each group as a labelled section with separator
- [ ] Palette re-renders when registry group order changes

### Files touched
- `src/editor/panels/assetPalette.ts`

### Verification
- [ ] Groups appear in palette in same order as library
- [ ] Group name label visible in palette as section separator

### Stop point ✋

---

## Phase 3 — Bottom Bar Tile Strip

**Goal**: While painting, the bottom bar reveals a scrollable tile strip for the active group.

### Tasks

- [ ] Build tile strip component in `bottomPanel.ts` (or extract `tileStrip.ts`)
- [ ] Strip renders `AssetCapsule` cards for tiles in the active paint group (horizontal scroll, 64px each)
- [ ] Subscribe to `editorEventBus` event `'paint:active-tile-changed'` → refresh strip
- [ ] Tile tap in strip: emit `editorEventBus.emit('paint:select-tile', assetId)` → paint tool picks up
- [ ] Strip visible only when bottom panel is expanded AND paint mode is active
- [ ] Strip hidden in non-paint modes

### Files touched
- `src/editor/panels/bottomPanel.ts` (or new `tileStrip.ts`)
- `src/editor/tools/paint.ts`

### Verification
- [ ] Active paint tool + expanded bottom bar: tile strip visible
- [ ] Tap tile in strip: active paint tile changes without exiting paint mode
- [ ] Not in paint mode: strip absent
- [ ] `npm run build` succeeds

### Stop point ✋

---

## Phase 4 — Closeout

### Tasks

- [ ] Update `context/active-track.md` — clear active track
- [ ] Append Track 53 entry to `context/history.md`
- [ ] Update `INDEX.md` if `tileStrip.ts` created

### Files touched
- `context/active-track.md`
- `context/history.md`
- `INDEX.md`

### Stop point ✋
