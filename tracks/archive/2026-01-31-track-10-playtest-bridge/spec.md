# Track 10: Playtest Bridge — Spec

## Goal

Enable launching the game from the editor with hot storage data, allowing instant playtesting of current edits without deploying. Users can test their changes immediately and return to the editor preserving state.

## User Story

As a mobile game developer using InRepo Studio, I want to playtest my map changes instantly so that I can see how they feel in-game without waiting for deployment.

## Scope

### In Scope

1. **Playtest Trigger**: Button that saves state and launches runtime
2. **Runtime Data Source Flag**: Switch between hot (playtest) and cold (deployed) data
3. **Hot Mode Data Loading**: Runtime loads project/scene from IndexedDB
4. **Playtest Viewport/Overlay**: Clear visual indicator of playtest mode
5. **Return to Editor**: Exit playtest and restore editor state
6. **Start at Current Scene**: Begin playtest from the scene being edited

### Out of Scope (deferred)

- Multiple starting positions within scene
- Playtest configuration (speed, invincibility, etc.)
- Playtest recording/replay
- Performance profiling during playtest
- Debug overlay with entity info

## Acceptance Criteria

1. **Playtest Launch**
   - [ ] "Playtest" button visible in editor UI
   - [ ] Tapping button saves current scene to IndexedDB
   - [ ] Runtime initializes after save completes
   - [ ] Current scene loads as starting scene

2. **Data Source Switching**
   - [ ] Runtime detects hot vs cold data mode
   - [ ] Hot mode loads from IndexedDB
   - [ ] Cold mode loads from fetch (existing path)
   - [ ] Data source determined at runtime init

3. **Hot Data Loading**
   - [ ] Runtime loads project from IndexedDB
   - [ ] Runtime loads scenes from IndexedDB
   - [ ] Tile data renders correctly
   - [ ] Entity data loads (when entities exist)

4. **Playtest UI**
   - [ ] Clear "PLAYTEST" indicator visible
   - [ ] "Exit" button to return to editor
   - [ ] Indicator does not interfere with gameplay
   - [ ] Touch-friendly exit button placement

5. **Return to Editor**
   - [ ] Exit button returns to editor mode
   - [ ] Editor state restored (viewport, tool, layer)
   - [ ] No data loss during round-trip
   - [ ] Smooth transition without full page reload

6. **Scene Selection**
   - [ ] Playtest starts at currently edited scene
   - [ ] If no scene selected, use project.defaultScene
   - [ ] Scene transitions work during playtest

## Risks

1. **State Sync Issues**: Editor and runtime state may conflict
   - Mitigation: Clear save before playtest launch, clean runtime init

2. **Hot Data Staleness**: Runtime may cache old data
   - Mitigation: Force fresh IndexedDB read on playtest init

3. **Memory Pressure**: Both editor and runtime loaded
   - Mitigation: Clean editor resources before playtest, restore on return

4. **Touch Conflicts**: Exit button may interfere with game input
   - Mitigation: Place in corner, use small but accessible target

## Verification

- Manual: Edit tiles, playtest, verify changes visible in game
- Manual: Return to editor, verify state preserved
- Manual: Test with multiple scenes
- Manual: Verify on mobile device
- Automated: Data source detection tests
- Automated: Hot storage read tests

## Dependencies

- Track 2 (Hot Storage): IndexedDB operations
- Track 8 (Paint Tool): Tile editing (for testing)
- Track 4 (Boot System): Mode routing

## Notes

- Playtest uses hot storage; deployed game uses cold storage
- Editor resources should be cleaned up during playtest for memory
- Consider showing loading indicator during transition
- Game must be able to run from IndexedDB data alone
