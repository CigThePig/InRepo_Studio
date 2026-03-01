/**
 * gestureDebugOverlay.ts
 *
 * A persistent, always-on debug panel for diagnosing gesture issues in the
 * Asset Library tab (long-press, drag-to-reorder, scroll conflicts).
 *
 * Displays:
 *   • Sortable state machine state (idle / pressing / scrolling / confirmed / dragging)
 *   • Active pointer id, capture status (viewport vs documentElement)
 *   • dx / dy / totalMoved vs thresholds (visual bars)
 *   • Full drag lifecycle: beginDrag, finishDrag, lostpointercapture, etc.
 *   • Scrollable event log with relative timestamps (newest-first)
 *   • Real-time key/value state watch panel with change highlighting
 *   • Global pointer tracker strip
 *
 * Usage (matches the API called in assetLibraryTab.ts):
 *
 *   const overlay = createGestureDebugOverlay();
 *   overlay.setEnabled(true);        // force-on
 *   overlay.log('event.name', { key: value });
 *   overlay.setState({ activePointerId: 1, captureDocument: true });
 *   overlay.destroy();
 */

export interface GestureDebugOverlayController {
  setEnabled(enabled: boolean): void;
  log(label: string, data?: Record<string, unknown>): void;
  setState(patch: Record<string, unknown>): void;
  destroy(): void;
}

const MAX_LOG_LINES = 150;
const STATE_REPAINT_INTERVAL_MS = 80;

const C = {
  bg: 'rgba(10,14,28,0.97)',
  border: '#2a3660',
  headerBg: '#111827',
  text: '#c9d6ff',
  dim: '#5c6a9a',
  key: '#7eb8f7',
  val: '#a5f3a0',
  warn: '#f6c96e',
  accent: '#818cf8',
  stateBg: '#1e2a45',
};

const STATE_COLOURS: Record<string, string> = {
  idle:      '#4b5563',
  pressing:  '#f59e0b',
  scrolling: '#3b82f6',
  confirmed: '#8b5cf6',
  dragging:  '#10b981',
};

function injectStyles(): void {
  if (document.getElementById('irs-gdbg-styles')) return;
  const s = document.createElement('style');
  s.id = 'irs-gdbg-styles';
  s.textContent = `
.irs-gdbg{position:fixed;top:8px;right:8px;width:310px;max-height:90vh;display:flex;flex-direction:column;z-index:99999;font-family:Menlo,Consolas,monospace;font-size:10px;line-height:1.4;border-radius:8px;border:1px solid ${C.border};background:${C.bg};color:${C.text};box-shadow:0 8px 32px rgba(0,0,0,.7);overflow:hidden;pointer-events:auto;user-select:none;}
.irs-gdbg--col .irs-gdbg__body{display:none}
.irs-gdbg__hd{display:flex;align-items:center;gap:6px;padding:6px 8px;background:${C.headerBg};border-bottom:1px solid ${C.border};cursor:grab;flex-shrink:0;}
.irs-gdbg__hd:active{cursor:grabbing}
.irs-gdbg__title{flex:1;font-weight:700;font-size:10px;color:${C.accent};letter-spacing:.05em;text-transform:uppercase;}
.irs-gdbg__btn{padding:2px 6px;border-radius:3px;border:1px solid ${C.border};background:transparent;color:${C.dim};font-size:10px;cursor:pointer;font-family:inherit;line-height:1;}
.irs-gdbg__btn:hover{color:${C.text};border-color:${C.accent}}
.irs-gdbg__body{display:flex;flex-direction:column;overflow:hidden;flex:1;min-height:0;}
.irs-gdbg__state-row{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid ${C.border};flex-shrink:0;}
.irs-gdbg__badge{padding:2px 8px;border-radius:999px;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.08em;background:${C.stateBg};color:#fff;border:1px solid ${C.border};flex-shrink:0;transition:background 100ms,border-color 100ms;}
.irs-gdbg__meta{flex:1;color:${C.dim};font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.irs-gdbg__meters{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;border-bottom:1px solid ${C.border};flex-shrink:0;}
.irs-gdbg__meter{display:flex;flex-direction:column;align-items:center;padding:4px 2px;background:${C.headerBg};}
.irs-gdbg__m-lbl{font-size:8px;color:${C.dim};text-transform:uppercase;letter-spacing:.06em;}
.irs-gdbg__m-val{font-size:11px;font-weight:700;color:${C.key};margin-top:1px;}
.irs-gdbg__m-bar{width:70%;height:3px;background:${C.border};border-radius:2px;margin-top:3px;overflow:hidden;}
.irs-gdbg__m-fill{height:100%;border-radius:2px;background:${C.accent};width:0%;transition:width 60ms linear,background 60ms;}
.irs-gdbg__kv{padding:4px 8px;border-bottom:1px solid ${C.border};display:grid;grid-template-columns:auto 1fr;gap:0 6px;max-height:130px;overflow-y:auto;flex-shrink:0;}
.irs-gdbg__kk{color:${C.key};padding:1px 0;white-space:nowrap;}
.irs-gdbg__kv-v{color:${C.val};padding:1px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
@keyframes irs-flash{0%{color:${C.warn}}100%{color:${C.val}}}
.irs-gdbg__kv-v--ch{animation:irs-flash 700ms ease-out forwards;}
.irs-gdbg__log-hd{display:flex;align-items:center;gap:4px;padding:4px 8px;border-bottom:1px solid ${C.border};flex-shrink:0;}
.irs-gdbg__log-t{flex:1;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:${C.dim};}
.irs-gdbg__log{overflow-y:auto;flex:1;min-height:80px;}
.irs-gdbg__le{display:flex;gap:4px;padding:2px 8px;border-bottom:1px solid rgba(42,54,96,.35);}
.irs-gdbg__le:first-child{background:rgba(129,140,248,.08);}
.irs-gdbg__le-ts{color:${C.dim};flex-shrink:0;width:48px;text-align:right;}
.irs-gdbg__le-lb{flex-shrink:0;}
.irs-gdbg__le-lb--drag{color:#10b981}
.irs-gdbg__le-lb--cap{color:#8b5cf6}
.irs-gdbg__le-lb--cancel{color:#f87171}
.irs-gdbg__le-lb--finish{color:#f6c96e}
.irs-gdbg__le-lb--state{color:#3b82f6}
.irs-gdbg__le-lb--long{color:#f59e0b}
.irs-gdbg__le-d{color:${C.dim};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}
.irs-gdbg__ptr{display:flex;gap:4px;padding:4px 8px;border-top:1px solid ${C.border};flex-shrink:0;flex-wrap:wrap;min-height:20px;font-size:9px;color:${C.dim};}
.irs-gdbg__ptr-chip{padding:1px 5px;border-radius:3px;background:${C.stateBg};border:1px solid ${C.border};color:${C.text};}
  `;
  document.head.appendChild(s);
}

function labelClass(label: string): string {
  if (label.includes('drag')) return 'irs-gdbg__le-lb--drag';
  if (label.includes('capture') || label.includes('lost')) return 'irs-gdbg__le-lb--cap';
  if (label.includes('cancel')) return 'irs-gdbg__le-lb--cancel';
  if (label.includes('finish') || label.includes('commit')) return 'irs-gdbg__le-lb--finish';
  if (label.includes('state') || label.includes('sortable')) return 'irs-gdbg__le-lb--state';
  if (label.includes('long') || label.includes('confirm') || label.includes('selection')) return 'irs-gdbg__le-lb--long';
  return '';
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return String(v);
  if (v instanceof HTMLElement) return `<${v.tagName.toLowerCase()}>`;
  if (typeof v === 'object') {
    try { const s = JSON.stringify(v); return s.length > 64 ? s.slice(0, 61) + '…' : s; }
    catch { return '[obj]'; }
  }
  return String(v);
}

export function createGestureDebugOverlay(): GestureDebugOverlayController {
  let enabled = false;
  let overlayEl: HTMLElement | null = null;
  let collapsed = false;
  const t0 = performance.now();

  interface LogEntry { ts: number; label: string; data?: Record<string, unknown>; }
  const logBuffer: LogEntry[] = [];
  const liveState: Record<string, unknown> = {};
  const prevStr: Record<string, string> = {};

  let elBadge: HTMLElement | null = null;
  let elMeta: HTMLElement | null = null;
  let elLog: HTMLElement | null = null;
  let elKv: HTMLElement | null = null;
  let elPtr: HTMLElement | null = null;
  let mDx: { v: HTMLElement; f: HTMLElement } | null = null;
  let mDy: { v: HTMLElement; f: HTMLElement } | null = null;
  let mTotal: { v: HTMLElement; f: HTMLElement } | null = null;
  let repaintTimer: number | null = null;

  const activePointers = new Map<number, string>();

  function onPtrDown(e: PointerEvent): void {
    activePointers.set(e.pointerId, e.pointerType);
    repaintPtr();
  }
  function onPtrUp(e: PointerEvent): void {
    activePointers.delete(e.pointerId);
    repaintPtr();
  }

  function repaintPtr(): void {
    if (!elPtr) return;
    elPtr.innerHTML = '';
    if (activePointers.size === 0) {
      elPtr.textContent = 'no active pointers';
      return;
    }
    for (const [id, type] of activePointers) {
      const chip = document.createElement('div');
      chip.className = 'irs-gdbg__ptr-chip';
      chip.textContent = `#${id} (${type})`;
      elPtr.appendChild(chip);
    }
  }

  function makeMeter(lbl: string, parent: HTMLElement): { v: HTMLElement; f: HTMLElement } {
    const m = document.createElement('div'); m.className = 'irs-gdbg__meter';
    const l = document.createElement('div'); l.className = 'irs-gdbg__m-lbl'; l.textContent = lbl;
    const v = document.createElement('div'); v.className = 'irs-gdbg__m-val'; v.textContent = '0';
    const bar = document.createElement('div'); bar.className = 'irs-gdbg__m-bar';
    const f = document.createElement('div'); f.className = 'irs-gdbg__m-fill';
    bar.appendChild(f); m.appendChild(l); m.appendChild(v); m.appendChild(bar);
    parent.appendChild(m);
    return { v, f };
  }

  function buildOverlay(): void {
    if (overlayEl) return;
    injectStyles();

    const panel = document.createElement('div');
    panel.className = 'irs-gdbg';

    // Header
    const hd = document.createElement('div');
    hd.className = 'irs-gdbg__hd';
    const title = document.createElement('div');
    title.className = 'irs-gdbg__title';
    title.textContent = '⎋ Gesture Debug';
    const clrBtn = document.createElement('button');
    clrBtn.className = 'irs-gdbg__btn';
    clrBtn.textContent = '⌫ clear';
    clrBtn.addEventListener('click', () => { logBuffer.length = 0; renderLog(); });
    const colBtn = document.createElement('button');
    colBtn.className = 'irs-gdbg__btn';
    colBtn.textContent = '−';
    colBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      panel.classList.toggle('irs-gdbg--col', collapsed);
      colBtn.textContent = collapsed ? '+' : '−';
    });
    hd.appendChild(title); hd.appendChild(clrBtn); hd.appendChild(colBtn);
    panel.appendChild(hd);

    // Drag-to-move
    let dragging = false, ox = 0, oy = 0, sr = 0, st = 0;
    hd.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.irs-gdbg__btn')) return;
      dragging = true; ox = e.clientX; oy = e.clientY;
      const r = panel.getBoundingClientRect();
      sr = window.innerWidth - r.right; st = r.top;
      hd.setPointerCapture(e.pointerId);
    });
    hd.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      panel.style.right = `${Math.max(4, sr - (e.clientX - ox))}px`;
      panel.style.top = `${Math.max(4, st + (e.clientY - oy))}px`;
    });
    hd.addEventListener('pointerup', () => { dragging = false; });

    // Body
    const body = document.createElement('div');
    body.className = 'irs-gdbg__body';

    // State row
    const sr2 = document.createElement('div');
    sr2.className = 'irs-gdbg__state-row';
    elBadge = document.createElement('div');
    elBadge.className = 'irs-gdbg__badge';
    elBadge.textContent = 'idle';
    elMeta = document.createElement('div');
    elMeta.className = 'irs-gdbg__meta';
    elMeta.textContent = 'awaiting events…';
    sr2.appendChild(elBadge); sr2.appendChild(elMeta);
    body.appendChild(sr2);

    // Meters
    const meters = document.createElement('div');
    meters.className = 'irs-gdbg__meters';
    mDx = makeMeter('dx', meters);
    mDy = makeMeter('dy', meters);
    mTotal = makeMeter('total', meters);
    body.appendChild(meters);

    // KV panel
    elKv = document.createElement('div');
    elKv.className = 'irs-gdbg__kv';
    body.appendChild(elKv);

    // Log header
    const lh = document.createElement('div');
    lh.className = 'irs-gdbg__log-hd';
    const lt = document.createElement('div');
    lt.className = 'irs-gdbg__log-t';
    lt.textContent = 'Event Log';
    lh.appendChild(lt);
    body.appendChild(lh);

    // Log
    elLog = document.createElement('div');
    elLog.className = 'irs-gdbg__log';
    body.appendChild(elLog);

    // Pointer strip
    elPtr = document.createElement('div');
    elPtr.className = 'irs-gdbg__ptr';
    elPtr.textContent = 'no active pointers';
    body.appendChild(elPtr);

    panel.appendChild(body);
    document.body.appendChild(panel);
    overlayEl = panel;

    document.addEventListener('pointerdown', onPtrDown, true);
    document.addEventListener('pointerup', onPtrUp, true);
    document.addEventListener('pointercancel', onPtrUp, true);

    repaintTimer = window.setInterval(repaintKv, STATE_REPAINT_INTERVAL_MS);

    renderLog();
    repaintKv();
  }

  function renderLog(): void {
    if (!elLog) return;
    elLog.innerHTML = '';
    for (const entry of [...logBuffer].reverse()) {
      const row = document.createElement('div');
      row.className = 'irs-gdbg__le';
      const ts = document.createElement('span');
      ts.className = 'irs-gdbg__le-ts';
      ts.textContent = `+${((entry.ts - t0) / 1000).toFixed(2)}s`;
      const lb = document.createElement('span');
      lb.className = `irs-gdbg__le-lb ${labelClass(entry.label)}`;
      lb.textContent = entry.label;
      const d = document.createElement('span');
      d.className = 'irs-gdbg__le-d';
      if (entry.data) {
        d.textContent = Object.entries(entry.data).map(([k, v]) => `${k}:${fmtVal(v)}`).join(' ');
      }
      row.appendChild(ts); row.appendChild(lb); row.appendChild(d);
      elLog.appendChild(row);
    }
  }

  function updateMeter(ref: { v: HTMLElement; f: HTMLElement } | null, raw: unknown, max: number): void {
    if (!ref) return;
    const n = typeof raw === 'number' ? raw : 0;
    ref.v.textContent = n.toFixed(0);
    const pct = Math.min(100, (Math.abs(n) / max) * 100);
    ref.f.style.width = `${pct}%`;
    ref.f.style.background = pct >= 70 ? '#f59e0b' : '#818cf8';
  }

  function repaintKv(): void {
    if (!elKv) return;
    elKv.innerHTML = '';
    for (const k of Object.keys(liveState).sort()) {
      const vs = fmtVal(liveState[k]);
      const keyEl = document.createElement('div');
      keyEl.className = 'irs-gdbg__kk';
      keyEl.textContent = k;
      const valEl = document.createElement('div');
      valEl.className = 'irs-gdbg__kv-v';
      valEl.textContent = vs;
      if (prevStr[k] !== vs) {
        valEl.classList.add('irs-gdbg__kv-v--ch');
        prevStr[k] = vs;
      }
      elKv.appendChild(keyEl);
      elKv.appendChild(valEl);
    }

    updateMeter(mDx, liveState['dx'], 40);
    updateMeter(mDy, liveState['dy'], 40);
    updateMeter(mTotal, liveState['maxMoved'], 80);

    const ss = liveState['sortableState'] as string | undefined;
    if (ss && elBadge) {
      elBadge.textContent = ss;
      const col = STATE_COLOURS[ss] ?? C.stateBg;
      elBadge.style.background = col;
      elBadge.style.borderColor = col;
    }
    if (elMeta) {
      const parts: string[] = [];
      const pid = liveState['activePointerId'];
      if (typeof pid === 'number' && pid >= 0) parts.push(`ptr#${pid}`);
      if (liveState['captureDocument']) parts.push('cap:doc✓');
      if (liveState['captureViewport']) parts.push('cap:vp✓');
      if (liveState['lastFinishReason']) parts.push(`fin:${liveState['lastFinishReason']}`);
      if (liveState['layoutProbe']) parts.push(String(liveState['layoutProbe']));
      elMeta.textContent = parts.join(' · ') || 'awaiting events…';
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function setEnabled(isEnabled: boolean): void {
    enabled = isEnabled;
    if (enabled && !overlayEl) buildOverlay();
    if (overlayEl) overlayEl.style.display = enabled ? '' : 'none';
  }

  function log(label: string, data?: Record<string, unknown>): void {
    if (!enabled) return;
    logBuffer.push({ ts: performance.now(), label, data });
    if (logBuffer.length > MAX_LOG_LINES) logBuffer.shift();
    renderLog();
  }

  function setState(patch: Record<string, unknown>): void {
    if (!enabled) return;
    Object.assign(liveState, patch);
    repaintKv();
  }

  function destroy(): void {
    if (repaintTimer !== null) { clearInterval(repaintTimer); repaintTimer = null; }
    document.removeEventListener('pointerdown', onPtrDown, true);
    document.removeEventListener('pointerup', onPtrUp, true);
    document.removeEventListener('pointercancel', onPtrUp, true);
    overlayEl?.remove();
    overlayEl = null;
    elBadge = null; elMeta = null; elLog = null;
    elKv = null; elPtr = null;
    mDx = null; mDy = null; mTotal = null;
  }

  return { setEnabled, log, setState, destroy };
}
