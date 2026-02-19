# Track 11: Runtime Loader — Plan

## Overview

This plan breaks Track 11 into phases with verification checklists and stop points.

**Track Type**: Full
**Estimated Phases**: 4

---

## Recon Summary

### Files Likely to Change

- `src/runtime/projectLoader.ts` (new) - Project initialization
- `src/runtime/sceneLoader.ts` (new) - Scene loading
- `src/runtime/tileMapFactory.ts` (new) - Phaser tilemap creation
- `src/runtime/entityRegistry.ts` (new) - Entity type management
- `src/runtime/entitySpawner.ts` (new) - Entity instantiation
- `src/runtime/sceneManager.ts` (new) - Scene transitions
- `src/runtime/init.ts` - Use new loaders

### Key Modules/Functions Involved

- `initProject()` - Load and register project data
- `loadScene()` - Load scene data
- `createTileMap()` - Create Phaser tilemap from scene
- `createEntityRegistry()` - Manage entity types
- `spawnEntities()` - Create game objects
- `createSceneManager()` - Handle scene transitions

### Invariants to Respect

- Hot/Cold boundary: Runtime reads from loader (hot or cold)
- Editor/Runtime separation: No editor code in runtime
- Schema compliance: Data matches defined schemas

### Cross-Module Side Effects

- Runtime init changes affect playtest (Track 10)
- Tilemap factory must match editor rendering

### Apply/Rebuild Semantics

- Scene loading: On transition (fresh load)
- Tilemap creation: On scene load (rebuild)

### Data Migration Impact

- None - uses existing schemas

### File Rules Impact

- Many new files - keep each focused and under size limits

### Risks/Regressions

- Phaser API changes between versions
- Tilemap format mismatch with editor
- Entity spawning complexity

### Verification Commands/Checks

- `npm run build` - TypeScript compilation
- `npm run lint` - Code style
- Manual testing in browser

---

## Phase 1: Project Loader + Tileset Loading

**Goal**: Load project data and tileset images into Phaser.

### Tasks

- [ ] Read `src/runtime/AGENTS.md` before editing
- [ ] Create `src/runtime/projectLoader.ts`
  - [ ] Define `ProjectRuntime` interface
  - [ ] Define `ProjectLoaderConfig` interface
  - [ ] Implement `initProject()` function
  - [ ] Load project via unified loader
  - [ ] Register tile categories
  - [ ] Load tileset images into Phaser
  - [ ] Create `getTileTexture()` helper
- [ ] Create `src/runtime/entityRegistry.ts`
  - [ ] Define `EntityRegistry` interface
  - [ ] Implement `createEntityRegistry()` function
  - [ ] Register entity types from project
  - [ ] Provide type lookup

### Files Touched

- `src/runtime/projectLoader.ts` (new)
- `src/runtime/entityRegistry.ts` (new)

### Verification

- [ ] `initProject()` loads project data
- [ ] Tileset images load into Phaser
- [ ] Entity types registered correctly
- [ ] `getTileTexture()` returns correct keys
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test project loading before scene loading.

---

## Phase 2: Scene Loader + Tilemap Factory

**Goal**: Load scene data and create Phaser tilemaps.

### Tasks

- [ ] Create `src/runtime/sceneLoader.ts`
  - [ ] Define `SceneRuntime` interface
  - [ ] Define `SceneLoaderConfig` interface
  - [ ] Implement `loadScene()` function
  - [ ] Calculate scene dimensions
- [ ] Create `src/runtime/tileMapFactory.ts`
  - [ ] Define `TileMapConfig` interface
  - [ ] Define `TileMapResult` interface
  - [ ] Implement `createTileMap()` function
  - [ ] Create Phaser tilemap from scene data
  - [ ] Create ground layer with tiles
  - [ ] Create props layer with tiles
  - [ ] Handle collision layer
  - [ ] Handle trigger layer
  - [ ] Implement `destroy()` for cleanup
- [ ] Wire up to runtime init (basic)
  - [ ] Load project
  - [ ] Load scene
  - [ ] Create tilemap

### Files Touched

- `src/runtime/sceneLoader.ts` (new)
- `src/runtime/tileMapFactory.ts` (new)
- `src/runtime/init.ts` (modify)

### Verification

- [ ] `loadScene()` loads scene data correctly
- [ ] Tilemap renders with correct tiles
- [ ] Ground layer visible
- [ ] Props layer visible above ground
- [ ] Collision layer created (markers or bodies)
- [ ] Trigger layer created
- [ ] Scene dimensions correct
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Verify tilemap rendering before entity spawning.

---

## Phase 3: Entity Spawner

**Goal**: Spawn entities from scene data.

### Tasks

- [ ] Create `src/runtime/entitySpawner.ts`
  - [ ] Define `SpawnConfig` interface
  - [ ] Define `SpawnedEntity` interface
  - [ ] Implement `spawnEntity()` function
  - [ ] Implement `spawnEntities()` function
  - [ ] Create game objects for entities
  - [ ] Apply entity properties
  - [ ] Handle missing entity types
  - [ ] Implement entity destroy
- [ ] Update runtime init
  - [ ] Spawn entities after tilemap
  - [ ] Store spawned entity references

### Files Touched

- `src/runtime/entitySpawner.ts` (new)
- `src/runtime/init.ts` (modify)

### Verification

- [ ] Entities spawn at correct positions
- [ ] Entity properties applied
- [ ] Unknown entity types logged as warnings
- [ ] Entity game objects visible
- [ ] Entity destroy works
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds

### Stop Point

Pause for review. Test entity spawning before scene manager.

---

## Phase 4: Scene Manager + Polish

**Goal**: Scene transitions and final integration.

### Tasks

- [ ] Create `src/runtime/sceneManager.ts`
  - [ ] Define `SceneManagerConfig` interface
  - [ ] Define `SceneManager` interface
  - [ ] Implement `createSceneManager()` function
  - [ ] Implement `goTo()` for scene transitions
  - [ ] Implement `reload()` for current scene
  - [ ] Implement cleanup on scene exit
  - [ ] Implement `destroy()` for full cleanup
- [ ] Update `src/runtime/init.ts`
  - [ ] Use scene manager for initial load
  - [ ] Expose scene manager for transitions
  - [ ] Accept start scene from config
- [ ] Create `src/runtime/index.ts`
  - [ ] Export public API
- [ ] Test with playtest (Track 10)
  - [ ] Edit tiles → playtest → verify visible
  - [ ] Scene transitions work
- [ ] Update `INDEX.md` with new files
  - [ ] Add all new runtime files
- [ ] Update `context/repo-map.md`
  - [ ] Document runtime modules
- [ ] Update `context/active-track.md` to mark Track 11 complete
- [ ] Append summary to `context/history.md`

### Files Touched

- `src/runtime/sceneManager.ts` (new)
- `src/runtime/index.ts` (new or modify)
- `src/runtime/init.ts` (modify)
- `INDEX.md` (modify)
- `context/repo-map.md` (modify)
- `context/active-track.md` (modify)
- `context/history.md` (modify)

### Verification

- [ ] Scene manager initializes correctly
- [ ] `goTo()` transitions to new scene
- [ ] Previous scene cleaned up (no memory leak)
- [ ] `reload()` reloads current scene
- [ ] Works with playtest mode
- [ ] Works with normal game mode
- [ ] All four layers render correctly
- [ ] Entities spawn correctly
- [ ] Scene transitions preserve game state
- [ ] INDEX.md lists new files
- [ ] repo-map.md updated
- [ ] Full manual test on mobile device
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Stop Point

Phase complete. Track 11 done.

---

## Risk Checkpoints

### Before Phase 1

- Confirm Phaser is set up correctly
- Confirm loader from Track 10 is working
- Read runtime AGENTS.md

### Before Phase 2

- Test tileset loading success
- Verify Phaser tilemap API understanding
- Confirm scene data format

### Before Phase 3

- Test tilemap rendering
- Verify entity data format
- Plan entity game object types

### Before Phase 4

- Test entity spawning
- Verify cleanup works
- Test memory usage

### End of Track

- Full manual test cycle:
  1. Open game (cold mode)
  2. Verify tilemap renders
  3. Verify entities spawn
  4. Test scene transition (if applicable)
  5. Open editor
  6. Make tile changes
  7. Playtest (hot mode)
  8. Verify changes visible
  9. Return to editor

---

## Rollback Plan

If issues arise:
- Phase 1: Remove projectLoader, entityRegistry
- Phase 2: Remove sceneLoader, tileMapFactory, revert init
- Phase 3: Remove entitySpawner, revert init
- Phase 4: Remove sceneManager, keep simpler init

---

## INDEX.md Updates

After Phase 4, add:

```markdown
- `src/runtime/projectLoader.ts`
  - Role: Load project data and tileset images.
  - Lists of truth: ProjectRuntime

- `src/runtime/sceneLoader.ts`
  - Role: Load scene data for runtime.
  - Lists of truth: SceneRuntime

- `src/runtime/tileMapFactory.ts`
  - Role: Create Phaser tilemaps from scene data.
  - Lists of truth: none

- `src/runtime/entityRegistry.ts`
  - Role: Manage entity type definitions.
  - Lists of truth: EntityRegistry

- `src/runtime/entitySpawner.ts`
  - Role: Instantiate entities as game objects.
  - Lists of truth: none

- `src/runtime/sceneManager.ts`
  - Role: Handle scene transitions and cleanup.
  - Lists of truth: none
```

---

## Notes

- Phaser tilemap creation differs from our data format
- Collision layer may need physics body setup
- Entity spawning is simple; behaviors added in later tracks
- Scene manager handles all cleanup to prevent leaks
- Consider performance profiling with many tiles
- Track 10 (Playtest) depends on this track working
