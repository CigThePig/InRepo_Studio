/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: IndexedDB operations for local-first workspace persistence.
 *
 * Defines:
 * - WorkspaceRecordSchema — canonical project content persistence (type: schema)
 * - EditorUIStateSchema — editor-only persistence (type: schema)
 * - HotProjectSchema — deploy baseline/SHA metadata (type: schema)
 *
 * Canonical key set:
 * - Workspace key: workspace/current
 * - Editor UI key: editorState/current
 *
 * Apply/Rebuild semantics:
 * - Workspace writes are auto-saved and feed runtime/deploy pack build.
 * - EditorUI writes are auto-saved and never carry project content payloads.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Project, Scene } from '@/types';
import { createDefaultProject } from '@/types';
import type { PresetSavedConfig } from '@/types/preset';
import type { AssetRegistryState } from '@/editor/assets';
import { DEFAULT_ASSET_REGISTRY_STATE } from '@/editor/assets';
import type { RepoAssetManifest } from '@/storage/cold';
import type { EditorUIState, WorkspaceContent, WorkspaceMeta } from '@/types/workspace';
import { initScriptStorage, listScripts, saveScript, clearScriptStorage } from './scriptStorage';
import { ensureAtlasSliceTileIds } from '@/shared/atlasTileIds';

export type {
  BrushSize,
  EditorIntent,
  EditorDomain,
  EditorPayload,
  ViewportState,
  PanelStates,
  SelectedTile,
  LayerVisibility,
  LayerLocks,
} from '@/types/workspace';

const DB_NAME = 'inrepo-studio';
const DB_VERSION = 2;
const LOG_PREFIX = '[Storage/Hot]';
const WORKSPACE_VERSION = 1;
const REFACTOR_VERSION = 1;

export interface ColdBaseline {
  project: {
    etag: string | null;
    lastModified: string | null;
  };
  checkedAt: number;
}

export interface HotProject {
  coldBaseline?: ColdBaseline;
  project: Project;
  lastSaved: number;
  lastDeployedSha: Record<string, string>;
  presetConfig?: PresetSavedConfig;
}

interface LegacyEditorState extends EditorUIState {
  assetRegistry?: AssetRegistryState;
  repoAssetManifest?: RepoAssetManifest | null;
}

interface InRepoStudioDB extends DBSchema {
  project: { key: string; value: HotProject };
  scenes: { key: string; value: Scene };
  editorState: { key: string; value: EditorUIState };
  workspace: { key: string; value: WorkspaceContent };
}

let db: IDBPDatabase<InRepoStudioDB> | null = null;

function cloneAssetRegistryState(state: AssetRegistryState): AssetRegistryState {
  return {
    selectedAssetId: state.selectedAssetId,
    groups: state.groups.map((group) => ({
      ...group,
      assets: group.assets.map((asset) => ({ ...asset, rect: asset.rect ? { ...asset.rect } : undefined })),
    })),
    animations: state.animations.map((animation) => ({
      ...animation,
      pivot: { ...animation.pivot },
      frames: animation.frames.map((frame) => ({
        sourceAssetId: frame.sourceAssetId,
        rect: { ...frame.rect },
        offset: frame.offset ? { ...frame.offset } : undefined,
        durationMs: frame.durationMs,
      })),
    })),
    animationSets: (state.animationSets ?? []).map((animationSet) => ({
      ...animationSet,
      directions: { ...animationSet.directions },
    })),
    animStateMachines: (state.animStateMachines ?? []).map((sm) => ({
      ...sm,
      states: sm.states.map((s) => ({
        ...s,
        position: { ...s.position },
      })),
      transitions: sm.transitions.map((t) => ({
        ...t,
        condition: { ...t.condition },
      })),
    })),
  };
}

const DEFAULT_EDITOR_STATE: EditorUIState = {
  currentSceneId: null,
  currentTool: 'select',
  intent: 'interact',
  domain: 'ground',
  payload: null,
  editorMode: 'select',
  rightBerryOpen: false,
  leftBerryOpen: false,
  activeLayer: 'ground',
  layerOrder: ['ground', 'props', 'collision', 'triggers'],
  selectedTile: null,
  selectedEntityType: null,
  selectedEntityIds: [],
  selectedPropSpriteIds: [],
  selectedAssetId: null,
  brushSize: 1,
  entitySnapToGrid: true,
  viewport: { panX: 0, panY: 0, zoom: 1 },
  panelStates: { topExpanded: false, bottomExpanded: true },
  recentTiles: [],
  layerVisibility: { ground: true, props: true, collision: true, triggers: true },
  layerLocks: { ground: false, props: false, collision: false, triggers: false },
  contentVersionToken: null,
};

function inferIntentFromTool(tool: EditorUIState['currentTool'] | undefined): EditorUIState['intent'] {
  if (tool === 'paint' || tool === 'entity') return 'place';
  if (tool === 'erase') return 'remove';
  return 'interact';
}

function inferDomainFromLegacy(state: Partial<EditorUIState>): EditorUIState['domain'] {
  if (state.editorMode && state.editorMode !== 'select') return state.editorMode as EditorUIState['domain'];
  if (state.currentTool === 'entity') return 'entities';
  if (state.activeLayer === 'props') return 'props';
  if (state.activeLayer === 'collision') return 'collision';
  if (state.activeLayer === 'triggers') return 'triggers';
  return 'ground';
}

function createWorkspaceMeta(now = Date.now()): WorkspaceMeta {
  return {
    lastSnapshotAt: now,
    dirtyActionCount: 0,
    lastSavedAt: now,
    refactorVersion: REFACTOR_VERSION,
  };
}

function createDefaultWorkspaceContent(project?: Project): WorkspaceContent {
  const now = Date.now();
  return {
    version: WORKSPACE_VERSION,
    project: project ?? createDefaultProject('New Project'),
    scenes: {},
    assetRegistry: cloneAssetRegistryState(DEFAULT_ASSET_REGISTRY_STATE),
    presetConfig: null,
    scripts: {},
    meta: createWorkspaceMeta(now),
  };
}

async function migrateLegacyDataIfNeeded(database: IDBPDatabase<InRepoStudioDB>): Promise<void> {
  const existing = await database.get('workspace', 'current');
  if (existing) return;

  const [hotProject, scenes, legacyEditorState] = await Promise.all([
    database.get('project', 'current'),
    database.getAll('scenes'),
    database.get('editorState', 'current') as Promise<LegacyEditorState | undefined>,
  ]);

  const workspace = createDefaultWorkspaceContent(hotProject?.project);
  workspace.scenes = Object.fromEntries(scenes.map((scene) => [scene.id, scene]));
  workspace.assetRegistry = cloneAssetRegistryState(
    legacyEditorState?.assetRegistry ?? DEFAULT_ASSET_REGISTRY_STATE
  );
  workspace.presetConfig = hotProject?.presetConfig ?? null;

  await initScriptStorage();
  const scripts = await listScripts();
  for (const script of scripts) {
    workspace.scripts[script.scriptId] = script;
  }

  await database.put('workspace', workspace, 'current');

  const editorState: EditorUIState = {
    ...DEFAULT_EDITOR_STATE,
    ...legacyEditorState,
    intent: legacyEditorState?.intent ?? inferIntentFromTool(legacyEditorState?.currentTool),
    domain: legacyEditorState?.domain ?? inferDomainFromLegacy(legacyEditorState ?? {}),
    selectedAssetId:
      legacyEditorState?.selectedAssetId
      ?? legacyEditorState?.assetRegistry?.selectedAssetId
      ?? DEFAULT_EDITOR_STATE.selectedAssetId,
    viewport: { ...DEFAULT_EDITOR_STATE.viewport, ...legacyEditorState?.viewport },
    panelStates: { ...DEFAULT_EDITOR_STATE.panelStates, ...legacyEditorState?.panelStates },
    layerVisibility: { ...DEFAULT_EDITOR_STATE.layerVisibility, ...legacyEditorState?.layerVisibility },
    layerLocks: { ...DEFAULT_EDITOR_STATE.layerLocks, ...legacyEditorState?.layerLocks },
  };

  await database.put('editorState', editorState, 'current');
  console.log(`${LOG_PREFIX} Migrated legacy hot stores into workspace/current`);
}

export async function initHotStorage(): Promise<void> {
  if (db) return;

  db = await openDB<InRepoStudioDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('project')) database.createObjectStore('project');
      if (!database.objectStoreNames.contains('scenes')) database.createObjectStore('scenes');
      if (!database.objectStoreNames.contains('editorState')) database.createObjectStore('editorState');
      if (!database.objectStoreNames.contains('workspace')) database.createObjectStore('workspace');
    },
  });

  await migrateLegacyDataIfNeeded(db);
  console.log(`${LOG_PREFIX} IndexedDB initialized`);
}

function getDB(): IDBPDatabase<InRepoStudioDB> {
  if (!db) throw new Error(`${LOG_PREFIX} Database not initialized. Call initHotStorage() first.`);
  return db;
}

async function saveScriptsToLegacyDb(scripts: Record<string, import('@/types').ScriptFile>): Promise<void> {
  await initScriptStorage();
  await clearScriptStorage();
  for (const script of Object.values(scripts)) {
    await saveScript(script);
  }
}

export async function loadWorkspaceContent(): Promise<WorkspaceContent> {
  const database = getDB();
  const workspace = await database.get('workspace', 'current');
  if (!workspace) return createDefaultWorkspaceContent();

  let currentWorkspace = workspace;

  const normalizedProject = ensureAtlasSliceTileIds(currentWorkspace.project);
  if (normalizedProject.changed) {
    currentWorkspace = {
      ...currentWorkspace,
      project: normalizedProject.project,
    };
    await database.put('workspace', currentWorkspace, 'current');
  }

  if (Object.keys(currentWorkspace.scripts ?? {}).length === 0) {
    await initScriptStorage();
    const scripts = await listScripts();
    if (scripts.length > 0) {
      const upgraded: WorkspaceContent = {
        ...currentWorkspace,
        scripts: Object.fromEntries(scripts.map((script) => [script.scriptId, script])),
      };
      await database.put('workspace', upgraded, 'current');
      return upgraded;
    }
  }

  return currentWorkspace;
}

export async function saveWorkspaceContent(next: WorkspaceContent): Promise<void> {
  const database = getDB();
  const now = Date.now();
  const normalized: WorkspaceContent = {
    ...next,
    version: WORKSPACE_VERSION,
    meta: {
      ...createWorkspaceMeta(now),
      ...next.meta,
      lastSavedAt: now,
      refactorVersion: REFACTOR_VERSION,
    },
  };
  await database.put('workspace', normalized, 'current');
  await saveScriptsToLegacyDb(normalized.scripts);

  const existingProject = await database.get('project', 'current');
  if (existingProject) {
    await database.put('project', {
      ...existingProject,
      project: normalized.project,
      presetConfig: normalized.presetConfig ?? undefined,
      lastSaved: now,
    }, 'current');
  }
}

export async function loadEditorUIState(): Promise<EditorUIState> {
  const database = getDB();
  const state = await database.get('editorState', 'current');
  if (!state) return { ...DEFAULT_EDITOR_STATE };
  return {
    ...DEFAULT_EDITOR_STATE,
    ...state,
    intent: state.intent ?? inferIntentFromTool(state.currentTool),
    domain: state.domain ?? inferDomainFromLegacy(state),
    viewport: { ...DEFAULT_EDITOR_STATE.viewport, ...state.viewport },
    panelStates: { ...DEFAULT_EDITOR_STATE.panelStates, ...state.panelStates },
    layerVisibility: { ...DEFAULT_EDITOR_STATE.layerVisibility, ...state.layerVisibility },
    layerLocks: { ...DEFAULT_EDITOR_STATE.layerLocks, ...state.layerLocks },
  };
}

export async function saveEditorUIState(state: EditorUIState): Promise<void> {
  const database = getDB();
  await database.put('editorState', state, 'current');
}

// Legacy aliases
export type EditorState = EditorUIState;
export const saveEditorState = saveEditorUIState;
export const loadEditorState = loadEditorUIState;

export async function saveProject(project: Project): Promise<void> {
  const database = getDB();
  const workspace = await loadWorkspaceContent();
  await saveWorkspaceContent({ ...workspace, project });

  const existing = await database.get('project', 'current');
  const hotProject: HotProject = {
    project,
    lastSaved: Date.now(),
    lastDeployedSha: existing?.lastDeployedSha ?? {},
    coldBaseline: existing?.coldBaseline,
    presetConfig: workspace.presetConfig ?? undefined,
  };
  await database.put('project', hotProject, 'current');
}

export async function loadProject(): Promise<Project | null> {
  const workspace = await loadWorkspaceContent();
  return workspace.project ?? null;
}

export async function getHotProject(): Promise<HotProject | null> {
  const database = getDB();
  const workspace = await loadWorkspaceContent();
  const existing = await database.get('project', 'current');
  if (!workspace.project) return null;
  if (existing) return { ...existing, project: workspace.project, presetConfig: workspace.presetConfig ?? undefined };
  return {
    project: workspace.project,
    lastSaved: workspace.meta.lastSavedAt,
    lastDeployedSha: {},
    presetConfig: workspace.presetConfig ?? undefined,
  };
}

export async function getColdBaseline(): Promise<ColdBaseline | null> {
  const hotProject = await getHotProject();
  return hotProject?.coldBaseline ?? null;
}

export async function setColdBaseline(baseline: ColdBaseline): Promise<void> {
  const database = getDB();
  const hotProject = await getHotProject();
  if (!hotProject) return;
  await database.put('project', { ...hotProject, coldBaseline: baseline }, 'current');
}

export async function updateLastDeployedSha(filePath: string, sha: string): Promise<void> {
  const database = getDB();
  const hotProject = await getHotProject();
  if (!hotProject) return;
  hotProject.lastDeployedSha[filePath] = sha;
  await database.put('project', hotProject, 'current');
}

export async function savePresetConfig(config: PresetSavedConfig): Promise<void> {
  const workspace = await loadWorkspaceContent();
  await saveWorkspaceContent({ ...workspace, presetConfig: config });
}

export async function loadPresetConfig(): Promise<PresetSavedConfig | null> {
  const workspace = await loadWorkspaceContent();
  return workspace.presetConfig ?? null;
}

export async function saveScene(scene: Scene): Promise<void> {
  const database = getDB();
  await database.put('scenes', scene, scene.id);
  const workspace = await loadWorkspaceContent();
  await saveWorkspaceContent({ ...workspace, scenes: { ...workspace.scenes, [scene.id]: scene } });
}

export async function loadScene(sceneId: string): Promise<Scene | null> {
  const workspace = await loadWorkspaceContent();
  return workspace.scenes[sceneId] ?? null;
}

export async function getAllScenes(): Promise<Scene[]> {
  const workspace = await loadWorkspaceContent();
  return Object.values(workspace.scenes);
}

export async function deleteScene(sceneId: string): Promise<void> {
  const database = getDB();
  await database.delete('scenes', sceneId);
  const workspace = await loadWorkspaceContent();
  const scenes = { ...workspace.scenes };
  delete scenes[sceneId];
  await saveWorkspaceContent({ ...workspace, scenes });
}

export async function getAllSceneIds(): Promise<string[]> {
  const workspace = await loadWorkspaceContent();
  return Object.keys(workspace.scenes);
}

export interface StorageQuotaInfo {
  used: number;
  quota: number;
  percentUsed: number;
  isNearLimit: boolean;
}

export async function checkStorageQuota(): Promise<StorageQuotaInfo | null> {
  if (!navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  const used = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;
  const percentUsed = quota > 0 ? (used / quota) * 100 : 0;
  return { used, quota, percentUsed, isNearLimit: percentUsed > 80 };
}

export interface WorkspaceBundle {
  version: number;
  exportedAt: number;
  workspace: WorkspaceContent;
  editorUIState: EditorUIState;
}

export async function exportWorkspaceBundle(): Promise<WorkspaceBundle> {
  return {
    version: 2,
    exportedAt: Date.now(),
    workspace: await loadWorkspaceContent(),
    editorUIState: await loadEditorUIState(),
  };
}

export async function importWorkspaceBundle(data: WorkspaceBundle): Promise<void> {
  if (!data || data.version < 1 || !data.workspace) {
    throw new Error(`${LOG_PREFIX} Invalid workspace bundle`);
  }

  const database = getDB();
  await database.put('workspace', data.workspace, 'current');
  await database.put('editorState', data.editorUIState ?? DEFAULT_EDITOR_STATE, 'current');
  await saveScriptsToLegacyDb(data.workspace.scripts ?? {});
}

// Backward-compatible names
export type ExportData = WorkspaceBundle;
export const exportAllData = exportWorkspaceBundle;
export const importAllData = importWorkspaceBundle;

export async function clearAllData(): Promise<void> {
  const database = getDB();
  const tx = database.transaction(['project', 'scenes', 'editorState', 'workspace'], 'readwrite');
  await Promise.all([
    tx.objectStore('project').clear(),
    tx.objectStore('scenes').clear(),
    tx.objectStore('editorState').clear(),
    tx.objectStore('workspace').clear(),
  ]);
  await tx.done;
  await initScriptStorage();
  await clearScriptStorage();
}

export async function hasHotData(): Promise<boolean> {
  const database = getDB();
  const workspace = await database.get('workspace', 'current');
  return workspace !== undefined;
}
