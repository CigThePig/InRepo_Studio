/**
 * uxFeedback.ts — InRepo Studio UX Feedback Driver
 *
 * Single source of truth for all user-facing feedback signals.
 * Every panel, tab, and system wires into this instead of rolling
 * their own animations, toasts, or status strings.
 *
 * Implements every rule in: context/ux-polish-rules.md
 *
 * Usage:
 *   import { uxFeedback } from '@/editor/uxFeedback';
 *
 *   uxFeedback.toast.success('Animation saved.');
 *   uxFeedback.motion.pulse(buttonEl);
 *   uxFeedback.selection.mark(rowEl);
 *   uxFeedback.storage.markDirty(saveButton);
 *   uxFeedback.undo.show('Preset switched.', () => restore());
 *   uxFeedback.emptyState.render(container, { message: 'No assets yet.', actionLabel: 'Import', onAction: openImport });
 */

// ─── Design Tokens ────────────────────────────────────────────────────────────
// Keep in sync with the visual language used across all panels.

const TOKEN = {
  // Base palette
  blue:         '#4a9eff',
  blueAlpha12:  'rgba(74, 158, 255, 0.12)',
  blueAlpha22:  'rgba(74, 158, 255, 0.22)',
  blueAlpha35:  'rgba(74, 158, 255, 0.35)',
  blueAlpha45:  'rgba(107, 165, 255, 0.45)',
  blueBorder:   'rgba(107, 165, 255, 0.45)',

  green:        '#6bff95',
  greenAlpha15: 'rgba(107, 255, 149, 0.15)',
  greenAlpha53: 'rgba(107, 255, 149, 0.53)',
  greenGlow:    'rgba(107, 255, 149, 0.27)',

  red:          '#ff6b6b',
  redAlpha15:   'rgba(255, 107, 107, 0.15)',
  redAlpha53:   'rgba(255, 107, 107, 0.53)',

  yellow:       '#ffc258',
  yellowAlpha20:'rgba(255, 194, 88, 0.20)',
  yellowBorder: 'rgba(255, 194, 88, 0.65)',

  // Surfaces
  surfaceDark:  'rgba(26, 43, 82, 0.95)',
  text:         '#e6ecff',
  textMuted:    '#aab0d4',

  // Timing (ms) — scales with action weight
  durationAck:      120,   // Acknowledgement: instant
  durationChange:   220,   // State change: fast
  durationSafe:     350,   // Safety/Completion: deliberate
  durationToast:    4000,  // Auto-dismiss default
  durationUndoBar:  5000,  // Undo window default
} as const;

// ─── Style Injection ──────────────────────────────────────────────────────────

const STYLE_ID = 'irs-ux-feedback-styles';

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `

    :root {
      --irs-color-blue: ${TOKEN.blue};
      --irs-color-blue-alpha-12: ${TOKEN.blueAlpha12};
      --irs-color-blue-alpha-22: ${TOKEN.blueAlpha22};
      --irs-color-blue-alpha-35: ${TOKEN.blueAlpha35};
      --irs-color-blue-alpha-45: ${TOKEN.blueAlpha45};
      --irs-color-blue-border: ${TOKEN.blueBorder};

      --irs-color-green: ${TOKEN.green};
      --irs-color-green-alpha-15: ${TOKEN.greenAlpha15};
      --irs-color-green-alpha-53: ${TOKEN.greenAlpha53};
      --irs-color-green-glow: ${TOKEN.greenGlow};

      --irs-color-red: ${TOKEN.red};
      --irs-color-red-alpha-15: ${TOKEN.redAlpha15};
      --irs-color-red-alpha-53: ${TOKEN.redAlpha53};

      --irs-color-yellow: ${TOKEN.yellow};
      --irs-color-yellow-alpha-20: ${TOKEN.yellowAlpha20};
      --irs-color-yellow-border: ${TOKEN.yellowBorder};

      --irs-surface-dark: ${TOKEN.surfaceDark};
      --irs-surface-dark-alpha: rgba(26, 43, 82, 0.85);
      --irs-text: ${TOKEN.text};
      --irs-text-muted: ${TOKEN.textMuted};

      --irs-duration-ack: ${TOKEN.durationAck}ms;
      --irs-duration-change: ${TOKEN.durationChange}ms;
      --irs-duration-safe: ${TOKEN.durationSafe}ms;
      --irs-duration-toast: ${TOKEN.durationToast}ms;
      --irs-duration-undo-bar: ${TOKEN.durationUndoBar}ms;

      --irs-safe-top: env(safe-area-inset-top, 0px);
      --irs-safe-bottom: env(safe-area-inset-bottom, 0px);
      --irs-safe-left: env(safe-area-inset-left, 0px);
      --irs-safe-right: env(safe-area-inset-right, 0px);
    }

    .irs-glass-panel {
      background-color: rgba(26, 43, 82, 0.95);
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      background: rgba(26, 43, 82, 0.80);
    }

    /* ── Keyframes ─────────────────────────────────────────── */

    @keyframes irs-pulse {
      0%   { box-shadow: 0 0 0 0 var(--irs-color-blue-alpha-35); }
      60%  { box-shadow: 0 0 0 6px transparent; }
      100% { box-shadow: 0 0 0 0 transparent; }
    }

    @keyframes irs-glow {
      0%   { box-shadow: 0 0 0 0 var(--irs-color-green-alpha-15); }
      50%  { box-shadow: 0 0 8px 4px var(--irs-color-green-glow); }
      100% { box-shadow: 0 0 0 0 transparent; }
    }

    @keyframes irs-expand-in {
      from { opacity: 0; transform: scale(0.92); }
      to   { opacity: 1; transform: scale(1); }
    }

    @keyframes irs-shrink-out {
      from { opacity: 1; transform: scale(1); max-height: 200px; }
      to   { opacity: 0; transform: scale(0.92); max-height: 0; padding: 0; margin: 0; }
    }

    @keyframes irs-slide-in-up {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes irs-slide-in-down {
      from { opacity: 0; transform: translate(-50%, -16px); }
      to   { opacity: 1; transform: translate(-50%, 0); }
    }

    @keyframes irs-toast-enter {
      from { opacity: 0; transform: translateX(16px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    @keyframes irs-toast-exit {
      from { opacity: 1; transform: translateX(0); }
      to   { opacity: 0; transform: translateX(16px); }
    }

    /* ── Motion classes ────────────────────────────────────── */

    .irs-pulse  { animation: irs-pulse  var(--irs-duration-ack) ease-out; }
    .irs-glow   { animation: irs-glow   var(--irs-duration-safe) ease-out; }
    .irs-expand { animation: irs-expand-in var(--irs-duration-change) ease-out; }

    /* ── Selection ─────────────────────────────────────────── */

    .irs-selected {
      outline: 2px solid var(--irs-color-blue);
      outline-offset: -2px;
      background: var(--irs-color-blue-alpha-12) !important;
    }

    .irs-focused {
      outline: 2px solid var(--irs-color-blue);
      outline-offset: -2px;
      background: var(--irs-color-blue-alpha-22) !important;
      box-shadow: inset 0 0 0 1px var(--irs-color-blue-alpha-45);
    }

    /* ── Storage / Save state ──────────────────────────────── */

    .irs-dirty {
      border-color: var(--irs-color-yellow) !important;
      color: var(--irs-color-yellow) !important;
    }

    .irs-dirty::after {
      content: '●';
      font-size: 8px;
      vertical-align: super;
      margin-left: 4px;
      color: var(--irs-color-yellow);
    }

    .irs-saved {
      animation: irs-glow ${TOKEN.durationSafe}ms ease-out;
    }

    /* ── Toast ─────────────────────────────────────────────── */

    .irs-toast-host {
      position: fixed;
      top: 0;
      right: 0;
      padding-top: calc(12px + var(--irs-safe-top));
      padding-right: calc(12px + var(--irs-safe-right));
      padding-bottom: 12px;
      padding-left: calc(12px + var(--irs-safe-left));
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
      z-index: 9999;
    }

    .irs-toast {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-width: 220px;
      max-width: 320px;
      padding: 11px 14px;
      border-radius: 12px;
      border: 1px solid var(--irs-color-blue-border);
      background-color: rgba(26, 43, 82, 0.95);
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      background: rgba(26, 43, 82, 0.80);
      color: var(--irs-text);
      font-size: 13px;
      line-height: 1.4;
      pointer-events: all;
      animation: irs-toast-enter var(--irs-duration-change) ease-out;
    }

    .irs-toast--exiting {
      animation: irs-toast-exit var(--irs-duration-change) ease-in forwards;
    }

    .irs-toast--success { border-color: var(--irs-color-green-alpha-53); }
    .irs-toast--error   { border-color: var(--irs-color-red-alpha-53); }
    .irs-toast--warning { border-color: var(--irs-color-yellow-border); }

    .irs-toast__icon {
      flex-shrink: 0;
      font-size: 15px;
      line-height: 1.3;
    }

    .irs-toast--success .irs-toast__icon { color: var(--irs-color-green); }
    .irs-toast--error   .irs-toast__icon { color: var(--irs-color-red); }
    .irs-toast--warning .irs-toast__icon { color: var(--irs-color-yellow); }
    .irs-toast--info    .irs-toast__icon { color: var(--irs-color-blue); }

    /* ── Undo bar ──────────────────────────────────────────── */

    .irs-undo-bar {
      position: fixed;
      top: calc(var(--irs-safe-top, 0px) + 64px);
      left: 50%;
      transform: translateX(-50%);
      display: none;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      border: 1px solid var(--irs-color-blue-border);
      background-color: var(--irs-surface-dark-alpha);
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      background: var(--irs-surface-dark-alpha);
      color: var(--irs-text);
      font-size: 13px;
      white-space: nowrap;
      z-index: 9998;
    }

    .irs-undo-bar--visible {
      display: flex;
      animation: irs-slide-in-down var(--irs-duration-change) ease-out;
    }

    .irs-undo-bar--destructive {
      border-color: var(--irs-color-yellow-border);
    }

    .irs-undo-bar__btn {
      min-width: 56px;
      min-height: 44px;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--irs-color-blue-alpha-45);
      background: var(--irs-color-blue-alpha-22);
      color: var(--irs-text);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .irs-undo-bar__btn:active {
      background: var(--irs-color-blue-alpha-35);
    }

    /* ── Empty state ───────────────────────────────────────── */

    .irs-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 32px 20px;
      text-align: center;
      animation: irs-slide-in-down var(--irs-duration-change) ease-out;
    }

    .irs-empty-state__icon {
      font-size: 28px;
      opacity: 0.5;
    }

    .irs-empty-state__message {
      color: var(--irs-text-muted);
      font-size: 13px;
      line-height: 1.5;
      max-width: 220px;
    }

    .irs-empty-state__action {
      min-height: 38px;
      padding: 0 16px;
      border-radius: 10px;
      border: 1px solid var(--irs-color-blue-alpha-45);
      background: var(--irs-color-blue-alpha-12);
      color: var(--irs-color-blue);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .irs-empty-state__action:active {
      background: var(--irs-color-blue-alpha-22);
    }

  `;

  document.head.appendChild(style);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export type MotionKind = 'pulse' | 'glow' | 'expand' | 'shrink' | 'slideUp' | 'slideDown';

export interface UndoOptions {
  /** Milliseconds before the bar auto-dismisses. Default: 5000 */
  durationMs?: number;
  /** Use destructive (yellow) border for high-stakes actions. Default: false */
  destructive?: boolean;
}

export interface EmptyStateOptions {
  message: string;
  actionLabel: string;
  onAction: () => void;
  /** Decorative emoji/icon shown above the message. Default: '' (none) */
  icon?: string;
}

// ─── Toast Module ─────────────────────────────────────────────────────────────

const TOAST_ICONS: Record<ToastKind, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

function getOrCreateToastHost(): HTMLElement {
  let host = document.getElementById('irs-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'irs-toast-host';
    host.className = 'irs-toast-host';
    document.body.appendChild(host);
  }
  return host;
}

function showToast(message: string, kind: ToastKind, durationMs: number = TOKEN.durationToast): void {
  ensureStyles();
  const host = getOrCreateToastHost();

  const el = document.createElement('div');
  el.className = `irs-toast irs-toast--${kind}`;

  const icon = document.createElement('span');
  icon.className = 'irs-toast__icon';
  icon.textContent = TOAST_ICONS[kind];

  const text = document.createElement('span');
  text.textContent = message;

  el.append(icon, text);
  host.appendChild(el);

  function dismiss(): void {
    el.classList.add('irs-toast--exiting');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  const timer = window.setTimeout(dismiss, durationMs);

  // Tap to dismiss early on mobile
  el.addEventListener('click', () => {
    window.clearTimeout(timer);
    dismiss();
  }, { once: true });
}

const toast = {
  success: (msg: string, durationMs?: number) => showToast(msg, 'success', durationMs),
  error:   (msg: string, durationMs?: number) => showToast(msg, 'error',   durationMs),
  warning: (msg: string, durationMs?: number) => showToast(msg, 'warning', durationMs),
  info:    (msg: string, durationMs?: number) => showToast(msg, 'info',    durationMs),
};

// ─── Motion Module ────────────────────────────────────────────────────────────
// Each motion communicates meaning (see Motion Grammar in ux-polish-rules.md).
// Never stacks more than two animations. Never blocks input.

const MOTION_CLASS: Partial<Record<MotionKind, string>> = {
  pulse:  'irs-pulse',
  glow:   'irs-glow',
  expand: 'irs-expand',
};

const MOTION_DURATION: Partial<Record<MotionKind, number>> = {
  pulse:  TOKEN.durationAck,
  glow:   TOKEN.durationSafe,
  expand: TOKEN.durationChange,
};

function applyMotion(el: HTMLElement, kind: MotionKind): void {
  ensureStyles();

  if (kind === 'shrink') {
    // Shrink/fade: caller is responsible for removing the element after
    el.style.animation = `irs-shrink-out ${TOKEN.durationChange}ms ease-in forwards`;
    return;
  }

  if (kind === 'slideUp') {
    el.style.animation = `irs-slide-in-up ${TOKEN.durationChange}ms ease-out`;
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
    return;
  }

  if (kind === 'slideDown') {
    el.style.animation = `irs-slide-in-down ${TOKEN.durationChange}ms ease-out`;
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
    return;
  }

  const cls = MOTION_CLASS[kind];
  const dur = MOTION_DURATION[kind] ?? TOKEN.durationChange;
  if (!cls) return;

  // Remove first so re-triggering on same element works
  el.classList.remove(cls);
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), dur + 50);
}

const motion = {
  /**
   * Pulse — Acknowledgement. "I heard you."
   * Use on: buttons, toggles, any tapped element.
   */
  pulse: (el: HTMLElement) => applyMotion(el, 'pulse'),

  /**
   * Glow — Success / Completion. "That action landed."
   * Use on: items after save, items after creation.
   */
  glow: (el: HTMLElement) => applyMotion(el, 'glow'),

  /**
   * Expand — Creation. "Something new exists."
   * Use on: newly added list items, panels opening.
   */
  expand: (el: HTMLElement) => applyMotion(el, 'expand'),

  /**
   * Shrink — Removal. "This is going away."
   * Animates the element out. Remove it from the DOM in the onDone callback.
   */
  shrink: (el: HTMLElement, onDone?: () => void) => {
    ensureStyles();
    el.style.animation = `irs-shrink-out ${TOKEN.durationChange}ms ease-in forwards`;
    el.style.overflow = 'hidden';
    el.style.pointerEvents = 'none';
    el.addEventListener('animationend', () => onDone?.(), { once: true });
  },

  /**
   * Slide — Context change. "We've moved somewhere."
   * direction: 'up' = entering from below, 'down' = entering from above.
   */
  slide: (el: HTMLElement, direction: 'up' | 'down' = 'up') =>
    applyMotion(el, direction === 'up' ? 'slideUp' : 'slideDown'),
};

// ─── Selection Module ─────────────────────────────────────────────────────────
// Ensures only one primary selection exists at a time.
// Visually distinguishes focused from selected.

let _selectedEl: HTMLElement | null = null;
let _focusedEl: HTMLElement | null = null;

const selection = {
  /**
   * Mark an element as the active selection.
   * Clears any previous selection automatically.
   */
  mark: (el: HTMLElement) => {
    ensureStyles();
    if (_selectedEl && _selectedEl !== el) {
      _selectedEl.classList.remove('irs-selected');
    }
    el.classList.add('irs-selected');
    el.classList.remove('irs-focused');
    _selectedEl = el;
  },

  /**
   * Mark an element as focused (editing context).
   * Visually distinct from mere selection.
   */
  focus: (el: HTMLElement) => {
    ensureStyles();
    if (_focusedEl && _focusedEl !== el) {
      _focusedEl.classList.remove('irs-focused');
    }
    el.classList.add('irs-focused');
    _focusedEl = el;
  },

  /**
   * Clear selection from a specific element, or clear all if none given.
   */
  clear: (el?: HTMLElement) => {
    if (el) {
      el.classList.remove('irs-selected', 'irs-focused');
      if (_selectedEl === el) _selectedEl = null;
      if (_focusedEl === el) _focusedEl = null;
    } else {
      _selectedEl?.classList.remove('irs-selected');
      _focusedEl?.classList.remove('irs-focused');
      _selectedEl = null;
      _focusedEl = null;
    }
  },

  /** Returns the currently selected element, if any. */
  current: (): HTMLElement | null => _selectedEl,
};

// ─── Storage Module ───────────────────────────────────────────────────────────
// Makes hot/cold state felt, not inferred.

const storage = {
  /**
   * Mark an element as having unsaved (hot) changes.
   * Adds a subtle yellow dot and border tint.
   */
  markDirty: (el: HTMLElement) => {
    ensureStyles();
    el.classList.add('irs-dirty');
    el.classList.remove('irs-saved');
  },

  /**
   * Mark an element as saved (cold).
   * Removes dirty indicator and plays a calm glow to confirm.
   */
  markSaved: (el: HTMLElement) => {
    ensureStyles();
    el.classList.remove('irs-dirty');
    el.classList.add('irs-saved');
    window.setTimeout(() => el.classList.remove('irs-saved'), TOKEN.durationSafe + 50);
  },

  /**
   * Clear all storage state from an element (neutral/idle).
   */
  clear: (el: HTMLElement) => {
    el.classList.remove('irs-dirty', 'irs-saved');
  },
};

// ─── Undo Module ──────────────────────────────────────────────────────────────
// Global undo bar — floats above all content. Not tied to any panel container.

let _undoBar: HTMLElement | null = null;
let _undoTimer: number | null = null;
let _undoCallback: (() => void) | null = null;

function getOrCreateUndoBar(): HTMLElement {
  if (_undoBar) return _undoBar;

  ensureStyles();

  const bar = document.createElement('div');
  bar.className = 'irs-undo-bar';
  bar.id = 'irs-undo-bar';

  const msg = document.createElement('span');
  msg.className = 'irs-undo-bar__msg';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'irs-undo-bar__btn';
  btn.textContent = 'Undo';

  btn.addEventListener('click', () => {
    const cb = _undoCallback;
    undoModule.dismiss();
    cb?.();
  });

  bar.append(msg, btn);
  document.body.appendChild(bar);
  _undoBar = bar;
  return bar;
}

const undoModule = {
  /**
   * Show the global undo bar.
   * Automatically dismisses after options.durationMs (default 5 s).
   * Safe to call repeatedly — resets the timer.
   */
  show: (message: string, onUndo: () => void, options?: UndoOptions) => {
    const bar = getOrCreateUndoBar();
    const msg = bar.querySelector('.irs-undo-bar__msg') as HTMLElement;

    if (_undoTimer !== null) window.clearTimeout(_undoTimer);

    msg.textContent = message;
    _undoCallback = onUndo;

    bar.classList.toggle('irs-undo-bar--destructive', options?.destructive ?? false);
    bar.classList.add('irs-undo-bar--visible');

    _undoTimer = window.setTimeout(() => undoModule.dismiss(), options?.durationMs ?? TOKEN.durationUndoBar);
  },

  /** Dismiss the undo bar immediately. */
  dismiss: () => {
    if (_undoTimer !== null) { window.clearTimeout(_undoTimer); _undoTimer = null; }
    _undoCallback = null;
    _undoBar?.classList.remove('irs-undo-bar--visible', 'irs-undo-bar--destructive');
  },
};

// ─── Empty State Module ───────────────────────────────────────────────────────
// Renders an invitation, not an error.

const emptyState = {
  /**
   * Render an empty state into a container.
   * Clears the container first. Exactly one call-to-action.
   */
  render: (container: HTMLElement, options: EmptyStateOptions) => {
    ensureStyles();
    container.innerHTML = '';

    const root = document.createElement('div');
    root.className = 'irs-empty-state';

    if (options.icon) {
      const icon = document.createElement('div');
      icon.className = 'irs-empty-state__icon';
      icon.textContent = options.icon;
      root.appendChild(icon);
    }

    const msg = document.createElement('p');
    msg.className = 'irs-empty-state__message';
    msg.textContent = options.message;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'irs-empty-state__action';
    btn.textContent = options.actionLabel;
    btn.addEventListener('click', options.onAction);

    root.append(msg, btn);
    container.appendChild(root);
  },

  /**
   * Clear a previously rendered empty state from a container.
   */
  clear: (container: HTMLElement) => {
    const existing = container.querySelector('.irs-empty-state');
    if (existing) existing.remove();
  },
};

// ─── Convenience Combos ───────────────────────────────────────────────────────
// Pre-wired combinations for common multi-class feedback requirements.
// (See: Minimum Feedback Requirements table in ux-polish-rules.md)

const combos = {
  /**
   * Creation combo — Feedback classes 1 + 2.
   * Pulse the trigger, then expand-animate the new item.
   */
  created: (triggerEl: HTMLElement, newItemEl: HTMLElement) => {
    motion.pulse(triggerEl);
    motion.expand(newItemEl);
  },

  /**
   * Deletion combo — Feedback classes 1 + 3 + 4.
   * Pulse trigger, shrink item out, show undo bar.
   */
  deleted: (
    triggerEl: HTMLElement,
    itemEl: HTMLElement,
    message: string,
    onUndo: () => void,
    options?: UndoOptions,
  ) => {
    motion.pulse(triggerEl);
    motion.shrink(itemEl, () => itemEl.remove());
    undoModule.show(message, onUndo, { destructive: true, ...options });
  },

  /**
   * Save combo — Safety + Completion.
   * Mark saved on the indicator element, toast success.
   */
  saved: (indicatorEl: HTMLElement, message = 'Saved.') => {
    storage.markSaved(indicatorEl);
    motion.glow(indicatorEl);
    toast.success(message);
  },

  /**
   * Commit (cold save / deploy) combo — full feedback chain.
   */
  committed: (indicatorEl: HTMLElement, message = 'Changes committed to repository.') => {
    storage.markSaved(indicatorEl);
    motion.glow(indicatorEl);
    toast.success(message, 6000);
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const uxFeedback = {
  /** Show toast notifications (success / error / warning / info). */
  toast,

  /** Apply semantic motion to elements (pulse, glow, expand, shrink, slide). */
  motion,

  /** Manage single primary selection state across the UI. */
  selection,

  /** Surface hot/cold storage state on any element. */
  storage,

  /** Global floating undo bar — not tied to any panel. */
  undo: undoModule,

  /** Render empty states as invitations with exactly one next action. */
  emptyState,

  /** Pre-wired multi-class combos for creation, deletion, and save flows. */
  combos,

  /**
   * Call once at app init to pre-inject styles.
   * Optional — styles are also injected lazily on first use.
   */
  init: () => ensureStyles(),
};

export default uxFeedback;
