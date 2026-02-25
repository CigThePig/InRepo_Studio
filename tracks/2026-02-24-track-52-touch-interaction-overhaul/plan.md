# Track 52 — Touch Interaction Overhaul — Plan

## Phase 1 — Remove `⋯` + Long-Press Gesture

**Goal**: Remove persistent overlay icon; add long-press detection to capsules.

### Tasks

- [ ] In `assetLibraryTab.ts`: remove `moreButton.textContent = '⋯'` and any adjacent button creation (line ~1105)
- [ ] In `assetCapsule.ts` (Track 51): add `setLit(lit: boolean)` to the controller — applies a "selection-ready" highlight class distinct from selected state
- [ ] Implement `attachLongPress` utility (inline in `assetLibraryTab.ts` or extracted to `src/editor/panels/longPress.ts`)
- [ ] Wire `attachLongPress` to each capsule: `onSelectionLit` → `capsule.setLit(true)`; `onDragStart` → existing drag path; `onPopupOpen` → open settings popup (Phase 2); `onTap` → existing select/paint path
- [ ] `onPointerCancel` / `onPointerUp` → `capsule.setLit(false)`

### Files touched
- `src/editor/panels/assetLibraryTab.ts`
- `src/editor/panels/assetCapsule.ts`
- `src/editor/panels/longPress.ts` (NEW, optional extraction)

### Verification
- [ ] No `⋯` visible on any asset card
- [ ] Long-press for 400ms: capsule lights up
- [ ] Short tap: capsule selects/paints (existing behaviour)
- [ ] Long-press + immediate drag: drag begins, no highlight
- [ ] Scroll in asset list works without triggering long-press
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 2 — Settings Popup

**Goal**: Long-press release opens aligned, themed settings popup.

### Tasks

- [ ] Create `src/editor/panels/assetSettingsPopup.ts`
- [ ] Popup options: Rename, Delete, Duplicate, Move to Tiles / Props / Entities (filtered by current type)
- [ ] Position: above or below anchor based on viewport position; `position: fixed`; styled with design system tokens
- [ ] Dismiss: tap outside (`document pointerdown` listener), Escape key
- [ ] Wire into `attachLongPress.onPopupOpen`
- [ ] Rename: opens existing rename sheet / inline edit
- [ ] Delete: calls existing delete flow with `uxFeedback.undo`
- [ ] Move to: calls `assetRegistry.moveAsset(id, targetType)` (Track 50 prerequisite)
- [ ] Add `assetSettingsPopup.ts` to `INDEX.md`

### Files touched
- `src/editor/panels/assetSettingsPopup.ts` (NEW)
- `src/editor/panels/assetLibraryTab.ts`
- `INDEX.md`

### Verification
- [ ] Popup appears on long-press release, correctly positioned
- [ ] Popup dismisses on outside tap and Escape
- [ ] All popup actions execute correctly
- [ ] No layout shift or scroll when popup opens
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 3 — Multi-Select + Organize Mode Overhaul

**Goal**: Multi-select via selection mode; full-tile drag in organize mode; group drag.

### Tasks

- [ ] Add `selectedAssetIds: Set<string>` to `assetLibraryTab.ts`
- [ ] When in selection mode (≥1 selected), short tap on unselected capsule → add to selection; on selected capsule → deselect
- [ ] Show selection count badge on selected capsules (use `capsule.setBadge(count)`)
- [ ] Clear selection on subtab change, popup dismiss after action
- [ ] Organize mode: remove `dragHandle` div (line ~1046); full capsule is drag target
- [ ] Multi-asset drag: if `selectedAssetIds.size > 1`, ghost shows `×N` badge; on drop, insert all selected assets at drop position in original relative order
- [ ] Single-asset drag: no regression from existing behaviour

### Files touched
- `src/editor/panels/assetLibraryTab.ts`

### Verification
- [ ] Long-press on first asset: lights up + selected
- [ ] Tap second asset while in selection mode: both selected
- [ ] Drag selected group: all move to drop target
- [ ] Organize mode: no icon overlay; full tile draggable
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 4 — Closeout

### Tasks

- [ ] Update `context/active-track.md` — clear active track
- [ ] Append Track 52 entry to `context/history.md`
- [ ] Confirm `INDEX.md` complete

### Files touched
- `context/active-track.md`
- `context/history.md`

### Stop point ✋
