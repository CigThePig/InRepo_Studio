# AGENTS.md — Scene Management Module

This file is for agents working on the scene management module.

## Module Purpose

Handle scene lifecycle operations: create, rename, delete, duplicate, resize, and scene switching.

## Rules

1. **Scene IDs**
   - Use UUID-style IDs (e.g., `scene_<timestamp>_<random>`)
   - IDs are stable and never change after creation
   - IDs are unique within a project
   - Scene IDs are used as `mapId` in Logic Target file paths (`/game/logic/maps/<mapId>.json`)

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

6. **Logic Target awareness**
   - Scene IDs are used to resolve Map Logic script paths: `/game/logic/maps/<sceneId>.json`
   - When a scene is **deleted**, consider orphaned logic scripts. The script file is NOT auto-deleted (to prevent data loss), but a warning or cleanup prompt may be shown.
   - When a scene is **renamed**, the scene ID does NOT change (IDs are stable), so logic script paths remain valid. The display label in the Logic Target dropdown updates from scene metadata.
   - When a scene is **duplicated**, the new scene gets a new ID. Its logic script is NOT auto-duplicated; the new scene starts with no map logic (create-on-demand).
   - The top-bar dropdown in World Mode shows scene names for map selection. In Blockly Mode, the same dropdown position shows Logic Targets. Scene names feed the `Map: <mapName>` labels.

## Files

- `sceneManager.ts` — Scene CRUD operations
- `sceneDialog.ts` — Dialog UI components for scene operations
- `sceneSelector.ts` — Scene list/selector UI component
- `index.ts` — Public exports

## Dependencies

- `@/storage/hot` — Scene persistence (saveScene, loadScene, deleteScene)
- `@/types/scene` — Scene types and factories (createScene, resizeScene)
