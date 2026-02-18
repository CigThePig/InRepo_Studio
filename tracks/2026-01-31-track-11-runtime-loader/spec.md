# Track 11: Runtime Loader — Spec

## Goal

Implement Phaser integration that loads InRepo Studio project and scene data, instantiates tilemaps, spawns entities, and supports scene transitions. This enables the actual game to run using data created in the editor.

## User Story

As a mobile game developer using InRepo Studio, I want my edited maps and entities to appear correctly when I play the game so that my creative work translates into a playable experience.

## Scope

### In Scope

1. **Project Loader**: Load project configuration (hot or cold)
2. **Scene Loader**: Load scene data with layers and entities
3. **Tilemap Instantiation**: Create Phaser tilemaps from scene data
4. **Entity Registry**: Track available entity types from project
5. **Entity Spawner**: Instantiate entities with correct properties
6. **Scene Transitions**: Switch between scenes during gameplay

### Out of Scope (deferred)

- Entity behaviors/scripts (Track 21+)
- Physics configuration
- Audio loading
- Particle systems
- Advanced tilemap features (animated tiles, auto-tiling)
- Chunked loading for large scenes

## Acceptance Criteria

1. **Project Loading**
   - [ ] Project.json loads successfully
   - [ ] Tile categories registered
   - [ ] Entity types registered
   - [ ] Project settings available

2. **Scene Loading**
   - [ ] Scene JSON loads correctly
   - [ ] All four layers load (ground, props, collision, triggers)
   - [ ] Entity instances load
   - [ ] Tilesets resolved and loaded

3. **Tilemap Rendering**
   - [ ] Ground layer renders as base
   - [ ] Props layer renders above ground
   - [ ] Collision layer creates collision bodies (or markers)
   - [ ] Trigger layer creates trigger zones (or markers)
   - [ ] Correct tile images display

4. **Entity Spawning**
   - [ ] Entities appear at correct positions
   - [ ] Entity properties applied
   - [ ] Entity types matched from registry
   - [ ] Missing entity types handled gracefully

5. **Scene Transitions**
   - [ ] Can switch to different scene
   - [ ] Previous scene cleaned up
   - [ ] New scene loaded and rendered
   - [ ] Player position can be set on transition

6. **Data Source Support**
   - [ ] Works with hot storage (playtest)
   - [ ] Works with cold storage (deployed game)
   - [ ] Seamless switching via loader

## Risks

1. **Phaser API Compatibility**: Tilemap API may not match data format
   - Mitigation: Study Phaser docs, create adapter layer

2. **Memory Management**: Multiple scene loads may leak memory
   - Mitigation: Proper cleanup on scene exit, texture management

3. **Large Scenes**: Performance with many tiles/entities
   - Mitigation: Consider culling, defer optimization to Track 27

4. **Missing Assets**: Tile images may fail to load
   - Mitigation: Placeholder tile, error logging

## Verification

- Manual: Load game, verify tilemap renders correctly
- Manual: Verify all four layers appear
- Manual: Place entities in editor, verify they appear in game
- Manual: Test scene transition
- Automated: Loader unit tests
- Automated: Tilemap factory tests

## Dependencies

- Track 1 (Data Structures): Project and scene schemas
- Track 2 (Hot Storage): IndexedDB operations
- Track 3 (Cold Storage): Fetch operations
- Track 10 (Playtest Bridge): Unified loader (extends this)

## Notes

- Phaser uses its own tilemap format; we adapt our data to it
- Collision layer may need special handling (Arcade physics vs Matter)
- Trigger layer for gameplay events (door transitions, etc.)
- Entity spawner creates game objects, not just visuals
- Consider lazy loading for large tilesets
