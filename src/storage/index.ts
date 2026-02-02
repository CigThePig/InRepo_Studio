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
  checkStorageQuota,
  exportAllData,
  importAllData,
  clearAllData,
  hasHotData,
} from './hot';

export type {
  BrushSize,
  EditorState,
  ViewportState,
  PanelStates,
  HotProject,
  ColdBaseline,
  StorageQuotaInfo,
  ExportData,
} from './hot';

// Cold storage (fetch)
export {
  fetchProject,
  fetchScene,
  resolveGamePath,
  resolveAssetPath,
  checkFreshness,
  hasRemoteChanges,
  scanAssetFolders,
  discoverScenes,
  preloadTileAssets,
} from './cold';

export type { FreshnessCheck, AssetPreloadResult, RepoAssetManifest } from './cold';

// Migration
export {
  needsMigration,
  migrateFromCold,
  forceRefreshFromCold,
  syncSceneFromCold,
  checkForUpdates,
} from './migration';

export type { MigrationResult, UpdateCheckResult } from './migration';
