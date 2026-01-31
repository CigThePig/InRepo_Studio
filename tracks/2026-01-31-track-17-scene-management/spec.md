# Track 17: Scene Management — Spec

## Goal

Enable full scene lifecycle management including creating new scenes, renaming, deleting, duplicating scenes, resizing scene dimensions, and switching between scenes with automatic save.

## User Story

As a mobile game developer using InRepo Studio, I want to manage multiple scenes in my project so that I can create different levels, areas, and game sections.

## Scope

### In Scope

1. **Create New Scene**: Create a new scene with custom name and dimensions
2. **Rename Scene**: Change the display name of a scene
3. **Delete Scene**: Remove a scene from the project
4. **Duplicate Scene**: Copy an existing scene with a new name
5. **Scene Resize**: Change scene dimensions (width/height in tiles)
6. **Scene Switching**: Navigate between scenes with auto-save
7. **Scene List UI**: View and select from available scenes

### Out of Scope (deferred)

- Scene reordering (future UX track)
- Scene thumbnails/previews
- Scene templates
- Multi-scene editing
- Scene import/export (Track 23/24)
- Scene properties beyond name/dimensions

## Acceptance Criteria

1. **Create New Scene**
   - [ ] Create button opens dialog
   - [ ] Dialog allows name input
   - [ ] Dialog allows dimension input (width, height)
   - [ ] Default dimensions from project settings
   - [ ] Validation: unique name, positive dimensions
   - [ ] New scene added to project and opened

2. **Rename Scene**
   - [ ] Rename option in scene menu
   - [ ] Dialog allows name editing
   - [ ] Validation: unique name, non-empty
   - [ ] Scene renamed in all references

3. **Delete Scene**
   - [ ] Delete option in scene menu
   - [ ] Confirmation dialog before deletion
   - [ ] Cannot delete last/only scene
   - [ ] After delete, switch to another scene

4. **Duplicate Scene**
   - [ ] Duplicate option in scene menu
   - [ ] Creates copy with new ID and modified name
   - [ ] Copies all layer data and entities
   - [ ] Opens the new duplicate

5. **Scene Resize**
   - [ ] Resize option in scene menu
   - [ ] Dialog shows current dimensions
   - [ ] Input for new width and height
   - [ ] Preserves existing tiles where possible
   - [ ] Clears tiles outside new bounds

6. **Scene Switching**
   - [ ] Scene selector in top panel
   - [ ] Current scene name displayed
   - [ ] Tap opens scene list
   - [ ] Selecting scene auto-saves current
   - [ ] Loads and displays new scene

7. **Scene List UI**
   - [ ] Shows all scenes in project
   - [ ] Highlights current scene
   - [ ] Each scene has menu (rename, duplicate, delete)
   - [ ] Create new scene button

8. **Persistence**
   - [ ] New scenes saved to IndexedDB
   - [ ] Scene changes auto-saved
   - [ ] Default scene updated if needed
   - [ ] Project metadata updated

## Risks

1. **Data Loss on Delete**: User accidentally deletes scene
   - Mitigation: Confirmation dialog, require explicit action

2. **Resize Data Loss**: Shrinking scene loses edge tiles
   - Mitigation: Warning dialog, show affected area

3. **Reference Integrity**: Scene references in project
   - Mitigation: Update defaultScene if deleted

4. **Large Scene Performance**: Large scenes may be slow to load
   - Mitigation: Loading indicator, lazy load if needed

## Verification

- Manual: Create new scene, verify it appears and can be edited
- Manual: Rename scene, verify name changes everywhere
- Manual: Delete scene (not last), verify removal and switch
- Manual: Duplicate scene, verify copy is independent
- Manual: Resize scene, verify tiles preserved
- Manual: Switch scenes, verify auto-save works
- Automated: Unit tests for scene operations
- Automated: Validation logic tests

## Dependencies

- Track 2 (Hot Storage): Scene persistence
- Track 4 (Boot System): Scene loading
- Tracks 5-6 (Canvas/Panels): UI integration

## Notes

- Scene IDs must remain stable (used in references)
- Duplicate creates new ID, not a reference
- Consider scene resize as a "requires rebuild" operation
- Clear undo/redo history on scene switch
- Update project.defaultScene if current default is deleted
