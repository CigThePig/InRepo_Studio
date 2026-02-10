/**
 * Blockly Cockpit — full mode orchestrator.
 *
 * Coordinates entering/exiting Blockly Mode:
 * - Lazy-loads Blockly workspace on first entry
 * - Shows/hides workspace container vs canvas
 * - Manages top bar swap (World Mode <-> Blockly Mode)
 * - Creates workspace manager for save/load
 * - Builds Logic Target list from scenes
 * - Wires Run/Stop to ScriptHost (stub — no SceneHost available in editor yet)
 * - Handles empty state UI
 * - beforeunload save, orientation resize
 */

import type { ScriptLogicTarget } from '@/types/script';
import type { PresetSavedConfig } from '@/types/preset';
import { initScriptStorage } from '@/storage/scriptStorage';
import {
  enterBlocklyMode,
  exitBlocklyMode,
  isBlocklyModeActive,
  setWorkspaceReady,
  setScriptStatus,
  getBlocklyModeState,
} from './blocklyMode';
import type { BlocklyWorkspaceController } from './blocklyWorkspace';
import type { WorkspaceManagerController } from './workspaceManager';
import {
  createBlocklyTopBar,
  type BlocklyTopBarController,
  type LogicTargetItem,
} from './blocklyTopBar';
import { BLOCKLY_BERRY_TABS } from './blocklyBerryTabs';
import { createBlocksPalette, type BlocksPaletteController } from './blocksPalette';
import type { RightBerryController } from '@/editor/panels/rightBerry';

const LOG_PREFIX = '[BlocklyCockpit]';

// --- Types ---

export interface BlocklyCockpitDeps {
  topPanelContainer: HTMLElement;
  canvasContainer: HTMLElement;
  getSceneList: () => Promise<Array<{ id: string; name: string }>>;
  getCurrentSceneId: () => string | null;
  setWorldTopBarVisible: (visible: boolean) => void;
  rightBerry?: RightBerryController;
  getPresetConfig?: () => PresetSavedConfig | null;
  onEnablePreset?: (categoryId: string) => void;
}

export interface BlocklyCockpitController {
  enter(target?: ScriptLogicTarget): Promise<void>;
  exit(): Promise<void>;
  isActive(): boolean;
  dispose(): void;
}

// --- Styles ---

const STYLES = `
  .blockly-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: none;
    background: #1e1e2e;
  }

  .blockly-container--active {
    display: block;
  }

  .blockly-container__loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: rgba(255, 255, 255, 0.6);
    font-size: 16px;
    font-family: sans-serif;
  }

  .blockly-empty-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 16px;
    font-family: sans-serif;
    z-index: 10;
    display: none;
  }

  .blockly-empty-state--visible {
    display: block;
  }

  .blockly-empty-state__text {
    margin-bottom: 16px;
  }

  .blockly-empty-state__btn {
    padding: 12px 24px;
    border-radius: 10px;
    border: none;
    background: #3b82f6;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    -webkit-tap-highlight-color: transparent;
  }

  .blockly-empty-state__btn:active {
    background: #2563eb;
    transform: scale(0.98);
  }
`;

// --- Factory ---

export function createBlocklyCockpit(
  deps: BlocklyCockpitDeps,
): BlocklyCockpitController {
  const {
    topPanelContainer,
    canvasContainer,
    getSceneList,
    getCurrentSceneId,
    setWorldTopBarVisible,
    rightBerry,
    getPresetConfig,
    onEnablePreset,
  } = deps;

  // Inject styles
  if (!document.getElementById('blockly-cockpit-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'blockly-cockpit-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  // --- DOM ---

  const workspaceContainer = document.createElement('div');
  workspaceContainer.className = 'blockly-container';
  canvasContainer.appendChild(workspaceContainer);

  const loadingEl = document.createElement('div');
  loadingEl.className = 'blockly-container__loading';
  loadingEl.textContent = 'Loading Blockly...';
  workspaceContainer.appendChild(loadingEl);

  const emptyState = document.createElement('div');
  emptyState.className = 'blockly-empty-state';

  const emptyText = document.createElement('div');
  emptyText.className = 'blockly-empty-state__text';
  emptyText.textContent = 'No script exists for this target. Create one?';

  const createBtn = document.createElement('button');
  createBtn.className = 'blockly-empty-state__btn';
  createBtn.type = 'button';
  createBtn.textContent = 'Create Script';

  emptyState.appendChild(emptyText);
  emptyState.appendChild(createBtn);
  workspaceContainer.appendChild(emptyState);

  // --- Mutable state (object so closures always see latest) ---

  const s: {
    topBar: BlocklyTopBarController | null;
    workspace: BlocklyWorkspaceController | null;
    manager: WorkspaceManagerController | null;
    palette: BlocksPaletteController | null;
    loaded: boolean;
    disposed: boolean;
  } = {
    topBar: null,
    workspace: null,
    manager: null,
    palette: null,
    loaded: false,
    disposed: false,
  };

  // --- Top bar ---

  s.topBar = createBlocklyTopBar(topPanelContainer);

  s.topBar.onBack(() => {
    controller.exit().catch((err) => {
      console.error(`${LOG_PREFIX} Error exiting Blockly Mode:`, err);
    });
  });

  s.topBar.onTargetChange((target) => {
    if (s.manager) {
      s.manager.switchLogicTarget(target).then(() => {
        updateEmptyState();
        // Update palette Logic Target filter
        if (s.palette) {
          s.palette.setLogicTarget(target.type);
        }
      }).catch((err) => {
        console.error(`${LOG_PREFIX} Error switching Logic Target:`, err);
      });
    }
  });

  s.topBar.onRun(() => {
    // Run is a stub in Track 39 — full ScriptHost wiring requires SceneHost
    console.log(`${LOG_PREFIX} Run pressed (stub — ScriptHost wiring in later track)`);
    setScriptStatus('running');
    s.topBar?.setScriptStatus('running');
  });

  s.topBar.onStop(() => {
    console.log(`${LOG_PREFIX} Stop pressed (stub)`);
    setScriptStatus('stopped');
    s.topBar?.setScriptStatus('stopped');
  });

  // Empty state create button
  createBtn.addEventListener('click', () => {
    if (s.manager) {
      s.manager.createScript().then(() => {
        updateEmptyState();
      });
    }
  });

  // --- Helpers ---

  async function buildLogicTargets(): Promise<LogicTargetItem[]> {
    const targets: LogicTargetItem[] = [
      {
        target: { type: 'game', label: 'Game Logic (main)' },
        label: 'Logic Target: Game Logic (main)',
      },
    ];

    const scenes = await getSceneList();
    for (const scene of scenes) {
      targets.push({
        target: { type: 'map', mapId: scene.id, label: `Map: ${scene.name}` },
        label: `Logic Target: Map: ${scene.name}`,
      });
    }

    return targets;
  }

  function resolveDefaultTarget(): ScriptLogicTarget {
    const currentSceneId = getCurrentSceneId();
    if (currentSceneId) {
      return {
        type: 'map',
        mapId: currentSceneId,
        label: `Map: ${currentSceneId}`,
      };
    }
    return { type: 'game', label: 'Game Logic (main)' };
  }

  function updateEmptyState(): void {
    const modeState = getBlocklyModeState();
    const showEmpty = !modeState.scriptExists && s.manager && !s.manager.getScriptExists();
    emptyState.classList.toggle('blockly-empty-state--visible', !!showEmpty);

    const targetLabel = modeState.currentLogicTarget?.label ?? 'this target';
    emptyText.textContent = `No script exists for ${targetLabel}. Create one?`;
  }

  function showUI(): void {
    workspaceContainer.classList.add('blockly-container--active');
    setWorldTopBarVisible(false);
    s.topBar?.setVisible(true);

    const gameCanvas = canvasContainer.querySelector('canvas');
    if (gameCanvas) {
      (gameCanvas as HTMLElement).style.display = 'none';
    }
  }

  function hideUI(): void {
    workspaceContainer.classList.remove('blockly-container--active');
    setWorldTopBarVisible(true);
    s.topBar?.setVisible(false);

    const gameCanvas = canvasContainer.querySelector('canvas');
    if (gameCanvas) {
      (gameCanvas as HTMLElement).style.display = '';
    }
  }

  // Touch event isolation
  workspaceContainer.addEventListener('touchstart', (e) => {
    e.stopPropagation();
  }, { passive: true });

  workspaceContainer.addEventListener('touchmove', (e) => {
    e.stopPropagation();
  }, { passive: true });

  // --- beforeunload save ---

  function handleBeforeUnload(): void {
    if (isBlocklyModeActive() && s.manager) {
      s.manager.saveNow().catch(() => { /* best effort */ });
    }
  }
  window.addEventListener('beforeunload', handleBeforeUnload);

  // --- Orientation / resize ---

  function handleResize(): void {
    if (isBlocklyModeActive() && s.workspace) {
      s.workspace.resize();
    }
  }
  window.addEventListener('resize', handleResize);

  // --- Controller ---

  const controller: BlocklyCockpitController = {
    async enter(target?: ScriptLogicTarget): Promise<void> {
      if (s.disposed) return;
      if (isBlocklyModeActive()) return;

      const resolvedTarget = target ?? resolveDefaultTarget();
      enterBlocklyMode(resolvedTarget);
      showUI();

      await initScriptStorage();

      // Lazy-load Blockly workspace module
      if (!s.loaded) {
        loadingEl.style.display = '';
        console.log(`${LOG_PREFIX} Lazy-loading Blockly workspace module...`);

        const { createBlocklyWorkspace } = await import('./blocklyWorkspace');

        const blocklyDiv = document.createElement('div');
        blocklyDiv.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0;';
        workspaceContainer.insertBefore(blocklyDiv, loadingEl);

        s.workspace = createBlocklyWorkspace(blocklyDiv);
        s.loaded = true;
        loadingEl.style.display = 'none';

        console.log(`${LOG_PREFIX} Blockly workspace loaded`);
      }

      // Create workspace manager
      const { createWorkspaceManager } = await import('./workspaceManager');
      s.manager = createWorkspaceManager(
        { workspaceController: s.workspace! },
        resolvedTarget,
      );

      setWorkspaceReady(true);

      // Build and set Logic Target list
      const targets = await buildLogicTargets();
      s.topBar!.setLogicTargets(targets);
      s.topBar!.setCurrentTarget(resolvedTarget);
      s.topBar!.setScriptStatus('stopped');

      // Load workspace for initial target
      await s.manager.switchLogicTarget(resolvedTarget);
      updateEmptyState();

      // Switch right berry to Blockly tabs and create palette
      if (rightBerry) {
        const tabContainers = rightBerry.setTabSet([...BLOCKLY_BERRY_TABS]);
        const blocksContainer = tabContainers.get('blocks');
        if (blocksContainer && s.workspace) {
          s.palette = createBlocksPalette(blocksContainer, {
            registry: s.workspace.getBlockRegistry(),
            workspace: s.workspace,
            getPresetConfig: getPresetConfig ?? (() => null),
            onEnablePreset,
          });
          s.palette.setLogicTarget(resolvedTarget.type);
        }

        // Add placeholder content for Inspect tab
        const inspectContainer = tabContainers.get('inspect');
        if (inspectContainer) {
          const placeholder = document.createElement('div');
          placeholder.style.cssText = 'color: rgba(255,255,255,0.4); font-size: 13px; padding: 16px; text-align: center;';
          placeholder.textContent = 'Inspect & Errors — coming in Track 42';
          inspectContainer.appendChild(placeholder);
        }
      }

      // Resize to fit container
      s.workspace!.resize();

      console.log(`${LOG_PREFIX} Blockly Mode entered`);
    },

    async exit(): Promise<void> {
      if (s.disposed) return;
      if (!isBlocklyModeActive()) return;

      if (s.manager) {
        await s.manager.saveNow();
        s.manager.dispose();
        s.manager = null;
      }

      // Destroy palette and restore right berry tabs
      if (s.palette) {
        s.palette.destroy();
        s.palette = null;
      }
      if (rightBerry) {
        rightBerry.restoreDefaultTabs();
      }

      hideUI();
      emptyState.classList.remove('blockly-empty-state--visible');
      exitBlocklyMode();

      console.log(`${LOG_PREFIX} Blockly Mode exited`);
    },

    isActive(): boolean {
      return isBlocklyModeActive();
    },

    dispose(): void {
      s.disposed = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('resize', handleResize);

      if (s.palette) {
        s.palette.destroy();
        s.palette = null;
      }
      if (s.manager) {
        s.manager.dispose();
        s.manager = null;
      }
      if (s.workspace) {
        s.workspace.dispose();
        s.workspace = null;
      }
      if (s.topBar) {
        s.topBar.destroy();
        s.topBar = null;
      }

      workspaceContainer.remove();

      const styleEl = document.getElementById('blockly-cockpit-styles');
      if (styleEl) styleEl.remove();

      console.log(`${LOG_PREFIX} Cockpit disposed`);
    },
  };

  return controller;
}
