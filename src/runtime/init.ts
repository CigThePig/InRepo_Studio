/**
 * Runtime Initialization
 *
 * This module initializes the game mode of InRepo Studio.
 * It will be expanded in Track 11 to include Phaser integration.
 */

import { loadProject, loadScene, hasHotData } from '@/storage';
import { fetchProject, fetchScene } from '@/storage';

const LOG_PREFIX = '[Runtime]';

// --- Initialization ---

export async function initRuntime(): Promise<void> {
  console.log(`${LOG_PREFIX} Initializing runtime...`);

  // Determine data source (hot for playtest, cold for deployed)
  const useHot = await hasHotData();
  console.log(`${LOG_PREFIX} Data source: ${useHot ? 'hot (playtest)' : 'cold (deployed)'}`);

  // Load project
  const project = useHot
    ? await loadProject()
    : await fetchProject();

  if (!project) {
    throw new Error('No project data available');
  }
  console.log(`${LOG_PREFIX} Project: "${project.name}"`);

  // Load default scene
  const sceneId = project.defaultScene;
  const scene = useHot
    ? await loadScene(sceneId)
    : await fetchScene(sceneId);

  if (!scene) {
    throw new Error(`Scene "${sceneId}" not found`);
  }
  console.log(`${LOG_PREFIX} Scene: "${scene.name}"`);

  // Render game UI (placeholder)
  renderGameUI(project.name, scene.name);

  console.log(`${LOG_PREFIX} Runtime initialized`);
}

// --- UI Rendering ---

function renderGameUI(projectName: string, sceneName: string): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div id="game-container" style="
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #0a0a1a;
    ">
      <div style="text-align: center; color: #fff;">
        <h1 style="margin-bottom: 10px;">${projectName}</h1>
        <p style="color: #888; margin-bottom: 30px;">Scene: ${sceneName}</p>
        <div style="
          width: 400px;
          height: 300px;
          background: #1a1a2e;
          border: 2px solid #0f3460;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
        ">
          <div style="text-align: center;">
            <div style="font-size: 1.2em; margin-bottom: 10px;">Game Canvas</div>
            <div style="font-size: 0.9em;">Track 11: Runtime Loader</div>
          </div>
        </div>
        <p style="color: #666; margin-top: 20px; font-size: 0.9em;">
          Add <code>?tool=editor</code> to URL to open editor
        </p>
      </div>
    </div>
  `;
}
