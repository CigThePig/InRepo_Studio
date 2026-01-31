/**
 * Editor Initialization
 *
 * This module initializes the editor mode of InRepo Studio.
 * Sets up the canvas, panels, and tool systems.
 */

import { loadEditorState, loadProject, loadScene, saveEditorState, saveScene } from '@/storage';
import type { EditorState } from '@/storage';
import { ensureSceneTilesets, type Scene, type Project } from '@/types';
import { createCanvas, type CanvasController } from '@/editor/canvas';
import {
  createTopPanel,
  createBottomPanel,
  type TopPanelController,
  type BottomPanelController,
} from '@/editor/panels';
import { createPaintTool, type PaintTool } from '@/editor/tools/paint';
import {
  preparePlaytest,
  setEditorStateBackup,
  getEditorStateBackup,
  clearEditorStateBackup,
  switchMode,
} from '@/boot/modeRouter';

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

export function getCurrentScene(): Scene | null {
  return currentScene;
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

// --- Initialization ---

export async function initEditor(): Promise<void> {
  console.log(`${LOG_PREFIX} Initializing editor...`);

  // Load editor state
  editorState = await loadEditorState();
  editorState = restoreEditorStateFromPlaytest(editorState);
  console.log(`${LOG_PREFIX} Editor state loaded:`, editorState);

  // Load project
  currentProject = await loadProject();
  if (!currentProject) {
    throw new Error('No project data available');
  }
  console.log(`${LOG_PREFIX} Project: "${currentProject.name}"`);

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
      currentScene = scene;
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

  // Initialize panels (after canvas so we can wire up canvas updates)
  initPanels();

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
      ASSET_BASE_PATH
    );
  }

  // Wire up viewport persistence
  canvasController.onViewportChange((viewport) => {
    if (editorState) {
      editorState.viewport = viewport;
      scheduleSave();
    }
  });

  // Initialize paint tool
  paintTool = createPaintTool({
    getEditorState: () => editorState,
    getScene: () => currentScene,
    onSceneChange: (scene) => {
      currentScene = scene;
      canvasController?.invalidateScene();
      scheduleSceneSave(scene);
    },
  });

  // Wire up tool gestures
  canvasController.onToolGesture({
    onStart: (x, y) => {
      if (editorState?.currentTool === 'paint' && paintTool) {
        paintTool.start(x, y, canvasController!.getViewport(), tileSize);
      }
    },
    onMove: (x, y) => {
      if (editorState?.currentTool === 'paint' && paintTool) {
        paintTool.move(x, y, canvasController!.getViewport(), tileSize);
      }
    },
    onEnd: () => {
      if (paintTool) {
        paintTool.end();
      }
    },
  });

  console.log(`${LOG_PREFIX} Canvas initialized (tile size: ${tileSize}px)`);
}

// --- Panel Initialization ---

function initPanels(): void {
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
      },
      currentProject ?? undefined,
      ASSET_BASE_PATH
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
  }

  console.log(`${LOG_PREFIX} Panels initialized`);
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
