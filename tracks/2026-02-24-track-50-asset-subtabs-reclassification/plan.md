# Track 50 — Asset Library Subtabs + Cross-Tab Reclassification — Plan

## Phase 1 — Subtab Strip + Content Switching

**Goal**: Render the subtab bar and wire content switching. No reclassification yet.

### Tasks

- [ ] Define `AssetSubtabId` type and `ASSET_SUBTABS` constant in `assetLibraryTab.ts`
- [ ] Add module-level `activeSubtab` state variable (default: `'tiles'`)
- [ ] Render subtab strip at top of asset library content area
- [ ] Wire tab button clicks to update `activeSubtab` and re-render content
- [ ] Tiles subtab: render `tilesets` groups (existing group rendering, filtered)
- [ ] Props subtab: render `props` groups
- [ ] Entities subtab: render `entities` groups
- [ ] Animations subtab: render animation assets from `assetRegistry.getAnimations()`
- [ ] Sources subtab: render `isSource === true` assets (from Track 49)
- [ ] Apply `.irs-asset-subtabs__tab--active` to the active tab
- [ ] Touch targets ≥ `var(--irs-touch-target)` on all tab buttons

### Files touched
- `src/editor/panels/assetLibraryTab.ts`

### Verification
- [ ] All five subtabs render and switch correctly
- [ ] Each subtab shows only its own asset type
- [ ] Active tab is visually distinct
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 2 — `assetRegistry.moveAsset`

**Goal**: Implement the cross-tab reclassification method.

### Tasks

- [ ] Add `moveAsset(assetId: string, targetType: AssetGroupType): void` to `AssetRegistry`
- [ ] Implementation: remove from current group → add to ungrouped group of target type → update `AssetEntry.type`
- [ ] Fire registry change listeners on completion
- [ ] Handle edge case: asset not found (log warning, no-op)
- [ ] Handle edge case: target type has no ungrouped group (create one)

### Files touched
- `src/editor/assets/assetRegistry.ts`

### Verification
- [ ] `moveAsset` on a tile asset: asset moves to props group, disappears from tiles subtab
- [ ] `moveAsset` to same type: no-op or harmless
- [ ] `tsc --noEmit` passes

### Stop point — review before wiring to popup ✋

---

## Phase 3 — "Move to…" Popup Integration

**Goal**: Expose "Move to…" actions in the asset settings popup (which Track 52 builds). This phase adds the data layer; the popup UI is Track 52's responsibility.

### Tasks

- [ ] Export a `getMoveTargets(assetId: string): AssetGroupType[]` helper from `assetLibraryTab.ts` or `assetRegistry.ts` — returns the group types the asset can move to (excludes current type and `'sources'` unless explicitly applicable)
- [ ] Confirm `assetLibraryTab.ts` refresh hook is in place so the UI re-renders after `moveAsset`

### Files touched
- `src/editor/assets/assetRegistry.ts` (or `assetLibraryTab.ts`)

### Verification
- [ ] `getMoveTargets` returns correct options for a tile, prop, and entity asset
- [ ] After `moveAsset`, asset library re-renders showing the asset in its new subtab

### Stop point ✋

---

## Phase 4 — Closeout

### Tasks

- [ ] Update `context/active-track.md` — clear active track
- [ ] Append Track 50 entry to `context/history.md`
- [ ] Update `context/schema-registry.md` if registry method signature is significant

### Files touched
- `context/active-track.md`
- `context/history.md`
- `context/schema-registry.md`

### Stop point ✋
