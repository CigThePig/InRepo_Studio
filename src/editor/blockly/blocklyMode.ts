/**
 * Blockly Mode — top-level UI state toggle.
 *
 * Blockly Mode is separate from EditorMode (which controls sub-modes within World Mode).
 * When Blockly Mode is active, the center viewport shows the Blockly workspace
 * instead of the canvas, and the top bar shows Logic Target + Run/Stop controls.
 *
 * Preserves EditorMode across mode switches — exiting Blockly Mode restores
 * the previous World Mode sub-mode.
 */

import type { ScriptLogicTarget } from '@/types/script';

const LOG_PREFIX = '[BlocklyMode]';

// --- Types ---

export type ScriptStatus = 'stopped' | 'running' | 'error';

export interface BlocklyModeState {
  readonly active: boolean;
  readonly currentLogicTarget: ScriptLogicTarget | null;
  readonly workspaceReady: boolean;
  readonly scriptStatus: ScriptStatus;
  readonly hasUnsavedChanges: boolean;
  readonly scriptExists: boolean;
}

type BlocklyModeListener = (active: boolean) => void;

// --- State ---

let active = false;
let currentLogicTarget: ScriptLogicTarget | null = null;
let workspaceReady = false;
let scriptStatus: ScriptStatus = 'stopped';
let hasUnsavedChanges = false;
let scriptExists = false;
const listeners = new Set<BlocklyModeListener>();

// --- Public API ---

/** Is Blockly Mode currently active? */
export function isBlocklyModeActive(): boolean {
  return active;
}

/** Get the current Logic Target being edited. */
export function getCurrentLogicTarget(): ScriptLogicTarget | null {
  return currentLogicTarget;
}

/** Get a snapshot of the full Blockly Mode state. */
export function getBlocklyModeState(): BlocklyModeState {
  return {
    active,
    currentLogicTarget,
    workspaceReady,
    scriptStatus,
    hasUnsavedChanges,
    scriptExists,
  };
}

/**
 * Enter Blockly Mode.
 * @param target — optional initial Logic Target. Defaults to Game Logic if not provided.
 */
export function enterBlocklyMode(target?: ScriptLogicTarget): void {
  if (active) return;

  const resolvedTarget: ScriptLogicTarget = target ?? {
    type: 'game',
    label: 'Game Logic (main)',
  };

  active = true;
  currentLogicTarget = resolvedTarget;
  workspaceReady = false;
  scriptStatus = 'stopped';
  hasUnsavedChanges = false;
  scriptExists = false;

  console.log(`${LOG_PREFIX} Entering Blockly Mode — target: ${resolvedTarget.label}`);
  notifyListeners();
}

/** Exit Blockly Mode and return to World Mode. */
export function exitBlocklyMode(): void {
  if (!active) return;

  console.log(`${LOG_PREFIX} Exiting Blockly Mode`);
  active = false;
  workspaceReady = false;
  scriptStatus = 'stopped';
  // Keep currentLogicTarget so re-entry defaults to last target
  notifyListeners();
}

/** Subscribe to Blockly Mode activation changes. Returns disposer. */
export function onBlocklyModeChange(listener: BlocklyModeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// --- Internal setters (used by workspace manager and top bar) ---

export function setWorkspaceReady(ready: boolean): void {
  workspaceReady = ready;
}

export function setScriptStatus(status: ScriptStatus): void {
  scriptStatus = status;
}

export function setHasUnsavedChanges(dirty: boolean): void {
  hasUnsavedChanges = dirty;
}

export function setScriptExists(exists: boolean): void {
  scriptExists = exists;
}

export function setCurrentLogicTarget(target: ScriptLogicTarget): void {
  currentLogicTarget = target;
}

// --- Private ---

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener(active);
    } catch (err) {
      console.error(`${LOG_PREFIX} Listener error:`, err);
    }
  });
}
