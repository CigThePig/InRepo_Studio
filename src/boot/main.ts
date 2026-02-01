/**
 * InRepo Studio - Main Entry Point
 *
 * This file handles:
 * - Mode detection (editor vs game)
 * - Storage initialization
 * - Cold-to-hot migration
 * - Routing to the appropriate mode
 *
 * Invariants:
 * - Boot stays thin: wiring only, no domain logic
 * - Editor modules must not be imported in game mode
 * - Runtime must be able to boot without editor code
 */

import {
  getBootConfig,
  type BootConfig,
  cleanupPlaytest,
  getPlaytestSceneId,
  switchMode,
} from './modeRouter';
import { initHotStorage, needsMigration, migrateFromCold, forceRefreshFromCold, loadProject } from '@/storage';

const LOG_PREFIX = '[Boot]';

// --- Loading UI ---

function hideLoading(): void {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.classList.add('hidden');
  }
}

function showError(message: string): void {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="color: #ff6b6b; margin-bottom: 10px;">Error</div>
        <div style="color: #888;">${message}</div>
        <button
          style="margin-top: 20px; padding: 10px 20px; background: #4a4a6a; border: none; color: white; border-radius: 4px; cursor: pointer;"
          onclick="window.location.reload()"
        >
          Retry
        </button>
      </div>
    `;
  }
}

function updateLoadingText(text: string): void {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    const textEl = loadingEl.querySelector('.loading-text');
    if (textEl) {
      textEl.textContent = text;
    }
  }
}

// --- Editor Boot ---

async function bootEditor(): Promise<void> {
  console.log(`${LOG_PREFIX} Booting editor mode...`);
  updateLoadingText('Loading editor...');

  // Dynamically import editor module to keep it separate from game bundle
  const { initEditor } = await import('@/editor/init');
  await initEditor();

  hideLoading();
  console.log(`${LOG_PREFIX} Editor ready`);
}

// --- Game Boot ---

async function bootGame(config: BootConfig): Promise<void> {
  console.log(`${LOG_PREFIX} Booting game mode...`);
  updateLoadingText('Loading game...');

  // Dynamically import runtime module
  const { initRuntime } = await import('@/runtime/init');
  await initRuntime({ dataSource: 'cold', startSceneId: config.sceneOverride });

  hideLoading();
  console.log(`${LOG_PREFIX} Game ready`);
}

// --- Playtest Boot ---

async function bootPlaytest(config: BootConfig): Promise<void> {
  console.log(`${LOG_PREFIX} Booting playtest mode...`);
  updateLoadingText('Loading playtest...');

  const { initRuntime } = await import('@/runtime/init');
  const { createUnifiedLoader } = await import('@/runtime/loader');
  const { createPlaytestOverlay } = await import('@/runtime/playtestOverlay');

  const startSceneId = getPlaytestSceneId() ?? config.sceneOverride;
  const loader = createUnifiedLoader('hot');
  await initRuntime({ loader, startSceneId, dataSource: 'hot' });

  const overlay = createPlaytestOverlay(document.body);
  overlay.onExit(() => {
    cleanupPlaytest();
    switchMode('editor');
  });
  overlay.show();

  hideLoading();
  console.log(`${LOG_PREFIX} Playtest ready`);
}

// --- Main Boot Sequence ---

async function boot(): Promise<void> {
  const config = getBootConfig();

  console.log(`${LOG_PREFIX} InRepo Studio starting...`);
  console.log(`${LOG_PREFIX} Mode: ${config.mode}`);
  console.log(`${LOG_PREFIX} Debug: ${config.debug}`);

  if (config.debug) {
    console.log(`${LOG_PREFIX} Debug mode enabled`);
  }

  try {
    // Initialize hot storage
    updateLoadingText('Initializing storage...');
    await initHotStorage();

    // Optional: explicit reset trigger (?reset=1) to wipe hot storage and re-seed from repo.
    // This is an escape hatch for stale IndexedDB data (mobile cache quirks, etc.).
    const params = new URLSearchParams(window.location.search);
    const reset = params.get('reset') === 'true' || params.get('reset') === '1';
    if (reset) {
      updateLoadingText('Resetting local data...');
      console.log(`${LOG_PREFIX} Reset requested via query param`);
      try {
        await forceRefreshFromCold();
      } catch (e) {
        console.warn(`${LOG_PREFIX} Reset failed:`, e);
      }
      params.delete('reset');
      const url = new URL(window.location.href);
      url.search = params.toString();
      history.replaceState({}, '', url.toString());
    }

    // Check if migration is needed
    if (await needsMigration()) {
      updateLoadingText('Loading project data...');
      console.log(`${LOG_PREFIX} Running cold-to-hot migration...`);
      const result = await migrateFromCold();

      if (!result.success) {
        console.error(`${LOG_PREFIX} Migration failed:`, result.errors);
        // Continue anyway - we'll have default data
      }
    }

    // Load project to verify we have data
    const project = await loadProject();
    if (project) {
      console.log(`${LOG_PREFIX} Project: "${project.name}"`);
    }

    // Route to appropriate mode
    await routeToMode(config);
  } catch (error) {
    console.error(`${LOG_PREFIX} Boot failed:`, error);
    showError(error instanceof Error ? error.message : 'Failed to start');
  }
}

async function routeToMode(config: BootConfig): Promise<void> {
  switch (config.mode) {
    case 'editor':
      await bootEditor();
      break;
    case 'game':
      await bootGame(config);
      break;
    case 'playtest':
      await bootPlaytest(config);
      break;
    default:
      throw new Error(`Unknown mode: ${config.mode}`);
  }
}

// --- Start ---

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    boot().catch(console.error);
  });
} else {
  boot().catch(console.error);
}
