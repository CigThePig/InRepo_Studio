/**
 * Workspace Manager — save/load orchestration and Logic Target switching.
 *
 * Manages the lifecycle of workspace data:
 * - Auto-save with debounce on workspace changes
 * - Logic Target switching (save current → load new → handle empty state)
 * - Empty state management (no script file → prompt to create)
 * - Script creation on first meaningful save (lazy creation)
 */

import type { ScriptLogicTarget, ScriptFile } from '@/types/script';
import { resolveScriptId } from '@/types/script';
import { saveScript, loadScript, hasScript } from '@/storage/scriptStorage';
import type { BlocklyWorkspaceController } from './blocklyWorkspace';
import {
  setScriptExists,
  setHasUnsavedChanges,
  setCurrentLogicTarget,
} from './blocklyMode';

const LOG_PREFIX = '[WorkspaceManager]';
const AUTO_SAVE_DEBOUNCE_MS = 1000;
const SCRIPT_FORMAT_VERSION = 1;

// --- Types ---

export interface WorkspaceManagerController {
  /** Switch to a different Logic Target. Auto-saves current workspace first. */
  switchLogicTarget(target: ScriptLogicTarget): Promise<void>;

  /** Get the current Logic Target. */
  getCurrentTarget(): ScriptLogicTarget;

  /** Force immediate save (e.g., before exiting Blockly Mode). */
  saveNow(): Promise<void>;

  /** Does a script file exist for the current target? */
  getScriptExists(): boolean;

  /** Create a script for the current target (from empty state). */
  createScript(): Promise<void>;

  /** Clean up listeners and timers. */
  dispose(): void;
}

interface WorkspaceManagerDeps {
  workspaceController: BlocklyWorkspaceController;
}

// --- Factory ---

export function createWorkspaceManager(
  deps: WorkspaceManagerDeps,
  initialTarget: ScriptLogicTarget,
): WorkspaceManagerController {
  const { workspaceController } = deps;

  let currentTarget: ScriptLogicTarget = initialTarget;
  let currentScriptExists = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let changeDisposer: (() => void) | null = null;
  let disposed = false;

  // Wire up the change listener for auto-save
  function wireChangeListener(): void {
    changeDisposer?.();
    changeDisposer = workspaceController.onChanged(() => {
      setHasUnsavedChanges(true);
      debouncedSave();
    });
  }

  function debouncedSave(): void {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveCurrentWorkspace().catch((err) => {
        console.error(`${LOG_PREFIX} Auto-save failed:`, err);
      });
    }, AUTO_SAVE_DEBOUNCE_MS);
  }

  async function saveCurrentWorkspace(): Promise<void> {
    if (disposed) return;

    const workspaceJson = workspaceController.save();

    // Check if workspace is empty (no blocks)
    const hasBlocks = workspaceJson.blocks !== undefined;
    if (!hasBlocks && !currentScriptExists) {
      // Don't create a script file for an empty workspace
      return;
    }

    const scriptId = resolveScriptId(currentTarget.type, currentTarget.mapId);

    const scriptFile: ScriptFile = {
      formatVersion: SCRIPT_FORMAT_VERSION,
      scriptId,
      logicTarget: currentTarget,
      blockly: {
        workspace: workspaceJson,
      },
    };

    await saveScript(scriptFile);
    currentScriptExists = true;
    setScriptExists(true);
    setHasUnsavedChanges(false);

    console.log(`${LOG_PREFIX} Saved workspace for "${scriptId}"`);
  }

  async function loadWorkspaceForTarget(target: ScriptLogicTarget): Promise<void> {
    const scriptId = resolveScriptId(target.type, target.mapId);
    const exists = await hasScript(scriptId);

    if (exists) {
      const scriptFile = await loadScript(scriptId);
      if (scriptFile?.blockly?.workspace) {
        workspaceController.load(scriptFile.blockly.workspace);
        currentScriptExists = true;
        setScriptExists(true);
        console.log(`${LOG_PREFIX} Loaded workspace for "${scriptId}"`);
        return;
      }
    }

    // No script exists — show empty state
    workspaceController.clear();
    currentScriptExists = false;
    setScriptExists(false);
    console.log(`${LOG_PREFIX} No script found for "${scriptId}" — empty state`);
  }

  // --- Initial load ---
  wireChangeListener();

  const controller: WorkspaceManagerController = {
    async switchLogicTarget(target: ScriptLogicTarget): Promise<void> {
      if (disposed) return;

      // Save current workspace before switching
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      await saveCurrentWorkspace();

      // Switch to new target
      currentTarget = target;
      setCurrentLogicTarget(target);
      setHasUnsavedChanges(false);

      // Load workspace for new target
      await loadWorkspaceForTarget(target);
    },

    getCurrentTarget(): ScriptLogicTarget {
      return currentTarget;
    },

    async saveNow(): Promise<void> {
      if (disposed) return;
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      await saveCurrentWorkspace();
    },

    getScriptExists(): boolean {
      return currentScriptExists;
    },

    async createScript(): Promise<void> {
      if (disposed) return;
      if (currentScriptExists) return;

      // Mark as existing — the actual file is created on next auto-save
      // when the user adds blocks
      currentScriptExists = true;
      setScriptExists(true);
      console.log(`${LOG_PREFIX} Script creation staged — file will be saved on first change`);
    },

    dispose(): void {
      disposed = true;
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      changeDisposer?.();
      changeDisposer = null;
    },
  };

  return controller;
}
