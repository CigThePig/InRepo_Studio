# Track 17: Scene Management — Plan

## Overview

This plan breaks Track 17 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 4

---

## Recon Summary

### Files Likely to Change

- `src/editor/scenes/index.ts` (new) - Public exports
- `src/editor/scenes/sceneManager.ts` (new) - Scene CRUD
- `src/editor/scenes/sceneDialog.ts` (new) - Dialog components
- `src/editor/scenes/sceneSelector.ts` (new) - Scene selector UI
- `src/editor/scenes/AGENTS.md` (new) - Module rules
- `src/editor/panels/topPanel.ts` - Scene selector integration
- `src/editor/init.ts` - Wire scene manager
- `src/storage/hot.ts` - Add deleteScene, scene list functions

### Key Modules/Functions Involved

- `createSceneManager()` - Scene operations factory
- `showCreateSceneDialog()` - Dialog for new scene
- `createSceneSelector()` - Scene list UI
- Existing `createScene()`, `resizeScene()` from types/scene.ts

### Invariants to Respect

- Hot/Cold boundary: All scene changes go to IndexedDB
- No data loss: Auto-save before switch
- Schema compliance: Scenes must validate

### Cross-Module Side Effects

- Top panel needs scene selector
- EditorState.currentSceneId updates
- Canvas needs to reload on scene switch
- History should clear on scene switch

### Apply/Rebuild Semantics

- Scene rename: Live-applying
- Scene resize: Requires rebuild (layer arrays)
- Scene switch: Requires full reload

### Data Migration Impact

- No schema changes - using existing Scene interface

### File Rules Impact

- New module: src/editor/scenes/
- Top panel modifications should stay within size limits

### Risks/Regressions

- Scene switch could lose unsaved changes
- Delete could affect project.defaultScene
- Resize could lose edge tiles

### Verification Commands/Checks

- `npm run build` - TypeScript compilation
- `npm run lint` - Code style
- Manual testing on mobile device

---

## Phase 1: Scene Manager Core

**Goal**: Implement scene manager with basic CRUD operations.

### Tasks

- [ ] Create `src/editor/scenes/` directory
- [ ] Create `src/editor/scenes/AGENTS.md`
  - [ ] Document scene module rules
  - [ ] Scene ID generation rules
  - [ ] Validation requirements
- [ ] Update `src/storage/hot.ts`
  - [ ] Add `deleteScene()` function
  - [ ] Add `getAllSceneIds()` function
  - [ ] Add `getSceneList()` function (id + name only)
- [ ] Create `src/editor/scenes/sceneManager.ts`
  - [ ] Implement SceneManagerConfig interface
  - [ ] Implement SceneManager interface
  - [ ] `createScene()` - create new scene
  - [ ] `renameScene()` - rename existing scene
  - [ ] `deleteScene()` - delete scene (with checks)
  - [ ] `duplicateScene()` - duplicate scene
  - [ ] `getSceneList()` - get all scene metadata
  - [ ] `switchToScene()` - switch with auto-save
  - [ ] Validation helpers
- [ ] Create `src/editor/scenes/index.ts`
  - [ ] Export all public APIs

### Files Touched

- `src/editor/scenes/AGENTS.md` (new)
- `src/editor/scenes/sceneManager.ts` (new)
- `src/editor/scenes/index.ts` (new)
- `src/storage/hot.ts` (modify)

### Verification

- [ ] Create scene succeeds
- [ ] Rename scene updates name
- [ ] Delete scene removes from storage
- [ ] Cannot delete last scene
- [ ] Duplicate creates independent copy
- [ ] Switch saves current before loading new
- [ ] Validation prevents invalid names
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test scene operations before adding UI.

---

## Phase 2: Scene Resize

**Goal**: Implement scene resize with tile preservation.

### Tasks

- [ ] Update `src/editor/scenes/sceneManager.ts`
  - [ ] Add `resizeScene()` method
  - [ ] Use existing `resizeScene()` from types/scene.ts
  - [ ] Handle current scene update
- [ ] Verify resize preserves tiles correctly
  - [ ] Expand right: new columns empty
  - [ ] Expand down: new rows empty
  - [ ] Shrink: tiles outside bounds lost
  - [ ] No change: no modification
- [ ] Test with all layer types
- [ ] Test entity positions during resize

### Files Touched

- `src/editor/scenes/sceneManager.ts` (modify)

### Verification

- [ ] Resize to larger preserves all tiles
- [ ] Resize to smaller loses edge tiles correctly
- [ ] Entity positions unchanged (may be out of bounds)
- [ ] Current scene updates after resize
- [ ] Scene saves after resize
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test resize before adding dialogs.

---

## Phase 3: Dialogs

**Goal**: Create dialog components for scene operations.

### Tasks

- [ ] Create `src/editor/scenes/sceneDialog.ts`
  - [ ] `showCreateSceneDialog()` - name + dimensions
  - [ ] `showRenameDialog()` - name only
  - [ ] `showResizeDialog()` - dimensions only
  - [ ] `showDeleteConfirmation()` - yes/no
  - [ ] Validation feedback in dialogs
  - [ ] Mobile-friendly dialog styling
  - [ ] Touch-friendly inputs
- [ ] Add default values from project settings
- [ ] Add input validation with feedback

### Files Touched

- `src/editor/scenes/sceneDialog.ts` (new)

### Verification

- [ ] Create dialog shows with defaults
- [ ] Rename dialog shows current name
- [ ] Resize dialog shows current dimensions
- [ ] Delete shows scene name and confirmation
- [ ] Validation errors display clearly
- [ ] Dialogs work on mobile
- [ ] Cancel closes without action
- [ ] Confirm executes operation
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test dialogs before integrating with UI.

---

## Phase 4: Scene Selector UI

**Goal**: Add scene selector to top panel and finalize integration.

### Tasks

- [ ] Create `src/editor/scenes/sceneSelector.ts`
  - [ ] Scene list component
  - [ ] Current scene indicator
  - [ ] Menu for each scene (rename, duplicate, resize, delete)
  - [ ] New scene button
  - [ ] Dropdown behavior
- [ ] Update `src/editor/panels/topPanel.ts`
  - [ ] Replace static scene name with selector
  - [ ] Wire selector callbacks
- [ ] Update `src/editor/init.ts`
  - [ ] Create scene manager instance
  - [ ] Wire to top panel
  - [ ] Handle scene operations
  - [ ] Clear history on scene switch
- [ ] Test full workflow
- [ ] Update `INDEX.md` with new files
  - [ ] Add `src/editor/scenes/index.ts`
  - [ ] Add `src/editor/scenes/sceneManager.ts`
  - [ ] Add `src/editor/scenes/sceneDialog.ts`
  - [ ] Add `src/editor/scenes/sceneSelector.ts`
  - [ ] Add `src/editor/scenes/AGENTS.md`
- [ ] Update `context/repo-map.md`
  - [ ] Add scenes module
- [ ] Update `context/active-track.md` to mark Track 17 complete
- [ ] Append summary to `context/history.md`

### Files Touched

- `src/editor/scenes/sceneSelector.ts` (new)
- `src/editor/panels/topPanel.ts` (modify)
- `src/editor/init.ts` (modify)
- `INDEX.md` (modify)
- `context/repo-map.md` (modify)
- `context/active-track.md` (modify)
- `context/history.md` (modify)

### Verification

- [ ] Scene name in top panel shows current scene
- [ ] Tap opens scene list dropdown
- [ ] All scenes listed with current highlighted
- [ ] Menu button shows options
- [ ] Create new scene works end-to-end
- [ ] Rename scene works end-to-end
- [ ] Duplicate scene works end-to-end
- [ ] Resize scene works end-to-end
- [ ] Delete scene works (not last)
- [ ] Scene switch auto-saves current
- [ ] History cleared on scene switch
- [ ] Full manual test on mobile device
- [ ] INDEX.md lists new files
- [ ] repo-map.md updated
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Phase complete. Track 17 done.

---

## Risk Checkpoints

### Before Phase 1

- Review existing scene types
- Understand storage patterns
- Plan ID generation strategy

### Before Phase 2

- Test resize utility
- Understand tile preservation logic
- Consider entity handling

### Before Phase 3

- Review dialog patterns in codebase
- Plan mobile-friendly input design
- Consider validation UX

### Before Phase 4

- Test scene manager thoroughly
- Plan top panel layout
- Consider dropdown behavior

### End of Track

- Full manual test cycle:
  1. Open scene selector
  2. Create new scene
  3. Paint some tiles
  4. Switch to original scene
  5. Verify changes saved
  6. Duplicate a scene
  7. Verify independence
  8. Rename a scene
  9. Resize a scene
  10. Delete a scene (not last)
  11. Try delete last scene (should fail)
  12. Reload page
  13. Verify all scenes persist

---

## Rollback Plan

If issues arise:
- Phase 1: Remove scene manager, revert storage changes
- Phase 2: Keep manager, disable resize
- Phase 3: Keep resize, use browser prompts instead of dialogs
- Phase 4: Keep dialogs, disable scene selector (use API only)

---

## INDEX.md Updates

After Phase 4, add:

```markdown
- `src/editor/scenes/index.ts`
  - Role: Public exports for scene management.
  - Lists of truth: none

- `src/editor/scenes/sceneManager.ts`
  - Role: Scene CRUD operations.
  - Lists of truth: none

- `src/editor/scenes/sceneDialog.ts`
  - Role: Dialog components for scene operations.
  - Lists of truth: none

- `src/editor/scenes/sceneSelector.ts`
  - Role: Scene list and selector UI.
  - Lists of truth: none

- `src/editor/scenes/AGENTS.md`
  - Role: Scene module rules.
  - Lists of truth: none
```

---

## repo-map.md Updates

After Phase 4, add to module boundaries:

```markdown
- **Editor/Scenes**: Scene CRUD, dialogs, selector UI
```

---

## Notes

- Use UUID for scene IDs
- Duplicate creates deep clone
- Clear history on scene switch
- Auto-save before switching
- Cannot delete last scene
- Update project.defaultScene if deleted
- Consider scene thumbnails (future track)
