# Track 54 — Animation Tab Restore + Repo-Asset Source Picker — Blueprint

## Technical Design

### CSS regression fix approach

Audit `animationTab.ts` inline STYLES string top-to-bottom. The broken "light blue bar with circle" is likely:
- A container with `background: var(--irs-accent-primary)` that should have `transparent` or `var(--irs-surface-panel)`
- Or a tab indicator element that is mis-positioned (e.g. `position: absolute` element escaping its parent)

Fix: align all backgrounds to `--irs-surface-*` tokens; confirm tab bar element uses `--irs-border-heavy` for the bottom separator, not a background fill.

### "New Animation" flow redesign

Current flow:
```
Tap "New Animation" → device file picker
```

New flow:
```
Tap "New Animation" →
  Show inline choice sheet:
    [From repo assets]  [From device]

  → From repo assets:
      createAnimationSourcePicker modal
        shows all AssetEntry items as AssetCapsule grid
        multi-select (same pattern as Track 52 selection mode)
        "Use selected (N)" confirm button
        on confirm: create AnimationAsset with selected entries as AnimationFrameRef[]

  → From device:
      existing HTMLInputElement[type=file] path (unchanged)
```

### `createAnimationSourcePicker`

New function in `animationTab.ts` (or extracted to `animationSourcePicker.ts`):

```ts
interface AnimationSourcePickerOptions {
  registry: AssetRegistry;
  onConfirm: (selectedIds: string[]) => void;
  onCancel: () => void;
}

function createAnimationSourcePicker(opts: AnimationSourcePickerOptions): { destroy(): void }
```

Renders as a modal overlay (`position: fixed; inset: 0`) with:
- Header: "Select frames" + close button
- Asset grid: `AssetCapsule` for each registry asset (filtered: `isSource === false`)
- Multi-select via tap (same `selectedAssetIds` Set pattern from Track 52)
- Footer: "Use selected (N)" button + "Cancel"

### Bottom actions restore

From Track 44 history entry — the bottom of the animation tab had: New Animation, (Edit), (Duplicate), Delete (when an animation is selected). Re-implement as an `.irs-btn`-based action row:

```
[New Animation]   [Delete]   (when none selected: Delete is disabled)
```

These already fire `uxFeedback` toasts — restore the `uxFeedback.combos.created` / `uxFeedback.undo` wiring from Track 44.

### Files touched

#### New files (optional)
- `src/editor/panels/animationSourcePicker.ts` (if extracted)

#### Modified files
- `src/editor/panels/animationTab.ts` — CSS fix, bottom actions restore, "New Animation" flow
- `INDEX.md` — if new file created

---

# Track 54 — Plan

## Phase 1 — CSS Fix + Layout Restore

### Tasks
- [ ] Audit `animationTab.ts` STYLES string: identify element causing "light blue bar with circle"
- [ ] Fix: align background tokens, confirm tab bar separator uses border not fill
- [ ] Verify "No animations yet" empty state renders correctly

### Files touched
- `src/editor/panels/animationTab.ts`

### Verification
- [ ] Animation tab layout matches other left berry tabs in appearance
- [ ] No stray blue bar or circle indicator
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 2 — Restore Bottom Action Buttons

### Tasks
- [ ] Re-implement New Animation, Delete buttons at bottom of animation tab
- [ ] Delete: enabled only when an animation is selected; fires `uxFeedback.undo` on delete
- [ ] New Animation: currently triggers file picker (Phase 3 changes this flow)
- [ ] All buttons use `.irs-btn` base class, min-height `var(--irs-touch-target)`

### Files touched
- `src/editor/panels/animationTab.ts`

### Verification
- [ ] New Animation and Delete buttons visible at bottom
- [ ] Delete disabled when no animation selected
- [ ] Delete with undo toast fires correctly
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 3 — "From Repo Assets" Source Picker

### Tasks
- [ ] Implement `createAnimationSourcePicker` (inline or extracted)
- [ ] Render all registry assets (filtered: `isSource === false`) as `AssetCapsule` grid
- [ ] Multi-select via tap
- [ ] "Use selected (N)" creates `AnimationAsset` with selected entries as frames
- [ ] "Cancel" dismisses without action
- [ ] Modify "New Animation" button flow: show choice sheet first (repo / device)

### Files touched
- `src/editor/panels/animationTab.ts`
- `src/editor/panels/animationSourcePicker.ts` (if extracted)

### Verification
- [ ] "New Animation" shows repo / device choice
- [ ] Repo picker opens with asset grid
- [ ] Multi-selecting 3 assets and confirming creates a 3-frame animation
- [ ] Device picker path unchanged
- [ ] `npm run build` succeeds

### Stop point ✋

---

## Phase 4 — Closeout

### Tasks
- [ ] Update `context/active-track.md`
- [ ] Append Track 54 entry to `context/history.md`

### Stop point ✋
