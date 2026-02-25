# Track 50 — Asset Library Subtabs + Cross-Tab Reclassification

## Intent

Replace the single overloaded Assets tab with a subtab bar containing **Tiles**, **Props**, **Entities**, **Animations**, and **Sources** sections. Each subtab shows only assets relevant to that usage type, reducing navigation overhead as the library grows. Assets can be moved between Tiles / Props / Entities via the long-press settings popup (implemented in Track 52) without re-importing.

Authority: `src/editor/panels/assetLibraryTab.ts`, `src/editor/panels/leftBerryTabs.ts` (`LeftBerryTabId`), `src/editor/assets/assetGroup.ts` (`AssetGroupType`), `src/editor/assets/assetRegistry.ts`.

Depends on: Track 49 (source classification complete, `AssetGroupType` includes `'sources'`).

## Scope

### In scope

1. **Subtab bar inside the Assets panel** — a horizontal scroll tab strip rendered inside the left berry when the "Assets" main tab is active. Tabs: Tiles | Props | Entities | Animations | Sources. Default active: Tiles.

2. **Each subtab renders only its asset type** — Tiles subtab shows `AssetGroupType === 'tilesets'`, Props shows `'props'`, Entities shows `'entities'`, Animations shows animation assets from the registry, Sources shows `isSource === true` assets.

3. **Cross-tab reclassification** — the settings popup for an asset (implemented as part of Track 52 long-press system) includes "Move to…" options:
   - "Move to Tiles" — changes the asset's group type to `'tilesets'`
   - "Move to Props" — changes to `'props'`
   - "Move to Entities" — changes to `'entities'`
   - Only shows options that are different from the asset's current group type
   - Fires an `assetRegistry.moveAsset(id, targetGroupType)` method

4. **`assetRegistry.moveAsset(id, targetGroupType)`** — new method on `AssetRegistry` that changes the group assignment of an asset entry. Moves the entry into the default `'ungrouped'` group of the target type.

5. **Persistent active subtab** — the last-viewed subtab is remembered per session (not persisted to IndexedDB; a module-level variable is sufficient).

### Out of scope

- Reordering subtabs.
- Creating new custom tabs.
- The long-press popup UI itself (Track 52).
- Animation creation workflow (Track 54).
- Random paint groups (Track 56).

## Acceptance criteria

- [ ] Asset library shows a Tiles | Props | Entities | Animations | Sources subtab bar
- [ ] Each subtab shows only assets of the matching type
- [ ] Tapping a subtab switches the content area immediately
- [ ] Active subtab is visually distinct (using `--irs-accent-primary` / `--irs-btn` active state)
- [ ] `assetRegistry.moveAsset(id, targetGroupType)` correctly reassigns the asset to the default group of the new type
- [ ] After moving an asset to Props, it no longer appears in Tiles, and appears in Props
- [ ] "Move to…" entries in the settings popup exclude the asset's current type
- [ ] Subtab active state persists within the session (no flicker on panel reopen)
- [ ] Touch targets ≥ 44px on all subtab buttons
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] `context/active-track.md` cleared after completion
- [ ] `context/history.md` updated with Track 50 entry
- [ ] `context/schema-registry.md` updated if registry method changes are significant

## Risks

- **`moveAsset` and group identity** — assets within a named group (e.g. "Forest Tiles") need their group membership reassigned correctly. If the target type has no matching named group, place in `'ungrouped'`. If a same-named group exists in the target type, prefer placing there. (MEDIUM)
- **Animations subtab data source** — animation assets live in `assetRegistry.getAnimations()`, not in the group structure. The subtab must merge both data sources coherently. (LOW)
- **Subtab strip overflow on narrow screens** — five tabs may overflow on very narrow phones (< 320px). Use `overflow-x: auto` with `-webkit-overflow-scrolling: touch` and hide the scrollbar. (LOW)
