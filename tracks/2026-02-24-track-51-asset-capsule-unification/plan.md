# Track 51 — Asset Capsule Component Unification — Plan

## Phase 1 — Build `assetCapsule.ts`

**Goal**: Create the capsule component in isolation with a test harness before migrating any tabs.

### Tasks

- [ ] Create `src/editor/panels/assetCapsule.ts`
- [ ] Implement `createAssetCapsule(opts): AssetCapsuleController`
- [ ] Inject styles once (style dedup ID pattern — see `berryControls.ts` for reference)
- [ ] Implement `setSelected()`, `setBadge()`, `destroy()`
- [ ] Thumbnail: support `thumbnailUrl` (img) and `thumbnailCanvas` (canvas) variants
- [ ] No persistent overlay icons (`⋯` is excluded by design)
- [ ] Add `assetCapsule.ts` to `INDEX.md`

### Files touched
- `src/editor/panels/assetCapsule.ts` (NEW)
- `INDEX.md`

### Verification
- [ ] Capsule renders with a thumbnail and label
- [ ] Label wraps correctly for long names (no overflow)
- [ ] `setSelected(true)` applies blue border
- [ ] `tsc --noEmit` passes

### Stop point — review capsule output before migrating tabs ✋

---

## Phase 2 — Migrate `assetLibraryTab.ts`

### Tasks

- [ ] Replace the bespoke card construction in `renderAssetCard` (or equivalent) with `createAssetCapsule`
- [ ] Remove old `.irs-asset-library__card` / related CSS
- [ ] Confirm existing selection, organise-mode drag handle, and group rendering still work

### Files touched
- `src/editor/panels/assetLibraryTab.ts`

### Verification
- [ ] Assets tab cards look consistent with capsule spec
- [ ] Labels wrap correctly (long names)
- [ ] Selection highlight works
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 3 — Migrate `tilePicker.ts` + `assetPalette.ts`

### Tasks

- [ ] `tilePicker.ts`: replace card HTML with `createAssetCapsule`; remove `.irs-asset-palette__card` / backing-square CSS
- [ ] `assetPalette.ts`: same migration
- [ ] Confirm Ground tab no longer shows backing square that differs from Assets tab

### Files touched
- `src/editor/panels/tilePicker.ts`
- `src/editor/panels/assetPalette.ts`

### Verification
- [ ] Ground tab and Assets tab have visually consistent card backgrounds
- [ ] Label wrapping fixed in Ground tab
- [ ] Label wrapping fixed in Props context
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 4 — Migrate `entitiesTab.ts` + Closeout

### Tasks

- [ ] `entitiesTab.ts`: replace entity palette card construction with `createAssetCapsule`; use `badge` slot for placement count if needed
- [ ] Remove old entity card CSS
- [ ] Update `context/active-track.md` — clear active track
- [ ] Append Track 51 entry to `context/history.md`

### Files touched
- `src/editor/panels/entitiesTab.ts`
- `context/active-track.md`
- `context/history.md`

### Verification
- [ ] All four tab contexts use `createAssetCapsule`
- [ ] `npm run build` succeeds
- [ ] Visual consistency confirmed across tabs

### Stop point ✋
