/**
 * Scene Management Module - Public Exports
 */

export {
  createSceneManager,
  validateSceneName,
  validateSceneDimensions,
  type SceneManager,
  type SceneManagerConfig,
  type SceneListItem,
  type ValidationResult,
} from './sceneManager';

export {
  showCreateSceneDialog,
  showRenameDialog,
  showResizeDialog,
  showDeleteConfirmation,
  showDuplicateDialog,
  type DialogResult,
  type CreateSceneDialogResult,
  type RenameDialogResult,
  type ResizeDialogResult,
} from './sceneDialog';

export {
  createSceneSelector,
  type SceneSelector,
  type SceneSelectorConfig,
  type SceneAction,
} from './sceneSelector';
