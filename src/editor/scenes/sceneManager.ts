/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Scene lifecycle management (create, rename, delete, duplicate, resize, switch)
 *
 * Defines:
 * - SceneManager — interface for scene operations (type: interface)
 * - SceneManagerConfig — configuration for scene manager (type: interface)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 *
 * Apply/Rebuild semantics:
 * - Scene rename: live-applying
 * - Scene resize: requires rebuild (layer arrays regenerated)
 * - Scene switch: requires full reload
 */

import {
  saveScene,
  loadScene,
  deleteScene as deleteSceneFromDB,
  getAllSceneIds,
  saveProject,
} from '@/storage/hot';
import {
  createScene as createSceneFactory,
  resizeScene as resizeSceneUtil,
  generateEntityId,
  type Scene,
  type Project,
} from '@/types';

const LOG_PREFIX = '[SceneManager]';

// --- Types ---

export interface SceneListItem {
  id: string;
  name: string;
}

export interface SceneManagerConfig {
  /** Get the current project */
  getProject: () => Project;
  /** Get the current scene */
  getCurrentScene: () => Scene | null;
  /** Get current scene ID */
  getCurrentSceneId: () => string | null;
  /** Callback when scene changes (for canvas update) */
  onSceneChange: (scene: Scene) => void;
  /** Callback when scene list changes (for UI refresh) */
  onSceneListChange: () => void;
  /** Callback when switching to a new scene */
  onSceneSwitch: (scene: Scene) => void;
  /** Save current scene before switching */
  saveCurrentScene: () => Promise<void>;
}

export interface SceneManager {
  /** Get all scene IDs in project */
  getSceneIds(): Promise<string[]>;

  /** Get scene metadata (id, name) for all scenes */
  getSceneList(): Promise<SceneListItem[]>;

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
}

// --- Validation ---

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_SCENE_NAME_LENGTH = 50;
const MAX_SCENE_DIMENSION = 500;
const MIN_SCENE_DIMENSION = 1;

export function validateSceneName(
  name: string,
  existingNames: string[],
  excludeId?: string,
  scenes?: SceneListItem[]
): ValidationResult {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: 'Scene name is required' };
  }

  if (trimmed.length > MAX_SCENE_NAME_LENGTH) {
    return { valid: false, error: `Scene name must be ${MAX_SCENE_NAME_LENGTH} characters or less` };
  }

  // Check for duplicate names
  const isDuplicate = scenes
    ? scenes.some(s => s.name.toLowerCase() === trimmed.toLowerCase() && s.id !== excludeId)
    : existingNames.some(n => n.toLowerCase() === trimmed.toLowerCase());

  if (isDuplicate) {
    return { valid: false, error: 'A scene with this name already exists' };
  }

  return { valid: true };
}

export function validateSceneDimensions(width: number, height: number): ValidationResult {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return { valid: false, error: 'Dimensions must be whole numbers' };
  }

  if (width < MIN_SCENE_DIMENSION || height < MIN_SCENE_DIMENSION) {
    return { valid: false, error: `Dimensions must be at least ${MIN_SCENE_DIMENSION}` };
  }

  if (width > MAX_SCENE_DIMENSION || height > MAX_SCENE_DIMENSION) {
    return { valid: false, error: `Dimensions cannot exceed ${MAX_SCENE_DIMENSION}` };
  }

  return { valid: true };
}

// --- Helpers ---

function generateSceneId(): string {
  return `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// --- Factory ---

export function createSceneManager(config: SceneManagerConfig): SceneManager {
  const {
    getProject,
    getCurrentSceneId,
    onSceneChange,
    onSceneListChange,
    onSceneSwitch,
    saveCurrentScene,
  } = config;

  const manager: SceneManager = {
    async getSceneIds(): Promise<string[]> {
      return getAllSceneIds();
    },

    async getSceneList(): Promise<SceneListItem[]> {
      const ids = await getAllSceneIds();
      const list: SceneListItem[] = [];

      for (const id of ids) {
        const scene = await loadScene(id);
        if (scene) {
          list.push({ id: scene.id, name: scene.name });
        }
      }

      return list;
    },

    async createScene(name: string, width: number, height: number): Promise<Scene> {
      const project = getProject();
      const existingScenes = await this.getSceneList();

      // Validate name
      const nameValidation = validateSceneName(name, [], undefined, existingScenes);
      if (!nameValidation.valid) {
        throw new Error(nameValidation.error);
      }

      // Validate dimensions
      const dimValidation = validateSceneDimensions(width, height);
      if (!dimValidation.valid) {
        throw new Error(dimValidation.error);
      }

      // Create scene using factory
      const id = generateSceneId();
      const tileSize = project.settings?.defaultTileSize ?? 32;
      const scene = createSceneFactory(id, name.trim(), width, height, tileSize, project);

      // Save to IndexedDB
      await saveScene(scene);
      console.log(`${LOG_PREFIX} Created scene "${scene.name}" (${width}x${height})`);

      // Notify UI
      onSceneListChange();

      return scene;
    },

    async renameScene(sceneId: string, newName: string): Promise<void> {
      const scene = await loadScene(sceneId);
      if (!scene) {
        throw new Error('Scene not found');
      }

      const existingScenes = await this.getSceneList();

      // Validate name
      const nameValidation = validateSceneName(newName, [], sceneId, existingScenes);
      if (!nameValidation.valid) {
        throw new Error(nameValidation.error);
      }

      scene.name = newName.trim();
      await saveScene(scene);
      console.log(`${LOG_PREFIX} Renamed scene to "${scene.name}"`);

      // If this is the current scene, notify about the change
      if (getCurrentSceneId() === sceneId) {
        onSceneChange(scene);
      }

      onSceneListChange();
    },

    async deleteScene(sceneId: string): Promise<boolean> {
      const sceneIds = await getAllSceneIds();

      // Cannot delete last scene
      if (sceneIds.length <= 1) {
        console.warn(`${LOG_PREFIX} Cannot delete last scene`);
        return false;
      }

      await deleteSceneFromDB(sceneId);
      console.log(`${LOG_PREFIX} Deleted scene "${sceneId}"`);

      // Update default scene if needed
      const project = getProject();
      if (project.defaultScene === sceneId) {
        const remaining = sceneIds.filter(id => id !== sceneId);
        project.defaultScene = remaining[0];
        await saveProject(project);
        console.log(`${LOG_PREFIX} Updated default scene to "${project.defaultScene}"`);
      }

      // Switch away if current
      if (getCurrentSceneId() === sceneId) {
        const remaining = sceneIds.filter(id => id !== sceneId);
        await this.switchToScene(remaining[0]);
      }

      onSceneListChange();
      return true;
    },

    async duplicateScene(sceneId: string, newName: string): Promise<Scene> {
      const original = await loadScene(sceneId);
      if (!original) {
        throw new Error('Scene not found');
      }

      const existingScenes = await this.getSceneList();

      // Validate name
      const nameValidation = validateSceneName(newName, [], undefined, existingScenes);
      if (!nameValidation.valid) {
        throw new Error(nameValidation.error);
      }

      const newId = generateSceneId();
      const duplicate: Scene = {
        ...original,
        id: newId,
        name: newName.trim(),
        // Deep clone layers
        layers: {
          ground: original.layers.ground.map(row => [...row]),
          props: original.layers.props.map(row => [...row]),
          collision: original.layers.collision.map(row => [...row]),
          triggers: original.layers.triggers.map(row => [...row]),
        },
        // Clone tilesets
        tilesets: original.tilesets.map(ts => ({ ...ts })),
        // Clone entities with new IDs
        entities: original.entities.map(e => ({
          ...e,
          id: generateEntityId(),
          properties: { ...e.properties },
        })),
      };

      await saveScene(duplicate);
      console.log(`${LOG_PREFIX} Duplicated scene "${original.name}" as "${duplicate.name}"`);

      onSceneListChange();

      return duplicate;
    },

    async resizeScene(sceneId: string, newWidth: number, newHeight: number): Promise<Scene> {
      const scene = await loadScene(sceneId);
      if (!scene) {
        throw new Error('Scene not found');
      }

      // Validate dimensions
      const dimValidation = validateSceneDimensions(newWidth, newHeight);
      if (!dimValidation.valid) {
        throw new Error(dimValidation.error);
      }

      // Use existing resizeScene utility from types/scene.ts
      const resized = resizeSceneUtil(scene, newWidth, newHeight);

      await saveScene(resized);
      console.log(`${LOG_PREFIX} Resized scene "${resized.name}" to ${newWidth}x${newHeight}`);

      // If this is the current scene, notify about the change
      if (getCurrentSceneId() === sceneId) {
        onSceneChange(resized);
      }

      return resized;
    },

    async switchToScene(sceneId: string): Promise<Scene> {
      // Save current scene first
      await saveCurrentScene();

      const scene = await loadScene(sceneId);
      if (!scene) {
        throw new Error('Scene not found');
      }

      console.log(`${LOG_PREFIX} Switching to scene "${scene.name}"`);
      onSceneSwitch(scene);

      return scene;
    },
  };

  console.log(`${LOG_PREFIX} Scene manager created`);

  return manager;
}
