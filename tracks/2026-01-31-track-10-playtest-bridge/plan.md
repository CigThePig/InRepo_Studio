# Track 10: Playtest Bridge — Plan

## Overview

This plan breaks Track 10 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 3

---

## Recon Summary

### Files Likely to Change

- `src/runtime/loader.ts` (new) - Unified data loader for hot/cold modes
- `src/runtime/playtestOverlay.ts` (new) - Playtest mode UI overlay
- `src/boot/modeRouter.ts` - Add playtest mode detection
- `src/boot/main.ts` - Handle playtest initialization
- `src/editor/init.ts` - Add playtest trigger function
- `src/editor/panels/topPanel.ts` - Add playtest button

### Key Modules/Functions Involved

- `createUnifiedLoader()` - Factory for hot/cold data loading
- `detectMode()` - Mode detection including playtest
- `preparePlaytest()` / `cleanupPlaytest()` - Session state management
- `startPlaytest()` - Editor-side playtest trigger
- `createPlaytestOverlay()` - Playtest UI component

### Invariants to Respect

- Hot/Cold boundary: Playtest reads from IndexedDB (hot), game reads from fetch (cold)
- Deploy vs Playtest: Playtest is NOT deployment, data stays in hot storage
- Editor/Runtime separation: Editor code doesn't run in playtest mode
- Offline-safe: Playtest works without network (uses local data)
- No data loss: Save before playtest transition

### Cross-Module Side Effects

- Boot system gains new mode
- Runtime needs to accept loader configuration
- Editor gains playtest trigger

### Apply/Rebuild Semantics

- Mode detection: Live (session storage flags)
- Data loading: On playtest init (fresh read)

### Data Migration Impact

- None - uses existing IndexedDB schemas
- Session storage keys are new but transient

### File Rules Impact

- New files: loader.ts, playtestOverlay.ts
- Existing files should stay within size limits

### Risks/Regressions

- Mode router changes could affect existing editor/game boot
- Runtime init changes could affect normal game mode

### Verification Commands/Checks

- `npm run build` - TypeScript compilation
- `npm run lint` - Code style
- Manual testing on mobile device

---

## Phase 1: Unified Loader + Mode Detection

**Goal**: Create the data loading infrastructure and mode detection for playtest support.

### Tasks

- [ ] Read `src/boot/AGENTS.md` and `src/runtime/AGENTS.md` before editing
- [ ] Create `src/runtime/loader.ts`
  - [ ] Define `DataSourceMode` type ('hot' | 'cold')
  - [ ] Define `UnifiedLoader` interface
  - [ ] Implement `createUnifiedLoader()` factory
  - [ ] Hot mode: Load from IndexedDB
  - [ ] Cold mode: Load via fetch
  - [ ] Error handling for missing data
- [ ] Update `src/boot/modeRouter.ts`
  - [ ] Add `AppMode` type with 'playtest'
  - [ ] Add playtest flag detection to `detectMode()`
  - [ ] Export playtest session storage helpers
- [ ] Create session storage helpers
  - [ ] `preparePlaytest(sceneId)` - Set flags
  - [ ] `cleanupPlaytest()` - Clear flags
  - [ ] `getPlaytestSceneId()` - Read scene
  - [ ] `isPlaytestMode()` - Check flag

### Files Touched

- `src/runtime/loader.ts` (new)
- `src/boot/modeRouter.ts` (modify)

### Verification

- [ ] `createUnifiedLoader('hot')` loads from IndexedDB
- [ ] `createUnifiedLoader('cold')` loads via fetch
- [ ] `detectMode()` returns 'playtest' when flag set
- [ ] `detectMode()` returns 'editor' for ?tool=editor
- [ ] `detectMode()` returns 'game' by default
- [ ] Session storage helpers work correctly
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test loader and mode detection before wiring up UI.

---

## Phase 2: Playtest Overlay + Boot Integration

**Goal**: Create the playtest UI and integrate mode transitions.

### Tasks

- [ ] Create `src/runtime/playtestOverlay.ts`
  - [ ] Define `PlaytestOverlay` interface
  - [ ] Implement `createPlaytestOverlay()` factory
  - [ ] Create "PLAYTEST" badge (bottom-left)
  - [ ] Create "Exit" button (top-right, 44x44px)
  - [ ] Style for visibility without obstructing gameplay
  - [ ] Wire up exit callback
- [ ] Update `src/boot/main.ts`
  - [ ] Import playtest helpers
  - [ ] Add `initPlaytest()` function
  - [ ] Create loader with hot mode
  - [ ] Initialize runtime with loader
  - [ ] Show playtest overlay
  - [ ] Handle exit: clean flags, redirect to editor
  - [ ] Update main switch for playtest mode
- [ ] Update `src/runtime/init.ts`
  - [ ] Accept loader configuration
  - [ ] Use loader for project/scene loading
  - [ ] Support custom start scene

### Files Touched

- `src/runtime/playtestOverlay.ts` (new)
- `src/boot/main.ts` (modify)
- `src/runtime/init.ts` (modify)

### Verification

- [ ] Playtest overlay displays correctly
- [ ] "PLAYTEST" badge visible but not obstructing
- [ ] Exit button is touch-friendly (44x44px)
- [ ] Exit button returns to editor mode
- [ ] Runtime loads data from hot storage
- [ ] Game renders with hot data
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test playtest boot before adding editor trigger.

---

## Phase 3: Editor Integration + Polish

**Goal**: Add playtest button to editor and complete round-trip flow.

### Tasks

- [ ] Update `src/editor/panels/topPanel.ts`
  - [ ] Add playtest button (▶ icon or "Playtest")
  - [ ] Wire up to playtest trigger
  - [ ] Position on right side of panel
- [ ] Update `src/editor/init.ts`
  - [ ] Implement `startPlaytest()` function
  - [ ] Save current scene before transition
  - [ ] Save editor state to IndexedDB
  - [ ] Call `preparePlaytest()` with scene ID
  - [ ] Trigger page reload
  - [ ] Add state restoration check on init
  - [ ] Restore viewport/tool/layer after playtest return
- [ ] Test full round-trip
  - [ ] Editor → playtest → editor
  - [ ] Verify state preservation
- [ ] Update `INDEX.md` with new files
  - [ ] Add `src/runtime/loader.ts`
  - [ ] Add `src/runtime/playtestOverlay.ts`
- [ ] Update `context/repo-map.md` if needed
- [ ] Update `context/active-track.md` to mark Track 10 complete
- [ ] Append summary to `context/history.md`

### Files Touched

- `src/editor/panels/topPanel.ts` (modify)
- `src/editor/init.ts` (modify)
- `INDEX.md` (modify)
- `context/active-track.md` (modify)
- `context/history.md` (modify)

### Verification

- [ ] Playtest button visible in editor top panel
- [ ] Tapping playtest saves scene first
- [ ] Game loads with current edits visible
- [ ] Exit returns to editor mode
- [ ] Editor viewport restored after return
- [ ] Editor tool selection restored
- [ ] Editor active layer restored
- [ ] Works on mobile device
- [ ] No data loss during round-trip
- [ ] Multiple playtest cycles work
- [ ] INDEX.md lists new files
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Phase complete. Track 10 done.

---

## Risk Checkpoints

### Before Phase 1

- Confirm IndexedDB storage is working
- Confirm fetch loading is working
- Read boot and runtime AGENTS.md files

### Before Phase 2

- Test unified loader on mobile
- Verify hot storage has valid data
- Check runtime accepts configuration

### Before Phase 3

- Test playtest mode boot
- Verify overlay doesn't block touch events
- Confirm exit redirect works

### End of Track

- Full manual test cycle:
  1. Open editor
  2. Paint some tiles
  3. Tap playtest button
  4. Verify changes visible in game
  5. Move around in game (if controls exist)
  6. Tap exit button
  7. Verify back in editor
  8. Verify viewport/tool/layer preserved
  9. Make more changes
  10. Playtest again

---

## Rollback Plan

If issues arise:
- Phase 1: Remove loader.ts, revert modeRouter changes
- Phase 2: Remove overlay, revert main.ts and runtime changes
- Phase 3: Remove playtest button, revert editor changes

---

## INDEX.md Updates

After Phase 3, add:

```markdown
- `src/runtime/loader.ts`
  - Role: Unified data loader for hot (IndexedDB) and cold (fetch) modes.
  - Lists of truth: DataSourceMode

- `src/runtime/playtestOverlay.ts`
  - Role: Playtest mode UI overlay with exit button.
  - Lists of truth: none
```

---

## Notes

- Playtest uses hot storage; deployed game uses cold storage
- Full page reload for mode transitions (simpler than SPA)
- Session storage cleared on tab close (by design)
- Consider loading indicator during transition
- Track 11 (Runtime Loader) will build on this loader infrastructure
