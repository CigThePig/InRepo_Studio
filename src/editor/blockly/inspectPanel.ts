/**
 * Inspect/Errors Panel — Track 42
 *
 * Tab 2 content for the right berry in Blockly Mode.
 * Shows: script status strip, last error with block highlight,
 * active timer count, and recent log entries.
 *
 * Push-fed: blocklyCockpit.ts calls update(state) and appendLog(entry).
 * No internal polling or timers.
 *
 * Implements ux-polish-rules.md:
 * - Every error triggers visible feedback (status strip + error card)
 * - Empty state invites action with a single clear next step
 * - Selection and status always visible; no silent states
 */

import uxFeedback from '@/editor/uxFeedback';

const LOG_PREFIX = '[InspectPanel]';
const MAX_LOG_ENTRIES = 100;

// --- Types ---

export interface ScriptInspectEntry {
  /** Label for this Logic Target, e.g. "Game Logic" | "Map: forest" */
  logicTarget: string;
  status: 'running' | 'stopped' | 'error';
  errorMessage?: string;
  errorBlockId?: string;
  activeTimerCount: number;
}

export interface InspectState {
  scripts: ScriptInspectEntry[];
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: number;
  logicTarget: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface InspectPanelOptions {
  onHighlightBlock?: (blockId: string) => void;
}

export interface InspectPanelController {
  /** Full status + error re-render. Does not replace existing log list. */
  update(state: InspectState): void;
  /** Append a single log entry; auto-scrolls to bottom. */
  appendLog(entry: LogEntry): void;
  /** Remove DOM, clear listeners. */
  destroy(): void;
}

// --- Visual tokens ---

const STATUS_ICON: Record<'running' | 'stopped' | 'error', string> = {
  running: '▶',
  stopped: '■',
  error: '✕',
};

const STATUS_COLOR: Record<'running' | 'stopped' | 'error', string> = {
  running: 'var(--irs-color-green)',
  stopped: 'var(--irs-text-muted)',
  error: 'var(--irs-color-red)',
};

const LOG_LEVEL_COLOR: Record<'info' | 'warn' | 'error', string> = {
  info: '#aab0d4',
  warn: '#ffc258',
  error: '#ff6b6b',
};

// --- Styles ---

const STYLE_ID = 'irs-inspect-panel-styles';

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .iip {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      font-family: sans-serif;
      font-size: 13px;
      color: var(--irs-text);
      background: transparent;
    }

    .iip__section-label {
      padding: 8px 12px 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(230, 236, 255, 0.4);
    }

    /* ── Status Strip ─────────────────────────────── */

    .iip__status-strip {
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 4px;
    }

    .iip__script-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      min-height: 44px;
    }

    .iip__status-icon {
      font-size: 11px;
      width: 18px;
      text-align: center;
      flex-shrink: 0;
    }

    .iip__script-label {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .iip__timer-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(230, 236, 255, 0.5);
      white-space: nowrap;
    }

    /* ── Error Card ───────────────────────────────── */

    .iip__error-section {
      margin: 4px 8px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--irs-color-red-alpha-15);
      border: 1px solid var(--irs-color-red-alpha-53);
      display: none;
    }

    .iip__error-section--visible {
      display: block;
    }

    .iip__error-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--irs-color-red);
      margin-bottom: 4px;
    }

    .iip__error-target {
      font-size: 11px;
      color: rgba(230, 236, 255, 0.5);
      margin-bottom: 4px;
    }

    .iip__error-msg {
      font-size: 12px;
      color: var(--irs-color-red);
      line-height: 1.45;
      word-break: break-word;
      margin-bottom: 8px;
    }

    .iip__highlight-btn {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      min-width: 44px;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--irs-color-red-alpha-53);
      background: var(--irs-color-red-alpha-15);
      color: var(--irs-color-red);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .iip__highlight-btn:active {
      background: var(--irs-color-red-alpha-53);
    }

    /* ── Empty State ──────────────────────────────── */

    .iip__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 24px 20px;
      text-align: center;
    }

    .iip__empty-icon {
      font-size: 26px;
      opacity: 0.35;
    }

    .iip__empty-msg {
      color: rgba(230, 236, 255, 0.38);
      font-size: 12px;
      line-height: 1.5;
      max-width: 200px;
    }

    /* ── Log Section ──────────────────────────────── */

    .iip__log-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .iip__log-list {
      flex: 1;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 4px 0 8px;
    }

    .iip__log-entry {
      display: flex;
      gap: 6px;
      align-items: flex-start;
      padding: 3px 12px;
      font-size: 11px;
      line-height: 1.5;
    }

    .iip__log-time {
      flex-shrink: 0;
      color: rgba(230, 236, 255, 0.28);
      font-size: 10px;
      font-variant-numeric: tabular-nums;
      margin-top: 1px;
    }

    .iip__log-target {
      flex-shrink: 0;
      color: rgba(230, 236, 255, 0.40);
      font-size: 10px;
      margin-top: 1px;
      max-width: 64px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .iip__log-msg {
      flex: 1;
      min-width: 0;
      word-break: break-word;
    }

    .iip__log-placeholder {
      padding: 16px 12px;
      color: rgba(230, 236, 255, 0.28);
      font-size: 12px;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

// --- Helpers ---

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// --- Factory ---

export function createInspectPanel(
  container: HTMLElement,
  opts: InspectPanelOptions = {},
): InspectPanelController {
  ensureStyles();

  let displayedLogCount = 0;
  let currentErrorBlockId: string | undefined;

  // --- DOM ---

  const root = document.createElement('div');
  root.className = 'iip';

  // Status strip
  const statusStrip = document.createElement('div');
  statusStrip.className = 'iip__status-strip';

  const statusLabel = document.createElement('div');
  statusLabel.className = 'iip__section-label';
  statusLabel.textContent = 'Scripts';

  const scriptRows = document.createElement('div');

  statusStrip.appendChild(statusLabel);
  statusStrip.appendChild(scriptRows);

  // Error card
  const errorSection = document.createElement('div');
  errorSection.className = 'iip__error-section';

  const errorTitle = document.createElement('div');
  errorTitle.className = 'iip__error-title';
  errorTitle.textContent = 'Error';

  const errorTarget = document.createElement('div');
  errorTarget.className = 'iip__error-target';

  const errorMsg = document.createElement('div');
  errorMsg.className = 'iip__error-msg';

  const highlightBtn = document.createElement('button');
  highlightBtn.type = 'button';
  highlightBtn.className = 'iip__highlight-btn';
  highlightBtn.textContent = '→ Highlight block';
  highlightBtn.style.display = 'none';

  highlightBtn.addEventListener('click', () => {
    if (currentErrorBlockId && opts.onHighlightBlock) {
      uxFeedback.motion.pulse(highlightBtn);
      opts.onHighlightBlock(currentErrorBlockId);
    }
  });

  errorSection.appendChild(errorTitle);
  errorSection.appendChild(errorTarget);
  errorSection.appendChild(errorMsg);
  errorSection.appendChild(highlightBtn);

  // Empty state (shown when no scripts)
  const emptyEl = document.createElement('div');
  emptyEl.className = 'iip__empty';

  const emptyIcon = document.createElement('div');
  emptyIcon.className = 'iip__empty-icon';
  emptyIcon.textContent = '◎';

  const emptyMsg = document.createElement('div');
  emptyMsg.className = 'iip__empty-msg';
  emptyMsg.textContent = 'No scripts running. Press ▶ to run.';

  emptyEl.appendChild(emptyIcon);
  emptyEl.appendChild(emptyMsg);

  // Log section
  const logSection = document.createElement('div');
  logSection.className = 'iip__log-section';

  const logLabel = document.createElement('div');
  logLabel.className = 'iip__section-label';
  logLabel.textContent = 'Console';

  const logList = document.createElement('div');
  logList.className = 'iip__log-list';

  const logPlaceholder = document.createElement('div');
  logPlaceholder.className = 'iip__log-placeholder';
  logPlaceholder.textContent = 'No output yet.';
  logList.appendChild(logPlaceholder);

  logSection.appendChild(logLabel);
  logSection.appendChild(logList);

  // Assemble
  root.appendChild(statusStrip);
  root.appendChild(errorSection);
  root.appendChild(emptyEl);
  root.appendChild(logSection);

  container.appendChild(root);

  // Animate entrance
  uxFeedback.motion.slide(root, 'down');

  // --- Render helpers ---

  function renderStatusStrip(scripts: ScriptInspectEntry[]): void {
    scriptRows.innerHTML = '';

    if (scripts.length === 0) {
      emptyEl.style.display = '';
      return;
    }
    emptyEl.style.display = 'none';

    for (const script of scripts) {
      const row = document.createElement('div');
      row.className = 'iip__script-row';

      const icon = document.createElement('span');
      icon.className = 'iip__status-icon';
      icon.textContent = STATUS_ICON[script.status];
      icon.style.color = STATUS_COLOR[script.status];

      const label = document.createElement('span');
      label.className = 'iip__script-label';
      label.style.color = script.status === 'error' ? 'var(--irs-color-red)'
        : script.status === 'running' ? 'var(--irs-text)'
        : 'var(--irs-text-muted)';
      label.textContent = script.logicTarget;

      row.appendChild(icon);
      row.appendChild(label);

      if (script.activeTimerCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'iip__timer-badge';
        badge.textContent = `${script.activeTimerCount}t`;
        row.appendChild(badge);
      }

      scriptRows.appendChild(row);
    }
  }

  function renderErrorSection(scripts: ScriptInspectEntry[]): void {
    const errorScript = scripts.find((s) => s.status === 'error');
    if (!errorScript) {
      errorSection.classList.remove('iip__error-section--visible');
      currentErrorBlockId = undefined;
      return;
    }

    errorSection.classList.add('iip__error-section--visible');
    errorTarget.textContent = errorScript.logicTarget;
    errorMsg.textContent = errorScript.errorMessage ?? 'An unknown error occurred.';
    currentErrorBlockId = errorScript.errorBlockId;

    highlightBtn.style.display = (currentErrorBlockId && opts.onHighlightBlock) ? '' : 'none';
  }

  function addLogRow(entry: LogEntry): void {
    // Remove placeholder on first real entry
    if (displayedLogCount === 0) {
      logPlaceholder.remove();
    }

    // Cap displayed entries at MAX_LOG_ENTRIES
    if (displayedLogCount >= MAX_LOG_ENTRIES) {
      const first = logList.querySelector('.iip__log-entry');
      if (first) first.remove();
    } else {
      displayedLogCount++;
    }

    const row = document.createElement('div');
    row.className = 'iip__log-entry';

    const timeEl = document.createElement('span');
    timeEl.className = 'iip__log-time';
    timeEl.textContent = formatTimestamp(entry.timestamp);

    const targetEl = document.createElement('span');
    targetEl.className = 'iip__log-target';
    // Abbreviate "Game Logic (main)" → "Game" for narrow columns
    targetEl.title = entry.logicTarget;
    targetEl.textContent = entry.logicTarget.split(' ')[0];

    const msgEl = document.createElement('span');
    msgEl.className = 'iip__log-msg';
    msgEl.style.color = LOG_LEVEL_COLOR[entry.level];
    msgEl.textContent = entry.message;

    row.appendChild(timeEl);
    row.appendChild(targetEl);
    row.appendChild(msgEl);
    logList.appendChild(row);

    // Auto-scroll while visible
    logList.scrollTop = logList.scrollHeight;
  }

  // --- Controller ---

  const controller: InspectPanelController = {
    update(state: InspectState): void {
      renderStatusStrip(state.scripts);
      renderErrorSection(state.scripts);

      // On initial mount, render any buffered logs from the state snapshot
      if (state.logs.length > 0 && displayedLogCount === 0) {
        for (const entry of state.logs) {
          addLogRow(entry);
        }
      }
    },

    appendLog(entry: LogEntry): void {
      addLogRow(entry);
    },

    destroy(): void {
      root.remove();
      console.log(`${LOG_PREFIX} Inspect panel destroyed`);
    },
  };

  console.log(`${LOG_PREFIX} Inspect panel created`);
  return controller;
}
