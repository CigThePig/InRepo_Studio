export interface GestureDebugOverlayController {
  setEnabled(enabled: boolean): void;
  log(label: string, data?: Record<string, unknown>): void;
  setState(patch: Record<string, unknown>): void;
  destroy(): void;
}

interface GestureDebugOverlayOptions {
  maxEvents?: number;
}

interface OverlayEvent {
  ts: number;
  label: string;
  data?: Record<string, unknown>;
}

const STYLE_ID = 'irs-gesture-debug-overlay-style';
const DEFAULT_MAX_EVENTS = 80;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = `
    .irs-gesture-debug-overlay {
      position: fixed;
      top: 8px;
      left: 8px;
      z-index: 2147483647;
      max-width: min(92vw, 420px);
      max-height: min(64vh, 420px);
      overflow: hidden;
      border: 1px solid var(--irs-border-heavy);
      border-radius: var(--irs-radius-md);
      background: var(--irs-surface-modal);
      color: var(--irs-text-primary);
      font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      padding: 8px;
      pointer-events: none;
      white-space: pre-wrap;
    }

    .irs-gesture-debug-overlay__title {
      font-weight: 700;
      margin-bottom: 6px;
      color: var(--irs-accent-primary);
    }

    .irs-gesture-debug-overlay__state {
      display: grid;
      grid-template-columns: minmax(100px, auto) 1fr;
      gap: 2px 8px;
      margin-bottom: 6px;
    }

    .irs-gesture-debug-overlay__state > strong {
      color: var(--irs-text-secondary);
      font-weight: 600;
    }

    .irs-gesture-debug-overlay__events {
      border-top: 1px dashed var(--irs-border-light);
      padding-top: 6px;
      max-height: 180px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .irs-gesture-debug-overlay__event-line {
      color: var(--irs-text-primary);
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(styleEl);
}

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, '') : String(value);
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return JSON.stringify(value);
}

function summarizeElement(el: Element | null): string {
  if (!el) return 'none';
  const htmlEl = el as HTMLElement;
  const classes = typeof htmlEl.className === 'string' ? htmlEl.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
  return `${el.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
}

export function createGestureDebugOverlay(
  opts: GestureDebugOverlayOptions = {},
): GestureDebugOverlayController {
  const maxEvents = Math.max(20, opts.maxEvents ?? DEFAULT_MAX_EVENTS);
  const events: OverlayEvent[] = [];
  const state: Record<string, unknown> = {
    activePointerId: -1,
    sortableState: 'idle',
    longPressMs: '',
    scrollThresholdPx: '',
    dragStartSlopPx: '',
    dx: 0,
    dy: 0,
    maxMoved: 0,
    captureViewport: 'unknown',
    captureDocument: 'unknown',
    lastLostCaptureTarget: '',
    lastFinishReason: '',
    elementFromPoint: '',
    closestGroupKey: '',
  };

  ensureStyles();

  const root = document.createElement('aside');
  root.className = 'irs-gesture-debug-overlay';
  root.hidden = true;

  const titleEl = document.createElement('div');
  titleEl.className = 'irs-gesture-debug-overlay__title';
  titleEl.textContent = 'Gesture Debug Overlay';

  const stateEl = document.createElement('div');
  stateEl.className = 'irs-gesture-debug-overlay__state';

  const eventsEl = document.createElement('div');
  eventsEl.className = 'irs-gesture-debug-overlay__events';

  root.appendChild(titleEl);
  root.appendChild(stateEl);
  root.appendChild(eventsEl);
  document.body.appendChild(root);

  let enabled = false;

  const render = (): void => {
    if (!enabled) return;
    const keys: Array<[string, string]> = [
      ['activePointerId', 'activePointerId'],
      ['sortableState', 'sortableState'],
      ['longPressMs', 'longPressMs'],
      ['scrollThresholdPx', 'scrollThresholdPx'],
      ['dragStartSlopPx', 'dragStartSlopPx'],
      ['dx', 'dx'],
      ['dy', 'dy'],
      ['maxMoved', 'maxMoved'],
      ['captureViewport', 'capture.viewport'],
      ['captureDocument', 'capture.document'],
      ['lastLostCaptureTarget', 'lostCapture.target'],
      ['lastFinishReason', 'finish.reason'],
      ['elementFromPoint', 'elementFromPoint'],
      ['closestGroupKey', 'closest[group-key]'],
      ['layoutProbe', 'layoutProbe'],
    ];

    stateEl.innerHTML = '';
    keys.forEach(([k, label]) => {
      const keyEl = document.createElement('strong');
      keyEl.textContent = label;
      const valueEl = document.createElement('span');
      valueEl.textContent = toDisplayValue(state[k]);
      stateEl.appendChild(keyEl);
      stateEl.appendChild(valueEl);
    });

    eventsEl.innerHTML = '';
    for (let idx = events.length - 1; idx >= 0; idx -= 1) {
      const entry = events[idx];
      const line = document.createElement('div');
      line.className = 'irs-gesture-debug-overlay__event-line';
      const time = (entry.ts / 1000).toFixed(3);
      const details = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
      line.textContent = `${time}s ${entry.label}${details}`;
      eventsEl.appendChild(line);
    }
  };

  return {
    setEnabled(nextEnabled: boolean): void {
      enabled = nextEnabled;
      root.hidden = !enabled;
      if (enabled) render();
    },

    log(label: string, data?: Record<string, unknown>): void {
      events.push({ ts: performance.now(), label, data });
      while (events.length > maxEvents) events.shift();
      if (enabled) render();
    },

    setState(patch: Record<string, unknown>): void {
      Object.assign(state, patch);
      if (patch.elementFromPoint instanceof Element) {
        state.elementFromPoint = summarizeElement(patch.elementFromPoint);
      }
      if (enabled) render();
    },

    destroy(): void {
      root.remove();
    },
  };
}
