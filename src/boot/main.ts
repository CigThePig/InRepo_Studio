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

import { getBootConfig, type AppMode } from './modeRouter';
import { initHotStorage, needsMigration, migrateFromCold, loadProject } from '@/storage';

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

async function bootGame(): Promise<void> {
  console.log(`${LOG_PREFIX} Booting game mode...`);
  updateLoadingText('Loading game...');

  // Dynamically import runtime module
  const { initRuntime } = await import('@/runtime/init');
  await initRuntime();

  hideLoading();
  console.log(`${LOG_PREFIX} Game ready`);
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
    await routeToMode(config.mode);
  } catch (error) {
    console.error(`${LOG_PREFIX} Boot failed:`, error);
    showError(error instanceof Error ? error.message : 'Failed to start');
  }
}

async function routeToMode(mode: AppMode): Promise<void> {
  switch (mode) {
    case 'editor':
      await bootEditor();
      break;
    case 'game':
      await bootGame();
      break;
    default:
      throw new Error(`Unknown mode: ${mode}`);
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
