# Track 49 — Asset Source Classification + "Can't Paint" Silence — Plan

## Phase 1 — Schema + Registry Changes

**Goal**: Introduce `isSource` on `AssetEntry` and `'sources'` in `AssetGroupType`. Update importers to set the flag.

### Tasks

- [ ] Add `isSource?: boolean` to `AssetEntry` interface in `assetRegistry.ts`
- [ ] Add `'sources'` to `AssetGroupType` union in `assetGroup.ts`
- [ ] Add default sources group to `DEFAULT_ASSET_GROUPS`
- [ ] Add `sources` entry to `ASSET_GROUP_PATHS`
- [ ] In `atlasImporter.ts`: set `isSource: true` on the parent/source entry when slicing
- [ ] In `spriteAtlasRehydrate.ts`: same — mark the rehydrated parent entry as source
- [ ] In `assetRegistry.ts` load path: apply retroactive source heuristic for existing entries without `isSource`
- [ ] Update `context/schema-registry.md` with `isSource` field

### Files touched
- `src/editor/assets/assetRegistry.ts`
- `src/editor/assets/assetGroup.ts`
- `src/editor/assets/atlasImporter.ts`
- `src/editor/assets/spriteAtlasRehydrate.ts`
- `context/schema-registry.md`

### Verification
- [ ] `tsc --noEmit` passes
- [ ] Importing a new spritesheet and slicing it: parent has `isSource: true`, slices do not
- [ ] Loading an existing registry: source spritesheets are retroactively flagged

### Stop point ✋

---

## Phase 2 — Silence the Paint Notice + Filter Palette

**Goal**: Source assets stop triggering "Can't paint atlas tile yet" and stop appearing in paint contexts.

### Tasks

- [ ] In `init.ts` (line ~627): add guard — if selected asset has `isSource: true`, return before `showAtlasMismatchNotice`
- [ ] In `tilePicker.ts`: filter entries where `isSource === true` before building the tile list
- [ ] In `assetPalette.ts`: same filter

### Files touched
- `src/editor/init.ts`
- `src/editor/panels/tilePicker.ts`
- `src/editor/panels/assetPalette.ts`

### Verification
- [ ] Refresh with a source spritesheet in the registry: no "Can't paint" notice
- [ ] Tile picker does not show source spritesheets
- [ ] Asset palette (right berry) does not show source spritesheets
- [ ] Sliced tiles still appear correctly in both contexts
- [ ] `tsc --noEmit` passes

### Stop point ✋

---

## Phase 3 — Sources Section in Asset Library Tab

**Goal**: Source assets have a visible home in the left berry under a "Sources" section. Read-only — no paint or placement affordance.

### Tasks

- [ ] In `assetLibraryTab.ts`: render a "Sources" section below the main asset groups
- [ ] Sources section shows source assets with their thumbnail and name
- [ ] No "paint" or "place" button on source asset cards (view/slice only)
- [ ] If no sources exist, render `uxFeedback.emptyState` ("No sources yet." / "Import Spritesheet")

### Files touched
- `src/editor/panels/assetLibraryTab.ts`

### Verification
- [ ] Sources section appears in left berry with correct assets listed
- [ ] Source asset card has no paint affordance
- [ ] Empty state renders when no sources present
- [ ] `npm run build` succeeds

### Stop point ✋

---

## Phase 4 — Closeout

### Tasks

- [ ] Update `context/active-track.md` — clear active track
- [ ] Append Track 49 entry to `context/history.md`
- [ ] Confirm `INDEX.md` is up to date

### Files touched
- `context/active-track.md`
- `context/history.md`
- `INDEX.md`

### Stop point ✋
