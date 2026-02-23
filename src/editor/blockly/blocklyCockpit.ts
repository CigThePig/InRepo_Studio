/**
 * Blockly Cockpit — full mode orchestrator.
 *
 * Coordinates entering/exiting Blockly Mode:
 * - Lazy-loads Blockly workspace on first entry
 * - Shows/hides workspace container vs canvas
 * - Manages top bar swap (World Mode <-> Blockly Mode)
 * - Creates workspace manager for save/load
 * - Builds Logic Target list from scenes (grouped: Presets, Game, Maps)
 * - Wires Run/Stop to a session-scoped ScriptHost (Track 42)
 * - Owns log ring buffer (max 100 entries) and Inspect panel
 * - Handles empty state UI
 * - beforeunload save, orientation resize
 * - Hides bottom map toolbar while Blockly is active
 */

import type { ScriptLogicTarget } from '@/types/script';
import { resolveScriptId } from '@/types/script';
import type { PresetSavedConfig } from '@/types/preset';
import type { ApiContext, LogApi, EntityLookup, PresetSurface, ApiMeta } from '@/types/gameApi';
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
  type LogicTargetGroup,
} from './blocklyTopBar';
import { BLOCKLY_BERRY_TABS } from './blocklyBerryTabs';
import { createBlocksPalette, type BlocksPaletteController } from './blocksPalette';
import {
  createInspectPanel,
  type InspectPanelController,
  type ScriptInspectEntry,
  type InspectState,
  type LogEntry,
} from './inspectPanel';
import type { RightBerryController } from '@/editor/panels/rightBerry';
import type { LeftBerryController } from '@/editor/panels/leftBerry';

// Runtime imports — editor may import runtime (not vice-versa).
import { ScriptHost } from '@/runtime/blockly/scriptHost';
import { createEventBus } from '@/runtime/apiContext/eventBus';
import { createTimeHelpers, type DisposableTimeHelpers } from '@/runtime/apiContext/timeHelpers';

const LOG_PREFIX = '[BlocklyCockpit]';

/** Preset category IDs used for building the preset target group. */
const PRESET_CATEGORIES = ['controls', 'movement', 'camera', 'animation', 'entity-animation'] as const;

/** Maximum log entries kept in the ring buffer. */
const MAX_LOG_ENTRIES = 100;

// --- Types ---

export interface BlocklyCockpitDeps {
  topPanelContainer: HTMLElement;
  canvasContainer: HTMLElement;
  getSceneList: () => Promise<Array<{ id: string; name: string }>>;
  getCurrentSceneId: () => string | null;
  setWorldTopBarVisible: (visible: boolean) => void;
  setWorldBottomBarVisible?: (visible: boolean) => void;
  rightBerry?: RightBerryController;
  leftBerry?: LeftBerryController;
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

const STYLE_ID = 'irs-blockly-cockpit-styles';

const STYLES = `
  .irs-blockly-workspace {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: none;
    background: var(--irs-surface-dark);
    touch-action: none;
    overscroll-behavior: none;
  }

  .irs-blockly-workspace .blocklySvg {
    touch-action: none;
    overscroll-behavior: none;
  }

  .irs-blockly-workspace .blocklyScrollbarHorizontal,
  .irs-blockly-workspace .blocklyScrollbarVertical,
  .irs-blockly-workspace .blocklyScrollbarBackground,
  .irs-blockly-workspace .blocklyScrollbarHandle {
    display: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  .irs-blockly-workspace--active {
    display: block;
  }

  .irs-blockly-workspace__loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--irs-text-secondary);
    font-size: 16px;
    font-family: sans-serif;
  }

  .irs-blockly-workspace__empty {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: var(--irs-text-secondary);
    font-size: 16px;
    font-family: sans-serif;
    z-index: 10;
    display: none;
  }

  .irs-blockly-workspace__empty--visible {
    display: block;
  }

  .irs-blockly-workspace__empty__text {
    margin-bottom: 16px;
  }

  .irs-blockly-workspace__empty__btn {
    padding: 12px 24px;
    border-radius: 10px;
    border: none;
    background: var(--irs-color-blue);
    color: var(--irs-text-primary);
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    -webkit-tap-highlight-color: transparent;
  }

  .irs-blockly-workspace__empty__btn:active {
    background: var(--irs-accent-primary-active);
    transform: scale(0.98);
  }
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

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
    setWorldBottomBarVisible,
    rightBerry,
    leftBerry,
    getPresetConfig,
    onEnablePreset,
  } = deps;

  // Inject styles
  ensureStyles();

  // --- DOM ---

  const workspaceContainer = document.createElement('div');
  workspaceContainer.className = 'irs-blockly-workspace';
  canvasContainer.appendChild(workspaceContainer);

  const loadingEl = document.createElement('div');
  loadingEl.className = 'irs-blockly-workspace__loading';
  loadingEl.textContent = 'Loading Blockly...';
  workspaceContainer.appendChild(loadingEl);

  const emptyState = document.createElement('div');
  emptyState.className = 'irs-blockly-workspace__empty';

  const emptyText = document.createElement('div');
  emptyText.className = 'irs-blockly-workspace__empty__text';
  emptyText.textContent = 'No script exists for this target. Create one?';

  const createBtn = document.createElement('button');
  createBtn.className = 'irs-blockly-workspace__empty__btn';
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
    inspectPanel: InspectPanelController | null;
    scriptHost: ScriptHost | null;
    timeHelpers: DisposableTimeHelpers | null;
    apiCtxDispose: (() => void) | null;
    scriptEventUnsubs: (() => void)[];
    loaded: boolean;
    disposed: boolean;
  } = {
    topBar: null,
    workspace: null,
    manager: null,
    palette: null,
    inspectPanel: null,
    scriptHost: null,
    timeHelpers: null,
    apiCtxDispose: null,
    scriptEventUnsubs: [],
    loaded: false,
    disposed: false,
  };

  // --- Log ring buffer + per-script inspect state ---

  const logBuffer: LogEntry[] = [];
  const inspectScripts = new Map<string, ScriptInspectEntry>();

  function appendToLogBuffer(entry: LogEntry): void {
    if (logBuffer.length >= MAX_LOG_ENTRIES) {
      logBuffer.shift();
    }
    logBuffer.push(entry);
    s.inspectPanel?.appendLog(entry);
  }

  function buildInspectState(): InspectState {
    return {
      scripts: Array.from(inspectScripts.values()),
      logs: [...logBuffer],
    };
  }

  // --- Editor-scoped ApiContext ---
  // Creates a minimal ApiContext for running scripts inside the editor.
  // Log calls are intercepted to populate the ring buffer.

  function createEditorRunContext(): { ctx: ApiContext; dispose: () => void } {
    const events = createEventBus();
    const timeHelpers = createTimeHelpers();
    s.timeHelpers = timeHelpers;

    const log: LogApi = {
      info(msg) {
        console.log(`[ScriptRun] ${msg}`);
        const targetLabel = getActiveTargetLabel();
        appendToLogBuffer({ timestamp: Date.now(), level: 'info', logicTarget: targetLabel, message: msg });
      },
      warn(msg) {
        console.warn(`[ScriptRun] ${msg}`);
        const targetLabel = getActiveTargetLabel();
        appendToLogBuffer({ timestamp: Date.now(), level: 'warn', logicTarget: targetLabel, message: msg });
      },
      error(msg) {
        console.error(`[ScriptRun] ${msg}`);
        const targetLabel = getActiveTargetLabel();
        appendToLogBuffer({ timestamp: Date.now(), level: 'error', logicTarget: targetLabel, message: msg });
      },
      event() {
        // event logs are internal — no ring buffer entry
      },
    };

    const stubPresets: PresetSurface = {
      getCategory: () => null,
      isEnabled: () => false,
      activePresetId: () => null,
    };

    const stubEntities: EntityLookup = {
      getById: () => null,
      getByTag: () => [],
      setTag: () => {},
      exists: () => false,
    };

    const meta: ApiMeta = {
      apiVersion: '1.0',
      schemaVersion: 1,
      logicTarget: { type: 'game', id: 'editor-run', label: 'Editor Run' },
      categories: [],
      capabilities: {},
    };

    const ctx: ApiContext = {
      meta,
      events,
      time: timeHelpers,
      log,
      entities: stubEntities,
      presets: stubPresets,
      call: () => undefined,
      on: (eventId, handler) => events.on(eventId, handler),
      read: () => undefined,
    };

    return {
      ctx,
      dispose: () => {
        timeHelpers.dispose();
        events.dispose();
      },
    };
  }

  function getActiveTargetLabel(): string {
    return getBlocklyModeState().currentLogicTarget?.label ?? 'Script';
  }

  // --- ScriptHost lifecycle subscription ---

  function subscribeToScriptEvents(ctx: ApiContext): void {
    const events = ctx.events;

    const onStarted = (payload: Record<string, unknown>) => {
      const scriptId = String(payload.scriptId ?? '');
      const target = payload.logicTarget as Partial<ScriptLogicTarget> | undefined;
      const label = target?.label ?? scriptId;

      inspectScripts.set(scriptId, {
        logicTarget: label,
        status: 'running',
        activeTimerCount: s.timeHelpers?.activeCount ?? 0,
      });

      const status = 'running';
      setScriptStatus(status);
      s.topBar?.setScriptStatus(status);
      s.inspectPanel?.update(buildInspectState());
      console.log(`${LOG_PREFIX} Script started: ${scriptId}`);
    };

    const onStopped = (payload: Record<string, unknown>) => {
      const scriptId = String(payload.scriptId ?? '');
      const existing = inspectScripts.get(scriptId);
      if (existing) {
        inspectScripts.set(scriptId, { ...existing, status: 'stopped', activeTimerCount: 0 });
      }

      const anyRunning = Array.from(inspectScripts.values()).some((e) => e.status === 'running');
      const anyError = Array.from(inspectScripts.values()).some((e) => e.status === 'error');
      const status = anyRunning ? 'running' : anyError ? 'error' : 'stopped';
      setScriptStatus(status);
      s.topBar?.setScriptStatus(status);
      s.inspectPanel?.update(buildInspectState());
      console.log(`${LOG_PREFIX} Script stopped: ${scriptId}`);
    };

    const onError = (payload: Record<string, unknown>) => {
      const scriptId = String(payload.scriptId ?? '');
      const target = payload.logicTarget as Partial<ScriptLogicTarget> | undefined;
      const label = target?.label ?? scriptId;
      const errorMessage = String(payload.message ?? 'Unknown error');
      const blockId = payload.blockId ? String(payload.blockId) : undefined;

      inspectScripts.set(scriptId, {
        logicTarget: label,
        status: 'error',
        errorMessage,
        errorBlockId: blockId,
        activeTimerCount: 0,
      });

      const anyRunning = Array.from(inspectScripts.values()).some((e) => e.status === 'running');
      const status = anyRunning ? 'running' : 'error';
      setScriptStatus(status);
      s.topBar?.setScriptStatus(status);
      s.inspectPanel?.update(buildInspectState());
      console.log(`${LOG_PREFIX} Script error: ${scriptId} — ${errorMessage}`);
    };

    s.scriptEventUnsubs.push(events.on('script.started', onStarted));
    s.scriptEventUnsubs.push(events.on('script.stopped', onStopped));
    s.scriptEventUnsubs.push(events.on('script.error', onError));
  }

  function unsubscribeFromScriptEvents(): void {
    for (const unsub of s.scriptEventUnsubs) {
      unsub();
    }
    s.scriptEventUnsubs = [];
  }

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
          s.palette.setLogicTarget(resolveLogicTargetFilter(target));
        }
      }).catch((err) => {
        console.error(`${LOG_PREFIX} Error switching Logic Target:`, err);
      });
    }
  });

  s.topBar.onRun(() => {
    if (!s.scriptHost || !s.workspace || !s.manager) {
      console.warn(`${LOG_PREFIX} Run pressed but runtime not ready`);
      return;
    }
    const currentTarget = s.manager.getCurrentTarget();
    const scriptId = resolveScriptId(currentTarget.type, currentTarget.targetId ?? currentTarget.mapId);

    try {
      const rawJs = s.workspace.generateJs();
      // ScriptHost's wrapped API captures disposers automatically; return [] is sufficient.
      const jsSource = `${rawJs}\nreturn [];`;
      s.scriptHost.startScript({ scriptId, logicTarget: currentTarget, jsSource });
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to start script:`, err);
    }
  });

  s.topBar.onStop(() => {
    if (s.scriptHost) {
      s.scriptHost.stopAll();
    } else {
      // Fallback: update status indicators directly
      setScriptStatus('stopped');
      s.topBar?.setScriptStatus('stopped');
    }
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

  /**
   * Build the full target list including preset, game, and map targets.
   * Returns both the flat list and grouped structure for the overlay picker.
   */
  async function buildLogicTargets(): Promise<{ flat: LogicTargetItem[]; groups: LogicTargetGroup[] }> {
    const presetConfig = getPresetConfig?.() ?? null;
    const presetItems: LogicTargetItem[] = PRESET_CATEGORIES.map((catId) => {
      const catConfig = presetConfig?.categories[catId];
      const activePresetId = catConfig?.enabled ? catConfig.presetId : null;
      return {
        target: { type: 'preset' as const, targetId: catId, label: capitalize(catId) },
        label: capitalize(catId),
        subLabel: activePresetId ?? 'No active preset',
      };
    });

    const gameItems: LogicTargetItem[] = [
      {
        target: { type: 'game', label: 'Game Logic (main)' },
        label: 'Game Logic (main)',
      },
    ];

    const scenes = await getSceneList();
    const mapItems: LogicTargetItem[] = scenes.map((scene) => ({
      target: { type: 'map' as const, mapId: scene.id, label: `Map: ${scene.name}` },
      label: `Map: ${scene.name}`,
    }));

    const flat = [...presetItems, ...gameItems, ...mapItems];

    const groups: LogicTargetGroup[] = [
      { id: 'presets', label: 'Presets', items: presetItems },
      { id: 'game', label: 'Game', items: gameItems },
      { id: 'maps', label: 'Maps', items: mapItems },
    ];

    return { flat, groups };
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

  /**
   * Map a ScriptLogicTarget to the palette filter value.
   * Preset targets use 'preset' filter; game and map pass through as-is.
   */
  function resolveLogicTargetFilter(target: ScriptLogicTarget): 'game' | 'map' | 'preset' | null {
    if (target.type === 'preset') return 'preset';
    if (target.type === 'game') return 'game';
    if (target.type === 'map') return 'map';
    return null;
  }

  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function updateEmptyState(): void {
    const modeState = getBlocklyModeState();
    const showEmpty = !modeState.scriptExists && s.manager && !s.manager.getScriptExists();
    emptyState.classList.toggle('irs-blockly-workspace__empty--visible', !!showEmpty);

    const targetLabel = modeState.currentLogicTarget?.label ?? 'this target';
    emptyText.textContent = `No script exists for ${targetLabel}. Create one?`;
  }

  function showUI(): void {
    workspaceContainer.classList.add('irs-blockly-workspace--active');
    setWorldTopBarVisible(false);
    setWorldBottomBarVisible?.(false);
    s.topBar?.setVisible(true);

    const gameCanvas = canvasContainer.querySelector('canvas');
    if (gameCanvas) {
      (gameCanvas as HTMLElement).style.display = 'none';
    }
  }

  function hideUI(): void {
    workspaceContainer.classList.remove('irs-blockly-workspace--active');
    setWorldTopBarVisible(true);
    setWorldBottomBarVisible?.(true);
    s.topBar?.setVisible(false);

    const gameCanvas = canvasContainer.querySelector('canvas');
    if (gameCanvas) {
      (gameCanvas as HTMLElement).style.display = '';
    }
  }

  function stopAllScripts(): void {
    if (s.scriptHost) {
      s.scriptHost.stopAll();
    }
    inspectScripts.clear();
  }

  function teardownScriptRuntime(): void {
    unsubscribeFromScriptEvents();
    stopAllScripts();

    if (s.scriptHost) {
      s.scriptHost.dispose();
      s.scriptHost = null;
    }
    s.timeHelpers = null;

    if (s.apiCtxDispose) {
      s.apiCtxDispose();
      s.apiCtxDispose = null;
    }

    // Reset status UI
    setScriptStatus('stopped');
    s.topBar?.setScriptStatus('stopped');
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

      const resolvedTarget = target ?? resolveDefaultTarget();
      if (isBlocklyModeActive()) {
        showUI();
        leftBerry?.close();
        if (!s.manager) return;
        const currentTarget = getBlocklyModeState().currentLogicTarget;
        const targetChanged = !currentTarget
          || currentTarget.type !== resolvedTarget.type
          || (currentTarget.type === 'map' && resolvedTarget.type === 'map' && currentTarget.mapId !== resolvedTarget.mapId)
          || (currentTarget.targetId !== resolvedTarget.targetId);
        if (targetChanged) {
          await s.manager.switchLogicTarget(resolvedTarget);
          s.topBar?.setCurrentTarget(resolvedTarget);
          s.palette?.setLogicTarget(resolveLogicTargetFilter(resolvedTarget));
          updateEmptyState();
        }
        return;
      }

      enterBlocklyMode(resolvedTarget);
      showUI();
      leftBerry?.close();

      await initScriptStorage();

      // Set up script runtime for this session
      const { ctx, dispose } = createEditorRunContext();
      s.apiCtxDispose = dispose;
      s.scriptHost = new ScriptHost(ctx);
      subscribeToScriptEvents(ctx);

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

      // Build and set Logic Target list (grouped)
      const { flat, groups } = await buildLogicTargets();
      s.topBar!.setLogicTargets(flat, groups);
      s.topBar!.setCurrentTarget(resolvedTarget);
      s.topBar!.setScriptStatus('stopped');

      // Load workspace for initial target
      await s.manager.switchLogicTarget(resolvedTarget);
      updateEmptyState();

      leftBerry?.setInsertBlockFn((blockType) => {
        s.workspace?.insertBlock(blockType);
      });

      // Switch right berry to Blockly tabs
      if (rightBerry) {
        const tabContainers = rightBerry.setTabSet([...BLOCKLY_BERRY_TABS]);

        // Tab 1: Blocks palette
        const blocksContainer = tabContainers.get('blocks');
        if (blocksContainer && s.workspace) {
          s.palette = createBlocksPalette(blocksContainer, {
            registry: s.workspace.getBlockRegistry(),
            workspace: s.workspace,
            getPresetConfig: getPresetConfig ?? (() => null),
            onEnablePreset: (categoryId) => {
              onEnablePreset?.(categoryId);
              void buildLogicTargets().then(({ flat: nextFlat, groups: nextGroups }) => {
                s.topBar?.setLogicTargets(nextFlat, nextGroups);
              });
            },
          });
          s.palette.setLogicTarget(resolveLogicTargetFilter(resolvedTarget));
        }

        // Tab 2: Inspect/Errors panel
        const inspectContainer = tabContainers.get('inspect');
        if (inspectContainer) {
          s.inspectPanel = createInspectPanel(inspectContainer, {
            onHighlightBlock: (blockId) => {
              s.manager?.highlightBlock(blockId);
            },
          });
          // Seed with current state (empty scripts, buffered logs)
          s.inspectPanel.update(buildInspectState());
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

      // Tear down script runtime (stop scripts, unsubscribe, dispose)
      teardownScriptRuntime();

      // Destroy inspect panel and restore right berry tabs
      if (s.inspectPanel) {
        s.inspectPanel.destroy();
        s.inspectPanel = null;
      }
      if (s.palette) {
        s.palette.destroy();
        s.palette = null;
      }
      if (rightBerry) {
        rightBerry.restoreDefaultTabs();
      }
      leftBerry?.setInsertBlockFn(null);

      // Clear log buffer on exit so re-entry starts fresh
      logBuffer.length = 0;

      hideUI();
      emptyState.classList.remove('irs-blockly-workspace__empty--visible');
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

      teardownScriptRuntime();

      if (s.inspectPanel) {
        s.inspectPanel.destroy();
        s.inspectPanel = null;
      }
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

      leftBerry?.setInsertBlockFn(null);

      workspaceContainer.remove();

      const styleEl = document.getElementById(STYLE_ID);
      if (styleEl) styleEl.remove();

      console.log(`${LOG_PREFIX} Cockpit disposed`);
    },
  };

  return controller;
}
