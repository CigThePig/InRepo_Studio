# Track 51 — Asset Capsule Component Unification

## Intent

Replace the divergent per-tab asset tile renderers with a single reusable **asset capsule** component. The Assets tab, Ground tab (tile picker), Props tab, and Entities tab currently each implement their own asset card with different padding, background rules, label overflow behaviour, and overlay interactions. This track consolidates them into one component.

Authority: `src/editor/panels/assetLibraryTab.ts`, `src/editor/panels/tilePicker.ts`, `src/editor/panels/assetPalette.ts`, `src/editor/panels/entitiesTab.ts`.

## Scope

### In scope

1. **New `assetCapsule.ts` component** — a factory function `createAssetCapsule(opts): HTMLElement` that renders a standardised asset tile with:
   - Consistent padding: `6px` inner, `8px` gap
   - Consistent background: `var(--irs-surface-modal)` (no tab-specific overrides)
   - Label wrapping: `word-break: break-word; white-space: normal; overflow: hidden` — labels wrap, never overflow off screen
   - Selection overlay: `2px solid var(--irs-accent-primary)` border when `selected`
   - Thumbnail: fixed `48×48px` display area, `object-fit: contain`
   - Optional badge slot (for selection count, category tag, etc.)
   - No persistent overlay icons (⋯ removed — pending Track 52 for long-press system)

2. **Migration of all four tab renderers** — `assetLibraryTab.ts`, `tilePicker.ts`, `assetPalette.ts`, and `entitiesTab.ts` each replace their bespoke card element construction with `createAssetCapsule`. Custom styles on the old cards are removed.

3. **Ground tab label fix** — the overflow/wrapping bug in the Ground (tile picker) tab is fixed as a direct consequence of using the unified capsule.

4. **Props tab label fix** — same fix via unification.

5. **Background consistency** — the backing square that appears in Ground tab but not Assets tab is eliminated by normalising both to the same surface token.

### Out of scope

- Long-press interaction logic (Track 52).
- Organize mode drag handles (Track 52).
- Three-dot `⋯` overlay removal is a prerequisite of Track 52, but the capsule is designed without it from the start — `createAssetCapsule` does not add any persistent overlay.

## Acceptance criteria

- [ ] `src/editor/panels/assetCapsule.ts` exists and exports `createAssetCapsule`
- [ ] Asset cards in all four tab contexts use `createAssetCapsule` — no bespoke card HTML
- [ ] Consistent background across tabs (no tab-specific backing square difference)
- [ ] Labels wrap correctly in all tabs — no overflow off-screen
- [ ] Selection state renders identically across tabs
- [ ] Touch targets ≥ 44px on all cards
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `INDEX.md` updated with `assetCapsule.ts`
- [ ] `context/active-track.md` cleared after completion
- [ ] `context/history.md` updated with Track 51 entry

## Risks

- **Thumbnail size differences** — the Ground/tile picker may currently render 64px thumbnails while Assets renders 48px. A fixed 48px is the target; confirm no visual regression in the tile picker where larger thumbnails were intentional. (LOW)
- **Entity tab customisation** — `entitiesTab.ts` may add extra affordances (placement count badge, property edit button) that the base capsule doesn't support. The `badge` and `action` slot in `createAssetCapsule` opts handle this; confirm these are flexible enough. (MEDIUM)
- **CSS specificity conflicts** — existing tab-specific CSS classes may override the capsule styles. Remove old card styles from each tab file after migration. (LOW)
