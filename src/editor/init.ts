/**
 * Editor Initialization
 *
 * This module initializes the editor mode of InRepo Studio.
 * It will be expanded in Track 5+ to include canvas, panels, and tools.
 */

import { loadEditorState, loadProject, loadScene, saveEditorState } from '@/storage';
import type { EditorState } from '@/storage';

const LOG_PREFIX = '[Editor]';

// --- Editor State ---

let editorState: EditorState | null = null;

export function getEditorState(): EditorState | null {
  return editorState;
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
  const sceneId = editorState.currentSceneId ?? project.defaultScene;
  if (sceneId) {
    const scene = await loadScene(sceneId);
    if (scene) {
      console.log(`${LOG_PREFIX} Scene loaded: "${scene.name}"`);
      editorState.currentSceneId = sceneId;
    }
  }

  // Save updated state
  await saveEditorState(editorState);

  // Render editor UI
  renderEditorUI();

  console.log(`${LOG_PREFIX} Editor initialized`);
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
    ">
      <!-- Top Panel (placeholder) -->
      <div id="top-panel" style="
        height: 48px;
        background: #16213e;
        border-bottom: 1px solid #0f3460;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
      ">
        <span style="color: #fff; font-weight: bold;">InRepo Studio</span>
        <span style="color: #888; font-size: 0.9em;">Editor Mode</span>
      </div>

      <!-- Canvas Area (placeholder) -->
      <div id="canvas-container" style="
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #0a0a1a;
        color: #666;
      ">
        <div style="text-align: center;">
          <div style="font-size: 1.5em; margin-bottom: 10px;">Canvas</div>
          <div style="font-size: 0.9em;">Track 5: Canvas System</div>
        </div>
      </div>

      <!-- Bottom Panel (placeholder) -->
      <div id="bottom-panel" style="
        height: 120px;
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
