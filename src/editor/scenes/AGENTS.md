# AGENTS.md — Scene Management Module

This file is for agents working on the scene management module.

## Module Purpose

Handle scene lifecycle operations: create, rename, delete, duplicate, resize, and scene switching.

## Rules

1. **Scene IDs**
   - Use UUID-style IDs (e.g., `scene_<timestamp>_<random>`)
   - IDs are stable and never change after creation
   - IDs are unique within a project

2. **Validation**
   - Scene names must be non-empty and unique
   - Scene dimensions must be positive integers (1-500 tiles)
   - Cannot delete the last/only scene

3. **Auto-save**
   - Always save current scene before switching
   - Scene operations should trigger auto-save via onSceneChange callback

4. **History**
   - Clear undo/redo history on scene switch
   - Scene-level operations (create/delete) are not undoable

5. **Default Scene**
   - Update project.defaultScene if current default is deleted
   - New projects should have at least one scene

## Files

- `sceneManager.ts` — Scene CRUD operations
- `sceneDialog.ts` — Dialog UI components for scene operations
- `sceneSelector.ts` — Scene list/selector UI component
- `index.ts` — Public exports

## Dependencies

- `@/storage/hot` — Scene persistence (saveScene, loadScene, deleteScene)
- `@/types/scene` — Scene types and factories (createScene, resizeScene)
