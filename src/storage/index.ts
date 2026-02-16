/**
 * Storage module exports
 *
 * This module provides all storage operations for InRepo Studio:
 * - Hot storage (IndexedDB) for browser-side persistence
 * - Cold storage (fetch) for reading from the repository
 * - Migration for syncing between cold and hot
 */

// Hot storage (IndexedDB)
export {
  initHotStorage,
  saveProject,
  loadProject,
  getHotProject,
  getColdBaseline,
  setColdBaseline,
  updateLastDeployedSha,
  saveScene,
  loadScene,
  getAllScenes,
  deleteScene,
  getAllSceneIds,
  saveEditorState,
  loadEditorState,
  saveEditorUIState,
  loadEditorUIState,
  saveWorkspaceContent,
  loadWorkspaceContent,
  checkStorageQuota,
  exportAllData,
  importAllData,
  exportWorkspaceBundle,
  importWorkspaceBundle,
  clearAllData,
  hasHotData,
} from './hot';

export type {
  BrushSize,
  EditorState,
  EditorIntent,
  EditorDomain,
  EditorPayload,
  ViewportState,
  PanelStates,
  SelectedTile,
  HotProject,
  ColdBaseline,
  StorageQuotaInfo,
  ExportData,
  WorkspaceBundle,
} from './hot';

// Cold storage (fetch)
export {
  fetchProject,
  fetchScene,
  checkFreshness,
  hasRemoteChanges,
  scanAssetFolders,
  discoverScenes,
  preloadTileAssets,
} from './cold';

export type { FreshnessCheck, AssetPreloadResult, RepoAssetManifest } from './cold';

// Script storage (hot)
export {
  initScriptStorage,
  saveScript,
  loadScript,
  deleteScript,
  listScriptIds,
  listScripts,
  hasScript,
  clearScriptStorage,
} from './scriptStorage';

// Script storage (cold)
export { fetchScriptFromRepo } from './scriptCold';

// Shared path helpers
export {
  resolveGamePath,
  resolveAssetUrl,
  resolveScriptUrl,
  PROJECT_JSON_PATH,
  SCENE_INDEX_JSON_PATH,
  LOGIC_DIR,
  LOGIC_MAIN_PATH,
  LOGIC_MAPS_DIR,
} from '@/shared/paths';

// Migration
export {
  needsMigration,
  migrateFromCold,
  forceRefreshFromCold,
  syncSceneFromCold,
  checkForUpdates,
} from './migration';

export type { MigrationResult, UpdateCheckResult } from './migration';
