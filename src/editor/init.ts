/**
 * Editor Initialization
 *
 * This module initializes the editor mode of InRepo Studio.
 * Sets up the canvas, panels, and tool systems.
 */

import { loadEditorState, loadProject, loadScene, saveEditorState } from '@/storage';
import type { EditorState } from '@/storage';
import { createCanvas, type CanvasController } from '@/editor/canvas';

const LOG_PREFIX = '[Editor]';

// --- Editor State ---

let editorState: EditorState | null = null;
let canvasController: CanvasController | null = null;

export function getEditorState(): EditorState | null {
  return editorState;
}

export function getCanvas(): CanvasController | null {
  return canvasController;
}

// --- Debounced Save ---

let saveTimeout: number | null = null;
const SAVE_DEBOUNCE_MS = 500;

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

// --- Initialization ---

export async function initEditor(): Promise<void> {
  console.log(`${LOG_PREFIX} Initializing editor...`);

  // Load editor state
  editorState = await loadEditorState();
  console.log(`${LOG_PREFIX} Editor state loaded:`, editorState);

  // Load project
  const project = await loadProject();
  if (!project) {
    throw new Error('No project data available');
  }
  console.log(`${LOG_PREFIX} Project: "${project.name}"`);

  // Load current scene or default
  let currentScene = null;
  const sceneId = editorState.currentSceneId ?? project.defaultScene;
  if (sceneId) {
    currentScene = await loadScene(sceneId);
    if (currentScene) {
      console.log(`${LOG_PREFIX} Scene loaded: "${currentScene.name}"`);
      editorState.currentSceneId = sceneId;
    }
  }

  // Save updated state
  await saveEditorState(editorState);

  // Render editor UI
  renderEditorUI();

  // Initialize canvas
  initCanvas(currentScene?.tileSize ?? project.settings?.defaultTileSize ?? 32);

  console.log(`${LOG_PREFIX} Editor initialized`);
}

// --- Canvas Initialization ---

function initCanvas(tileSize: number): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error(`${LOG_PREFIX} Canvas container not found`);
    return;
  }

  // Create canvas controller with initial viewport from editor state
  canvasController = createCanvas(container, {
    viewport: editorState?.viewport,
    tileSize,
  });

  // Wire up viewport persistence
  canvasController.onViewportChange((viewport) => {
    if (editorState) {
      editorState.viewport = viewport;
      scheduleSave();
    }
  });

  console.log(`${LOG_PREFIX} Canvas initialized (tile size: ${tileSize}px)`);
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
      <!-- Top Panel (placeholder) -->
      <div id="top-panel" style="
        height: 48px;
        min-height: 48px;
        background: #16213e;
        border-bottom: 1px solid #0f3460;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
      ">
        <span style="color: #fff; font-weight: bold;">InRepo Studio</span>
        <span style="color: #888; font-size: 0.9em;">Press G to toggle grid</span>
      </div>

      <!-- Canvas Area -->
      <div id="canvas-container" style="
        flex: 1;
        position: relative;
        overflow: hidden;
        background: #0a0a1a;
      "></div>

      <!-- Bottom Panel (placeholder) -->
      <div id="bottom-panel" style="
        height: 120px;
        min-height: 120px;
        background: #16213e;
        border-top: 1px solid #0f3460;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
      ">
        <span>Track 6: Panels + Tile Picker</span>
      </div>
    </div>
  `;
}
