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
  checkForUpdates,
  forceRefreshFromCold,
} from '@/storage';
import type { BrushSize, EditorState, UpdateCheckResult } from '@/storage';
import { ensureSceneTilesets, type Scene, type Project } from '@/types';
import { createCanvas, type CanvasController } from '@/editor/canvas';
import { tileToScreen } from '@/editor/canvas/viewport';
import {
  createTopPanel,
  createBottomPanel,
  type TopPanelController,
  type BottomPanelController,
  createSelectionBar,
  type SelectionBarController,
  createLayerPanel,
} from '@/editor/panels';
import { createPaintTool, type PaintTool } from '@/editor/tools/paint';
import { createEraseTool, type EraseTool } from '@/editor/tools/erase';
import { createSelectTool, type SelectTool } from '@/editor/tools/select';
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

import { downloadJson } from '@/utils/download';

const LOG_PREFIX = '[Editor]';

// Asset base path for loading tile images
const ASSET_BASE_PATH = import.meta.env.BASE_URL + 'game';

// --- Editor State ---

let editorState: EditorState | null = null;
let currentProject: Project | null = null;
let canvasController: CanvasController | null = null;
let topPanelController: TopPanelController | null = null;
let bottomPanelController: BottomPanelController | null = null;
let currentScene: Scene | null = null;
let paintTool: PaintTool | null = null;
let eraseTool: EraseTool | null = null;
let selectTool: SelectTool | null = null;
let selectionBar: SelectionBarController | null = null;
let clipboard: Clipboard | null = null;
let currentBrushSize: BrushSize = 1;
let authManager: AuthManager | null = null;
let historyManager: HistoryManager | null = null;
let updateInfo: UpdateCheckResult | null = null;
let assetCacheBust: string | null = null;
let sceneManager: SceneManager | null = null;
let sceneSelector: SceneSelector | null = null;

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

export function getEditorState(): EditorState | null {
  return editorState;
}

export function getCanvas(): CanvasController | null {
  return canvasController;
}

export function getTopPanel(): TopPanelController | null {
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

  historyManager = createHistoryManager({
    maxSize: 50,
    onStateChange: (canUndo, canRedo) => {
      bottomPanelController?.setUndoRedoState(canUndo, canRedo);
    },
  });

  // Load project
  currentProject = await loadProject();
  if (!currentProject) {
    throw new Error('No project data available');
  }
  console.log(`${LOG_PREFIX} Project: "${currentProject.name}"`);

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

  // Render update banner (if needed) after panels exist.
  renderSystemNotice(updateInfo);

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
    },
    clipboard,
    onFillResult: (result) => {
      if (result.limitReached) {
        showToast('Fill stopped early (limit reached).');
      }
    },
    history: historyManager,
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

  // Wire up tool gestures
  canvasController.onToolGesture({
    onStart: (x, y) => {
      if (editorState?.currentTool === 'select' && selectTool) {
        selectTool.start(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'paint' && paintTool) {
        paintTool.start(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'erase' && eraseTool) {
        eraseTool.start(x, y, canvasController!.getViewport(), tileSize);
      }
    },
    onMove: (x, y) => {
      if (editorState?.currentTool === 'select' && selectTool) {
        selectTool.move(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'paint' && paintTool) {
        paintTool.move(x, y, canvasController!.getViewport(), tileSize);
      } else if (editorState?.currentTool === 'erase' && eraseTool) {
        eraseTool.move(x, y, canvasController!.getViewport(), tileSize);
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
    },
    onLongPress: (x, y) => {
      if (editorState?.currentTool === 'select' && selectTool) {
        selectTool.startMove(x, y, canvasController!.getViewport(), tileSize);
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
    topPanelController = createTopPanel(topPanelContainer, {
      expanded: editorState.panelStates.topExpanded,
      sceneName: currentScene?.name ?? 'No Scene',
      activeLayer: editorState.activeLayer,
    });

    // Wire up persistence
    topPanelController.onExpandToggle((expanded) => {
      if (editorState) {
        editorState.panelStates.topExpanded = expanded;
        scheduleSave();
      }
    });

    topPanelController.onLayerChange((layer) => {
      if (editorState) {
        editorState.activeLayer = layer;
        scheduleSave();
      }
      // Update canvas active layer for dimming
      canvasController?.setActiveLayer(layer);
    });

    topPanelController.onPlaytest(() => {
      startPlaytest().catch((error) => {
        console.error(`${LOG_PREFIX} Failed to start playtest:`, error);
      });
    });

    // Initialize scene manager and selector
    await initSceneManagement();

    // Initialize layer panel
    const layerPanelContainer = topPanelController.getLayerPanelContainer();
    layerPanelContainer.innerHTML = ''; // Clear default layer tabs

    createLayerPanel(layerPanelContainer, {
      activeLayer: editorState.activeLayer,
      visibility: editorState.layerVisibility,
      locks: editorState.layerLocks,
      onLayerSelect: (layer) => {
        if (editorState) {
          editorState.activeLayer = layer;
          scheduleSave();
        }
        topPanelController?.setActiveLayer(layer);
        canvasController?.setActiveLayer(layer);
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
    });

    // Initialize renderer with current visibility and locks
    const renderer = canvasController?.getRenderer();
    if (renderer) {
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
      },
      currentProject ?? undefined,
      ASSET_BASE_PATH,
        {
          authManager: authManager ?? undefined,
          tileCache: canvasController?.getTileCache() ?? undefined,
          cacheBust: assetCacheBust,
        }
    );

    // Wire up persistence
    bottomPanelController.onExpandToggle((expanded) => {
      if (editorState) {
        editorState.panelStates.bottomExpanded = expanded;
        scheduleSave();
      }
    });

    bottomPanelController.onToolChange((tool) => {
      if (editorState) {
        editorState.currentTool = tool;
        scheduleSave();
      }
      updateHoverPreview(tool);
      if (tool !== 'select') {
        selectTool?.clearSelection();
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

    bottomPanelController.onUndo(() => {
      historyManager?.undo();
    });

    bottomPanelController.onRedo(() => {
      historyManager?.redo();
    });

    bottomPanelController.setUndoRedoState(
      historyManager?.canUndo() ?? false,
      historyManager?.canRedo() ?? false
    );
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

  if (editorState) {
    editorState.currentSceneId = scene.id;
    scheduleSave();
  }

  // Update canvas
  canvasController?.setScene(scene);
  canvasController?.invalidateScene();

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


function renderSystemNotice(info: UpdateCheckResult | null): void {
  const container = document.getElementById('system-notice-container');
  if (!container) return;

  // Clear existing
  container.innerHTML = '';
  container.style.display = 'none';

  if (!info) return;

  // Only show a banner when we have a strong signal that cold changed or hot baseline is missing+diff.
  if (!info.needsUpdate) return;

  // Allow dismissing per-session for the current fingerprint.
  const dismissKey = `inrepo_dismiss_update_banner:${info.remote?.etag ?? info.remote?.lastModified ?? 'unknown'}`;
  if (sessionStorage.getItem(dismissKey) === 'true') {
    return;
  }

  const banner = document.createElement('div');
  banner.style.cssText = `
    background: #2a1f3a;
    border-bottom: 1px solid #3a2a6e;
    color: #f0e6ff;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;

  const title = document.createElement('div');
  title.style.cssText = 'font-weight: 700; font-size: 13px;';
  title.textContent = 'Published project changed on GitHub';

  const desc = document.createElement('div');
  desc.style.cssText = 'font-size: 12px; color: #cbbbe8; line-height: 1.35;';
  desc.textContent =
    'Your editor is using a local (hot) copy that may be out of date. Refreshing will overwrite local edits, so export a backup first if you want to keep them.';

  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

  const btnPrimary = document.createElement('button');
  btnPrimary.type = 'button';
  btnPrimary.textContent = 'Refresh from Repo';
  btnPrimary.style.cssText = `
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 10px;
    border: none;
    background: #ff6b6b;
    color: #1a0f14;
    font-weight: 800;
    cursor: pointer;
  `;

  const btnSecondary = document.createElement('button');
  btnSecondary.type = 'button';
  btnSecondary.textContent = 'Export Local Backup';
  btnSecondary.style.cssText = `
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid #3a3a6e;
    background: #1f1f3a;
    color: #fff;
    font-weight: 700;
    cursor: pointer;
  `;

  const btnDismiss = document.createElement('button');
  btnDismiss.type = 'button';
  btnDismiss.textContent = 'Dismiss';
  btnDismiss.style.cssText = `
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid #3a3a6e;
    background: transparent;
    color: #cbbbe8;
    font-weight: 700;
    cursor: pointer;
  `;

  const status = document.createElement('div');
  status.style.cssText = 'font-size: 12px; color: #aab0d4;';
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
    const ok = window.confirm(
      'Refresh from Repo will overwrite your local (hot) edits with the published repo version.\n\nTip: Export a backup first if you might want to restore your edits.\n\nContinue?'
    );
    if (!ok) return;

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
    container.innerHTML = '';
    container.style.display = 'none';
  });

  actions.appendChild(btnPrimary);
  actions.appendChild(btnSecondary);
  actions.appendChild(btnDismiss);

  banner.appendChild(title);
  banner.appendChild(desc);
  banner.appendChild(actions);
  banner.appendChild(status);

  container.appendChild(banner);
  container.style.display = 'block';
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
