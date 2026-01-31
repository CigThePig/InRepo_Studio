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
  EditorState,
  ViewportState,
  PanelStates,
  HotProject,
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
  discoverScenes,
  preloadTileAssets,
} from './cold';

export type { FreshnessCheck, AssetPreloadResult } from './cold';

// Migration
export {
  needsMigration,
  migrateFromCold,
  forceRefreshFromCold,
  syncSceneFromCold,
  checkForUpdates,
} from './migration';

export type { MigrationResult } from './migration';
