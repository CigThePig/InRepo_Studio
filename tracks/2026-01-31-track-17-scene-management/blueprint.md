# Track 17: Scene Management — Blueprint

## Overview

This blueprint details the technical design for scene management, including scene CRUD operations, resize functionality, and a scene selector UI.

---

## Architecture

### Module Structure

```
src/editor/scenes/
├── index.ts             # Public exports
├── sceneManager.ts      # NEW - Scene CRUD operations
├── sceneDialog.ts       # NEW - Dialog components
├── sceneSelector.ts     # NEW - Scene list/selector UI
└── AGENTS.md            # NEW - Scene module rules

src/types/
├── scene.ts             # EXISTING - Scene types (has createScene, resizeScene)
└── ...
```

### Data Flow

```
Scene Create:
  1. User taps "New Scene"
  2. Dialog collects name/dimensions
  3. sceneManager.createScene()
  4. Save to IndexedDB
  5. Switch to new scene

Scene Switch:
  1. User selects scene from list
  2. Auto-save current scene
  3. Load new scene from IndexedDB
  4. Update EditorState.currentSceneId
  5. Re-render canvas
```

---

## Detailed Design

### 1. Scene Manager

**Interface:**

```typescript
interface SceneManagerConfig {
  getProject: () => Project;
  getCurrentScene: () => Scene | null;
  onSceneChange: (scene: Scene) => void;
  onSceneListChange: () => void;
}

interface SceneManager {
  /** Get all scene IDs in project */
  getSceneIds(): string[];

  /** Get scene metadata (id, name) for all scenes */
  getSceneList(): Array<{ id: string; name: string }>;

  /** Create a new scene */
  createScene(name: string, width: number, height: number): Promise<Scene>;

  /** Rename an existing scene */
  renameScene(sceneId: string, newName: string): Promise<void>;

  /** Delete a scene (not allowed if last scene) */
  deleteScene(sceneId: string): Promise<boolean>;

  /** Duplicate a scene */
  duplicateScene(sceneId: string, newName: string): Promise<Scene>;

  /** Resize a scene */
  resizeScene(sceneId: string, newWidth: number, newHeight: number): Promise<Scene>;

  /** Switch to a different scene */
  switchToScene(sceneId: string): Promise<Scene>;

  /** Get current scene ID */
  getCurrentSceneId(): string | null;
}
```

### 2. Scene Operations

**Create Scene:**

```typescript
async function createScene(
  name: string,
  width: number,
  height: number
): Promise<Scene> {
  const project = getProject();

  // Validate
  if (!name.trim()) throw new Error('Scene name required');
  if (width <= 0 || height <= 0) throw new Error('Invalid dimensions');
  if (sceneNameExists(name)) throw new Error('Scene name already exists');

  // Create scene using existing factory
  const id = generateSceneId();
  const tileSize = project.settings?.defaultTileSize ?? 32;
  const scene = createSceneFactory(id, name, width, height, tileSize, project);

  // Save to IndexedDB
  await saveScene(scene);

  // Update project scene list if needed
  onSceneListChange();

  return scene;
}
```

**Rename Scene:**

```typescript
async function renameScene(sceneId: string, newName: string): Promise<void> {
  const scene = await loadScene(sceneId);
  if (!scene) throw new Error('Scene not found');

  if (!newName.trim()) throw new Error('Scene name required');
  if (sceneNameExists(newName, sceneId)) throw new Error('Name already exists');

  scene.name = newName.trim();
  await saveScene(scene);

  if (getCurrentSceneId() === sceneId) {
    onSceneChange(scene);
  }
}
```

**Delete Scene:**

```typescript
async function deleteScene(sceneId: string): Promise<boolean> {
  const sceneIds = getSceneIds();

  // Cannot delete last scene
  if (sceneIds.length <= 1) {
    return false;
  }

  await deleteSceneFromDB(sceneId);

  // Update default scene if needed
  const project = getProject();
  if (project.defaultScene === sceneId) {
    const remaining = sceneIds.filter(id => id !== sceneId);
    project.defaultScene = remaining[0];
    await saveProject(project);
  }

  // Switch away if current
  if (getCurrentSceneId() === sceneId) {
    const remaining = sceneIds.filter(id => id !== sceneId);
    await switchToScene(remaining[0]);
  }

  onSceneListChange();
  return true;
}
```

**Duplicate Scene:**

```typescript
async function duplicateScene(
  sceneId: string,
  newName: string
): Promise<Scene> {
  const original = await loadScene(sceneId);
  if (!original) throw new Error('Scene not found');

  const newId = generateSceneId();
  const duplicate: Scene = {
    ...original,
    id: newId,
    name: newName,
    // Deep clone layers
    layers: {
      ground: original.layers.ground.map(row => [...row]),
      props: original.layers.props.map(row => [...row]),
      collision: original.layers.collision.map(row => [...row]),
      triggers: original.layers.triggers.map(row => [...row]),
    },
    // Clone entities with new IDs
    entities: original.entities.map(e => ({
      ...e,
      id: generateEntityId(),
      properties: { ...e.properties },
    })),
  };

  await saveScene(duplicate);
  onSceneListChange();

  return duplicate;
}
```

**Resize Scene:**

```typescript
async function resizeSceneOp(
  sceneId: string,
  newWidth: number,
  newHeight: number
): Promise<Scene> {
  const scene = await loadScene(sceneId);
  if (!scene) throw new Error('Scene not found');

  // Use existing resizeScene utility from types/scene.ts
  const resized = resizeScene(scene, newWidth, newHeight);

  await saveScene(resized);

  if (getCurrentSceneId() === sceneId) {
    onSceneChange(resized);
  }

  return resized;
}
```

### 3. Scene Dialogs

**Dialog Types:**

```typescript
interface DialogResult<T> {
  confirmed: boolean;
  value?: T;
}

interface CreateSceneDialogResult {
  name: string;
  width: number;
  height: number;
}

interface RenameDialogResult {
  name: string;
}

interface ResizeDialogResult {
  width: number;
  height: number;
}
```

**Dialog Factory:**

```typescript
function showCreateSceneDialog(
  defaultWidth: number,
  defaultHeight: number
): Promise<DialogResult<CreateSceneDialogResult>>;

function showRenameDialog(
  currentName: string
): Promise<DialogResult<RenameDialogResult>>;

function showResizeDialog(
  currentWidth: number,
  currentHeight: number
): Promise<DialogResult<ResizeDialogResult>>;

function showDeleteConfirmation(
  sceneName: string
): Promise<boolean>;
```

**Dialog UI:**

```
+----------------------------------+
|        Create New Scene          |
+----------------------------------+
|  Name: [________________]        |
|                                  |
|  Width:  [__32__] tiles          |
|  Height: [__32__] tiles          |
|                                  |
|      [Cancel]  [Create]          |
+----------------------------------+
```

### 4. Scene Selector UI

**Location**: Top panel (replacing static scene name)

**Interface:**

```typescript
interface SceneSelectorConfig {
  scenes: Array<{ id: string; name: string }>;
  currentSceneId: string;
  onSceneSelect: (sceneId: string) => void;
  onCreateScene: () => void;
  onRenameScene: (sceneId: string) => void;
  onDuplicateScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onResizeScene: (sceneId: string) => void;
}

interface SceneSelector {
  /** Update the scene list */
  updateScenes(scenes: Array<{ id: string; name: string }>): void;

  /** Set current scene */
  setCurrentScene(sceneId: string): void;

  /** Open the scene list dropdown */
  open(): void;

  /** Close the scene list dropdown */
  close(): void;

  /** Clean up */
  destroy(): void;
}
```

**UI Design:**

```
Top Panel (collapsed):
+------------------------------------------+
| ▼ Scene: Level 1                         |
+------------------------------------------+

Top Panel (expanded with scene list):
+------------------------------------------+
| ▼ Scene: Level 1                         |
+------------------------------------------+
| Scenes:                                  |
| ● Level 1            [⋮]                 |
|   Level 2            [⋮]                 |
|   Boss Arena         [⋮]                 |
|                                          |
| [+ New Scene]                            |
+------------------------------------------+

Scene menu [⋮]:
+----------------+
| Rename         |
| Duplicate      |
| Resize         |
| Delete         |
+----------------+
```

### 5. Top Panel Integration

**Modifications to topPanel.ts:**

```typescript
interface TopPanelConfig {
  // ... existing
  scenes: Array<{ id: string; name: string }>;
  currentSceneId: string;
  onSceneSelect: (sceneId: string) => void;
  onSceneAction: (action: SceneAction, sceneId: string) => void;
}

type SceneAction = 'create' | 'rename' | 'duplicate' | 'resize' | 'delete';
```

### 6. Validation

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateSceneName(
  name: string,
  existingNames: string[],
  excludeId?: string
): ValidationResult;

function validateSceneDimensions(
  width: number,
  height: number
): ValidationResult;
```

**Rules:**

- Name: non-empty, unique, max 50 chars
- Dimensions: 1-500 tiles (configurable max)

---

## State Management

### Scene Manager State

```typescript
interface SceneManagerState {
  sceneList: Array<{ id: string; name: string }>;
  currentSceneId: string | null;
}
```

### EditorState Updates

Existing fields used:
- `currentSceneId`: Updated on scene switch

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/scenes/index.ts` | Create | Public exports |
| `src/editor/scenes/sceneManager.ts` | Create | Scene CRUD operations |
| `src/editor/scenes/sceneDialog.ts` | Create | Dialog components |
| `src/editor/scenes/sceneSelector.ts` | Create | Scene list UI |
| `src/editor/scenes/AGENTS.md` | Create | Module rules |
| `src/editor/panels/topPanel.ts` | Modify | Integrate scene selector |
| `src/editor/init.ts` | Modify | Wire scene manager |
| `src/storage/hot.ts` | Modify | Add deleteScene function |

---

## API Contracts

### SceneManager

```typescript
const manager = createSceneManager({
  getProject: () => project,
  getCurrentScene: () => currentScene,
  onSceneChange: (scene) => { /* update */ },
  onSceneListChange: () => { /* refresh UI */ },
});

// Operations
await manager.createScene('New Level', 32, 32);
await manager.renameScene('scene-1', 'Renamed');
await manager.deleteScene('scene-1');
await manager.duplicateScene('scene-1', 'Copy of Level 1');
await manager.resizeScene('scene-1', 64, 64);
await manager.switchToScene('scene-2');
```

---

## Edge Cases

1. **Delete Last Scene**: Prevent, show error
2. **Duplicate Name**: Validation error
3. **Empty Name**: Validation error
4. **Zero Dimensions**: Validation error
5. **Resize to Smaller**: Warning about data loss
6. **Switch During Edit**: Auto-save first
7. **Current Scene Deleted**: Switch to first remaining

---

## Performance Considerations

1. **Scene List Caching**: Keep metadata in memory
2. **Lazy Loading**: Only load full scene on switch
3. **Async Operations**: Don't block UI during save/load
4. **Resize Optimization**: Only process changed regions

---

## Testing Strategy

### Manual Tests

1. Create new scene with custom name/dimensions
2. Rename scene, verify name updates
3. Delete scene (not last), verify removal
4. Try to delete last scene, verify prevented
5. Duplicate scene, verify independence
6. Resize scene, verify tiles preserved
7. Switch scenes, verify auto-save
8. Reload page, verify all scenes present

### Unit Tests

1. Scene name validation
2. Dimension validation
3. Duplicate creates independent copy
4. Resize preserves correct tiles
5. Delete updates default scene

---

## Notes

- Scene IDs are UUIDs, stable across operations
- Duplicate creates deep clone of all data
- Resize uses existing resizeScene from types/scene.ts
- Clear undo/redo history on scene switch
- Consider batch operations for multi-scene workflows
- Future: scene thumbnails, reordering
