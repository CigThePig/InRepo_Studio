/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: IndexedDB operations for hot storage (browser-side persistence)
 *
 * Defines:
 * - EditorStateSchema — persisted editor state (type: schema)
 * - HotProjectSchema — IndexedDB project record (type: schema)
 * - DB_NAME, DB_VERSION — database constants
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: same key set, EditorState not exported
 *
 * Apply/Rebuild semantics:
 * - All writes are immediate (auto-save)
 * - Apply mode: live (restored on load)
 *
 * Verification (minimum):
 * - [ ] Save -> reload restores state
 * - [ ] Export -> import round-trips cleanly
 * - [ ] Quota warning appears when approaching limits
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Project, Scene, LayerType } from '@/types';
import type { EditorMode } from '@/editor/v2/editorMode';

// --- Constants ---

const DB_NAME = 'inrepo-studio';
const DB_VERSION = 1;

const LOG_PREFIX = '[Storage/Hot]';

// --- Editor State Schema ---

export interface ViewportState {
  panX: number;
  panY: number;
  zoom: number;
}

export interface PanelStates {
  topExpanded: boolean;
  bottomExpanded: boolean;
}

export interface SelectedTile {
  category: string;
  index: number;
}

export type BrushSize = 1 | 2 | 3;

export type LayerVisibility = Record<LayerType, boolean>;
export type LayerLocks = Record<LayerType, boolean>;

export interface EditorState {
  currentSceneId: string | null;
  currentTool: 'select' | 'paint' | 'erase' | 'entity';
  editorMode: EditorMode;
  activeLayer: LayerType;
  /** Custom layer render order (bottom to top) */
  layerOrder: LayerType[];
  selectedTile: SelectedTile | null;
  /** Selected entity type name for placement */
  selectedEntityType: string | null;
  /** Selected entity IDs for manipulation */
  selectedEntityIds: string[];
  brushSize: BrushSize;
  /** Snap entity placement to grid */
  entitySnapToGrid: boolean;
  viewport: ViewportState;
  panelStates: PanelStates;
  recentTiles: number[];
  /** Per-layer visibility toggle (true = visible) */
  layerVisibility: LayerVisibility;
  /** Per-layer lock toggle (true = locked, cannot edit) */
  layerLocks: LayerLocks;
}

// --- Hot Project Schema ---

export interface ColdBaseline {
  project: {
    etag: string | null;
    lastModified: string | null;
  };
  checkedAt: number;
}

export interface HotProject {
  /** Last known cold (repo) fingerprint used to seed/compare hot data. */
  coldBaseline?: ColdBaseline;

  project: Project;
  lastSaved: number;
  lastDeployedSha: Record<string, string>;
}

// --- Database Schema ---

interface InRepoStudioDB extends DBSchema {
  project: {
    key: string;
    value: HotProject;
  };
  scenes: {
    key: string;
    value: Scene;
  };
  editorState: {
    key: string;
    value: EditorState;
  };
}

// --- Database Instance ---

let db: IDBPDatabase<InRepoStudioDB> | null = null;

// --- Initialization ---

export async function initHotStorage(): Promise<void> {
  if (db) return;

  console.log(`${LOG_PREFIX} Initializing IndexedDB...`);

  db = await openDB<InRepoStudioDB>(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion, _newVersion, _transaction) {
      console.log(`${LOG_PREFIX} Upgrading database from v${oldVersion}`);

      // Create stores if they don't exist
      if (!database.objectStoreNames.contains('project')) {
        database.createObjectStore('project');
      }
      if (!database.objectStoreNames.contains('scenes')) {
        database.createObjectStore('scenes');
      }
      if (!database.objectStoreNames.contains('editorState')) {
        database.createObjectStore('editorState');
      }
    },
    blocked() {
      console.warn(`${LOG_PREFIX} Database blocked - close other tabs`);
    },
    blocking() {
      console.warn(`${LOG_PREFIX} Database blocking upgrade`);
    },
  });

  console.log(`${LOG_PREFIX} IndexedDB initialized`);
}

function getDB(): IDBPDatabase<InRepoStudioDB> {
  if (!db) {
    throw new Error(`${LOG_PREFIX} Database not initialized. Call initHotStorage() first.`);
  }
  return db;
}

// --- Project Operations ---

export async function saveProject(project: Project): Promise<void> {
  const database = getDB();
  const existing = await database.get('project', 'current');

  const hotProject: HotProject = {
    project,
    lastSaved: Date.now(),
    lastDeployedSha: existing?.lastDeployedSha ?? {},
    coldBaseline: existing?.coldBaseline,
  };

  await database.put('project', hotProject, 'current');
  console.log(`${LOG_PREFIX} Project saved`);
}

export async function loadProject(): Promise<Project | null> {
  const database = getDB();
  const hotProject = await database.get('project', 'current');

  if (!hotProject) {
    console.log(`${LOG_PREFIX} No project found in hot storage`);
    return null;
  }

  console.log(`${LOG_PREFIX} Project loaded (last saved: ${new Date(hotProject.lastSaved).toISOString()})`);
  return hotProject.project;
}

export async function getHotProject(): Promise<HotProject | null> {
  const database = getDB();
  return await database.get('project', 'current') ?? null;
}

export async function getColdBaseline(): Promise<ColdBaseline | null> {
  const hotProject = await getHotProject();
  return hotProject?.coldBaseline ?? null;
}

export async function setColdBaseline(baseline: ColdBaseline): Promise<void> {
  const database = getDB();
  const hotProject = await database.get('project', 'current');
  if (!hotProject) return;

  hotProject.coldBaseline = baseline;
  await database.put('project', hotProject, 'current');
  console.log(`${LOG_PREFIX} Cold baseline updated`);
}

export async function updateLastDeployedSha(filePath: string, sha: string): Promise<void> {
  const database = getDB();
  const hotProject = await database.get('project', 'current');

  if (hotProject) {
    hotProject.lastDeployedSha[filePath] = sha;
    await database.put('project', hotProject, 'current');
  }
}

// --- Scene Operations ---

export async function saveScene(scene: Scene): Promise<void> {
  const database = getDB();
  await database.put('scenes', scene, scene.id);
  console.log(`${LOG_PREFIX} Scene "${scene.name}" saved`);
}

export async function loadScene(sceneId: string): Promise<Scene | null> {
  const database = getDB();
  const scene = await database.get('scenes', sceneId);

  if (!scene) {
    console.log(`${LOG_PREFIX} Scene "${sceneId}" not found in hot storage`);
    return null;
  }

  console.log(`${LOG_PREFIX} Scene "${scene.name}" loaded`);
  return scene;
}

export async function getAllScenes(): Promise<Scene[]> {
  const database = getDB();
  return await database.getAll('scenes');
}

export async function deleteScene(sceneId: string): Promise<void> {
  const database = getDB();
  await database.delete('scenes', sceneId);
  console.log(`${LOG_PREFIX} Scene "${sceneId}" deleted`);
}

export async function getAllSceneIds(): Promise<string[]> {
  const database = getDB();
  return await database.getAllKeys('scenes');
}

// --- Editor State Operations ---

const DEFAULT_EDITOR_STATE: EditorState = {
  currentSceneId: null,
  currentTool: 'select',
  editorMode: 'select',
  activeLayer: 'ground',
  layerOrder: ['ground', 'props', 'collision', 'triggers'],
  selectedTile: null,
  selectedEntityType: null,
  selectedEntityIds: [],
  brushSize: 1,
  entitySnapToGrid: true,
  viewport: {
    panX: 0,
    panY: 0,
    zoom: 1,
  },
  panelStates: {
    topExpanded: false,
    bottomExpanded: true,
  },
  recentTiles: [],
  layerVisibility: {
    ground: true,
    props: true,
    collision: true,
    triggers: true,
  },
  layerLocks: {
    ground: false,
    props: false,
    collision: false,
    triggers: false,
  },
};

export async function saveEditorState(state: EditorState): Promise<void> {
  const database = getDB();
  await database.put('editorState', state, 'current');
  console.log(`${LOG_PREFIX} Editor state saved`);
}

export async function loadEditorState(): Promise<EditorState> {
  const database = getDB();
  const state = await database.get('editorState', 'current');

  if (!state) {
    console.log(`${LOG_PREFIX} No editor state found, using defaults`);
    return { ...DEFAULT_EDITOR_STATE };
  }

  // Merge with defaults to handle missing fields from older versions
  const mergedState: EditorState = {
    ...DEFAULT_EDITOR_STATE,
    ...state,
    viewport: { ...DEFAULT_EDITOR_STATE.viewport, ...state.viewport },
    panelStates: { ...DEFAULT_EDITOR_STATE.panelStates, ...state.panelStates },
    layerVisibility: { ...DEFAULT_EDITOR_STATE.layerVisibility, ...state.layerVisibility },
    layerLocks: { ...DEFAULT_EDITOR_STATE.layerLocks, ...state.layerLocks },
  };

  console.log(`${LOG_PREFIX} Editor state loaded`);
  return mergedState;
}

// --- Storage Quota ---

export interface StorageQuotaInfo {
  used: number;
  quota: number;
  percentUsed: number;
  isNearLimit: boolean;
}

export async function checkStorageQuota(): Promise<StorageQuotaInfo | null> {
  if (!navigator.storage || !navigator.storage.estimate) {
    console.warn(`${LOG_PREFIX} Storage API not available`);
    return null;
  }

  const estimate = await navigator.storage.estimate();
  const used = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;
  const percentUsed = quota > 0 ? (used / quota) * 100 : 0;
  const isNearLimit = percentUsed > 80;

  if (isNearLimit) {
    console.warn(`${LOG_PREFIX} Storage quota warning: ${percentUsed.toFixed(1)}% used`);
  }

  return {
    used,
    quota,
    percentUsed,
    isNearLimit,
  };
}

// --- Export / Import ---

export interface ExportData {
  version: number;
  exportedAt: number;
  project: Project | null;
  scenes: Scene[];
}

export async function exportAllData(): Promise<ExportData> {
  const project = await loadProject();
  const scenes = await getAllScenes();

  const data: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    project,
    scenes,
  };

  console.log(`${LOG_PREFIX} Data exported (${scenes.length} scenes)`);
  return data;
}

export async function importAllData(data: ExportData): Promise<void> {
  if (!data || data.version !== 1) {
    throw new Error(`${LOG_PREFIX} Invalid export data format`);
  }

  const database = getDB();

  // Clear existing data
  const tx = database.transaction(['project', 'scenes'], 'readwrite');

  // Import project
  if (data.project) {
    const hotProject: HotProject = {
      project: data.project,
      lastSaved: Date.now(),
      lastDeployedSha: {},
      coldBaseline: undefined,
    };
    await tx.objectStore('project').put(hotProject, 'current');
  }

  // Import scenes
  const scenesStore = tx.objectStore('scenes');
  await scenesStore.clear();
  for (const scene of data.scenes) {
    await scenesStore.put(scene, scene.id);
  }

  await tx.done;
  console.log(`${LOG_PREFIX} Data imported (${data.scenes.length} scenes)`);
}

// --- Clear All Data ---

export async function clearAllData(): Promise<void> {
  const database = getDB();

  const tx = database.transaction(['project', 'scenes', 'editorState'], 'readwrite');
  await tx.objectStore('project').clear();
  await tx.objectStore('scenes').clear();
  await tx.objectStore('editorState').clear();
  await tx.done;

  console.log(`${LOG_PREFIX} All data cleared`);
}

// --- Check if data exists ---

export async function hasHotData(): Promise<boolean> {
  const database = getDB();
  const project = await database.get('project', 'current');
  return project !== undefined;
}
