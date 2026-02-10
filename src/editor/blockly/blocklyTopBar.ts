/**
 * Blockly Top Bar — overlay for Blockly Mode.
 *
 * Renders: Back button, Logic Target dropdown, Run/Stop buttons, status indicator.
 * Replaces the World Mode top bar when Blockly Mode is active.
 *
 * All buttons meet 44x44px minimum touch target (mobile-first).
 */

import type { ScriptLogicTarget } from '@/types/script';
import type { ScriptStatus } from './blocklyMode';

const LOG_PREFIX = '[BlocklyTopBar]';

// --- Types ---

export interface LogicTargetItem {
  readonly target: ScriptLogicTarget;
  readonly label: string;
}

export interface BlocklyTopBarController {
  /** Update the list of Logic Targets in the dropdown. */
  setLogicTargets(targets: LogicTargetItem[]): void;

  /** Set the currently selected Logic Target. */
  setCurrentTarget(target: ScriptLogicTarget): void;

  /** Update the script status indicator. */
  setScriptStatus(status: ScriptStatus): void;

  /** Set visibility of the entire top bar. */
  setVisible(visible: boolean): void;

  /** Register callback for Back button. */
  onBack(callback: () => void): void;

  /** Register callback for Logic Target change. */
  onTargetChange(callback: (target: ScriptLogicTarget) => void): void;

  /** Register callback for Run button. */
  onRun(callback: () => void): void;

  /** Register callback for Stop button. */
  onStop(callback: () => void): void;

  /** Clean up DOM and listeners. */
  destroy(): void;
}

// --- Styles ---

const STYLES = `
  .blockly-top-bar {
    display: flex;
    align-items: center;
    background: #0d1220;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 8px 12px;
    gap: 8px;
  }

  .blockly-top-bar--hidden {
    display: none;
  }

  .blockly-top-bar__back-btn {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    border: none;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.7);
    font-size: 20px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .blockly-top-bar__back-btn:active {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(0.95);
  }

  .blockly-top-bar__target-select {
    flex: 1;
    min-width: 0;
    height: 44px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='2' fill='none'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
  }

  .blockly-top-bar__target-select:focus {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }

  .blockly-top-bar__status {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
    transition: background-color 0.2s ease;
  }

  .blockly-top-bar__status--stopped {
    background: #666;
  }

  .blockly-top-bar__status--running {
    background: #22c55e;
    box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
  }

  .blockly-top-bar__status--error {
    background: #ef4444;
    box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
  }

  .blockly-top-bar__run-btn,
  .blockly-top-bar__stop-btn {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    border: none;
    font-size: 16px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .blockly-top-bar__run-btn {
    background: #22c55e;
    color: #fff;
  }

  .blockly-top-bar__run-btn:active {
    background: #16a34a;
    transform: scale(0.95);
  }

  .blockly-top-bar__run-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .blockly-top-bar__run-btn:disabled:active {
    transform: none;
  }

  .blockly-top-bar__stop-btn {
    background: #ef4444;
    color: #fff;
  }

  .blockly-top-bar__stop-btn:active {
    background: #dc2626;
    transform: scale(0.95);
  }

  .blockly-top-bar__stop-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .blockly-top-bar__stop-btn:disabled:active {
    transform: none;
  }
`;

// --- Factory ---

export function createBlocklyTopBar(
  container: HTMLElement,
): BlocklyTopBarController {
  // Inject styles once
  if (!document.getElementById('blockly-top-bar-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'blockly-top-bar-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  let backCallback: (() => void) | null = null;
  let targetChangeCallback: ((target: ScriptLogicTarget) => void) | null = null;
  let runCallback: (() => void) | null = null;
  let stopCallback: (() => void) | null = null;

  let currentTargets: LogicTargetItem[] = [];
  let currentStatus: ScriptStatus = 'stopped';

  // --- DOM ---

  const bar = document.createElement('div');
  bar.className = 'blockly-top-bar blockly-top-bar--hidden';

  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'blockly-top-bar__back-btn';
  backBtn.type = 'button';
  backBtn.textContent = '\u2190'; // ←
  backBtn.setAttribute('aria-label', 'Back to World Mode');

  // Logic Target dropdown
  const targetSelect = document.createElement('select');
  targetSelect.className = 'blockly-top-bar__target-select';
  targetSelect.setAttribute('aria-label', 'Logic Target');

  // Status indicator
  const statusDot = document.createElement('div');
  statusDot.className = 'blockly-top-bar__status blockly-top-bar__status--stopped';
  statusDot.setAttribute('aria-label', 'Script status: stopped');

  // Run button
  const runBtn = document.createElement('button');
  runBtn.className = 'blockly-top-bar__run-btn';
  runBtn.type = 'button';
  runBtn.textContent = '\u25B6'; // ▶
  runBtn.setAttribute('aria-label', 'Run script');

  // Stop button
  const stopBtn = document.createElement('button');
  stopBtn.className = 'blockly-top-bar__stop-btn';
  stopBtn.type = 'button';
  stopBtn.textContent = '\u25A0'; // ■
  stopBtn.setAttribute('aria-label', 'Stop script');
  stopBtn.disabled = true;

  // Assemble
  bar.appendChild(backBtn);
  bar.appendChild(targetSelect);
  bar.appendChild(statusDot);
  bar.appendChild(runBtn);
  bar.appendChild(stopBtn);
  container.appendChild(bar);

  // --- Event Handlers ---

  backBtn.addEventListener('click', () => backCallback?.());

  targetSelect.addEventListener('change', () => {
    const idx = targetSelect.selectedIndex;
    if (idx >= 0 && idx < currentTargets.length) {
      targetChangeCallback?.(currentTargets[idx].target);
    }
  });

  runBtn.addEventListener('click', () => runCallback?.());
  stopBtn.addEventListener('click', () => stopCallback?.());

  // --- Helpers ---

  function updateStatusUI(): void {
    statusDot.className = `blockly-top-bar__status blockly-top-bar__status--${currentStatus}`;
    statusDot.setAttribute('aria-label', `Script status: ${currentStatus}`);

    const isRunning = currentStatus === 'running';
    runBtn.disabled = isRunning;
    stopBtn.disabled = !isRunning;
  }

  function rebuildDropdown(): void {
    targetSelect.innerHTML = '';
    for (const item of currentTargets) {
      const option = document.createElement('option');
      option.textContent = item.label;
      targetSelect.appendChild(option);
    }
  }

  console.log(`${LOG_PREFIX} Blockly top bar created`);

  // --- Controller ---

  const controller: BlocklyTopBarController = {
    setLogicTargets(targets: LogicTargetItem[]): void {
      currentTargets = targets;
      rebuildDropdown();
    },

    setCurrentTarget(target: ScriptLogicTarget): void {
      const idx = currentTargets.findIndex((item) => {
        if (item.target.type !== target.type) return false;
        if (item.target.type === 'map') return item.target.mapId === target.mapId;
        return true;
      });
      if (idx >= 0) {
        targetSelect.selectedIndex = idx;
      }
    },

    setScriptStatus(status: ScriptStatus): void {
      currentStatus = status;
      updateStatusUI();
    },

    setVisible(visible: boolean): void {
      bar.classList.toggle('blockly-top-bar--hidden', !visible);
    },

    onBack(callback: () => void): void {
      backCallback = callback;
    },

    onTargetChange(callback: (target: ScriptLogicTarget) => void): void {
      targetChangeCallback = callback;
    },

    onRun(callback: () => void): void {
      runCallback = callback;
    },

    onStop(callback: () => void): void {
      stopCallback = callback;
    },

    destroy(): void {
      bar.remove();
      const styleEl = document.getElementById('blockly-top-bar-styles');
      if (styleEl) styleEl.remove();
      console.log(`${LOG_PREFIX} Blockly top bar destroyed`);
    },
  };

  return controller;
}
