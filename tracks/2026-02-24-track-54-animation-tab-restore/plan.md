# Track 54 — Animation Tab Restore + Repo-Asset Source Picker — Plan

## Phase 1 — CSS Fix + Layout Restore

**Goal**: Identify and fix the layout regression that causes a broken blue bar and circle indicator.

### Tasks

- [ ] Open `animationTab.ts` STYLES string and audit all background values
- [ ] Identify the element causing the blue/circle artefact
- [ ] Fix: align all backgrounds to `--irs-surface-*` tokens; separator to `--irs-border-heavy`
- [ ] Verify "No animations yet" empty state from Track 46 still renders

### Files touched
- `src/editor/panels/animationTab.ts`

### Verification
- [ ] Animation tab layout correct (matches other tab visual style)
- [ ] No stray blue bar or circle
- [ ] Empty state visible when no animations
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 2 — Restore Bottom Action Buttons

**Goal**: Re-implement New Animation and Delete action buttons.

### Tasks

- [ ] Check Track 44 history entry in `context/history.md` for which actions were previously shipped
- [ ] Re-implement action row at bottom: [New Animation] [Delete]
- [ ] Delete: disabled when no animation selected; on click fires `uxFeedback.undo('Animation deleted.', undoFn, { destructive: true })`
- [ ] All buttons use `.irs-btn` base class, `min-height: var(--irs-touch-target)`

### Files touched
- `src/editor/panels/animationTab.ts`

### Verification
- [ ] Buttons visible at bottom of animation tab
- [ ] Delete disabled state works
- [ ] Undo toast appears on delete
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 3 — Repo-Asset Source Picker

**Goal**: "New Animation" allows selecting existing repo assets as frames.

### Tasks

- [ ] Implement `createAnimationSourcePicker` modal in `animationTab.ts` or new `animationSourcePicker.ts`
  - Modal overlay: `position: fixed; inset: 0; background: var(--irs-surface-dark-alpha); z-index: 50`
  - Header: "Select frames" + close button
  - Asset grid: `AssetCapsule` cards for all `!entry.isSource` registry assets
  - Multi-select via tap; badge shows selection count
  - Footer: "Use selected (N)" (disabled when 0 selected) + "Cancel"
- [ ] On confirm: call `assetRegistry.addAnimation({ name: 'New Animation', frames: selectedIds.map(toFrameRef), fps: 8, loopMode: 'loop', pivot: {x:0.5,y:1} })`
- [ ] Modify "New Animation" button: show a small choice sheet ("From repo" / "From device") before launching either path
- [ ] If extracted: add `animationSourcePicker.ts` to `INDEX.md`

### Files touched
- `src/editor/panels/animationTab.ts`
- `src/editor/panels/animationSourcePicker.ts` (if extracted, NEW)
- `INDEX.md` (if new file)

### Verification
- [ ] Tapping "New Animation" shows repo/device choice
- [ ] Repo picker opens with asset thumbnails
- [ ] Multi-select works; count badge accurate
- [ ] Confirm with 2 assets: animation created with 2 frames, appears in list
- [ ] Device path still opens file picker
- [ ] `npm run build` succeeds

### Stop point ✋

---

## Phase 4 — Closeout

### Tasks

- [ ] Update `context/active-track.md` — clear active track
- [ ] Append Track 54 entry to `context/history.md`
- [ ] Update `INDEX.md` if new files created

### Stop point ✋
