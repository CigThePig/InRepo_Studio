/**
 * Editor Initialization
 *
 * This module initializes the editor mode of InRepo Studio.
 * Sets up the canvas, panels, and tool systems.
 */

import {
  loadEditorState,
  loadWorkspaceContent,
  saveWorkspaceContent,
  loadProject,
  loadScene,
  saveProject,
  saveEditorState,
  saveScene,
  exportAllData,
  checkStorageQuota,
  checkForUpdates,
  forceRefreshFromCold,
  scanAssetFolders,
} from '@/storage';
import type {
  BrushSize,
  EditorState,
  EditorIntent,
  EditorDomain,
  EditorPayload,
  SelectedTile,
  StorageQuotaInfo,
  UpdateCheckResult,
} from '@/storage';
import type { WorkspaceContent } from '@/types/workspace';
import { ensureSceneTilesets, type Scene, type Project, type LayerType, type SpriteRef } from '@/types';
import { createCanvas, type CanvasController } from '@/editor/canvas';
import {
  createTopPanel,
  createTopBarV2,
  createBottomPanel,
  type TopPanelController,
  type TopBarV2Controller,
  type BottomPanelController,
  createBottomContextStrip,
  type BottomContextStripController,
  createRightBerry,
  type RightBerryController,
  createLeftBerry,
  type LeftBerryController,
  createEntitiesTab,
  type EntitiesTabController,
  createAssetPalette,
  createBrushSizeControl,
  createLayerPanel,
  type LayerPanelController,
  createUtilitiesTab,
} from '@/editor/panels';
import {
  createAssetRegistry,
  rehydrateSpriteAtlasesIntoAssetRegistry,
  type AssetEntry,
  type AssetRegistry,
  type AssetRegistryState,
} from '@/editor/assets';
import { ASSET_GROUP_PATHS } from '@/editor/assets/assetGroup';
import { setContentVersionToken } from '@/shared/paths';
import { getAtlasCategoryName } from '@/shared/atlasNaming';
import { resolveAtlasSliceByLocalId } from '@/shared/atlasTileIds';
import { createPaintTool, type PaintTool } from '@/editor/tools/paint';
import { createEraseTool, type EraseTool } from '@/editor/tools/erase';
import { createSelectTool, type SelectTool } from '@/editor/tools/select';
import {
  createSelectEntityController,
  type SelectEntityController,
} from '@/editor/tools/selectEntityController';
import { createEntityTool, type EntityTool } from '@/editor/tools/entity';
import { createPropSpriteTool, type PropSpriteTool } from '@/editor/tools/propSprite';
import { createClipboard, type Clipboard } from '@/editor/tools/clipboard';
import { createHistoryManager, type HistoryManager } from '@/editor/history';
import {
  createAuthManager,
  createTokenStorage,
  uploadAssetGroup,
  type AssetUploadGroup,
  type AssetUploadItem,
  type AssetUploadProgress,
  type AuthManager,
} from '@/deploy';
import {
  preparePlaytest,
  setEditorStateBackup,
  getEditorStateBackup,
  clearEditorStateBackup,
  switchMode,
} from '@/boot/modeRouter';
import {
  createSceneManager,
  createSceneSelector,
  showCreateSceneDialog,
  showRenameDialog,
  showResizeDialog,
  showDeleteConfirmation,
  showDuplicateDialog,
  type SceneManager,
  type SceneSelector,
  type SceneAction,
} from '@/editor/scenes';
import { createEntityManager, type EntityManager } from '@/editor/entities/entityManager';
import { createPropSpriteManager, type PropSpriteManager } from '@/editor/props/propSpriteManager';
import { createEntitySelection, type EntitySelection } from '@/editor/entities/entitySelection';
import { EDITOR_FLAGS, isFlagEnabled, setFlag } from '@/editor/core/featureFlags';
import {
  getEditorMode,
  setEditorMode,
  setInitialEditorMode,
  type EditorMode,
} from '@/editor/core/editorMode';
import { uxFeedback } from '@/editor/uxFeedback';

import { downloadJson } from '@/utils/download';
import {
  createBlocklyCockpit,
  type BlocklyCockpitController,
} from '@/editor/blockly';
import type { ScriptLogicTarget } from '@/types/script';
import type { PresetCategoryId } from '@/types/preset';
import { createPresetConfigStore } from '@/editor/presets';
import { createPresetRegistry } from '@/runtime/presets';

const LOG_PREFIX = '[Editor]';

// --- Editor State ---

let editorState: EditorState | null = null;
let workspaceContent: WorkspaceContent | null = null;
let currentProject: Project | null = null;
let canvasController: CanvasController | null = null;
let topPanelController: TopPanelController | TopBarV2Controller | null = null;
let bottomPanelController: BottomPanelController | null = null;
let bottomContextStrip: BottomContextStripController | null = null;
let currentScene: Scene | null = null;
let paintTool: PaintTool | null = null;
let eraseTool: EraseTool | null = null;
let selectTool: SelectTool | null = null;
let entityTool: EntityTool | null = null;
let propSpriteTool: PropSpriteTool | null = null;
let clipboard: Clipboard | null = null;
let currentBrushSize: BrushSize = 1;
let authManager: AuthManager | null = null;
let historyManager: HistoryManager | null = null;
let updateInfo: UpdateCheckResult | null = null;
let sceneManager: SceneManager | null = null;
let sceneSelector: SceneSelector | null = null;
let layerPanelController: LayerPanelController | null = null;
let entityManager: EntityManager | null = null;
let entitySelection: EntitySelection | null = null;
let propSpriteManager: PropSpriteManager | null = null;
let tileSelectionActive = false;
let rightBerryController: RightBerryController | null = null;
let leftBerryController: LeftBerryController | null = null;
let entitiesTab: EntitiesTabController | null = null;
let entityMoveController: SelectEntityController | null = null;
let entityMoveActive = false;
let assetRegistry: AssetRegistry | null = null;

// Blockly cockpit controller — assigned during init, used to enter/exit Blockly Mode.
// Exported via getBlocklyCockpit() for other modules to trigger mode entry.
let blocklyCockpit: BlocklyCockpitController | null = null;
let presetRegistryRef: ReturnType<typeof createPresetRegistry> | null = null;

// Preset config store — hoisted so Blockly cockpit can read preset state.
let presetConfigStoreRef: {
  getConfig(): import('@/types/preset').PresetSavedConfig;
  enableCategory(categoryId: PresetCategoryId, presetId: string): void;
} | null = null;

const ERASE_HOVER_STYLE = {
  fill: 'rgba(255, 80, 80, 0.25)',
  border: 'rgba(255, 120, 120, 0.9)',
};

function resolveRepoConfig(): { owner: string; repo: string } | null {
  const owner = localStorage.getItem('inrepo_repo_owner');
  const repo = localStorage.getItem('inrepo_repo_name');
  if (owner && repo) {
    return { owner, repo };
  }

  const baseUrl = import.meta.env.BASE_URL ?? '/';
  const trimmed = baseUrl.replace(/^\/|\/$/g, '');
  const inferredRepo = trimmed.split('/')[0];
  if (!inferredRepo) {
    return null;
  }

  const host = window.location.hostname;
  if (!host.endsWith('.github.io')) {
    return null;
  }

  const inferredOwner = host.replace('.github.io', '');
  if (!inferredOwner) {
    return null;
  }

  return { owner: inferredOwner, repo: inferredRepo };
}

function updateHoverPreview(tool: EditorState['currentTool']): void {
  const renderer = canvasController?.getRenderer();
  if (!renderer) return;

  if (tool === 'erase') {
    renderer.setHoverBrushSize(currentBrushSize);
    renderer.setHoverStyle(ERASE_HOVER_STYLE);
    canvasController?.setBrushCursorSize(currentBrushSize);
    canvasController?.setBrushCursorColor(ERASE_HOVER_STYLE.border);
  } else {
    renderer.setHoverBrushSize(1);
    renderer.setHoverStyle();
    canvasController?.setBrushCursorSize(1);
    canvasController?.setBrushCursorColor('rgba(255, 255, 255, 0.9)');
  }
}

function applyActiveLayer(layer: LayerType): void {
  if (!editorState) return;
  if (editorState.activeLayer === layer) {
    return;
  }
  editorState.activeLayer = layer;
  scheduleSave();
  layerPanelController?.setActiveLayer(layer);
  if (topPanelController && 'setActiveLayer' in topPanelController) {
    topPanelController.setActiveLayer(layer);
  }
  canvasController?.setActiveLayer(layer);
  updateBottomPanelToolContext();
}

function applyToolChange(tool: EditorState['currentTool'], updateUI = false): void {
  if (!editorState) return;
  editorState.currentTool = tool;
  scheduleSave();
  if (updateUI) {
    bottomPanelController?.setCurrentIntent(editorState.intent);
  }
  updateHoverPreview(tool);
  if (tool !== 'select') {
    selectTool?.clearSelection();
    entitySelection?.clear();
    tileSelectionActive = false;
    updateEntitySelectionUI();
  }
  if (tool !== 'entity') {
    canvasController?.getRenderer().setEntityPreview(null);
    canvasController?.getRenderer().setEntityHighlightId(null);
    canvasController?.invalidateScene();
  }
  if (tool !== 'paint') {
    canvasController?.getRenderer().setPropSpritePreview(null);
  }
  updateBottomContextStrip();
}

function resolveToolForIntent(intent: EditorIntent, domain: EditorDomain): EditorState['currentTool'] {
  if (intent === 'interact') return 'select';
  if (intent === 'remove') {
    return domain === 'entities' ? 'select' : 'erase';
  }
  return domain === 'entities' ? 'entity' : 'paint';
}

function setPayload(nextPayload: EditorPayload | null): void {
  if (!editorState) return;
  editorState.payload = nextPayload;
  scheduleSave();
}

function resolveSelectionPixelSize(selection: SelectedTile | null): { width: number; height: number } | null {
  if (!selection || !currentProject) return null;
  if (selection.category.startsWith('atlas:')) {
    const atlas = findAtlasByCategory(currentProject, selection.category);
    const sliceRect = resolveAtlasSliceByLocalId(atlas, selection.index)?.rect;
    if (sliceRect && sliceRect.w > 0 && sliceRect.h > 0) {
      return { width: sliceRect.w, height: sliceRect.h };
    }
    if (atlas?.sliceSize) {
      return { width: atlas.sliceSize.width, height: atlas.sliceSize.height };
    }
    return null;
  }
  if (currentScene) {
    return { width: currentScene.tileSize, height: currentScene.tileSize };
  }
  return null;
}


function resolveSpriteRefPixelSize(sprite: SpriteRef): { width: number; height: number } | null {
  return resolveSelectionPixelSize({ category: sprite.category, index: sprite.index });
}

function buildTilePayload(domain: EditorDomain, selection: SelectedTile | null): EditorPayload | null {
  if (!selection) return null;
  if (domain === 'props') {
    const size = resolveSelectionPixelSize(selection);
    const isTileSized = size && currentScene
      ? size.width === currentScene.tileSize && size.height === currentScene.tileSize
      : true;
    const kind = isTileSized ? 'prop' : 'propSprite';
    return { kind, id: `${selection.category}:${selection.index}` };
  }
  return { kind: 'tile', id: `${selection.category}:${selection.index}` };
}

function buildEntityPayload(typeName: string | null): EditorPayload | null {
  if (!typeName) return null;
  return { kind: 'entity', id: typeName };
}

function isPayloadCompatible(domain: EditorDomain, payload: EditorPayload | null): boolean {
  if (!payload) return true;
  if (domain === 'ground') return payload.kind === 'tile';
  if (domain === 'props') return payload.kind === 'prop' || payload.kind === 'propSprite';
  if (domain === 'entities') return payload.kind === 'entity';
  if (domain === 'collision') return payload.kind === 'collision';
  return payload.kind === 'trigger';
}

function ensurePayloadForDomain(domain: EditorDomain): void {
  if (!editorState) return;
  if (isPayloadCompatible(domain, editorState.payload)) {
    return;
  }

  if (domain === 'entities') {
    const fallback = editorState.selectedEntityType ?? currentProject?.entityTypes?.[0]?.name ?? null;
    if (fallback && editorState.selectedEntityType !== fallback) {
      editorState.selectedEntityType = fallback;
    }
    setPayload(buildEntityPayload(fallback));
    return;
  }

  if (domain === 'ground' || domain === 'props') {
    setPayload(buildTilePayload(domain, editorState.selectedTile));
    return;
  }

  if (domain === 'collision') {
    setPayload({ kind: 'collision', id: 'paint' });
    return;
  }

  setPayload({ kind: 'trigger', id: 'paint' });
}

function applyIntent(intent: EditorIntent, updateUI = false): void {
  if (!editorState) return;
  if (editorState.intent === intent) return;
  editorState.intent = intent;
  scheduleSave();
  if (updateUI) {
    bottomPanelController?.setCurrentIntent(intent);
  }

  const nextTool = resolveToolForIntent(intent, editorState.domain);
  applyToolChange(nextTool, true);
}

function applyDomain(domain: EditorDomain, updateUI = false): void {
  if (!editorState) return;
  if (editorState.domain === domain && editorState.editorMode === domain && getEditorMode() === domain) {
    if (updateUI) {
      rightBerryController?.setActiveTab(domain, { silent: true });
    }
    ensurePayloadForDomain(domain);
    const nextTool = resolveToolForIntent(editorState.intent, domain);
    applyToolChange(nextTool, true);
    updateBottomPanelToolContext();
    return;
  }

  editorState.domain = domain;
  editorState.editorMode = domain as EditorMode;
  scheduleSave();

  if (getEditorMode() !== domain) {
    setEditorMode(domain);
  }

  if (updateUI) {
    rightBerryController?.setActiveTab(domain, { silent: true });
  }

  if (domain === 'ground') applyActiveLayer('ground');
  if (domain === 'props') applyActiveLayer('props');
  if (domain === 'collision') applyActiveLayer('collision');
  if (domain === 'triggers') applyActiveLayer('triggers');

  ensurePayloadForDomain(domain);

  const nextTool = resolveToolForIntent(editorState.intent, domain);
  applyToolChange(nextTool, true);
  updateBottomPanelToolContext();
}

function updateBottomContextStrip(): void {
  if (!bottomContextStrip || !editorState) return;
  bottomContextStrip.setSelectToolActive(editorState.intent === 'interact');
  const moveFirstEnabled = isFlagEnabled(EDITOR_FLAGS.ENTITY_MOVE_FIRST);
  const toolAllowsEntitySelection =
    editorState.currentTool === 'select' ||
    (moveFirstEnabled && editorState.currentTool === 'entity');

  const selectedIds = editorState.selectedEntityIds ?? [];
  if (selectedIds.length > 0 && toolAllowsEntitySelection) {
    bottomContextStrip.setSelectionType('entities');
    bottomContextStrip.setSelectionCount(selectedIds.length);
    return;
  }

  const selectedPropSpriteIds = editorState.selectedPropSpriteIds ?? [];
  if (selectedPropSpriteIds.length > 0 && editorState.currentTool === 'select') {
    bottomContextStrip.setSelectionType('propSprites');
    bottomContextStrip.setSelectionCount(selectedPropSpriteIds.length);
    return;
  }

  if (editorState.intent !== 'interact') {
    bottomContextStrip.setSelectionType('none');
    return;
  }

  if (tileSelectionActive) {
    const selectionLayer = selectTool?.getSelection()?.layer;
    if (selectionLayer === 'triggers') {
      bottomContextStrip.setSelectionType('triggers');
    } else {
      bottomContextStrip.setSelectionType('tiles');
      bottomContextStrip.setPasteEnabled(clipboard?.hasData() ?? false);
    }
    return;
  }

  bottomContextStrip.setSelectionType('none');
}

function formatLayerLabel(layer: LayerType | null): string {
  if (!layer) return 'Layer';
  return layer.charAt(0).toUpperCase() + layer.slice(1);
}

function updateBottomPanelToolContext(): void {
  if (!bottomPanelController || !editorState) return;
  const mode = editorState.domain;
  const layer = editorState.activeLayer;
  const baseLocked = layer ? editorState.layerLocks?.[layer] ?? false : false;
  const isLocked = mode === 'entities' ? false : baseLocked;
  const placeEnabled = mode === 'entities' ? true : !baseLocked;
  const removeEnabled = mode === 'entities' ? true : !baseLocked;
  const layerLabel = mode === 'entities' ? 'Entities' : formatLayerLabel(layer);

  bottomPanelController.setIntentContext({
    layerLabel,
    placeEnabled,
    removeEnabled,
    isLocked,
  });
}

function normalizeAssetPath(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/{2,}/g, '/');
}

function normalizeRepoRelativePath(value: string): string {
  return normalizeAssetPath(value).replace(/^game\//, '');
}

function isRectEqual(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function resolveSelectedTileFromAsset(asset: AssetEntry, project: Project): SelectedTile | null {
  if (asset.type === 'entity') return null;
  if (/^data:/i.test(asset.dataUrl)) {
    return null;
  }

  const assetPath = normalizeAssetPath(asset.dataUrl);

  for (const category of project.tileCategories) {
    const categoryRoot = normalizeAssetPath(category.path);
    const files = category.files ?? [];

    for (let index = 0; index < files.length; index += 1) {
      const fullPath = normalizeAssetPath(`${categoryRoot}/${files[index]}`);
      if (fullPath === assetPath) {
        return { category: category.name, index };
      }
    }
  }

  if (asset.rect && !/^data:/i.test(asset.dataUrl)) {
    const assetAtlasPath = normalizeRepoRelativePath(asset.dataUrl);
    const atlas = (project.spriteAtlases ?? []).find(
      (candidate) => normalizeRepoRelativePath(candidate.path) === assetAtlasPath
    );
    if (!atlas) {
      return null;
    }

    const matchingSliceIds = (atlas.slices ?? [])
      .map((slice, index) => {
        if (!isRectEqual(slice.rect, asset.rect!)) return -1;
        return Number.isFinite(slice.tileId) ? (slice.tileId as number) : index;
      })
      .filter((value) => value >= 0);

    if (matchingSliceIds.length === 0) {
      return null;
    }

    if (matchingSliceIds.length > 1) {
      console.warn('[AtlasSelect] Multiple atlas slices matched by rect; using first', {
        atlas: atlas.path,
        rect: asset.rect,
        indices: matchingSliceIds,
      });
    }

    const localTileId = matchingSliceIds[0];
    console.log('[AtlasSelect] Selected atlas tile', { atlas: atlas.path, localTileId });
    return { category: getAtlasCategoryName(atlas.path), index: localTileId };
  }

  return null;
}

function findAtlasByCategory(project: Project, category: string) {
  return (project.spriteAtlases ?? []).find((atlas) => getAtlasCategoryName(atlas.path) === category) ?? null;
}

function getAtlasTileSizeMismatchReason(selection: SelectedTile): string | null {
  if (!currentProject || !currentScene) return null;
  if (!selection.category.startsWith('atlas:')) return null;

  const atlas = findAtlasByCategory(currentProject, selection.category);
  if (!atlas) return null;

  const rect = resolveAtlasSliceByLocalId(atlas, selection.index)?.rect;
  const width = rect?.w ?? atlas.sliceSize.width;
  const height = rect?.h ?? atlas.sliceSize.height;

  if (width !== currentScene.tileSize || height !== currentScene.tileSize) {
    return `"${atlas.name}" slice ${selection.index} is ${width}x${height}, but this scene uses ${currentScene.tileSize}x${currentScene.tileSize} tiles.`;
  }

  return null;
}

function applySelectedTile(
  selection: SelectedTile,
  options?: { setIntent?: EditorIntent; closeRightBerry?: boolean }
): void {
  if (!editorState) return;

  const previous = editorState.selectedTile;
  if (previous?.category === selection.category && previous.index === selection.index) {
    return;
  }

  editorState.selectedTile = selection;
  scheduleSave();
  canvasController?.setSelectedCategory(selection.category);

  if (editorState.domain === 'ground' || editorState.domain === 'props') {
    setPayload(buildTilePayload(editorState.domain, selection));
  }

  if (options?.setIntent) {
    applyIntent(options.setIntent, true);
  }

  if (options?.closeRightBerry) {
    rightBerryController?.close();
  }
}

function syncSelectedAssetSelection(
  selectedAssetId: string | null,
  options?: { setIntent?: EditorIntent; closeRightBerry?: boolean }
): void {
  if (!editorState || !assetRegistry || !currentProject) return;
  if (!selectedAssetId) return;

  const asset = assetRegistry.getAsset(selectedAssetId);
  if (!asset) return;

  const selection = resolveSelectedTileFromAsset(asset, currentProject);
  if (!selection) {
    // Local (data: URL) assets can't be painted until uploaded to the repo.
    if (asset.type !== 'entity' && /^data:/i.test(asset.dataUrl)) {
      showLocalAssetNotice(asset);
    }
    return;
  }

  const atlasMismatchReason = getAtlasTileSizeMismatchReason(selection);
  if (atlasMismatchReason) {
    if (editorState.domain === 'ground') {
      showAtlasMismatchNotice(`Can't paint atlas tile yet: ${atlasMismatchReason}`);
      return;
    }
    if (editorState.domain === 'props') {
      showAtlasMismatchNotice(`Placing as Prop object: ${atlasMismatchReason}`);
    }
  }

  applySelectedTile(selection, options);
}

let localAssetNoticeEl: HTMLElement | null = null;
let localAssetNoticeTimeout: number | null = null;
let atlasMismatchNoticeEl: HTMLElement | null = null;
let atlasMismatchNoticeTimeout: number | null = null;

function showLocalAssetNotice(asset: AssetEntry): void {
  // Show a temporary toast explaining why the asset can't be painted
  const container = document.getElementById('canvas-container');
  if (!container) return;

  if (localAssetNoticeEl) {
    localAssetNoticeEl.remove();
    if (localAssetNoticeTimeout !== null) {
      window.clearTimeout(localAssetNoticeTimeout);
    }
  }

  const notice = document.createElement('div');
  notice.style.cssText = `
    position: absolute;
    left: 50%;
    bottom: 60px;
    transform: translateX(-50%);
    background: rgba(20, 24, 48, 0.95);
    color: #ffddaa;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(255, 185, 80, 0.4);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    z-index: 30;
    max-width: 280px;
    text-align: center;
    line-height: 1.4;
  `;
  notice.textContent = `"${asset.name}" is a local asset. Upload it to the repo to use it for painting.`;
  container.appendChild(notice);
  localAssetNoticeEl = notice;

  localAssetNoticeTimeout = window.setTimeout(() => {
    notice.remove();
    localAssetNoticeEl = null;
    localAssetNoticeTimeout = null;
  }, 4000);
}

function showAtlasMismatchNotice(message: string): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  if (atlasMismatchNoticeEl) {
    atlasMismatchNoticeEl.remove();
    if (atlasMismatchNoticeTimeout !== null) {
      window.clearTimeout(atlasMismatchNoticeTimeout);
    }
  }

  const notice = document.createElement('div');
  notice.style.cssText = `
    position: absolute;
    left: 50%;
    bottom: 60px;
    transform: translateX(-50%);
    background: rgba(20, 24, 48, 0.95);
    color: #ffddaa;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(255, 185, 80, 0.4);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    z-index: 30;
    max-width: 320px;
    text-align: center;
    line-height: 1.4;
  `;
  notice.textContent = message;
  container.appendChild(notice);
  atlasMismatchNoticeEl = notice;

  atlasMismatchNoticeTimeout = window.setTimeout(() => {
    notice.remove();
    atlasMismatchNoticeEl = null;
    atlasMismatchNoticeTimeout = null;
  }, 4000);
}

function updateEntitySelectionUI(): void {
  if (!editorState || !canvasController || !currentScene || !entitySelection) return;
  const renderer = canvasController.getRenderer();
  const selectedIds = editorState.selectedEntityIds ?? [];
  const selectedPropSpriteIds = editorState.selectedPropSpriteIds ?? [];
  entitiesTab?.setSelection(selectedIds);
  if (leftBerryController?.getActiveTab() === 'animation') {
    leftBerryController.refreshTab('animation');
  }

  const moveFirstEnabled = isFlagEnabled(EDITOR_FLAGS.ENTITY_MOVE_FIRST);
  const allowEntitySelection =
    editorState.currentTool === 'select' ||
    (moveFirstEnabled && editorState.currentTool === 'entity');

  if (!allowEntitySelection || selectedIds.length === 0) {
    renderer.setEntitySelectionIds([]);
    renderer.setPropSpriteSelectionIds(selectedPropSpriteIds);
    canvasController.invalidateScene();
    updateBottomContextStrip();
    return;
  }

  const selectedEntities = currentScene.entities.filter((entity) =>
    selectedIds.includes(entity.id)
  );

  if (selectedEntities.length === 0) {
    renderer.setEntitySelectionIds([]);
    canvasController.invalidateScene();
    updateBottomContextStrip();
    return;
  }

  renderer.setEntitySelectionIds(selectedIds);
  renderer.setPropSpriteSelectionIds(selectedPropSpriteIds);
  canvasController.invalidateScene();

  updateBottomContextStrip();
}

function updateUndoRedoUI(canUndo: boolean, canRedo: boolean): void {
  if (topPanelController && 'setUndoRedoState' in topPanelController) {
    topPanelController.setUndoRedoState(canUndo, canRedo);
  }
}

function setLayerPanelVisibility(visible: boolean): void {
  const element = layerPanelController?.getElement();
  if (!element) return;
  element.classList.toggle('layer-panel--hidden', !visible);
  element.setAttribute('aria-hidden', String(!visible));
}

function openSettingsPlaceholder(): void {
  const isHidden = isFlagEnabled(EDITOR_FLAGS.HIDE_LAYER_PANEL);
  const prompt = isHidden
    ? 'Show Layer Panel? (Advanced)'
    : 'Hide Layer Panel? (Advanced)';
  const confirm = window.confirm(`Settings (Preview)\n\n${prompt}`);
  if (!confirm) {
    return;
  }
  setFlag(EDITOR_FLAGS.HIDE_LAYER_PANEL, !isHidden);
  setLayerPanelVisibility(isHidden);
}

export function getEditorState(): EditorState | null {
  return editorState;
}

export function getCanvas(): CanvasController | null {
  return canvasController;
}

export function getTopPanel(): TopPanelController | TopBarV2Controller | null {
  return topPanelController;
}

export function getBottomPanel(): BottomPanelController | null {
  return bottomPanelController;
}

export function getAuthManager(): AuthManager | null {
  return authManager;
}

export function getBlocklyCockpit(): BlocklyCockpitController | null {
  return blocklyCockpit;
}

/**
 * Resolve a blockType string (from preset hooks) to a ScriptLogicTarget.
 *
 * Mapping rules (deterministic, prefix-based):
 * - blockType containing 'movement'  → preset target: movement
 * - blockType containing 'controls'  → preset target: controls
 * - blockType containing 'camera'    → preset target: camera
 * - blockType containing 'animation' → preset target: animation
 * - unknown                          → preset target: movement (safe default)
 *
 * The blockType format from preset hooks is typically: <category>_<action>_<detail>
 * e.g. "movement_set_speed", "controls_on_keypress", "camera_follow_entity".
 */
function resolveBlocklyTargetFromBlockType(blockType: string): ScriptLogicTarget {
  const lower = blockType.toLowerCase();
  const categories = ['controls', 'movement', 'camera', 'animation', 'entity-animation'] as const;
  for (const cat of categories) {
    if (lower.includes(cat)) {
      return { type: 'preset', targetId: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1) };
    }
  }
  // Default to movement preset if no category match
  return { type: 'preset', targetId: 'movement', label: 'Movement' };
}

export function getCurrentScene(): Scene | null {
  return currentScene;
}

function setCurrentScene(scene: Scene | null, options: { clearHistory?: boolean } = {}): void {
  if (options.clearHistory && scene?.id !== currentScene?.id) {
    historyManager?.clear();
  }

  currentScene = scene;
}

// --- Debounced Save ---

function getTopBarV2() {
  return topPanelController && 'markDirty' in topPanelController
    ? (topPanelController as TopBarV2Controller)
    : null;
}

let saveTimeout: number | null = null;
let sceneSaveTimeout: number | null = null;
let workspaceSaveTimeout: number | null = null;
const SAVE_DEBOUNCE_MS = 500;
const SCENE_SAVE_DEBOUNCE_MS = 500;

function scheduleSave(): void {
  getTopBarV2()?.markDirty();

  if (saveTimeout !== null) {
    window.clearTimeout(saveTimeout);
  }
  saveTimeout = window.setTimeout(async () => {
    saveTimeout = null;
    if (editorState) {
      await saveEditorState(editorState);
      getTopBarV2()?.markSaved();
      console.log(`${LOG_PREFIX} Editor state saved`);
    }
  }, SAVE_DEBOUNCE_MS);
}

function scheduleWorkspaceSave(): void {
  if (workspaceSaveTimeout !== null) {
    window.clearTimeout(workspaceSaveTimeout);
  }
  workspaceSaveTimeout = window.setTimeout(async () => {
    workspaceSaveTimeout = null;
    if (!workspaceContent) return;
    await saveWorkspaceContent(workspaceContent);
  }, SAVE_DEBOUNCE_MS);
}

function scheduleSceneSave(scene: Scene): void {
  getTopBarV2()?.markDirty();

  if (sceneSaveTimeout !== null) {
    window.clearTimeout(sceneSaveTimeout);
  }
  sceneSaveTimeout = window.setTimeout(async () => {
    sceneSaveTimeout = null;
    await saveScene(scene);
    console.log(`${LOG_PREFIX} Scene "${scene.name}" auto-saved`);
  }, SCENE_SAVE_DEBOUNCE_MS);
}

function handleSceneChange(scene: Scene): void {
  setCurrentScene(scene);
  canvasController?.invalidateScene();
  scheduleSceneSave(scene);
}

async function applyProjectUpdate(updatedProject: Project, commitSha: string | null): Promise<void> {
  currentProject = updatedProject;
  await saveProject(updatedProject);

  if (editorState && commitSha) {
    editorState.contentVersionToken = commitSha;
    setContentVersionToken(commitSha);
    scheduleSave();
  }

  canvasController?.getTileCache().clear();
  canvasController?.setProject(updatedProject);
  if (canvasController) {
    await canvasController.preloadProject(updatedProject);
    canvasController.invalidateScene();
    canvasController.getRenderer().setEntityTypes(updatedProject.entityTypes ?? []);
  }

  entitiesTab?.refresh();
}

// --- Initialization ---

export async function initEditor(): Promise<void> {
  uxFeedback.init();

  console.log(`${LOG_PREFIX} Initializing editor...`);

  workspaceContent = await loadWorkspaceContent();

  // Load editor state
  editorState = await loadEditorState();
  editorState = restoreEditorStateFromPlaytest(editorState);
  console.log(`${LOG_PREFIX} Editor state loaded:`, editorState);
  setContentVersionToken(editorState.contentVersionToken ?? null);
  currentBrushSize = editorState.brushSize ?? 1;
  editorState.editorMode = (editorState.domain ?? 'ground') as EditorMode;
  setInitialEditorMode(editorState.editorMode);
  const assetUploadHandler = async ({
    group,
    assets,
    onProgress,
  }: {
    group: AssetUploadGroup;
    assets: AssetUploadItem[];
    onProgress?: (progress: AssetUploadProgress) => void;
  }) => {
    const repoConfig = resolveRepoConfig();
    if (!repoConfig) {
      return {
        group,
        results: [],
        error: 'Repo configuration not found. Set the repo in Deploy first.',
      };
    }
    if (!authManager) {
      return {
        group,
        results: [],
        error: 'Not authenticated. Add a GitHub token first.',
      };
    }
    const result = await uploadAssetGroup({
      authManager,
      repoOwner: repoConfig.owner,
      repoName: repoConfig.repo,
      group,
      assets,
      assetPaths: ASSET_GROUP_PATHS,
      onProgress,
    });

    if (result.updatedProject) {
      await applyProjectUpdate(result.updatedProject, result.commitSha ?? null);
    } else if (result.commitSha && editorState) {
      editorState.contentVersionToken = result.commitSha;
      setContentVersionToken(result.commitSha);
      scheduleSave();
      canvasController?.getTileCache().clear();
    }

    return result;
  };

  assetRegistry = createAssetRegistry({
    initialState: workspaceContent?.assetRegistry as AssetRegistryState | undefined,
    uploadHandler: assetUploadHandler,
  });
  assetRegistry.onChange((nextState) => {
    if (!editorState || !workspaceContent) return;
    const previousSelectedAssetId = editorState.selectedAssetId ?? null;
    editorState.selectedAssetId = nextState.selectedAssetId;
    workspaceContent = { ...workspaceContent, assetRegistry: nextState };
    scheduleWorkspaceSave();
    scheduleSave();
    if (previousSelectedAssetId !== nextState.selectedAssetId) {
      const shouldPlace = editorState.domain === 'ground' || editorState.domain === 'props';
      syncSelectedAssetSelection(nextState.selectedAssetId, {
        setIntent: shouldPlace ? 'place' : undefined,
        closeRightBerry: shouldPlace,
      });
    }
    canvasController?.getRenderer().setAssetRegistry(assetRegistry);
    canvasController?.invalidateScene();
  });

  historyManager = createHistoryManager({
    maxSize: 50,
    onStateChange: (canUndo, canRedo) => {
      updateUndoRedoUI(canUndo, canRedo);
    },
  });

  // Load project
  currentProject = await loadProject();
  if (!currentProject) {
    throw new Error('No project data available');
  }
  console.log(`${LOG_PREFIX} Project: "${currentProject.name}"`);
  if (assetRegistry) {
    rehydrateSpriteAtlasesIntoAssetRegistry({
      project: currentProject,
      assetRegistry,
    });
  }
  syncSelectedAssetSelection(editorState.selectedAssetId ?? null);
  if (!editorState.selectedEntityType && currentProject.entityTypes.length > 0) {
    editorState.selectedEntityType = currentProject.entityTypes[0].name;
    scheduleSave();
  }

  // Check if the published (cold) project has changed since this hot snapshot was created.
  // This is non-destructive: we only surface a banner so the user can choose to refresh.
  try {
    updateInfo = await checkForUpdates();
    if (updateInfo.needsUpdate) {
      console.warn(`${LOG_PREFIX} Published project appears to have changed (${updateInfo.reason})`);
    }
  } catch (e) {
    console.warn(`${LOG_PREFIX} Update check failed:`, e);
    updateInfo = null;
  }

  // Load current scene or default
  const sceneId = editorState.currentSceneId ?? currentProject.defaultScene;
  if (sceneId) {
    let scene = await loadScene(sceneId);
    if (scene) {
      // Ensure tilesets are present and compatible with project categories.
      const ensured = ensureSceneTilesets(scene, currentProject);
      scene = ensured.scene;

      if (ensured.warnings.length > 0) {
        for (const w of ensured.warnings) {
          console.warn(`${LOG_PREFIX} ${w}`);
        }
      }

      if (ensured.changed) {
        await saveScene(scene);
        console.log(`${LOG_PREFIX} Scene tilesets normalized${ensured.migratedLegacyTileValues ? ' (legacy tiles migrated)' : ''}`);
      }

      console.log(`${LOG_PREFIX} Scene loaded: "${scene.name}"`);
      setCurrentScene(scene, { clearHistory: true });
      editorState.currentSceneId = sceneId;
    }
  }

  // Save updated state
  await saveEditorState(editorState);
  clearEditorStateBackup();

  // Render editor UI layout
  renderEditorUI();

  // Initialize canvas (before panels so we can wire up callbacks)
  await initCanvas(currentScene?.tileSize ?? currentProject.settings?.defaultTileSize ?? 32);

  authManager = createAuthManager(createTokenStorage());

  void (async () => {
    if (!editorState || !assetRegistry) return;
    if (!isFlagEnabled(EDITOR_FLAGS.REPO_MIRRORING)) return;
    if (!navigator.onLine) return;
    const repoConfig = resolveRepoConfig();
    if (!repoConfig) return;

    try {
      const token = await authManager?.getToken();
      const manifest = await scanAssetFolders({
        repoOwner: repoConfig.owner,
        repoName: repoConfig.repo,
        token,
        assetPaths: ASSET_GROUP_PATHS,
      });
      assetRegistry.refreshFromRepo(manifest);
      if (currentProject) {
        rehydrateSpriteAtlasesIntoAssetRegistry({
          project: currentProject,
          assetRegistry,
        });
      }
      scheduleWorkspaceSave();
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed to scan repo assets:`, error);
    }
  })();

  // Initialize panels (after canvas so we can wire up canvas updates)
  await initPanels();

  // Initialize Blockly cockpit (after panels + scene management)
  {
    const topContainer = document.getElementById('top-panel-container');
    const canvasContainer = document.getElementById('canvas-container');
    if (topContainer && canvasContainer && sceneManager) {
      const sm = sceneManager;
      blocklyCockpit = createBlocklyCockpit({
        topPanelContainer: topContainer,
        canvasContainer,
        getSceneList: () => sm.getSceneList(),
        getCurrentSceneId: () => currentScene?.id ?? null,
        setWorldTopBarVisible: (visible) => {
          if (topPanelController && 'setVisible' in topPanelController) {
            (topPanelController as TopBarV2Controller).setVisible(visible);
          }
        },
        setWorldBottomBarVisible: (visible) => {
          const el = document.getElementById('bottom-panel-container');
          if (el) el.style.display = visible ? '' : 'none';
        },
        rightBerry: rightBerryController ?? undefined,
        leftBerry: leftBerryController ?? undefined,
        getPresetConfig: () => presetConfigStoreRef?.getConfig() ?? null,
        onEnablePreset: (categoryId) => {
          const defaultPresetId = presetRegistryRef?.getDefaultForCategory(categoryId as PresetCategoryId);
          if (!defaultPresetId) return;
          presetConfigStoreRef?.enableCategory(categoryId as PresetCategoryId, defaultPresetId);
        },
      });

      if (leftBerryController && blocklyCockpit) {
        leftBerryController.setOpenInBlocklyFn(async (blockType: string) => {
          const target = resolveBlocklyTargetFromBlockType(blockType);
          await blocklyCockpit?.enter(target);
        });
      }

      console.log(`${LOG_PREFIX} Blockly cockpit initialized`);
    }
  }

  // Render system notices (update + quota warning) after panels exist.
  let quotaInfo: StorageQuotaInfo | null = null;
  try {
    quotaInfo = await checkStorageQuota();
  } catch (e) {
    console.warn(`${LOG_PREFIX} Failed to check storage quota:`, e);
  }
  renderSystemNotices(updateInfo, quotaInfo);

  // --- Dev/Test Bridge ---
  // Expose a lightweight `window.__editor__` API so Playwright (and Claude's
  // MCP browser tools) can inspect and drive the editor without needing to
  // click through the DOM.  Only populated in development builds.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>)['__editor__'] = {
      /** True once the editor has fully initialised. Poll this before calling other methods. */
      ready: true,

      /** Return a snapshot of the current editor state (serialisable). */
      getState: () => editorState ? { ...editorState } : null,

      /** Return the current scene data. */
      getScene: () => currentScene ? { ...currentScene } : null,

      /** Return the current project data. */
      getProject: () => currentProject ? { ...currentProject } : null,

      /** Return the active tool name (paint / erase / select / entity). */
      getCurrentTool: () => editorState?.currentTool ?? null,

      /** Return the active layer (ground / props / entities / collision / triggers). */
      getActiveLayer: () => editorState?.activeLayer ?? null,

      /** Return the current viewport state (x, y, zoom). */
      getViewport: () => canvasController?.getViewport() ?? null,

      /** Return the current editor domain mode. */
      getEditorMode: () => editorState?.editorMode ?? null,

      /**
       * Programmatically change the active layer.
       * @param layer - 'ground' | 'props' | 'entities' | 'collision' | 'triggers'
       */
      setActiveLayer: (layer: string) => applyActiveLayer(layer as import('@/types').LayerType),

      /**
       * Programmatically change the active tool.
       * @param tool - 'paint' | 'erase' | 'select' | 'entity'
       */
      setTool: (tool: string) => applyToolChange(tool as EditorState['currentTool'], true),

      /** Return the bounding rect of the canvas element (useful for computing click coords). */
      getCanvasRect: () => {
        const container = document.getElementById('canvas-container');
        const canvas = container?.querySelector('canvas');
        return canvas?.getBoundingClientRect() ?? null;
      },

      /** Return a list of visible DOM panel IDs / class names to help orient screenshots. */
      getLayoutInfo: () => ({
        editorContainer: !!document.getElementById('editor-container'),
        topPanel: !!document.getElementById('top-panel-container')?.firstElementChild,
        canvas: !!document.getElementById('canvas-container')?.querySelector('canvas'),
        bottomPanel: !!document.getElementById('bottom-panel-container')?.firstElementChild,
        leftBerry: !!document.querySelector('.left-berry'),
        rightBerry: !!document.querySelector('.right-berry'),
      }),
    };
    console.log(`${LOG_PREFIX} window.__editor__ bridge registered (dev only)`);
  }

  console.log(`${LOG_PREFIX} Editor initialized`);
}

function restoreEditorStateFromPlaytest(state: EditorState): EditorState {
  const backup = getEditorStateBackup();
  if (!backup) {
    return state;
  }

  try {
    const parsed = JSON.parse(backup) as Partial<EditorState>;
    return {
      ...state,
      ...parsed,
      viewport: { ...state.viewport, ...parsed.viewport },
      panelStates: { ...state.panelStates, ...parsed.panelStates },
    };
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to restore editor state from playtest:`, error);
    return state;
  }
}

async function startPlaytest(): Promise<void> {
  if (!editorState) {
    console.warn(`${LOG_PREFIX} Cannot start playtest without editor state`);
    return;
  }

  const sceneId = currentScene?.id ?? currentProject?.defaultScene ?? null;

  if (currentScene) {
    await saveScene(currentScene);
  }

  await saveEditorState(editorState);
  setEditorStateBackup(JSON.stringify(editorState));
  preparePlaytest(sceneId);

  switchMode('game');
}

// --- Canvas Initialization ---

async function initCanvas(tileSize: number): Promise<void> {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error(`${LOG_PREFIX} Canvas container not found`);
    return;
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    position: absolute;
    left: 50%;
    bottom: 16px;
    transform: translateX(-50%);
    background: rgba(20, 24, 48, 0.95);
    color: #e6ecff;
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid #30407a;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    display: none;
    z-index: 9;
  `;
  container.appendChild(toast);

  let toastTimeout: number | null = null;
  function showToast(message: string): void {
    toast.textContent = message;
    toast.style.display = 'block';
    if (toastTimeout !== null) {
      window.clearTimeout(toastTimeout);
    }
    toastTimeout = window.setTimeout(() => {
      toast.style.display = 'none';
      toastTimeout = null;
    }, 2200);
  }

  // Get initial selected category
  const initialCategory = editorState?.selectedTile?.category ??
    currentProject?.tileCategories[0]?.name ?? '';

  // Create canvas controller with initial viewport and scene from editor state
  canvasController = createCanvas(container, {
    viewport: editorState?.viewport,
    tileSize,
    scene: currentScene ?? undefined,
    activeLayer: editorState?.activeLayer,
  });

  // Set initial selected category for rendering
  canvasController.setSelectedCategory(initialCategory);
  canvasController.setProject(currentProject);
  canvasController.getRenderer().setEntityTypes(currentProject?.entityTypes ?? []);
  canvasController.getRenderer().setAssetRegistry(assetRegistry);

  // Preload tile images for all categories
  if (currentProject) {
    await canvasController.preloadProject(currentProject);
  }

  // Wire up viewport persistence
  canvasController.onViewportChange((viewport) => {
    if (editorState) {
      editorState.viewport = viewport;
      scheduleSave();
    }
    updateEntitySelectionUI();
  });

  if (!historyManager) {
    throw new Error('History manager not initialized');
  }

  // Initialize paint tool
  paintTool = createPaintTool({
    getEditorState: () => editorState,
    getScene: () => currentScene,
    onSceneChange: (scene) => {
      handleSceneChange(scene);
    },
    history: historyManager,
  });

  // Initialize erase tool
  eraseTool = createEraseTool({
    getEditorState: () => editorState,
    getScene: () => currentScene,
    onSceneChange: (scene) => {
      handleSceneChange(scene);
    },
    getBrushSize: () => currentBrushSize,
    history: historyManager,
  });

  clipboard = createClipboard();

  entityManager = createEntityManager({
    getScene: () => currentScene,
    getProject: () => currentProject,
    onSceneChange: (scene) => {
      handleSceneChange(scene);
      updateEntitySelectionUI();
    },
  });

  propSpriteManager = createPropSpriteManager({
    getScene: () => currentScene,
    onSceneChange: (scene) => {
      handleSceneChange(scene);
      updateEntitySelectionUI();
    },
    entityManager,
  });

  entitySelection = createEntitySelection({
    getEditorState: () => editorState,
    onSelectionChange: () => {
      scheduleSave();
      updateEntitySelectionUI();
    },
  });

  selectTool = createSelectTool({
    getEditorState: () => editorState,
    getScene: () => currentScene,
    onSceneChange: (scene) => {
      handleSceneChange(scene);
    },
    onSelectionChange: (state) => {
      const renderer = canvasController?.getRenderer();
      renderer?.setSelectionOverlay({
        selection: state.selection,
        moveOffset: state.moveOffset,
        previewTiles: state.previewTiles,
      });
      canvasController?.invalidateScene();

      tileSelectionActive = Boolean(state.selection && state.mode === 'selected');
      updateBottomContextStrip();
    },
    clipboard,
    onFillResult: (result) => {
      if (result.limitReached) {
        showToast('Fill stopped early (limit reached).');
      }
    },
    history: historyManager,
    entityManager,
    entitySelection,
    propSpriteManager,
    getProject: () => currentProject,
    onEntitySelectionChange: () => {
      updateEntitySelectionUI();
    },
  });

  entityMoveController = createSelectEntityController({
    getEditorState: () => editorState,
    getScene: () => currentScene,
    onSelectionChange: () => {
      updateEntitySelectionUI();
    },
    entityManager,
    entitySelection,
    history: historyManager,
    allowedTools: ['select', 'entity'],
  });

  entityTool = createEntityTool({
    getEditorState: () => editorState,
    getScene: () => currentScene,
    getProject: () => currentProject,
    entityManager,
    history: historyManager,
    onPreviewChange: (preview) => {
      canvasController?.getRenderer().setEntityPreview(preview);
      canvasController?.invalidateScene();
    },
    onEntityPlaced: (entityId) => {
      canvasController?.getRenderer().setEntityHighlightId(entityId);
      canvasController?.invalidateScene();
    },
  });

  propSpriteTool = createPropSpriteTool({
    getEditorState: () => editorState,
    getScene: () => currentScene,
    propSpriteManager,
    history: historyManager,
    onPreviewChange: (preview) => {
      canvasController?.getRenderer().setPropSpritePreview(preview);
      canvasController?.invalidateScene();
    },
  });

  // Wire up tool gestures
  canvasController.onToolGesture({
    onStart: (x, y) => {
      if (editorState?.intent === 'place') {
        const needsPayload =
          editorState.domain === 'ground' ||
          editorState.domain === 'props' ||
          editorState.domain === 'entities';
        if (needsPayload && !editorState.payload) {
          showToast('Pick something to place.');
          rightBerryController?.open(editorState.domain as EditorMode);
          return;
        }
      }

      if (
        editorState?.intent === 'remove' &&
        editorState.domain === 'entities' &&
        entityMoveController
      ) {
        const didSelect = entityMoveController.handlePointerStart(
          canvasController!.getViewport(),
          x,
          y,
          tileSize
        );
        if (didSelect) {
          entityMoveController.deleteSelected();
          updateEntitySelectionUI();
        }
        return;
      }

      if (editorState?.currentTool === 'select' && selectTool) {
        selectTool.start(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'paint') {
        if (editorState.domain === 'props' && editorState.payload?.kind === 'propSprite' && propSpriteTool) {
          propSpriteTool.start(x, y, canvasController!.getViewport(), tileSize);
        } else if (paintTool) {
          paintTool.start(x, y, canvasController!.getViewport(), tileSize);
        }
      } else if (editorState?.currentTool === 'erase' && eraseTool) {
        eraseTool.start(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'entity' && entityTool) {
        const moveFirstEnabled = isFlagEnabled(EDITOR_FLAGS.ENTITY_MOVE_FIRST);
        if (moveFirstEnabled && entityMoveController) {
          entityMoveActive = entityMoveController.handlePointerStart(
            canvasController!.getViewport(),
            x,
            y,
            tileSize
          );
          if (entityMoveActive) {
            return;
          }
        }
        entityTool.start(x, y, canvasController!.getViewport(), tileSize);
      }
    },
    onMove: (x, y) => {
      if (editorState?.intent === 'remove' && editorState.domain === 'entities') {
        return;
      }
      if (editorState?.currentTool === 'select' && selectTool) {
        selectTool.move(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'paint') {
        if (editorState.domain === 'props' && editorState.payload?.kind === 'propSprite' && propSpriteTool) {
          propSpriteTool.move(x, y, canvasController!.getViewport(), tileSize);
        } else if (paintTool) {
          paintTool.move(x, y, canvasController!.getViewport(), tileSize);
        }
      } else if (editorState?.currentTool === 'erase' && eraseTool) {
        eraseTool.move(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'entity' && entityTool) {
        const moveFirstEnabled = isFlagEnabled(EDITOR_FLAGS.ENTITY_MOVE_FIRST);
        if (moveFirstEnabled && entityMoveActive && entityMoveController) {
          if (
            entityMoveController.handlePointerMove(
              canvasController!.getViewport(),
              x,
              y,
              tileSize
            )
          ) {
            return;
          }
        }
        entityTool.move(x, y, canvasController!.getViewport(), tileSize);
      }
    },
    onEnd: () => {
      if (entityMoveActive && entityMoveController) {
        entityMoveController.handlePointerEnd();
        entityMoveActive = false;
      }
      if (selectTool) {
        selectTool.end();
      }
      if (paintTool) {
        paintTool.end();
      }
      if (propSpriteTool) {
        propSpriteTool.end();
      }
      if (eraseTool) {
        eraseTool.end();
      }
      if (entityTool) {
        entityTool.end();
      }
    },
    onLongPress: (x, y) => {
      if (editorState?.currentTool === 'select' && selectTool) {
        selectTool.handleLongPress(x, y, canvasController!.getViewport(), tileSize);
      } else if (
        editorState?.currentTool === 'entity' &&
        isFlagEnabled(EDITOR_FLAGS.ENTITY_MOVE_FIRST) &&
        entityMoveController
      ) {
        entityMoveController.handleLongPress(
          canvasController!.getViewport(),
          x,
          y,
          tileSize
        );
      }
    },
  });

  updateHoverPreview(editorState?.currentTool ?? 'select');

  console.log(`${LOG_PREFIX} Canvas initialized (tile size: ${tileSize}px)`);
}

// --- Panel Initialization ---

async function initPanels(): Promise<void> {
  if (!editorState) return;

  // Initialize top panel
  const topPanelContainer = document.getElementById('top-panel-container');
  if (topPanelContainer) {
    const useTopBarV2 = isFlagEnabled(EDITOR_FLAGS.TOP_BAR_GLOBAL);
    const topExpanded = useTopBarV2 ? true : editorState.panelStates.topExpanded;

    topPanelController = useTopBarV2
      ? createTopBarV2(topPanelContainer, {
          expanded: topExpanded,
          sceneName: currentScene?.name ?? 'No Scene',
        })
      : createTopPanel(topPanelContainer, {
          expanded: topExpanded,
          sceneName: currentScene?.name ?? 'No Scene',
          activeLayer: editorState.activeLayer,
        });

    if (useTopBarV2 && editorState.panelStates.topExpanded !== topExpanded) {
      editorState.panelStates.topExpanded = topExpanded;
      scheduleSave();
    }

    // Wire up persistence
    topPanelController.onExpandToggle((expanded) => {
      if (editorState) {
        editorState.panelStates.topExpanded = expanded;
        scheduleSave();
      }
    });

    if (!useTopBarV2 && 'onLayerChange' in topPanelController) {
      topPanelController.onLayerChange((layer) => {
        if (editorState) {
          editorState.activeLayer = layer;
          scheduleSave();
        }
        // Update canvas active layer for dimming
        canvasController?.setActiveLayer(layer);
      });
    }

    topPanelController.onPlaytest(() => {
      startPlaytest().catch((error) => {
        console.error(`${LOG_PREFIX} Failed to start playtest:`, error);
      });
    });

    if ('onUndo' in topPanelController) {
      topPanelController.onUndo(() => {
        historyManager?.undo();
      });
    }

    if ('onRedo' in topPanelController) {
      topPanelController.onRedo(() => {
        historyManager?.redo();
      });
    }

    if ('onSettings' in topPanelController) {
      topPanelController.onSettings(() => {
        openSettingsPlaceholder();
      });
    }

    if ('onSave' in topPanelController) {
      topPanelController.onSave(() => {
        // Cancel pending debounced saves and flush immediately.
        if (saveTimeout !== null) {
          window.clearTimeout(saveTimeout);
          saveTimeout = null;
        }
        if (sceneSaveTimeout !== null) {
          window.clearTimeout(sceneSaveTimeout);
          sceneSaveTimeout = null;
        }
        const doSave = async () => {
          try {
            if (editorState) await saveEditorState(editorState);
            if (currentScene) await saveScene(currentScene);
            const topBar = getTopBarV2();
            if (topBar) {
              uxFeedback.combos.saved(topBar.getSaveButtonEl(), 'Project saved.');
            }
          } catch {
            uxFeedback.toast.error('Save failed.');
          }
        };
        doSave().catch(() => undefined);
      });
    }

    // Initialize scene manager and selector
    await initSceneManagement();

    if (!topPanelController) {
      return;
    }

    // Initialize layer panel
    const layerPanelContainer = topPanelController.getLayerPanelContainer();
    layerPanelContainer.innerHTML = ''; // Clear default layer tabs

    layerPanelController = createLayerPanel(layerPanelContainer, {
      order: editorState.layerOrder,
      activeLayer: editorState.activeLayer,
      visibility: editorState.layerVisibility,
      locks: editorState.layerLocks,
      onLayerSelect: (layer) => {
        applyActiveLayer(layer);
        if (isFlagEnabled(EDITOR_FLAGS.RIGHT_BERRY)) {
          if (editorState?.currentTool === 'paint' || editorState?.currentTool === 'erase') {
            applyDomain(layer as EditorDomain, false);
          }
        }
      },
      onVisibilityChange: (visibility) => {
        if (editorState) {
          editorState.layerVisibility = visibility;
          scheduleSave();
        }
        canvasController?.getRenderer()?.setLayerVisibility(visibility);
        canvasController?.invalidateScene();
      },
      onLocksChange: (locks) => {
        if (editorState) {
          editorState.layerLocks = locks;
          scheduleSave();
        }
        canvasController?.getRenderer()?.setLayerLocks(locks);
        updateBottomPanelToolContext();
      },
      onOrderChange: (order) => {
        if (editorState) {
          editorState.layerOrder = [...order];
          scheduleSave();
        }
        const renderer = canvasController?.getRenderer();
        renderer?.setLayerOrder(order);
        canvasController?.invalidateScene();
      },
    });

    setLayerPanelVisibility(!isFlagEnabled(EDITOR_FLAGS.HIDE_LAYER_PANEL));

    // Initialize renderer with current visibility and locks
    const renderer = canvasController?.getRenderer();
    if (renderer) {
      renderer.setLayerOrder(editorState.layerOrder);
      renderer.setLayerVisibility(editorState.layerVisibility);
      renderer.setLayerLocks(editorState.layerLocks);
    }
  }

  // Initialize bottom panel
  const bottomPanelContainer = document.getElementById('bottom-panel-container');
  if (bottomPanelContainer) {
    bottomPanelController = createBottomPanel(bottomPanelContainer, {
      currentIntent: editorState.intent,
    });

    if (isFlagEnabled(EDITOR_FLAGS.BOTTOM_CONTEXT_STRIP)) {
      bottomContextStrip = createBottomContextStrip(
        bottomPanelController.getContextStripContainer(),
        {
          onMove: () => {
            selectTool?.armMove();
          },
          onCopy: () => {
            selectTool?.copySelection();
            updateBottomContextStrip();
          },
          onPaste: () => {
            selectTool?.armPaste();
            updateBottomContextStrip();
          },
          onDelete: () => {
            if ((editorState?.selectedEntityIds ?? []).length > 0) {
              selectTool?.deleteEntities();
              updateEntitySelectionUI();
            } else if ((editorState?.selectedPropSpriteIds ?? []).length > 0) {
              selectTool?.deletePropSprites();
              updateEntitySelectionUI();
            } else {
              selectTool?.deleteSelection();
            }
          },
          onFill: () => {
            selectTool?.armFill();
          },
          onCancel: () => {
            selectTool?.clearSelection();
          },
          onResize: () => {
            selectTool?.armResize();
            updateBottomContextStrip();
          },
          onDuplicate: () => {
            const entityIds = editorState?.selectedEntityIds ?? [];
            if (entityIds.length > 0) {
              selectTool?.duplicateEntities();
              updateEntitySelectionUI();
              return;
            }
            const propIds = editorState?.selectedPropSpriteIds ?? [];
            if (propIds.length > 0) {
              selectTool?.duplicatePropSprites();
              updateEntitySelectionUI();
              return;
            }

            const selectionLayer = selectTool?.getSelection()?.layer;
            if (selectionLayer === 'triggers') {
              selectTool?.copySelection();
              selectTool?.armPaste();
              updateBottomContextStrip();
            }
          },
          onClear: () => {
            entitySelection?.clear();
            if (editorState) editorState.selectedPropSpriteIds = [];
            updateEntitySelectionUI();
          },

          onConvertToEntity: () => {
            const propIds = editorState?.selectedPropSpriteIds ?? [];
            if (propIds.length === 0 || !propSpriteManager || !currentProject) return;

            const spriteEntityType = 'sprite';
            const hasSpriteType = currentProject.entityTypes.some((type) => type.name === spriteEntityType);
            if (!hasSpriteType) {
              currentProject.entityTypes.push({ name: spriteEntityType, displayName: 'Sprite', properties: [] });
              void saveProject(currentProject);
              canvasController?.getRenderer().setEntityTypes(currentProject.entityTypes ?? []);
            }

            propSpriteManager.convertPropSpritesToEntities(propIds, {
              entityType: spriteEntityType,
              resolveSpriteSize: (sprite: SpriteRef) => resolveSpriteRefPixelSize(sprite) ?? { width: currentScene?.tileSize ?? 32, height: currentScene?.tileSize ?? 32 },
            });
            editorState!.selectedPropSpriteIds = [];
            updateEntitySelectionUI();
          },
        }
      );
      updateBottomContextStrip();
    }

    bottomPanelController.onPlaceClick(() => {
      applyIntent('place', true);
    });

    bottomPanelController.onInteractClick(() => {
      applyIntent('interact', true);
    });

    bottomPanelController.onRemoveClick(() => {
      applyIntent('remove', true);
    });

    updateBottomPanelToolContext();

    updateUndoRedoUI(
      historyManager?.canUndo() ?? false,
      historyManager?.canRedo() ?? false
    );
  }

  if (isFlagEnabled(EDITOR_FLAGS.LEFT_BERRY)) {
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer && editorState) {
      const presetRegistry = createPresetRegistry();
      presetRegistryRef = presetRegistry;
      const presetConfigStore = createPresetConfigStore(presetRegistry);
      await presetConfigStore.load();
      presetConfigStoreRef = presetConfigStore;

      leftBerryController = createLeftBerry(editorContainer, {
        initialOpen: editorState.leftBerryOpen,
        initialTab: 'sprites',
        assetRegistry: assetRegistry ?? undefined,
        assetLibraryEnabled: isFlagEnabled(EDITOR_FLAGS.ASSET_LIBRARY),
        assetUploadEnabled: isFlagEnabled(EDITOR_FLAGS.ASSET_UPLOAD),
        getEditorState: () => editorState,
        getCurrentScene: () => currentScene,
        entityManager: entityManager ?? undefined,
        history: historyManager ?? undefined,
        presetRegistry,
        presetConfigStore,
      });

      const toolsContainer = leftBerryController.getTabContentContainer('tools');
      if (toolsContainer) {
        createUtilitiesTab({
          container: toolsContainer,
          authManager: authManager ?? undefined,
          assetRegistry: assetRegistry ?? undefined,
        });
      }

      leftBerryController.onOpenChange((open) => {
        if (!editorState) return;
        editorState.leftBerryOpen = open;
        scheduleSave();
      });
    }
  }

  if (isFlagEnabled(EDITOR_FLAGS.RIGHT_BERRY)) {
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer && editorState) {
      const initialTab = editorState.domain ?? 'ground';
      rightBerryController = createRightBerry(editorContainer, {
        initialOpen: editorState.rightBerryOpen,
        initialTab,
      });

      const brushControls: Array<ReturnType<typeof createBrushSizeControl>> = [];

      const handleBrushSizeChange = (size: BrushSize): void => {
        currentBrushSize = size;
        if (editorState) {
          editorState.brushSize = size;
          scheduleSave();
        }
        brushControls.forEach((control) => control.setSize(size));
        updateHoverPreview(editorState?.currentTool ?? 'select');
      };

      const addBrushControl = (container: HTMLElement, hint: string): void => {
        const control = createBrushSizeControl({
          container,
          initialSize: currentBrushSize,
          hint,
          onChange: handleBrushSizeChange,
        });
        brushControls.push(control);
      };

      const paletteModes: Array<{ mode: EditorMode; type: 'tilesets' | 'props'; title: string }> =
        [
          { mode: 'ground', type: 'tilesets', title: 'Paint Palette' },
          { mode: 'props', type: 'props', title: 'Props Palette' },
        ];

      paletteModes.forEach(({ mode, type, title }) => {
        const container = rightBerryController?.getTabContentContainer(mode);
        if (!container) return;
        if (assetRegistry) {
          createAssetPalette({
            container,
            assetRegistry,
            groupType: type,
            title,
          });
        }
        const hint =
          mode === 'ground'
            ? 'Select a tileset and paint it onto the grid.'
            : 'Pick a prop and paint it into the scene.';
        addBrushControl(container, hint);
      });

      const collisionContainer = rightBerryController?.getTabContentContainer('collision');
      if (collisionContainer) {
        addBrushControl(collisionContainer, 'Paint collision tiles to block movement.');
      }

      const triggersContainer = rightBerryController?.getTabContentContainer('triggers');
      if (triggersContainer) {
        addBrushControl(triggersContainer, 'Paint trigger zones (binary) for event areas.');
      }

      const entitiesContainer = rightBerryController.getTabContentContainer('entities');
      if (entitiesContainer && editorState && entityManager && historyManager) {
        entitiesTab = createEntitiesTab({
          container: entitiesContainer,
          getProject: () => currentProject,
          getEditorState: () => editorState,
          entityManager,
          history: historyManager,
          assetRegistry: assetRegistry ?? undefined,
          onEntityTypeSelect: (typeName) => {
            if (!editorState) return;
            editorState.selectedEntityType = typeName;
            scheduleSave();
            setPayload(buildEntityPayload(typeName));
          },
          onEntityTypePlace: (typeName) => {
            if (!editorState) return;
            editorState.selectedEntityType = typeName;
            scheduleSave();
            setPayload(buildEntityPayload(typeName));
            applyIntent('place', true);
            rightBerryController?.close();
          },
          onEntitySnapChange: (enabled) => {
            if (!editorState) return;
            editorState.entitySnapToGrid = enabled;
            scheduleSave();
          },
          onEditAnimation: (animationId) => {
            if (!animationId) return;
            leftBerryController?.openAnimation(animationId);
          },
        });
        entitiesTab.setSelection(editorState.selectedEntityIds ?? []);
      }

      rightBerryController.onTabChange((mode) => {
        const nextDomain = mode === 'select' ? editorState?.domain ?? 'ground' : mode;
        applyDomain(nextDomain as EditorDomain, false);
      });

      rightBerryController.onOpenChange((open) => {
        if (!editorState) return;
        editorState.rightBerryOpen = open;
        scheduleSave();
        if (open) {
          const activeTab = rightBerryController?.getActiveTab() ?? 'ground';
          const nextDomain = activeTab === 'select' ? editorState.domain : activeTab;
          applyDomain(nextDomain as EditorDomain, false);
        } else {
          // Do not force-select on close. Keep the current editing mode/tool.
          updateBottomPanelToolContext();
        }
      });

      {
        const resolvedInitialDomain = editorState.domain ?? 'ground';
        applyDomain(resolvedInitialDomain, true);
      }
    }
  }

  if (editorState) {
    applyDomain(editorState.domain ?? 'ground', false);
    bottomPanelController?.setCurrentIntent(editorState.intent);
  }

  updateEntitySelectionUI();

  console.log(`${LOG_PREFIX} Panels initialized`);
}

// --- Scene Management ---

async function initSceneManagement(): Promise<void> {
  if (!topPanelController || !currentProject) return;

  // Create scene manager
  sceneManager = createSceneManager({
    getProject: () => currentProject!,
    getCurrentScene: () => currentScene,
    getCurrentSceneId: () => currentScene?.id ?? null,
    onSceneChange: (scene) => {
      handleSceneChange(scene);
      topPanelController?.setSceneName(scene.name);
      sceneSelector?.setSceneName(scene.name);
    },
    onSceneListChange: async () => {
      if (sceneManager && sceneSelector) {
        const scenes = await sceneManager.getSceneList();
        sceneSelector.updateScenes(scenes);
      }
    },
    onSceneSwitch: (scene) => {
      handleSceneSwitch(scene);
    },
    saveCurrentScene: async () => {
      if (currentScene) {
        await saveScene(currentScene);
      }
    },
  });

  // Get initial scene list
  const scenes = await sceneManager.getSceneList();

  // Create scene selector in top panel
  const container = topPanelController.getSceneSelectorContainer();
  container.innerHTML = ''; // Clear fallback title

  sceneSelector = createSceneSelector(container, {
    scenes,
    currentSceneId: currentScene?.id ?? null,
    onSceneSelect: (sceneId) => {
      sceneManager?.switchToScene(sceneId).catch((error) => {
        console.error(`${LOG_PREFIX} Failed to switch scene:`, error);
      });
    },
    onSceneAction: (action, sceneId) => {
      handleSceneAction(action, sceneId).catch((error) => {
        console.error(`${LOG_PREFIX} Scene action failed:`, error);
      });
    },
    onCreateScene: () => {
      handleCreateScene().catch((error) => {
        console.error(`${LOG_PREFIX} Failed to create scene:`, error);
      });
    },
  });

  console.log(`${LOG_PREFIX} Scene management initialized`);
}

function handleSceneSwitch(scene: Scene): void {
  // Ensure tilesets
  if (currentProject) {
    const ensured = ensureSceneTilesets(scene, currentProject);
    if (ensured.changed) {
      scene = ensured.scene;
      saveScene(scene).catch(console.error);
    }
  }

  // Update state
  setCurrentScene(scene, { clearHistory: true });
  entitySelection?.clear();

  if (editorState) {
    editorState.currentSceneId = scene.id;
    scheduleSave();
  }

  // Update canvas
  canvasController?.setScene(scene);
  canvasController?.invalidateScene();
  updateEntitySelectionUI();

  // Update UI
  topPanelController?.setSceneName(scene.name);
  sceneSelector?.setCurrentScene(scene.id);
  sceneSelector?.setSceneName(scene.name);

  console.log(`${LOG_PREFIX} Switched to scene "${scene.name}"`);
}

async function handleCreateScene(): Promise<void> {
  if (!sceneManager || !currentProject) return;

  const scenes = await sceneManager.getSceneList();
  const defaultWidth = currentProject.settings?.defaultGridWidth ?? 20;
  const defaultHeight = currentProject.settings?.defaultGridHeight ?? 15;

  const result = await showCreateSceneDialog(defaultWidth, defaultHeight, scenes);

  if (!result.confirmed || !result.value) return;

  const scene = await sceneManager.createScene(
    result.value.name,
    result.value.width,
    result.value.height
  );

  // Switch to the new scene
  await sceneManager.switchToScene(scene.id);
}

async function handleSceneAction(action: SceneAction, sceneId: string): Promise<void> {
  if (!sceneManager) return;

  const scenes = await sceneManager.getSceneList();
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;

  switch (action) {
    case 'rename': {
      const result = await showRenameDialog(scene.name, scenes, sceneId);
      if (result.confirmed && result.value) {
        await sceneManager.renameScene(sceneId, result.value.name);
      }
      break;
    }

    case 'duplicate': {
      const result = await showDuplicateDialog(scene.name, scenes);
      if (result.confirmed && result.value) {
        const duplicate = await sceneManager.duplicateScene(sceneId, result.value.name);
        // Switch to the duplicated scene
        await sceneManager.switchToScene(duplicate.id);
      }
      break;
    }

    case 'resize': {
      const loadedScene = await loadScene(sceneId);
      if (!loadedScene) return;

      const result = await showResizeDialog(loadedScene.width, loadedScene.height);
      if (result.confirmed && result.value) {
        await sceneManager.resizeScene(sceneId, result.value.width, result.value.height);
      }
      break;
    }

    case 'delete': {
      const confirmed = await showDeleteConfirmation(scene.name);
      if (confirmed) {
        await sceneManager.deleteScene(sceneId);
      }
      break;
    }
  }
}


function renderSystemNotices(
  updateInfo: UpdateCheckResult | null,
  quotaInfo: StorageQuotaInfo | null
): void {
  const container = document.getElementById('system-notice-container');
  if (!container) return;

  // Clear existing
  container.innerHTML = '';
  container.style.display = 'none';

  const banners: HTMLElement[] = [];

  const updateBanner = buildUpdateBanner(updateInfo);
  if (updateBanner) banners.push(updateBanner);

  const quotaBanner = buildQuotaBanner(quotaInfo);
  if (quotaBanner) banners.push(quotaBanner);

  if (banners.length === 0) return;

  for (const banner of banners) {
    container.appendChild(banner);
  }
  container.style.display = 'block';
}

function buildUpdateBanner(info: UpdateCheckResult | null): HTMLElement | null {
  if (!info) return null;

  // Only show a banner when we have a strong signal that cold changed or hot baseline is missing+diff.
  if (!info.needsUpdate) return null;

  // Allow dismissing per-session for the current fingerprint.
  const dismissKey = `inrepo_dismiss_update_banner:${info.remote?.etag ?? info.remote?.lastModified ?? 'unknown'}`;
  if (sessionStorage.getItem(dismissKey) === 'true') return null;

  const banner = document.createElement('div');
  banner.style.cssText = `
    background: rgba(255, 185, 80, 0.12);
    border: 1px solid rgba(255, 185, 80, 0.35);
    color: #ffddaa;
    padding: 10px 12px;
    border-radius: 10px;
    margin: 10px 12px;
  `;

  const title = document.createElement('div');
  title.textContent = 'Published project changed';
  title.style.cssText = 'font-weight: 700; margin-bottom: 6px;';

  const desc = document.createElement('div');
  desc.style.cssText = 'font-size: 12px; color: #d6d0c2; line-height: 1.35;';
  desc.textContent =
    'The repository version differs from your local hot storage. You can refresh from the repo (cold) or export a local backup first.';

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;';

  const btnPrimary = document.createElement('button');
  btnPrimary.textContent = 'Refresh from Repo';
  btnPrimary.style.cssText = `
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255, 185, 80, 0.45);
    background: rgba(255, 185, 80, 0.2);
    color: #ffddaa;
    font-weight: 700;
    cursor: pointer;
  `;

  const btnSecondary = document.createElement('button');
  btnSecondary.textContent = 'Export Local Backup';
  btnSecondary.style.cssText = `
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid rgba(160, 200, 255, 0.45);
    background: rgba(160, 200, 255, 0.12);
    color: #cfe6ff;
    font-weight: 700;
    cursor: pointer;
  `;

  const btnDismiss = document.createElement('button');
  btnDismiss.textContent = 'Dismiss';
  btnDismiss.style.cssText = `
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: transparent;
    color: #c9c9c9;
    font-weight: 700;
    cursor: pointer;
  `;

  const status = document.createElement('div');
  status.style.cssText = 'font-size: 12px; color: #aab0d4; margin-top: 8px;';
  status.textContent = '';

  async function exportBackup(): Promise<void> {
    const data = await exportAllData();
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    downloadJson(`inrepo-hot-backup-${ts}.json`, data);
  }

  btnSecondary.addEventListener('click', async () => {
    try {
      status.textContent = 'Exporting...';
      await exportBackup();
      status.textContent = 'Backup exported.';
    } catch (e) {
      console.error(e);
      status.textContent = 'Export failed (see console).';
    }
  });

  btnPrimary.addEventListener('click', async () => {
    try {
      status.textContent = 'Exporting backup...';
      await exportBackup();

      status.textContent = 'Refreshing from repo...';
      const result = await forceRefreshFromCold();
      if (!result.success) {
        status.textContent = `Refresh failed: ${result.errors.join('; ')}`;
        return;
      }

      status.textContent = 'Done. Reloading...';
      window.location.reload();
    } catch (e) {
      console.error(e);
      status.textContent = 'Refresh failed (see console).';
    }
  });

  btnDismiss.addEventListener('click', () => {
    sessionStorage.setItem(dismissKey, 'true');
    banner.remove();
  });

  actions.appendChild(btnPrimary);
  actions.appendChild(btnSecondary);
  actions.appendChild(btnDismiss);

  banner.appendChild(title);
  banner.appendChild(desc);
  banner.appendChild(actions);
  banner.appendChild(status);

  return banner;
}

function buildQuotaBanner(info: StorageQuotaInfo | null): HTMLElement | null {
  if (!info || !info.isNearLimit) return null;

  const bucket = Math.floor(info.percentUsed);
  const dismissKey = `inrepo_dismiss_quota_banner:${bucket}`;
  if (sessionStorage.getItem(dismissKey) === 'true') return null;

  const banner = document.createElement('div');
  banner.style.cssText = `
    background: rgba(255, 80, 80, 0.10);
    border: 1px solid rgba(255, 80, 80, 0.35);
    color: #ffd0d0;
    padding: 10px 12px;
    border-radius: 10px;
    margin: 10px 12px;
  `;

  const title = document.createElement('div');
  title.textContent = 'Storage nearly full';
  title.style.cssText = 'font-weight: 700; margin-bottom: 6px;';

  const desc = document.createElement('div');
  desc.style.cssText = 'font-size: 12px; color: #e7c7c7; line-height: 1.35;';
  desc.textContent = `Hot storage is using about ${info.percentUsed.toFixed(1)}% of the available quota. Consider exporting a backup or clearing old data.`;

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;';

  const btnOpen = document.createElement('button');
  btnOpen.textContent = 'Open Data Tools';
  btnOpen.style.cssText = `
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255, 80, 80, 0.45);
    background: rgba(255, 80, 80, 0.14);
    color: #ffd0d0;
    font-weight: 700;
    cursor: pointer;
  `;

  const btnDismiss = document.createElement('button');
  btnDismiss.textContent = 'Dismiss';
  btnDismiss.style.cssText = `
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: transparent;
    color: #c9c9c9;
    font-weight: 700;
    cursor: pointer;
  `;

  btnOpen.addEventListener('click', () => {
    leftBerryController?.open('tools');
  });

  btnDismiss.addEventListener('click', () => {
    sessionStorage.setItem(dismissKey, 'true');
    banner.remove();
  });

  actions.appendChild(btnOpen);
  actions.appendChild(btnDismiss);

  banner.appendChild(title);
  banner.appendChild(desc);
  banner.appendChild(actions);

  return banner;
}

// --- UI Rendering ---


function renderEditorUI(): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div id="editor-container" style="
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #1a1a2e;
      overflow: hidden;
    ">
      <!-- Top Panel Container -->
      <div id="top-panel-container"></div>

      <!-- System Notice (update banner, etc.) -->
      <div id="system-notice-container"></div>

      <!-- Canvas Area -->
      <div id="canvas-container" style="
        flex: 1;
        position: relative;
        overflow: hidden;
        background: #0a0a1a;
      "></div>

      <!-- Bottom Panel Container -->
      <div id="bottom-panel-container"></div>
    </div>
  `;
}
