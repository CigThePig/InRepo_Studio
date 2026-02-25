# Track 54 — Animation Tab Restore + Repo-Asset Source Picker

## Intent

Restore the animation tab to a working state after a CSS/layout regression, and fix the "New Animation" workflow to allow selecting source assets already in the repo instead of only opening the device file picker. Restore the action options that were previously available at the bottom of the animation tab.

Authority: `src/editor/panels/animationTab.ts`, `src/editor/panels/assetLibraryTab.ts` (animation assets section), `src/editor/panels/leftBerryTabs.ts` (`'animation'` tab ID).

## Scope

### In scope

1. **CSS regression fix** — the animation tab currently shows a broken layout (light blue bar with a circle indicator at the top). Identify and fix the regression in `animationTab.ts` styles. All `--irs-*` tokens, correct padding, and tab bar alignment must be restored.

2. **Restore missing bottom action options** — re-implement the action buttons that previously appeared at the bottom of the animation tab (likely: New Animation, Edit, Duplicate, Delete — confirmed from history). Restore using `uxFeedback` patterns established in Track 44.

3. **"New Animation" source picker** — when the user taps New Animation, they should be presented with:
   - **From repo asset** — a selection modal showing all assets in the registry (sources, tiles, props) as potential animation frames
   - **From device** — the existing file picker path (kept as an option)

4. **Source asset frame picker modal** — a new `createAnimationSourcePicker` component: shows all registry assets as selectable thumbnails. Tapping selects/deselects. "Use selected" creates a new animation with those frames as the frame list.

5. **"No animations yet" empty state** — confirmed by Track 46 that `uxFeedback.emptyState` was wired. Verify it still renders correctly after the CSS fix.

### Out of scope

- Full animation timeline editor redesign.
- Animation state machine integration (handled in `animStateMachine.ts`).
- Animated tile painting (Track 55).

## Acceptance criteria

- [ ] Animation tab renders with correct layout (no broken blue bar / circle indicator)
- [ ] All previously-available action buttons are present at the bottom
- [ ] "No animations yet" empty state renders correctly
- [ ] "New Animation" opens a choice: "From repo assets" or "From device"
- [ ] "From repo assets" opens a modal showing registry assets as selectable thumbnails
- [ ] Selecting frames and confirming creates a new animation with those frames
- [ ] "From device" opens the existing file picker (no regression)
- [ ] Selecting an animation in the list shows its frame count and FPS
- [ ] Touch targets ≥ 44px throughout
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `context/active-track.md` cleared after completion
- [ ] `context/history.md` updated with Track 54 entry

## Risks

- **CSS regression root cause unknown** — the exact commit that broke the layout is not identified. Audit the entire `animationTab.ts` style block against `--irs-*` token compliance. The "light blue circle" may be a `--irs-accent-primary` background leaking onto a container element. (MEDIUM)
- **Bottom actions — missing implementation** — if the previous bottom action code was removed rather than commented out, it must be re-implemented from the spec/history. Check `context/history.md` Track 44 entry for which actions were shipped. (MEDIUM)
- **Frame picker modal complexity** — the picker must handle potentially large asset libraries gracefully. Add search/filter and pagination or virtual scroll if count exceeds ~50. (LOW)
