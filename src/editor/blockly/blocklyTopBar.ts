/**
 * Blockly Top Bar — overlay for Blockly Mode.
 *
 * Renders: Back button, Logic Target grouped picker, Run/Stop buttons, status indicator.
 * Replaces the World Mode top bar when Blockly Mode is active.
 *
 * The target picker uses a grouped overlay panel (mobile friendly) with
 * collapsible group headers: Presets, Game, Maps (and future Entity/Trigger groups).
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
  readonly subLabel?: string;
}

/** Grouped target list for the picker overlay. */
export interface LogicTargetGroup {
  readonly id: string;
  readonly label: string;
  readonly items: LogicTargetItem[];
}

export interface BlocklyTopBarController {
  /** Update the list of Logic Targets in the picker (grouped). */
  setLogicTargets(targets: LogicTargetItem[], groups?: LogicTargetGroup[]): void;

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
  .irs-blockly-bar {
    display: flex;
    align-items: center;
    background: var(--irs-surface-dark-alpha);
    border-bottom: 1px solid var(--irs-color-blue-alpha-12);
    padding: max(8px, env(safe-area-inset-top)) 12px 8px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    gap: 8px;
  }

  .irs-blockly-bar--hidden {
    display: none;
  }

  .irs-blockly-bar__back-btn {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    border: none;
    background: var(--irs-border-light);
    color: var(--irs-text-secondary);
    font-size: 20px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .irs-blockly-bar__back-btn:active {
    background: var(--irs-color-blue-alpha-12);
    transform: scale(0.95);
  }

  .irs-blockly-bar__target-btn {
    flex: 1;
    min-width: 0;
    height: 44px;
    padding: 0 32px 0 12px;
    border-radius: 10px;
    border: 1px solid var(--irs-border-light);
    background: var(--irs-border-light);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    position: relative;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='2' fill='none'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
  }

  .irs-blockly-bar__target-btn:active {
    background-color: var(--irs-color-blue-alpha-12);
  }

  /* --- Overlay picker --- */
  .irs-target-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 9999;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: max(60px, env(safe-area-inset-top));
    background: var(--irs-surface-dark-alpha);
  }

  .irs-target-overlay__panel {
    background: var(--irs-surface-dark-alpha);
    border: 1px solid var(--irs-border-light);
    border-radius: 12px;
    width: 90%;
    max-width: 340px;
    max-height: 60vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .irs-target-overlay__group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    color: var(--irs-text-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    border-bottom: 1px solid var(--irs-border-light);
  }

  .irs-target-overlay__group-header:active {
    background: var(--irs-surface-elevated);
  }

  .irs-target-overlay__group-chevron {
    font-size: 14px;
    transition: transform 0.15s ease;
  }

  .irs-target-overlay__group-chevron--collapsed {
    transform: rotate(-90deg);
  }

  .irs-target-overlay__group-body {
    overflow: hidden;
  }

  .irs-target-overlay__group-body--collapsed {
    display: none;
  }

  .irs-target-overlay__item {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 44px;
    padding: 8px 14px 8px 28px;
    border: none;
    background: none;
    color: var(--irs-text-primary);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    text-align: left;
  }

  .irs-target-overlay__item-main {
    display: block;
    font-size: 13px;
    font-weight: 700;
  }

  .irs-target-overlay__item-sub {
    display: block;
    font-size: 11px;
    font-weight: 500;
    color: var(--irs-text-secondary);
    margin-top: 2px;
    margin-left: 10px;
  }

  .irs-target-overlay__item:active {
    background: var(--irs-color-blue-alpha-12);
  }

  .irs-target-overlay__item--active {
    color: var(--irs-color-blue);
    font-weight: 700;
  }

  .irs-blockly-bar__status {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
    transition: background-color 0.2s ease;
  }

  .irs-blockly-bar__status--stopped {
    background: #666;
  }

  .irs-blockly-bar__status--running {
    background: var(--irs-color-green);
    box-shadow: 0 0 6px var(--irs-color-green-alpha-53);
  }

  .irs-blockly-bar__status--error {
    background: var(--irs-color-red);
    box-shadow: 0 0 6px var(--irs-color-red-alpha-53);
  }

  .irs-blockly-bar__run-btn,
  .irs-blockly-bar__stop-btn {
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

  .irs-blockly-bar__run-btn {
    background: var(--irs-color-green);
    color: #fff;
  }

  .irs-blockly-bar__run-btn:active {
    background: var(--irs-accent-success);
    transform: scale(0.95);
  }

  .irs-blockly-bar__run-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .irs-blockly-bar__run-btn:disabled:active {
    transform: none;
  }

  .irs-blockly-bar__stop-btn {
    background: var(--irs-color-red);
    color: #fff;
  }

  .irs-blockly-bar__stop-btn:active {
    background: var(--irs-accent-danger-active);
    transform: scale(0.95);
  }

  .irs-blockly-bar__stop-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .irs-blockly-bar__stop-btn:disabled:active {
    transform: none;
  }
`;


function ensureStyles(): void {
  if (document.getElementById('irs-blockly-bar-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'irs-blockly-bar-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

// --- Factory ---

export function createBlocklyTopBar(
  container: HTMLElement,
): BlocklyTopBarController {
  // Inject styles once
  ensureStyles();

  let backCallback: (() => void) | null = null;
  let targetChangeCallback: ((target: ScriptLogicTarget) => void) | null = null;
  let runCallback: (() => void) | null = null;
  let stopCallback: (() => void) | null = null;

  let currentTargets: LogicTargetItem[] = [];
  let currentGroups: LogicTargetGroup[] = [];
  let selectedTarget: ScriptLogicTarget | null = null;
  let currentStatus: ScriptStatus = 'stopped';
  let overlayEl: HTMLElement | null = null;

  // --- DOM ---

  const bar = document.createElement('div');
  bar.className = 'irs-blockly-bar irs-blockly-bar--hidden';

  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'irs-blockly-bar__back-btn';
  backBtn.type = 'button';
  backBtn.textContent = '\u2190'; // ←
  backBtn.setAttribute('aria-label', 'Back to World Mode');

  // Target picker button (replaces the <select>)
  const targetBtn = document.createElement('button');
  targetBtn.className = 'irs-blockly-bar__target-btn';
  targetBtn.type = 'button';
  targetBtn.textContent = 'Select Target';
  targetBtn.setAttribute('aria-label', 'Logic Target');

  // Status indicator
  const statusDot = document.createElement('div');
  statusDot.className = 'irs-blockly-bar__status irs-blockly-bar__status--stopped';
  statusDot.setAttribute('aria-label', 'Script status: stopped');

  // Run button
  const runBtn = document.createElement('button');
  runBtn.className = 'irs-blockly-bar__run-btn';
  runBtn.type = 'button';
  runBtn.textContent = '\u25B6'; // ▶
  runBtn.setAttribute('aria-label', 'Run script');

  // Stop button
  const stopBtn = document.createElement('button');
  stopBtn.className = 'irs-blockly-bar__stop-btn';
  stopBtn.type = 'button';
  stopBtn.textContent = '\u25A0'; // ■
  stopBtn.setAttribute('aria-label', 'Stop script');
  stopBtn.disabled = true;

  // Assemble
  bar.appendChild(backBtn);
  bar.appendChild(targetBtn);
  bar.appendChild(statusDot);
  bar.appendChild(runBtn);
  bar.appendChild(stopBtn);
  container.appendChild(bar);

  // --- Event Handlers ---

  backBtn.addEventListener('click', () => backCallback?.());
  targetBtn.addEventListener('click', () => openOverlay());
  runBtn.addEventListener('click', () => runCallback?.());
  stopBtn.addEventListener('click', () => stopCallback?.());

  // --- Overlay picker ---

  function openOverlay(): void {
    if (overlayEl) return;

    const overlay = document.createElement('div');
    overlay.className = 'irs-target-overlay';

    const panel = document.createElement('div');
    panel.className = 'irs-target-overlay__panel';

    // Build grouped content
    const groupsToRender = currentGroups.length > 0 ? currentGroups : autoGroupTargets();

    for (const group of groupsToRender) {
      if (group.items.length === 0) continue;

      const groupHeader = document.createElement('div');
      groupHeader.className = 'irs-target-overlay__group-header';

      const groupLabel = document.createElement('span');
      groupLabel.textContent = group.label;

      const chevron = document.createElement('span');
      chevron.className = 'irs-target-overlay__group-chevron';
      chevron.textContent = '\u203a'; // ›

      groupHeader.appendChild(groupLabel);
      groupHeader.appendChild(chevron);

      const groupBody = document.createElement('div');
      groupBody.className = 'irs-target-overlay__group-body';

      for (const item of group.items) {
        const itemBtn = document.createElement('button');
        itemBtn.type = 'button';
        itemBtn.className = 'irs-target-overlay__item';
        if (isTargetMatch(item.target, selectedTarget)) {
          itemBtn.classList.add('irs-target-overlay__item--active');
        }
        const itemMain = document.createElement('span');
        itemMain.className = 'irs-target-overlay__item-main';
        itemMain.textContent = item.label;
        itemBtn.appendChild(itemMain);
        if (item.subLabel) {
          const itemSub = document.createElement('span');
          itemSub.className = 'irs-target-overlay__item-sub';
          itemSub.textContent = item.subLabel;
          itemBtn.appendChild(itemSub);
        }
        itemBtn.addEventListener('click', () => {
          closeOverlay();
          targetChangeCallback?.(item.target);
        });
        groupBody.appendChild(itemBtn);
      }

      groupHeader.addEventListener('click', () => {
        const isCollapsed = groupBody.classList.toggle('irs-target-overlay__group-body--collapsed');
        chevron.classList.toggle('irs-target-overlay__group-chevron--collapsed', isCollapsed);
      });

      panel.appendChild(groupHeader);
      panel.appendChild(groupBody);
    }

    overlay.appendChild(panel);

    // Close on backdrop tap
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });

    document.body.appendChild(overlay);
    overlayEl = overlay;
  }

  function closeOverlay(): void {
    if (overlayEl) {
      overlayEl.remove();
      overlayEl = null;
    }
  }

  /** Auto-group flat targets into Presets / Game / Maps groups. */
  function autoGroupTargets(): LogicTargetGroup[] {
    const presets: LogicTargetItem[] = [];
    const game: LogicTargetItem[] = [];
    const maps: LogicTargetItem[] = [];
    const other: LogicTargetItem[] = [];

    for (const item of currentTargets) {
      switch (item.target.type) {
        case 'preset': presets.push(item); break;
        case 'game': game.push(item); break;
        case 'map': maps.push(item); break;
        default: other.push(item); break;
      }
    }

    const groups: LogicTargetGroup[] = [];
    if (presets.length > 0) groups.push({ id: 'presets', label: 'Presets', items: presets });
    if (game.length > 0) groups.push({ id: 'game', label: 'Game', items: game });
    if (maps.length > 0) groups.push({ id: 'maps', label: 'Maps', items: maps });
    if (other.length > 0) groups.push({ id: 'other', label: 'Other', items: other });
    return groups;
  }

  function isTargetMatch(a: ScriptLogicTarget, b: ScriptLogicTarget | null): boolean {
    if (!b) return false;
    if (a.type !== b.type) return false;
    if (a.type === 'map') return a.mapId === b.mapId;
    if (a.targetId || b.targetId) return a.targetId === b.targetId;
    return true;
  }

  // --- Helpers ---

  function updateStatusUI(): void {
    statusDot.className = `irs-blockly-bar__status irs-blockly-bar__status--${currentStatus}`;
    statusDot.setAttribute('aria-label', `Script status: ${currentStatus}`);

    const isRunning = currentStatus === 'running';
    runBtn.disabled = isRunning;
    stopBtn.disabled = !isRunning;
  }

  function updateTargetBtnLabel(): void {
    if (!selectedTarget) {
      targetBtn.textContent = 'Select Target';
      return;
    }
    const selectedItem = currentTargets.find((item) => isTargetMatch(item.target, selectedTarget));
    targetBtn.textContent = selectedItem?.subLabel
      ? `${selectedTarget.label} → ${selectedItem.subLabel}`
      : selectedTarget.label;
  }

  console.log(`${LOG_PREFIX} Blockly top bar created`);

  // --- Controller ---

  const controller: BlocklyTopBarController = {
    setLogicTargets(targets: LogicTargetItem[], groups?: LogicTargetGroup[]): void {
      currentTargets = targets;
      currentGroups = groups ?? [];
      updateTargetBtnLabel();
    },

    setCurrentTarget(target: ScriptLogicTarget): void {
      selectedTarget = target;
      updateTargetBtnLabel();
    },

    setScriptStatus(status: ScriptStatus): void {
      currentStatus = status;
      updateStatusUI();
    },

    setVisible(visible: boolean): void {
      bar.classList.toggle('irs-blockly-bar--hidden', !visible);
      if (!visible) closeOverlay();
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
      closeOverlay();
      bar.remove();
      const styleEl = document.getElementById('irs-blockly-bar-styles');
      if (styleEl) styleEl.remove();
      console.log(`${LOG_PREFIX} Blockly top bar destroyed`);
    },
  };

  return controller;
}
