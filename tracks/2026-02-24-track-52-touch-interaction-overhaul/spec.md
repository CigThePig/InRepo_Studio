# Track 52 — Touch Interaction Overhaul: Long-Press, Multi-Select, Organize Mode

## Intent

Replace the persistent three-dot `⋯` overlay and Organize mode's per-tile icon with a gesture-driven touch interaction system. The new system uses long-press to enter selection mode, on-release to open a settings popup, and long-press + drag to move assets. Organise mode becomes full-tile drag (no icon). Multi-select and group drag are supported.

Authority: `src/editor/panels/assetLibraryTab.ts` (existing `organizeMode`, `dragState`, `openAssetSheet`, `moreButton` at line ~1105), `src/editor/panels/assetCapsule.ts` (Track 51 — must be complete first).

Depends on: Track 51 (asset capsule), Track 50 (asset subtabs, for "Move to…" popup options).

## Scope

### In scope

1. **Remove persistent `⋯` button** from every asset capsule. The `moreButton` (line ~1105 in `assetLibraryTab.ts`) is removed entirely.

2. **Long-press gesture** (400ms threshold):
   - Hold starts → capsule "lights up" (selection-ready highlight, no action yet)
   - Release after hold (no drag) → settings popup appears
   - Drag after hold (> 8px movement) → drag begins; popup does not appear

3. **Settings popup** (`createAssetSettingsPopup`):
   - Positioned adjacent to the tapped asset (above or below depending on viewport position)
   - Styled with `--irs-surface-modal`, `--irs-border-heavy`, `--irs-radius-xl`
   - Options: Rename, Delete, Move to Tiles / Props / Entities (context-dependent), Duplicate
   - Dismisses on tap outside, Escape key, or after selecting an action

4. **Multi-select** — while selection mode is active (first asset selected), tapping additional assets adds them to the selection set. A selection count badge appears on each selected capsule.

5. **Organize mode overhaul**:
   - Remove the per-tile icon overlay from organize mode (existing `dragHandle` div at line ~1046 in `assetLibraryTab.ts`)
   - Full tile is the drag target (entire capsule surface, not a small handle)
   - If multiple assets are selected, dragging one drags all selected assets as a group (maintaining relative order on drop)
   - Organize mode is still entered via the existing Organize button

6. **Long-press + drag** (single or multi):
   - Drag ghost: semi-transparent clone of the dragged capsule(s)
   - Drop indicator: insertion line between targets
   - On drop: asset(s) reorder within the current group

### Out of scope

- "Move to…" cross-tab action itself (assetRegistry.moveAsset — Track 50 provides this; Track 52 just calls it from the popup).
- Tablet-specific swipe-to-dismiss gestures.
- Long-press in contexts outside the asset library (tile picker, entities palette).

## Acceptance criteria

- [ ] No persistent `⋯` icon on any asset capsule in any tab
- [ ] Long-press (400ms) on an asset: capsule highlights; popup appears on release
- [ ] Long-press + drag on an asset: drag begins, no popup; ghost follows finger
- [ ] Popup options: Rename, Delete, Move to [applicable types], Duplicate
- [ ] Popup is aligned adjacent to the asset and styled with design system tokens
- [ ] Tap outside popup dismisses it without side effects
- [ ] Multi-select: tap a selected asset to add to selection; badge shows count
- [ ] Drag selected group: all selected assets move together, order preserved on drop
- [ ] Organize mode: no per-tile icon; full tile is draggable
- [ ] Single-tile drag in organize mode still works (no regression)
- [ ] Touch targets ≥ 44px throughout
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `context/active-track.md` cleared after completion
- [ ] `context/history.md` updated with Track 52 entry

## Risks

- **Long-press vs scroll conflict** — in a scrollable list, a 400ms hold would block scroll. Must check for any significant vertical movement during the hold period and cancel the long-press if scroll is detected (use `touchmove` / `pointermove` with a distance threshold of ~8px). (HIGH)
- **Multi-select + drag complexity** — dragging a group of assets as a visual cluster is complex. For v1, constrain to: the dragged asset appears as a ghost; a count badge on the ghost indicates "N assets". The destination group receives all assets in order. True cluster drag (all ghosts visible) is post-v1. (MEDIUM)
- **Popup positioning on small screens** — the popup must fit within viewport. Calculate whether to position above or below based on `getBoundingClientRect()` and `window.innerHeight`. (LOW)
