/**
 * Editor Initialization
 *
 * This module initializes the editor mode of InRepo Studio.
 * Sets up the canvas, panels, and tool systems.
 */

import {
  loadEditorState,
  loadProject,
  loadScene,
  saveEditorState,
  saveScene,
  exportAllData,
  checkStorageQuota,
  checkForUpdates,
  forceRefreshFromCold,
} from '@/storage';
import type { BrushSize, EditorState, UpdateCheckResult } from '@/storage';
import type { StorageQuotaInfo } from '@/storage/hot';
import { ensureSceneTilesets, type Scene, type Project, type LayerType } from '@/types';
import { createCanvas, type CanvasController } from '@/editor/canvas';
import { tileToScreen, worldToScreen } from '@/editor/canvas/viewport';
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
  createRightBerryPlaceholder,
  type RightBerryController,
  createSelectionBar,
  type SelectionBarController,
  createEntitySelectionBar,
  type EntitySelectionBarController,
  createLayerPanel,
  type LayerPanelController,
  createPropertyInspector,
  type PropertyInspectorController,
} from '@/editor/panels';
import { createPaintTool, type PaintTool } from '@/editor/tools/paint';
import { createEraseTool, type EraseTool } from '@/editor/tools/erase';
import { createSelectTool, type SelectTool } from '@/editor/tools/select';
import { createEntityTool, type EntityTool } from '@/editor/tools/entity';
import { createClipboard, type Clipboard } from '@/editor/tools/clipboard';
import { createHistoryManager, type HistoryManager } from '@/editor/history';
import { createAuthManager, createTokenStorage, type AuthManager } from '@/deploy';
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
import { createEntitySelection, type EntitySelection } from '@/editor/entities/entitySelection';
import { EDITOR_V2_FLAGS, isV2Enabled } from '@/editor/v2/featureFlags';
import {
  getEditorMode,
  setEditorMode,
  setInitialEditorMode,
  type EditorMode,
} from '@/editor/v2/editorMode';
import { getLegacyState } from '@/editor/v2/modeMapping';

import { downloadJson } from '@/utils/download';

const LOG_PREFIX = '[Editor]';

// Asset base path for loading tile images
const ASSET_BASE_PATH = import.meta.env.BASE_URL + 'game';

// --- Editor State ---

let editorState: EditorState | null = null;
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
let selectionBar: SelectionBarController | null = null;
let clipboard: Clipboard | null = null;
let currentBrushSize: BrushSize = 1;
let authManager: AuthManager | null = null;
let historyManager: HistoryManager | null = null;
let updateInfo: UpdateCheckResult | null = null;
let assetCacheBust: string | null = null;
let sceneManager: SceneManager | null = null;
let sceneSelector: SceneSelector | null = null;
let layerPanelController: LayerPanelController | null = null;
let entityManager: EntityManager | null = null;
let entitySelection: EntitySelection | null = null;
let entitySelectionBar: EntitySelectionBarController | null = null;
let propertyInspector: PropertyInspectorController | null = null;
let tileSelectionActive = false;
let rightBerryController: RightBerryController | null = null;

const ERASE_HOVER_STYLE = {
  fill: 'rgba(255, 80, 80, 0.25)',
  border: 'rgba(255, 120, 120, 0.9)',
};

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
}

function applyToolChange(tool: EditorState['currentTool'], updateUI = false): void {
  if (!editorState) return;
  editorState.currentTool = tool;
  scheduleSave();
  if (updateUI) {
    bottomPanelController?.setCurrentTool(tool);
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
  updateBottomContextStrip();
}

function updateEditorMode(mode: EditorMode, syncLegacy = true): void {
  if (!editorState) return;
  if (editorState.editorMode === mode && getEditorMode() === mode) {
    if (syncLegacy) {
      const legacy = getLegacyState(mode);
      if (legacy.layer) {
        applyActiveLayer(legacy.layer);
      }
      applyToolChange(legacy.tool, true);
    }
    if (mode !== 'select') {
      rightBerryController?.setActiveTab(mode, { silent: true });
    }
    return;
  }
  editorState.editorMode = mode;
  scheduleSave();

  if (getEditorMode() !== mode) {
    setEditorMode(mode);
  }

  if (syncLegacy) {
    const legacy = getLegacyState(mode);
    if (legacy.layer) {
      applyActiveLayer(legacy.layer);
    }
    applyToolChange(legacy.tool, true);
  }

  if (mode !== 'select') {
    rightBerryController?.setActiveTab(mode, { silent: true });
  }
}

function inferModeFromTool(tool: EditorState['currentTool']): EditorMode {
  if (!editorState) return 'select';
  if (tool === 'select') return 'select';
  if (tool === 'entity') return 'entities';
  const layer = editorState.activeLayer;
  if (layer === 'ground') return 'ground';
  if (layer === 'props') return 'props';
  if (layer === 'collision') return 'collision';
  if (layer === 'triggers') return 'triggers';
  return 'ground';
}

function updateBottomContextStrip(): void {
  if (!bottomContextStrip || !editorState) return;
  if (editorState.currentTool !== 'select') {
    bottomContextStrip.setSelectionType('none');
    return;
  }

  const selectedIds = editorState.selectedEntityIds ?? [];
  if (selectedIds.length > 0) {
    bottomContextStrip.setSelectionType('entities');
    bottomContextStrip.setSelectionCount(selectedIds.length);
    return;
  }

  if (tileSelectionActive) {
    bottomContextStrip.setSelectionType('tiles');
    bottomContextStrip.setPasteEnabled(clipboard?.hasData() ?? false);
    return;
  }

  bottomContextStrip.setSelectionType('none');
}

function updateEntitySelectionUI(): void {
  if (!editorState || !canvasController || !currentScene || !entitySelection) return;
  const renderer = canvasController.getRenderer();
  const selectedIds = editorState.selectedEntityIds ?? [];

  if (editorState.currentTool !== 'select' || selectedIds.length === 0) {
    renderer.setEntitySelectionIds([]);
    canvasController.invalidateScene();
    entitySelectionBar?.hide();
    propertyInspector?.hide();
    updateBottomContextStrip();
    return;
  }

  const selectedEntities = currentScene.entities.filter((entity) =>
    selectedIds.includes(entity.id)
  );

  if (selectedEntities.length === 0) {
    renderer.setEntitySelectionIds([]);
    canvasController.invalidateScene();
    entitySelectionBar?.hide();
    propertyInspector?.hide();
    updateBottomContextStrip();
    return;
  }

  renderer.setEntitySelectionIds(selectedIds);
  canvasController.invalidateScene();

  const viewport = canvasController.getViewport();
  const screenPositions = selectedEntities.map((entity) =>
    worldToScreen(viewport, entity.x, entity.y)
  );

  const minX = Math.min(...screenPositions.map((pos) => pos.x));
  const maxX = Math.max(...screenPositions.map((pos) => pos.x));
  const minY = Math.min(...screenPositions.map((pos) => pos.y));

  const centerX = (minX + maxX) / 2;
  const topY = minY - 12;

  entitySelectionBar?.setSelectionCount(selectedEntities.length);
  entitySelectionBar?.setPosition(centerX, topY);
  entitySelectionBar?.show();
  propertyInspector?.setSelection(selectedIds);
  updateBottomContextStrip();
}

function updateUndoRedoUI(canUndo: boolean, canRedo: boolean): void {
  if (topPanelController && 'setUndoRedoState' in topPanelController) {
    topPanelController.setUndoRedoState(canUndo, canRedo);
  }
}

function openSettingsPlaceholder(): void {
  window.alert('Settings are coming soon.');
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

let saveTimeout: number | null = null;
let sceneSaveTimeout: number | null = null;
const SAVE_DEBOUNCE_MS = 500;
const SCENE_SAVE_DEBOUNCE_MS = 500;

function scheduleSave(): void {
  if (saveTimeout !== null) {
    window.clearTimeout(saveTimeout);
  }
  saveTimeout = window.setTimeout(async () => {
    saveTimeout = null;
    if (editorState) {
      await saveEditorState(editorState);
      console.log(`${LOG_PREFIX} Editor state saved`);
    }
  }, SAVE_DEBOUNCE_MS);
}

function scheduleSceneSave(scene: Scene): void {
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

// --- Initialization ---

export async function initEditor(): Promise<void> {
  console.log(`${LOG_PREFIX} Initializing editor...`);

  // Load editor state
  editorState = await loadEditorState();
  editorState = restoreEditorStateFromPlaytest(editorState);
  console.log(`${LOG_PREFIX} Editor state loaded:`, editorState);
  currentBrushSize = editorState.brushSize ?? 1;
  setInitialEditorMode(editorState.editorMode);

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
  if (!editorState.selectedEntityType && currentProject.entityTypes.length > 0) {
    editorState.selectedEntityType = currentProject.entityTypes[0].name;
    scheduleSave();
  }

  // Check if the published (cold) project has changed since this hot snapshot was created.
  // This is non-destructive: we only surface a banner so the user can choose to refresh.
  try {
    updateInfo = await checkForUpdates();
    assetCacheBust = updateInfo.cacheBust;
    if (updateInfo.needsUpdate) {
      console.warn(`${LOG_PREFIX} Published project appears to have changed (${updateInfo.reason})`);
    }
  } catch (e) {
    console.warn(`${LOG_PREFIX} Update check failed:`, e);
    updateInfo = null;
    assetCacheBust = null;
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

  // Initialize panels (after canvas so we can wire up canvas updates)
  await initPanels();

  // Render system notices (update + quota warning) after panels exist.
  let quotaInfo: StorageQuotaInfo | null = null;
  try {
    quotaInfo = await checkStorageQuota();
  } catch (e) {
    console.warn(`${LOG_PREFIX} Failed to check storage quota:`, e);
  }
  renderSystemNotices(updateInfo, quotaInfo);

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
    assetBasePath: ASSET_BASE_PATH,
  });

  // Set initial selected category for rendering
  canvasController.setSelectedCategory(initialCategory);
  canvasController.getRenderer().setEntityTypes(currentProject?.entityTypes ?? []);

  // Preload tile images for all categories
  if (currentProject?.tileCategories) {
    await canvasController.preloadCategories(
      currentProject.tileCategories,
      ASSET_BASE_PATH,
      assetCacheBust
    );
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

      if (selectionBar) {
        selectionBar.setPasteEnabled(clipboard?.hasData() ?? false);
        if (state.selection && state.mode === 'selected') {
          selectionBar.show();
          const viewport = canvasController?.getViewport();
          if (viewport && currentScene) {
            const start = tileToScreen(
              viewport,
              state.selection.startX,
              state.selection.startY,
              currentScene.tileSize
            );
            const end = tileToScreen(
              viewport,
              state.selection.startX + state.selection.width,
              state.selection.startY + state.selection.height,
              currentScene.tileSize
            );
            const centerX = (start.x + end.x) / 2;
            const topY = Math.min(start.y, end.y) - 8;
            selectionBar.setPosition(centerX, topY);
          }
        } else {
          selectionBar.hide();
        }
      }

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
    onEntitySelectionChange: () => {
      updateEntitySelectionUI();
    },
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

  selectionBar = createSelectionBar(container, {
    onMove: () => {
      selectTool?.armMove();
    },
    onCopy: () => {
      selectTool?.copySelection();
    },
    onPaste: () => {
      selectTool?.armPaste();
    },
    onDelete: () => {
      selectTool?.deleteSelection();
    },
    onFill: () => {
      selectTool?.armFill();
    },
    onCancel: () => {
      selectTool?.clearSelection();
    },
  });

  entitySelectionBar = createEntitySelectionBar(container, {
    onDuplicate: () => {
      selectTool?.duplicateEntities();
    },
    onDelete: () => {
      selectTool?.deleteEntities();
    },
    onClear: () => {
      entitySelection?.clear();
      updateEntitySelectionUI();
    },
  });

  // Wire up tool gestures
  canvasController.onToolGesture({
    onStart: (x, y) => {
      if (editorState?.currentTool === 'select' && selectTool) {
        selectTool.start(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'paint' && paintTool) {
        paintTool.start(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'erase' && eraseTool) {
        eraseTool.start(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'entity' && entityTool) {
        entityTool.start(x, y, canvasController!.getViewport(), tileSize);
      }
    },
    onMove: (x, y) => {
      if (editorState?.currentTool === 'select' && selectTool) {
        selectTool.move(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'paint' && paintTool) {
        paintTool.move(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'erase' && eraseTool) {
        eraseTool.move(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'entity' && entityTool) {
        entityTool.move(x, y, canvasController!.getViewport(), tileSize);
      }
    },
    onEnd: () => {
      if (selectTool) {
        selectTool.end();
      }
      if (paintTool) {
        paintTool.end();
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
    const useTopBarV2 = isV2Enabled(EDITOR_V2_FLAGS.TOP_BAR_GLOBAL);
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
        if (isV2Enabled(EDITOR_V2_FLAGS.RIGHT_BERRY)) {
          if (editorState?.currentTool === 'paint' || editorState?.currentTool === 'erase') {
            updateEditorMode(inferModeFromTool(editorState.currentTool), false);
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
    bottomPanelController = createBottomPanel(
      bottomPanelContainer,
      {
        expanded: editorState.panelStates.bottomExpanded,
        currentTool: editorState.currentTool,
        selectedTile: editorState.selectedTile,
        brushSize: editorState.brushSize,
        entitySnapToGrid: editorState.entitySnapToGrid ?? true,
      },
      currentProject ?? undefined,
      ASSET_BASE_PATH,
        {
          authManager: authManager ?? undefined,
          tileCache: canvasController?.getTileCache() ?? undefined,
          cacheBust: assetCacheBust,
        }
    );

    if (isV2Enabled(EDITOR_V2_FLAGS.BOTTOM_CONTEXT_STRIP)) {
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
          onDuplicate: () => {
            selectTool?.duplicateEntities();
            updateEntitySelectionUI();
          },
          onClear: () => {
            entitySelection?.clear();
            updateEntitySelectionUI();
          },
        }
      );
      updateBottomContextStrip();
    }

    // Wire up persistence
    bottomPanelController.onExpandToggle((expanded) => {
      if (editorState) {
        editorState.panelStates.bottomExpanded = expanded;
        scheduleSave();
      }
    });

    bottomPanelController.onToolChange((tool) => {
      applyToolChange(tool);
      if (isV2Enabled(EDITOR_V2_FLAGS.RIGHT_BERRY)) {
        updateEditorMode(inferModeFromTool(tool), false);
      }
    });

    bottomPanelController.onTileSelect((selection) => {
      if (editorState) {
        editorState.selectedTile = {
          category: selection.category,
          index: selection.index,
        };
        scheduleSave();
      }
      // Update canvas selected category for rendering
      canvasController?.setSelectedCategory(selection.category);
    });

    bottomPanelController.onBrushSizeChange((size) => {
      currentBrushSize = size;
      if (editorState) {
        editorState.brushSize = size;
        scheduleSave();
      }
      updateHoverPreview(editorState?.currentTool ?? 'select');
    });

    bottomPanelController.onEntitySnapChange((enabled) => {
      if (editorState) {
        editorState.entitySnapToGrid = enabled;
        scheduleSave();
      }
    });

    updateUndoRedoUI(
      historyManager?.canUndo() ?? false,
      historyManager?.canRedo() ?? false
    );
  }

  if (isV2Enabled(EDITOR_V2_FLAGS.RIGHT_BERRY)) {
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer && editorState) {
      const initialTab =
        editorState.editorMode !== 'select' ? editorState.editorMode : 'ground';
      rightBerryController = createRightBerry(canvasContainer, {
        initialOpen: editorState.rightBerryOpen,
        initialTab,
      });

      const placeholderText: Record<EditorMode, string> = {
        ground: 'Choose tiles in the bottom panel, then paint on the canvas.',
        props: 'Props mode is ready for palette wiring in a later track.',
        entities: 'Entities mode will show the entity palette in Track 26.',
        collision: 'Collision mode will use the paint tool for collision tiles.',
        triggers: 'Triggers mode will be wired after entities in a later track.',
        select: 'Select mode is handled outside the right berry.',
      };

      (['ground', 'props', 'entities', 'collision', 'triggers'] as EditorMode[]).forEach(
        (mode) => {
          const container = rightBerryController?.getTabContentContainer(mode);
          if (container) {
            container.appendChild(
              createRightBerryPlaceholder(placeholderText[mode])
            );
          }
        }
      );

      rightBerryController.onTabChange((mode) => {
        updateEditorMode(mode, true);
      });

      rightBerryController.onOpenChange((open) => {
        if (!editorState) return;
        editorState.rightBerryOpen = open;
        scheduleSave();
        if (open) {
          const activeTab = rightBerryController?.getActiveTab() ?? 'ground';
          updateEditorMode(activeTab, true);
        } else {
          updateEditorMode('select', true);
        }
      });

      if (editorState.rightBerryOpen) {
        updateEditorMode(initialTab, true);
      } else {
        updateEditorMode('select', true);
      }
    }
  }

  const canvasContainer = document.getElementById('canvas-container');
  if (canvasContainer && entityManager && historyManager) {
    propertyInspector = createPropertyInspector({
      container: canvasContainer,
      getProject: () => currentProject,
      entityManager,
      history: historyManager,
      onClose: () => {
        entitySelection?.clear();
        updateEntitySelectionUI();
      },
    });
    updateEntitySelectionUI();
  }

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
    bottomPanelController?.setExpanded(true);
    bottomPanelController?.setActivePanel('data');
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
