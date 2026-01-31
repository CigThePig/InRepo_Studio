/**
 * Runtime Initialization
 *
 * This module initializes the game mode of InRepo Studio.
 * It will be expanded in Track 11 to include Phaser integration.
 */

import { createUnifiedLoader, type DataSourceMode, type UnifiedLoader } from '@/runtime/loader';

const LOG_PREFIX = '[Runtime]';

// --- Initialization ---

export interface RuntimeConfig {
  dataSource?: DataSourceMode;
  loader?: UnifiedLoader;
  startSceneId?: string | null;
}

export async function initRuntime(config: RuntimeConfig = {}): Promise<void> {
  console.log(`${LOG_PREFIX} Initializing runtime...`);

  const dataSource = config.dataSource ?? 'cold';
  const loader = config.loader ?? createUnifiedLoader(dataSource);
  console.log(`${LOG_PREFIX} Data source: ${loader.getMode()} (${loader.getMode() === 'hot' ? 'playtest' : 'deployed'})`);

  // Load project
  const project = await loader.loadProject();

  console.log(`${LOG_PREFIX} Project: "${project.name}"`);

  // Load default scene
  const sceneId = config.startSceneId ?? project.defaultScene;
  if (!sceneId) {
    throw new Error('No scene selected for runtime');
  }
  const scene = await loader.loadScene(sceneId);
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
