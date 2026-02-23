import type { AssetRegistry, AnimStateMachineAsset } from '@/editor/assets';
import type { AnimState, AnimTransition, TransitionCondition } from '@/types/animStateMachine';
import { createAnimationClock } from '@/editor/canvas/animationClock';
import type { AnimationClock } from '@/editor/canvas/animationClock';
import { createSmSimulator } from './smSimulator';
import type { SmSimulator } from './smSimulator';
import { uxFeedback } from '@/editor/uxFeedback';

const STYLES = `
  .asm-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: #e6ecff;
    font-family: inherit;
  }

  .asm-editor__toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(20, 30, 60, 0.95);
    border-bottom: 1px solid #253461;
    flex-shrink: 0;
  }

  .asm-editor__toolbar-button {
    min-height: 36px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(33, 46, 89, 0.85);
    color: #f2f5ff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .asm-editor__toolbar-button:active {
    background: rgba(52, 70, 128, 0.9);
  }

  .asm-editor__toolbar-button--primary {
    background: rgba(74, 158, 255, 0.2);
    border-color: rgba(74, 158, 255, 0.4);
  }

  .asm-editor__toolbar-title {
    font-size: 13px;
    font-weight: 700;
    color: #dbe4ff;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asm-editor__canvas-wrap {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: rgba(12, 18, 40, 0.95);
  }

  .asm-editor__canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }

  .asm-editor__inspector {
    padding: 12px;
    background: rgba(20, 30, 60, 0.95);
    border-top: 1px solid #253461;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 260px;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .asm-editor__inspector-title {
    font-size: 13px;
    font-weight: 700;
    color: #dbe4ff;
  }

  .asm-editor__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .asm-editor__field-label {
    font-size: 11px;
    font-weight: 600;
    color: #9fb2e3;
  }

  .asm-editor__field-input,
  .asm-editor__field-select {
    min-height: 36px;
    border-radius: 8px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(22, 30, 60, 0.85);
    color: #f2f5ff;
    padding: 6px 10px;
    font-size: 12px;
  }

  .asm-editor__field-select {
    cursor: pointer;
  }

  .asm-editor__field-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #dbe4ff;
  }

  .asm-editor__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(20, 30, 60, 0.95);
    border-top: 1px solid #253461;
    max-height: 50vh;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .asm-editor__list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(30, 42, 80, 0.85);
    border-radius: 10px;
    cursor: pointer;
    border: 2px solid transparent;
  }

  .asm-editor__list-item--selected {
    border-color: #4a9eff;
  }

  .asm-editor__list-item-name {
    font-size: 13px;
    font-weight: 600;
  }

  .asm-editor__list-item-info {
    font-size: 11px;
    color: #9fb2e3;
  }

  .asm-editor__empty {
    font-size: 12px;
    color: #8c94c9;
    padding: 16px 12px;
    text-align: center;
  }

  .asm-editor__toolbar-button--active {
    background: rgba(74, 255, 142, 0.18);
    border-color: rgba(74, 255, 142, 0.55);
    color: #4aff8e;
  }

  .asm-editor__toolbar-button--danger {
    background: rgba(255, 80, 80, 0.12);
    border-color: rgba(255, 80, 80, 0.4);
    color: #ff9fb3;
  }

  .asm-editor__sim-panel {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(10, 22, 50, 0.97);
    border-top: 2px solid #4aff8e44;
  }

  .asm-editor__sim-label {
    font-size: 11px;
    font-weight: 700;
    color: #4aff8e;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .asm-editor__sim-state {
    font-size: 12px;
    color: #dbe4ff;
    padding: 6px 10px;
    background: rgba(74, 255, 142, 0.08);
    border-radius: 8px;
    border: 1px solid #4aff8e44;
  }

  .asm-editor__sim-events {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .asm-editor__sim-event-btn {
    min-height: 36px;
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid rgba(74, 158, 255, 0.5);
    background: rgba(74, 158, 255, 0.12);
    color: #a8c8ff;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
  }

  .asm-editor__sim-event-btn:active {
    background: rgba(74, 158, 255, 0.3);
  }

  .asm-editor__sim-anim-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .asm-editor__sim-anim-canvas {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    border: 1px solid #3e5494;
    background: #0e1830;
    flex-shrink: 0;
  }

  .asm-editor__sim-anim-info {
    font-size: 11px;
    color: #9fb2e3;
    line-height: 1.5;
  }

  .asm-editor__sim-reset-btn {
    min-height: 36px;
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid rgba(255, 159, 179, 0.4);
    background: rgba(255, 80, 80, 0.08);
    color: #ff9fb3;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    align-self: flex-start;
  }

  .asm-editor__undo-row {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }
`;

// --- Constants ---

const NODE_WIDTH = 140;
const NODE_HEIGHT = 56;
const NODE_RADIUS = 12;
const NODE_FILL = '#1e2a50';
const NODE_FILL_SELECTED = '#2a3e74';
const NODE_BORDER = '#3e5494';
const NODE_BORDER_SELECTED = '#4a9eff';
const NODE_INITIAL_INDICATOR = '#4aff8e';
const ANY_STATE_FILL = '#3a2050';
const ANY_STATE_BORDER = '#8855cc';
const ARROW_COLOR = '#5a6eaa';
const ARROW_SELECTED = '#4a9eff';
const TEXT_COLOR = '#e6ecff';
const TEXT_MUTED = '#9fb2e3';
const GRID_COLOR = 'rgba(50, 65, 110, 0.3)';
const GRID_SPACING = 40;

// Grid snap
const SNAP_SIZE = 16;

// Alignment guide threshold (world units)
const GUIDE_THRESHOLD = 4;

// Simulation
const NODE_FILL_ACTIVE_SIM = '#124a2a';
const NODE_BORDER_ACTIVE_SIM = '#4aff8e';

// Condition chip
const CHIP_BG = 'rgba(30, 42, 80, 0.92)';
const CHIP_BORDER = 'rgba(83, 101, 164, 0.7)';
const CHIP_TEXT = '#c8d8ff';

// --- Helpers ---

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// --- Editor Interfaces ---

export interface AnimStateMachineEditorConfig {
  container: HTMLElement;
  assetRegistry: AssetRegistry;
  initialStateMachineId?: string;
  onSave?: (stateMachine: AnimStateMachineAsset) => void;
  onBack?: () => void;
}

export interface AnimStateMachineEditorController {
  openStateMachine(stateMachineId: string): void;
  createNew(): void;
  refresh(): void;
  destroy(): void;
}

interface EditorState {
  machine: AnimStateMachineAsset | null;
  isNew: boolean;
  selectedStateId: string | null;
  selectedTransitionId: string | null;
  panX: number;
  panY: number;
  zoom: number;
  draggingStateId: string | null;
  dragOffsetX: number;
  dragOffsetY: number;
  creatingTransitionFrom: string | null;
  cursorX: number;
  cursorY: number;
  // Guide lines (in world coords)
  guideLines: { type: 'h' | 'v'; value: number }[];
  // Simulation mode
  simulating: boolean;
}

interface HistoryEntry {
  states: AnimState[];
  transitions: AnimTransition[];
  initialStateId: string;
}

// --- Main Editor ---

export function createAnimStateMachineEditor(
  config: AnimStateMachineEditorConfig
): AnimStateMachineEditorController {
  const { container, assetRegistry } = config;

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  const root = document.createElement('div');
  root.className = 'asm-editor';

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'asm-editor__toolbar';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'asm-editor__toolbar-button';
  backButton.textContent = '\u2190 Back';
  backButton.addEventListener('click', () => config.onBack?.());

  const titleEl = document.createElement('span');
  titleEl.className = 'asm-editor__toolbar-title';
  titleEl.textContent = 'State Machine Editor';

  const addStateButton = document.createElement('button');
  addStateButton.type = 'button';
  addStateButton.className = 'asm-editor__toolbar-button';
  addStateButton.textContent = '+ State';
  addStateButton.addEventListener('click', () => addNewState());

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'asm-editor__toolbar-button asm-editor__toolbar-button--primary';
  saveButton.textContent = 'Save';
  saveButton.addEventListener('click', () => saveMachine());

  const fitButton = document.createElement('button');
  fitButton.type = 'button';
  fitButton.className = 'asm-editor__toolbar-button';
  fitButton.textContent = 'Fit';
  fitButton.title = 'Zoom to fit all nodes';
  fitButton.addEventListener('click', () => zoomToFit());

  const layoutButton = document.createElement('button');
  layoutButton.type = 'button';
  layoutButton.className = 'asm-editor__toolbar-button';
  layoutButton.textContent = 'Layout';
  layoutButton.title = 'Auto-layout nodes';
  layoutButton.addEventListener('click', () => autoLayout());

  const undoRow = document.createElement('div');
  undoRow.className = 'asm-editor__undo-row';

  const undoButton = document.createElement('button');
  undoButton.type = 'button';
  undoButton.className = 'asm-editor__toolbar-button';
  undoButton.textContent = '↩';
  undoButton.title = 'Undo (Ctrl+Z)';
  undoButton.addEventListener('click', () => undo());

  const redoButton = document.createElement('button');
  redoButton.type = 'button';
  redoButton.className = 'asm-editor__toolbar-button';
  redoButton.textContent = '↪';
  redoButton.title = 'Redo (Ctrl+Y)';
  redoButton.addEventListener('click', () => redo());

  undoRow.appendChild(undoButton);
  undoRow.appendChild(redoButton);

  const simulateButton = document.createElement('button');
  simulateButton.type = 'button';
  simulateButton.className = 'asm-editor__toolbar-button';
  simulateButton.textContent = '▶ Simulate';
  simulateButton.title = 'Toggle simulation mode';
  simulateButton.addEventListener('click', () => toggleSimulate());

  toolbar.appendChild(backButton);
  toolbar.appendChild(titleEl);
  toolbar.appendChild(fitButton);
  toolbar.appendChild(layoutButton);
  toolbar.appendChild(undoRow);
  toolbar.appendChild(addStateButton);
  toolbar.appendChild(simulateButton);
  toolbar.appendChild(saveButton);

  // Canvas area
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'asm-editor__canvas-wrap';

  const canvas = document.createElement('canvas');
  canvas.className = 'asm-editor__canvas';
  canvasWrap.appendChild(canvas);

  // Overlay for empty-state invitation (shown when machine has 0 states)
  const emptyOverlay = document.createElement('div');
  emptyOverlay.style.cssText =
    'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;';
  canvasWrap.appendChild(emptyOverlay);
  let emptyStateShown = false;

  // Inspector panel (shown when state/transition selected)
  const inspector = document.createElement('div');
  inspector.className = 'asm-editor__inspector';
  inspector.style.display = 'none';

  root.appendChild(toolbar);
  root.appendChild(canvasWrap);
  root.appendChild(inspector);
  container.appendChild(root);

  const ctx = canvas.getContext('2d')!;

  const editorState: EditorState = {
    machine: null,
    isNew: true,
    selectedStateId: null,
    selectedTransitionId: null,
    panX: 0,
    panY: 0,
    zoom: 1,
    draggingStateId: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    creatingTransitionFrom: null,
    cursorX: 0,
    cursorY: 0,
    guideLines: [],
    simulating: false,
  };

  // Simulation state
  let simulator: SmSimulator | null = null;
  let simClock: AnimationClock | null = null;
  let simRafId = 0;
  let simLastTime = 0;
  let simPanel: HTMLElement | null = null;
  // Source image cache for sim animation preview
  const simImageCache = new Map<string, HTMLImageElement | 'loading' | 'error'>();

  // Undo/redo history
  const undoStack: HistoryEntry[] = [];
  const redoStack: HistoryEntry[] = [];

  // --- Poster Image Cache ---

  const posterCache = new Map<string, HTMLImageElement | 'loading' | 'error'>();

  function loadPosterImage(animationId: string, posterDataUrl: string): void {
    if (posterCache.has(animationId)) return;
    posterCache.set(animationId, 'loading');
    const img = new Image();
    img.onload = () => {
      posterCache.set(animationId, img);
      render();
    };
    img.onerror = () => {
      posterCache.set(animationId, 'error');
    };
    img.src = posterDataUrl;
  }

  // --- Canvas Sizing ---

  function resizeCanvas(): void {
    const rect = canvasWrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  // --- Canvas-to-World transform ---

  function screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - editorState.panX) / editorState.zoom,
      y: (sy - editorState.panY) / editorState.zoom,
    };
  }

  // --- Hit Testing ---

  function hitTestState(wx: number, wy: number): string | null {
    if (!editorState.machine) return null;
    for (let i = editorState.machine.states.length - 1; i >= 0; i--) {
      const state = editorState.machine.states[i];
      const halfW = NODE_WIDTH / 2;
      const halfH = NODE_HEIGHT / 2;
      if (
        wx >= state.position.x - halfW &&
        wx <= state.position.x + halfW &&
        wy >= state.position.y - halfH &&
        wy <= state.position.y + halfH
      ) {
        return state.id;
      }
    }
    return null;
  }

  function hitTestTransition(wx: number, wy: number): string | null {
    if (!editorState.machine) return null;
    const threshold = 12;

    for (const transition of editorState.machine.transitions) {
      const fromState = transition.fromStateId === '*'
        ? null
        : editorState.machine.states.find((s) => s.id === transition.fromStateId);
      const toState = editorState.machine.states.find((s) => s.id === transition.toStateId);
      if (!toState) continue;

      const fromX = fromState ? fromState.position.x : -200 + editorState.panX / editorState.zoom;
      const fromY = fromState ? fromState.position.y : 50;
      const toX = toState.position.x;
      const toY = toState.position.y;

      // Point-to-line-segment distance
      const dx = toX - fromX;
      const dy = toY - fromY;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;

      let t = ((wx - fromX) * dx + (wy - fromY) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const nearX = fromX + t * dx;
      const nearY = fromY + t * dy;
      const dist = Math.sqrt((wx - nearX) ** 2 + (wy - nearY) ** 2);

      if (dist < threshold) {
        return transition.id;
      }
    }

    return null;
  }

  // --- Rendering ---

  function drawGrid(): void {
    const { width, height } = canvas.getBoundingClientRect();
    const zoom = editorState.zoom;
    const spacing = GRID_SPACING * zoom;

    const offsetX = editorState.panX % spacing;
    const offsetY = editorState.panY % spacing;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    for (let x = offsetX; x < width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = offsetY; y < height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawNode(state: AnimState, isSelected: boolean, isInitial: boolean, isSimActive?: boolean): void {
    const { zoom, panX, panY } = editorState;
    const cx = state.position.x * zoom + panX;
    const cy = state.position.y * zoom + panY;
    const w = NODE_WIDTH * zoom;
    const h = NODE_HEIGHT * zoom;
    const r = NODE_RADIUS * zoom;

    // Node body
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
    if (isSimActive) {
      ctx.fillStyle = NODE_FILL_ACTIVE_SIM;
    } else {
      ctx.fillStyle = isSelected ? NODE_FILL_SELECTED : NODE_FILL;
    }
    ctx.fill();
    if (isSimActive) {
      ctx.strokeStyle = NODE_BORDER_ACTIVE_SIM;
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = isSelected ? NODE_BORDER_SELECTED : NODE_BORDER;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
    }
    ctx.stroke();

    // Initial state indicator — "▶ Start" arrow pointing into the node
    if (isInitial) {
      const arrowLen = 24 * zoom;
      const arrowTipX = cx - w / 2;
      const arrowTailX = arrowTipX - arrowLen;
      const arrowY = cy;
      const headSize = 7 * zoom;

      ctx.strokeStyle = NODE_INITIAL_INDICATOR;
      ctx.lineWidth = 2 * zoom;
      ctx.beginPath();
      ctx.moveTo(arrowTailX, arrowY);
      ctx.lineTo(arrowTipX, arrowY);
      ctx.stroke();

      ctx.fillStyle = NODE_INITIAL_INDICATOR;
      ctx.beginPath();
      ctx.moveTo(arrowTipX, arrowY);
      ctx.lineTo(arrowTipX - headSize, arrowY - headSize / 2);
      ctx.lineTo(arrowTipX - headSize, arrowY + headSize / 2);
      ctx.closePath();
      ctx.fill();

      // "Start" label
      ctx.fillStyle = NODE_INITIAL_INDICATOR;
      ctx.font = `bold ${Math.round(8 * zoom)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Start', arrowTailX + arrowLen / 2, arrowY - 2 * zoom);
    }

    const nameOffsetX = isInitial ? 8 * zoom : 0;

    // Look up animation and poster
    const animations = assetRegistry.getAnimations();
    const anim = animations.find((a) => a.id === state.animationId);

    // Trigger poster load if available
    if (anim?.posterDataUrl) {
      loadPosterImage(state.animationId, anim.posterDataUrl);
    }

    const cachedPoster = anim?.posterDataUrl ? posterCache.get(state.animationId) : undefined;
    const posterImg = cachedPoster instanceof HTMLImageElement ? cachedPoster : null;

    if (posterImg) {
      // Layout: thumbnail in top portion, state name below
      const thumbSize = 20 * zoom;
      const thumbX = cx + nameOffsetX - thumbSize / 2;
      const thumbY = cy - h / 2 + 4 * zoom;

      // Clip and draw thumbnail
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 3 * zoom);
      ctx.clip();
      ctx.drawImage(posterImg, thumbX, thumbY, thumbSize, thumbSize);
      ctx.restore();

      // State name below thumbnail
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.round(11 * zoom)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.name, cx + nameOffsetX, cy + 10 * zoom, w - 24 * zoom);
    } else {
      // Fallback: name + anim label text layout (existing)
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.round(12 * zoom)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.name, cx + nameOffsetX, cy - 6 * zoom, w - 24 * zoom);

      const animLabel = anim ? anim.name : (state.animationId || 'No anim');
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = `${Math.round(10 * zoom)}px system-ui, sans-serif`;
      ctx.fillText(animLabel, cx + nameOffsetX, cy + 10 * zoom, w - 24 * zoom);
    }
  }

  function drawAnyStateNode(): void {
    const { zoom, panX, panY } = editorState;
    const cx = -200 * zoom + panX;
    const cy = 50 * zoom + panY;
    const w = 120 * zoom;
    const h = 36 * zoom;
    const r = 18 * zoom;

    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
    ctx.fillStyle = ANY_STATE_FILL;
    ctx.fill();
    ctx.strokeStyle = ANY_STATE_BORDER;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `${Math.round(11 * zoom)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Any State', cx, cy);
  }

  function drawArrow(
    fromX: number, fromY: number,
    toX: number, toY: number,
    isSelected: boolean,
    label?: string
  ): void {
    const { zoom, panX, panY } = editorState;
    const x1 = fromX * zoom + panX;
    const y1 = fromY * zoom + panY;
    const x2 = toX * zoom + panX;
    const y2 = toY * zoom + panY;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;

    const ux = dx / len;
    const uy = dy / len;

    // Shorten to not overlap node
    const nodeRadius = (NODE_HEIGHT / 2) * zoom;
    const sx = x1 + ux * nodeRadius;
    const sy = y1 + uy * nodeRadius;
    const ex = x2 - ux * nodeRadius;
    const ey = y2 - uy * nodeRadius;

    ctx.strokeStyle = isSelected ? ARROW_SELECTED : ARROW_COLOR;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Arrowhead
    const arrowSize = 10 * zoom;
    const angle = Math.atan2(ey - sy, ex - sx);
    ctx.fillStyle = isSelected ? ARROW_SELECTED : ARROW_COLOR;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(
      ex - arrowSize * Math.cos(angle - Math.PI / 6),
      ey - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      ex - arrowSize * Math.cos(angle + Math.PI / 6),
      ey - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    // Condition chip pill at arrow midpoint
    if (label) {
      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2;
      const fontSize = Math.max(8, Math.round(9 * zoom));
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
      const textW = ctx.measureText(label).width;
      const padX = 6 * zoom;
      const padY = 3 * zoom;
      const chipW = textW + padX * 2;
      const chipH = fontSize + padY * 2;
      const chipR = chipH / 2;
      const chipX = midX - chipW / 2;
      const chipY = midY - chipH / 2 - 2 * zoom;

      ctx.fillStyle = CHIP_BG;
      ctx.strokeStyle = CHIP_BORDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(chipX, chipY, chipW, chipH, chipR);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = CHIP_TEXT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, midX, chipY + chipH / 2);
    }
  }

  function getConditionLabel(condition: TransitionCondition): string {
    switch (condition.type) {
      case 'always': return 'always';
      case 'animComplete': return 'anim done';
      case 'exitTime': return `exit @${Math.round(condition.normalizedTime * 100)}%`;
      case 'event': return `on: ${condition.eventId}`;
      case 'state': return `${condition.stateId} ${condition.operator} ${condition.value}`;
      default: return '?';
    }
  }

  function render(): void {
    const { width, height } = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);

    drawGrid();

    if (!editorState.machine) {
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No state machine loaded', width / 2, height / 2);
      return;
    }

    const machine = editorState.machine;
    const hasWildcards = machine.transitions.some((t) => t.fromStateId === '*');

    // Draw "Any State" node if there are wildcard transitions
    if (hasWildcards) {
      drawAnyStateNode();
    }

    // Draw transitions
    for (const transition of machine.transitions) {
      const fromState = transition.fromStateId === '*'
        ? null
        : machine.states.find((s) => s.id === transition.fromStateId);
      const toState = machine.states.find((s) => s.id === transition.toStateId);
      if (!toState) continue;

      const fromX = fromState ? fromState.position.x : -200;
      const fromY = fromState ? fromState.position.y : 50;
      const isSelected = editorState.selectedTransitionId === transition.id;
      const label = getConditionLabel(transition.condition);

      drawArrow(fromX, fromY, toState.position.x, toState.position.y, isSelected, label);
    }

    // Draw in-progress transition creation
    if (editorState.creatingTransitionFrom) {
      const fromState = machine.states.find((s) => s.id === editorState.creatingTransitionFrom);
      if (fromState) {
        const world = screenToWorld(editorState.cursorX, editorState.cursorY);
        drawArrow(fromState.position.x, fromState.position.y, world.x, world.y, true);
      }
    }

    // Draw state nodes
    const simActiveId = editorState.simulating ? (simulator?.getCurrentStateId() ?? null) : null;
    for (const state of machine.states) {
      const isSelected = !editorState.simulating && editorState.selectedStateId === state.id;
      const isInitial = state.id === machine.initialStateId;
      const isSimActive = state.id === simActiveId;
      drawNode(state, isSelected, isInitial, isSimActive);
    }

    // Draw alignment guides
    if (editorState.guideLines.length > 0) {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.strokeStyle = 'rgba(74, 200, 255, 0.75)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      for (const guide of editorState.guideLines) {
        if (guide.type === 'v') {
          const sx = guide.value * editorState.zoom + editorState.panX;
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx, height);
          ctx.stroke();
        } else {
          const sy = guide.value * editorState.zoom + editorState.panY;
          ctx.beginPath();
          ctx.moveTo(0, sy);
          ctx.lineTo(width, sy);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }

    // Sync empty-state overlay
    const shouldShowEmpty = Boolean(editorState.machine && editorState.machine.states.length === 0);
    if (shouldShowEmpty !== emptyStateShown) {
      emptyStateShown = shouldShowEmpty;
      if (shouldShowEmpty) {
        emptyOverlay.style.pointerEvents = '';
        uxFeedback.emptyState.render(emptyOverlay, {
          message: 'No states yet.',
          actionLabel: 'Add State',
          onAction: () => addNewState(),
        });
      } else {
        uxFeedback.emptyState.clear(emptyOverlay);
        emptyOverlay.style.pointerEvents = 'none';
      }
    }
  }

  // --- Interaction ---

  let pointerDown = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let isPanning = false;

  function onPointerDown(e: PointerEvent): void {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    pointerDown = true;
    lastPointerX = sx;
    lastPointerY = sy;
    isPanning = false;

    canvas.setPointerCapture(e.pointerId);

    // Check if we hit a state node
    const hitState = hitTestState(world.x, world.y);
    if (hitState) {
      const state = editorState.machine?.states.find((s) => s.id === hitState);
      if (state) {
        editorState.draggingStateId = hitState;
        editorState.dragOffsetX = world.x - state.position.x;
        editorState.dragOffsetY = world.y - state.position.y;
      }
      editorState.selectedStateId = hitState;
      editorState.selectedTransitionId = null;
      renderInspector();
      render();
      return;
    }

    // Check if we hit a transition
    const hitTransition = hitTestTransition(world.x, world.y);
    if (hitTransition) {
      editorState.selectedStateId = null;
      editorState.selectedTransitionId = hitTransition;
      renderInspector();
      render();
      return;
    }

    // Clear selection and start panning
    editorState.selectedStateId = null;
    editorState.selectedTransitionId = null;
    isPanning = true;
    renderInspector();
    render();
  }

  function onPointerMove(e: PointerEvent): void {
    if (!pointerDown) return;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const dx = sx - lastPointerX;
    const dy = sy - lastPointerY;

    if (editorState.creatingTransitionFrom) {
      editorState.cursorX = sx;
      editorState.cursorY = sy;
      render();
      lastPointerX = sx;
      lastPointerY = sy;
      return;
    }

    if (editorState.draggingStateId && editorState.machine) {
      const world = screenToWorld(sx, sy);
      const state = editorState.machine.states.find((s) => s.id === editorState.draggingStateId);
      if (state) {
        let rawX = world.x - editorState.dragOffsetX;
        let rawY = world.y - editorState.dragOffsetY;

        // Snap to 16px grid
        rawX = Math.round(rawX / SNAP_SIZE) * SNAP_SIZE;
        rawY = Math.round(rawY / SNAP_SIZE) * SNAP_SIZE;

        state.position.x = rawX;
        state.position.y = rawY;

        // Alignment guides — check centre and edges against other nodes
        const guides: { type: 'h' | 'v'; value: number }[] = [];
        for (const other of editorState.machine.states) {
          if (other.id === editorState.draggingStateId) continue;
          // Centre alignment
          if (Math.abs(rawX - other.position.x) <= GUIDE_THRESHOLD) {
            guides.push({ type: 'v', value: other.position.x });
            state.position.x = other.position.x;
          }
          if (Math.abs(rawY - other.position.y) <= GUIDE_THRESHOLD) {
            guides.push({ type: 'h', value: other.position.y });
            state.position.y = other.position.y;
          }
          // Edge alignment (left/right edges)
          const dragLeft = rawX - NODE_WIDTH / 2;
          const dragRight = rawX + NODE_WIDTH / 2;
          const otherLeft = other.position.x - NODE_WIDTH / 2;
          const otherRight = other.position.x + NODE_WIDTH / 2;
          if (Math.abs(dragLeft - otherLeft) <= GUIDE_THRESHOLD) {
            guides.push({ type: 'v', value: otherLeft });
            state.position.x = otherLeft + NODE_WIDTH / 2;
          } else if (Math.abs(dragRight - otherRight) <= GUIDE_THRESHOLD) {
            guides.push({ type: 'v', value: otherRight });
            state.position.x = otherRight - NODE_WIDTH / 2;
          }
          // Edge alignment (top/bottom)
          const dragTop = rawY - NODE_HEIGHT / 2;
          const dragBottom = rawY + NODE_HEIGHT / 2;
          const otherTop = other.position.y - NODE_HEIGHT / 2;
          const otherBottom = other.position.y + NODE_HEIGHT / 2;
          if (Math.abs(dragTop - otherTop) <= GUIDE_THRESHOLD) {
            guides.push({ type: 'h', value: otherTop });
            state.position.y = otherTop + NODE_HEIGHT / 2;
          } else if (Math.abs(dragBottom - otherBottom) <= GUIDE_THRESHOLD) {
            guides.push({ type: 'h', value: otherBottom });
            state.position.y = otherBottom - NODE_HEIGHT / 2;
          }
        }
        editorState.guideLines = guides;
        render();
      }
    } else if (isPanning) {
      editorState.panX += dx;
      editorState.panY += dy;
      render();
    }

    lastPointerX = sx;
    lastPointerY = sy;
  }

  function onPointerUp(e: PointerEvent): void {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (editorState.creatingTransitionFrom) {
      const world = screenToWorld(sx, sy);
      const targetState = hitTestState(world.x, world.y);
      if (targetState && targetState !== editorState.creatingTransitionFrom) {
        addTransition(editorState.creatingTransitionFrom, targetState);
      }
      editorState.creatingTransitionFrom = null;
      render();
    }

    pointerDown = false;
    editorState.draggingStateId = null;
    editorState.guideLines = [];
    isPanning = false;
    canvas.releasePointerCapture(e.pointerId);
    render();
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(3, editorState.zoom * delta));

    // Zoom toward pointer position
    editorState.panX = sx - (sx - editorState.panX) * (newZoom / editorState.zoom);
    editorState.panY = sy - (sy - editorState.panY) * (newZoom / editorState.zoom);
    editorState.zoom = newZoom;

    render();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  function onKeyDown(e: KeyboardEvent): void {
    // Only fire when focus is within our editor root
    if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;

    if (e.key === 'Escape') {
      if (editorState.simulating) {
        exitSimMode();
      } else {
        editorState.selectedStateId = null;
        editorState.selectedTransitionId = null;
        editorState.creatingTransitionFrom = null;
        renderInspector();
        render();
      }
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Don't fire when an input is focused
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (editorState.selectedStateId) {
        removeSelectedState();
      } else if (editorState.selectedTransitionId) {
        removeSelectedTransition();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      redo();
      return;
    }
  }

  document.addEventListener('keydown', onKeyDown);

  const resizeObserver = new ResizeObserver(() => resizeCanvas());
  resizeObserver.observe(canvasWrap);

  // --- Undo/Redo ---

  function pushHistory(): void {
    if (!editorState.machine) return;
    const entry: HistoryEntry = {
      states: editorState.machine.states.map((s) => ({ ...s, position: { ...s.position } })),
      transitions: editorState.machine.transitions.map((t) => ({ ...t, condition: { ...t.condition } as TransitionCondition })),
      initialStateId: editorState.machine.initialStateId,
    };
    undoStack.push(entry);
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
    uxFeedback.storage.markDirty(saveButton);
  }

  function applyHistory(entry: HistoryEntry): void {
    if (!editorState.machine) return;
    editorState.machine.states = entry.states.map((s) => ({ ...s, position: { ...s.position } }));
    editorState.machine.transitions = entry.transitions.map((t) => ({ ...t, condition: { ...t.condition } as TransitionCondition }));
    editorState.machine.initialStateId = entry.initialStateId;
    editorState.selectedStateId = null;
    editorState.selectedTransitionId = null;
    renderInspector();
    render();
  }

  function undo(): void {
    if (!editorState.machine || undoStack.length === 0) return;
    const current: HistoryEntry = {
      states: editorState.machine.states.map((s) => ({ ...s, position: { ...s.position } })),
      transitions: editorState.machine.transitions.map((t) => ({ ...t, condition: { ...t.condition } as TransitionCondition })),
      initialStateId: editorState.machine.initialStateId,
    };
    redoStack.push(current);
    const prev = undoStack.pop()!;
    applyHistory(prev);
  }

  function redo(): void {
    if (!editorState.machine || redoStack.length === 0) return;
    const current: HistoryEntry = {
      states: editorState.machine.states.map((s) => ({ ...s, position: { ...s.position } })),
      transitions: editorState.machine.transitions.map((t) => ({ ...t, condition: { ...t.condition } as TransitionCondition })),
      initialStateId: editorState.machine.initialStateId,
    };
    undoStack.push(current);
    const next = redoStack.pop()!;
    applyHistory(next);
  }

  // --- Zoom to Fit ---

  function zoomToFit(): void {
    if (!editorState.machine || editorState.machine.states.length === 0) return;

    const padding = 60;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const state of editorState.machine.states) {
      minX = Math.min(minX, state.position.x - NODE_WIDTH / 2);
      minY = Math.min(minY, state.position.y - NODE_HEIGHT / 2);
      maxX = Math.max(maxX, state.position.x + NODE_WIDTH / 2);
      maxY = Math.max(maxY, state.position.y + NODE_HEIGHT / 2);
    }

    const { width, height } = canvas.getBoundingClientRect();
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;

    const zoom = Math.max(0.2, Math.min(3, Math.min(width / contentW, height / contentH)));
    editorState.zoom = zoom;
    editorState.panX = width / 2 - ((minX + maxX) / 2) * zoom;
    editorState.panY = height / 2 - ((minY + maxY) / 2) * zoom;

    render();
  }

  // --- Auto Layout ---

  function autoLayout(): void {
    if (!editorState.machine || editorState.machine.states.length === 0) return;

    pushHistory();

    const states = editorState.machine.states;
    const transitions = editorState.machine.transitions;

    // Build adjacency for topological sort
    const inDegree = new Map<string, number>();
    const children = new Map<string, string[]>();
    for (const s of states) {
      inDegree.set(s.id, 0);
      children.set(s.id, []);
    }
    for (const t of transitions) {
      if (t.fromStateId === '*') continue;
      const from = t.fromStateId as string;
      if (!children.has(from)) continue;
      children.get(from)!.push(t.toStateId);
      inDegree.set(t.toStateId, (inDegree.get(t.toStateId) ?? 0) + 1);
    }

    // Kahn's algorithm — if cycles remain, fall back to force-directed grid
    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }
    // Ensure initial state is first
    const initIdx = queue.indexOf(editorState.machine.initialStateId);
    if (initIdx > 0) {
      queue.splice(initIdx, 1);
      queue.unshift(editorState.machine.initialStateId);
    }

    const layers: string[][] = [];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const layer: string[] = [];
      const nextQueue: string[] = [];
      for (const id of queue) {
        if (visited.has(id)) continue;
        visited.add(id);
        layer.push(id);
        for (const child of (children.get(id) ?? [])) {
          const deg = (inDegree.get(child) ?? 1) - 1;
          inDegree.set(child, deg);
          if (deg === 0) nextQueue.push(child);
        }
      }
      if (layer.length > 0) layers.push(layer);
      queue.length = 0;
      queue.push(...nextQueue);
    }

    // Place visited nodes in layers
    const COL_W = NODE_WIDTH + 60;
    const ROW_H = NODE_HEIGHT + 50;
    const startX = 120;
    const startY = 120;

    const positioned = new Set<string>();
    for (let col = 0; col < layers.length; col++) {
      const layer = layers[col];
      for (let row = 0; row < layer.length; row++) {
        const state = states.find((s) => s.id === layer[row]);
        if (!state) continue;
        state.position.x = startX + col * COL_W;
        state.position.y = startY + row * ROW_H;
        positioned.add(layer[row]);
      }
    }

    // Any nodes not reached (cycles) — place in a row below
    const unpositioned = states.filter((s) => !positioned.has(s.id));
    for (let i = 0; i < unpositioned.length; i++) {
      unpositioned[i].position.x = startX + i * COL_W;
      unpositioned[i].position.y = startY + layers.length * ROW_H;
    }

    // Smooth animation to new positions
    const targets = new Map<string, { x: number; y: number }>();
    for (const s of states) {
      targets.set(s.id, { x: s.position.x, y: s.position.y });
    }
    // Reset to pre-layout positions (already captured in history)
    // Actually we mutated above, so just animate from current to same (positions already set)
    render();
  }

  // --- Simulation Mode ---

  function buildSimPanel(): void {
    if (simPanel) simPanel.remove();

    simPanel = document.createElement('div');
    simPanel.className = 'asm-editor__sim-panel';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
    const label = document.createElement('div');
    label.className = 'asm-editor__sim-label';
    label.textContent = 'Simulation';
    const stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.className = 'irs-btn irs-btn--danger asm-editor__sim-reset-btn';
    stopBtn.textContent = '■ Stop';
    stopBtn.addEventListener('click', () => {
      uxFeedback.motion.pulse(stopBtn);
      exitSimMode();
    });
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'irs-btn irs-btn--secondary asm-editor__sim-reset-btn';
    resetBtn.textContent = '↺ Reset';
    resetBtn.style.borderColor = 'rgba(74, 158, 255, 0.4)';
    resetBtn.style.color = '#a8c8ff';
    resetBtn.style.background = 'rgba(74, 158, 255, 0.08)';
    resetBtn.addEventListener('click', () => {
      uxFeedback.motion.pulse(resetBtn);
      simulator?.reset();
      simClock?.reset();
      refreshSimPanel();
      render();
    });
    labelRow.appendChild(label);
    labelRow.appendChild(stopBtn);
    labelRow.appendChild(resetBtn);
    simPanel.appendChild(labelRow);

    refreshSimPanel();
    root.appendChild(simPanel);
  }

  function refreshSimPanel(): void {
    if (!simPanel || !simulator || !editorState.machine) return;

    // Remove everything after the label row (first child)
    while (simPanel.children.length > 1) {
      simPanel.removeChild(simPanel.lastChild!);
    }

    // Current state display
    const currentId = simulator.getCurrentStateId();
    const currentState = editorState.machine.states.find((s) => s.id === currentId);
    const stateEl = document.createElement('div');
    stateEl.className = 'asm-editor__sim-state';
    stateEl.textContent = currentState ? `Active: ${currentState.name}` : 'Active: (none)';
    simPanel.appendChild(stateEl);

    // Animation preview
    if (currentState?.animationId) {
      const animations = assetRegistry.getAnimations();
      const anim = animations.find((a) => a.id === currentState.animationId);
      if (anim && simClock) {
        simClock.register(anim.id, anim);
        const animRow = document.createElement('div');
        animRow.className = 'asm-editor__sim-anim-row';

        const simCanvas = document.createElement('canvas');
        simCanvas.className = 'asm-editor__sim-anim-canvas';
        const dpr = window.devicePixelRatio || 1;
        simCanvas.width = 56 * dpr;
        simCanvas.height = 56 * dpr;
        animRow.appendChild(simCanvas);
        drawSimAnimFrame(simCanvas, anim.id);

        const animInfo = document.createElement('div');
        animInfo.className = 'asm-editor__sim-anim-info';
        animInfo.innerHTML = `<strong>${anim.name}</strong><br>${anim.frames.length} frames · ${anim.fps} fps`;
        animRow.appendChild(animInfo);

        simPanel.appendChild(animRow);
      }
    }

    // Event buttons
    const eventNames = simulator.getUniqueEventNames();
    if (eventNames.length > 0) {
      const eventsLabel = document.createElement('div');
      eventsLabel.className = 'asm-editor__sim-label';
      eventsLabel.textContent = 'Send Event';
      eventsLabel.style.marginTop = '4px';
      simPanel.appendChild(eventsLabel);

      const eventsRow = document.createElement('div');
      eventsRow.className = 'asm-editor__sim-events';
      for (const name of eventNames) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'irs-btn irs-btn--secondary asm-editor__sim-event-btn';
        btn.textContent = name;
        btn.addEventListener('click', () => {
          uxFeedback.motion.pulse(btn);
          simulator?.sendEvent(name);
        });
        eventsRow.appendChild(btn);
      }
      simPanel.appendChild(eventsRow);
    }
  }

  function drawSimAnimFrame(simCanvas: HTMLCanvasElement, animationId: string): void {
    const ctx2 = simCanvas.getContext('2d');
    if (!ctx2 || !simClock) return;

    const snapshot = simClock.getCurrentFrameSnapshot(animationId);
    if (!snapshot) return;

    const { frame } = snapshot;
    const w = simCanvas.width;
    const h = simCanvas.height;
    ctx2.clearRect(0, 0, w, h);

    const asset = assetRegistry.getAsset(frame.sourceAssetId);
    if (!asset) return;

    const cached = simImageCache.get(frame.sourceAssetId);
    if (cached instanceof HTMLImageElement) {
      ctx2.drawImage(cached, frame.rect.x, frame.rect.y, frame.rect.w, frame.rect.h, 0, 0, w, h);
    } else if (cached !== 'loading' && cached !== 'error') {
      // Start loading
      simImageCache.set(frame.sourceAssetId, 'loading');
      const img = new Image();
      img.onload = () => {
        simImageCache.set(frame.sourceAssetId, img);
      };
      img.onerror = () => {
        simImageCache.set(frame.sourceAssetId, 'error');
      };
      img.src = asset.dataUrl;
    }
  }

  function tickSimLoop(time: number): void {
    if (!editorState.simulating || !simulator || !simClock) return;

    const deltaMs = simLastTime === 0 ? 0 : time - simLastTime;
    simLastTime = time;

    const dirty = simClock.tick(deltaMs);
    if (dirty.size > 0 || deltaMs > 0) {
      // Advance simulator
      const currentId = simulator.getCurrentStateId();
      const anim = assetRegistry.getAnimations().find((a) => {
        const state = editorState.machine?.states.find((s) => s.id === currentId);
        return state && a.id === state.animationId;
      });
      const totalDuration = anim ? (anim.frames.length / anim.fps) * 1000 : undefined;
      simulator.tick(deltaMs, totalDuration);

      const newId = simulator.getCurrentStateId();
      if (newId !== currentId) {
        // State changed — refresh panel and re-register animation
        refreshSimPanel();
      }

      render();

      // Redraw sim canvas if it exists
      if (simPanel && currentId && anim) {
        const simCanvas = simPanel.querySelector('.asm-editor__sim-anim-canvas') as HTMLCanvasElement | null;
        if (simCanvas) drawSimAnimFrame(simCanvas, anim.id);
      }
    }

    simRafId = requestAnimationFrame(tickSimLoop);
  }

  function enterSimMode(): void {
    if (!editorState.machine) return;
    editorState.simulating = true;
    editorState.selectedStateId = null;
    editorState.selectedTransitionId = null;
    inspector.style.display = 'none';

    simulator = createSmSimulator(editorState.machine);
    simClock = createAnimationClock();
    simLastTime = 0;
    simImageCache.clear();

    simulateButton.className = 'asm-editor__toolbar-button asm-editor__toolbar-button--active';
    simulateButton.textContent = '■ Simulating';

    buildSimPanel();
    render();

    simRafId = requestAnimationFrame(tickSimLoop);
  }

  function exitSimMode(): void {
    editorState.simulating = false;
    cancelAnimationFrame(simRafId);
    simClock?.destroy();
    simClock = null;
    simulator = null;
    simLastTime = 0;

    simPanel?.remove();
    simPanel = null;

    simulateButton.className = 'asm-editor__toolbar-button';
    simulateButton.textContent = '▶ Simulate';

    render();
  }

  function toggleSimulate(): void {
    if (editorState.simulating) {
      exitSimMode();
    } else {
      enterSimMode();
    }
  }

  // --- State Management ---

  function addNewState(): void {
    if (!editorState.machine) return;
    pushHistory();
    uxFeedback.motion.pulse(addStateButton);

    const id = generateId();
    const existingCount = editorState.machine.states.length;
    const newState: AnimState = {
      id,
      name: `State ${existingCount + 1}`,
      animationId: '',
      loop: true,
      position: {
        x: 100 + (existingCount % 4) * 180,
        y: 100 + Math.floor(existingCount / 4) * 120,
      },
    };

    editorState.machine.states.push(newState);

    // If this is the first state, make it the initial state
    if (editorState.machine.states.length === 1) {
      editorState.machine.initialStateId = id;
    }

    editorState.selectedStateId = id;
    editorState.selectedTransitionId = null;
    renderInspector();
    render();
  }

  function addTransition(fromStateId: string, toStateId: string): void {
    if (!editorState.machine) return;
    pushHistory();

    const transition: AnimTransition = {
      id: generateId(),
      fromStateId,
      toStateId,
      condition: { type: 'always' },
      priority: 0,
    };

    editorState.machine.transitions.push(transition);
    editorState.selectedStateId = null;
    editorState.selectedTransitionId = transition.id;
    uxFeedback.toast.info('Transition added.');
    renderInspector();
    render();
  }

  function removeSelectedState(): void {
    if (!editorState.machine || !editorState.selectedStateId) return;

    pushHistory();

    const stateId = editorState.selectedStateId;
    editorState.machine.states = editorState.machine.states.filter((s) => s.id !== stateId);
    editorState.machine.transitions = editorState.machine.transitions.filter(
      (t) => t.fromStateId !== stateId && t.toStateId !== stateId
    );

    // Fix initial state if deleted
    if (editorState.machine.initialStateId === stateId) {
      editorState.machine.initialStateId = editorState.machine.states[0]?.id ?? '';
    }

    uxFeedback.undo.show('State removed.', () => undo(), { destructive: true });
    editorState.selectedStateId = null;
    renderInspector();
    render();
  }

  function removeSelectedTransition(): void {
    if (!editorState.machine || !editorState.selectedTransitionId) return;

    pushHistory();

    editorState.machine.transitions = editorState.machine.transitions.filter(
      (t) => t.id !== editorState.selectedTransitionId
    );

    uxFeedback.undo.show('Transition removed.', () => undo());
    editorState.selectedTransitionId = null;
    renderInspector();
    render();
  }

  function startTransitionCreation(): void {
    if (!editorState.selectedStateId) return;
    editorState.creatingTransitionFrom = editorState.selectedStateId;
  }

  // --- Inspector ---

  function renderInspector(): void {
    inspector.innerHTML = '';

    if (editorState.selectedStateId && editorState.machine) {
      renderStateInspector();
      inspector.style.display = '';
    } else if (editorState.selectedTransitionId && editorState.machine) {
      renderTransitionInspector();
      inspector.style.display = '';
    } else {
      inspector.style.display = 'none';
    }
  }

  function renderStateInspector(): void {
    if (!editorState.machine || !editorState.selectedStateId) return;

    const state = editorState.machine.states.find((s) => s.id === editorState.selectedStateId);
    if (!state) return;

    const title = document.createElement('div');
    title.className = 'asm-editor__inspector-title';
    title.textContent = 'State Properties';
    inspector.appendChild(title);

    // Name field
    const nameField = createField('Name', state.name, (value) => {
      state.name = value;
      render();
    });
    inspector.appendChild(nameField);

    // Animation dropdown
    const animations = assetRegistry.getAnimations();
    const animField = createSelectField(
      'Animation',
      [{ value: '', label: 'None' }, ...animations.map((a) => ({ value: a.id, label: a.name }))],
      state.animationId,
      (value) => {
        state.animationId = value;
        render();
      }
    );
    inspector.appendChild(animField);

    // Loop checkbox
    const loopField = createCheckboxField('Loop', state.loop, (value) => {
      state.loop = value;
    });
    inspector.appendChild(loopField);

    // Set as initial
    const isInitial = editorState.machine.initialStateId === state.id;
    if (!isInitial) {
      const setInitialBtn = document.createElement('button');
      setInitialBtn.type = 'button';
      setInitialBtn.className = 'asm-editor__toolbar-button';
      setInitialBtn.textContent = 'Set as Initial State';
      setInitialBtn.addEventListener('click', () => {
        if (editorState.machine) {
          editorState.machine.initialStateId = state.id;
          render();
          renderInspector();
        }
      });
      inspector.appendChild(setInitialBtn);
    }

    // Create transition button
    const createTransBtn = document.createElement('button');
    createTransBtn.type = 'button';
    createTransBtn.className = 'asm-editor__toolbar-button';
    createTransBtn.textContent = 'Drag to Create Transition';
    createTransBtn.addEventListener('click', () => {
      uxFeedback.motion.pulse(createTransBtn);
      startTransitionCreation();
    });
    inspector.appendChild(createTransBtn);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'asm-editor__toolbar-button';
    deleteBtn.textContent = 'Delete State';
    deleteBtn.style.color = '#ff9fb3';
    deleteBtn.addEventListener('click', () => {
      uxFeedback.motion.pulse(deleteBtn);
      removeSelectedState();
    });
    inspector.appendChild(deleteBtn);
  }

  function renderTransitionInspector(): void {
    if (!editorState.machine || !editorState.selectedTransitionId) return;

    const transition = editorState.machine.transitions.find(
      (t) => t.id === editorState.selectedTransitionId
    );
    if (!transition) return;

    const title = document.createElement('div');
    title.className = 'asm-editor__inspector-title';
    title.textContent = 'Transition Properties';
    inspector.appendChild(title);

    // From state (read-only)
    const fromLabel = transition.fromStateId === '*'
      ? 'Any State'
      : editorState.machine.states.find((s) => s.id === transition.fromStateId)?.name ?? transition.fromStateId;
    const toLabel = editorState.machine.states.find((s) => s.id === transition.toStateId)?.name ?? transition.toStateId;

    const routeField = document.createElement('div');
    routeField.className = 'asm-editor__field';
    const routeLabelEl = document.createElement('div');
    routeLabelEl.className = 'asm-editor__field-label';
    routeLabelEl.textContent = `${fromLabel} \u2192 ${toLabel}`;
    routeField.appendChild(routeLabelEl);
    inspector.appendChild(routeField);

    // Condition type
    const conditionTypes = [
      { value: 'always', label: 'Always (immediate)' },
      { value: 'animComplete', label: 'Animation Complete' },
      { value: 'exitTime', label: 'Exit Time (normalized)' },
      { value: 'event', label: 'On Event' },
      { value: 'state', label: 'State Condition' },
    ];

    const condTypeField = createSelectField(
      'Condition Type',
      conditionTypes,
      transition.condition.type,
      (value) => {
        switch (value) {
          case 'always':
            transition.condition = { type: 'always' };
            break;
          case 'animComplete':
            transition.condition = { type: 'animComplete' };
            break;
          case 'exitTime':
            transition.condition = { type: 'exitTime', normalizedTime: 0.9 };
            break;
          case 'event':
            transition.condition = { type: 'event', eventId: '' };
            break;
          case 'state':
            transition.condition = { type: 'state', stateId: '', operator: '==', value: true };
            break;
        }
        renderInspector();
        render();
      }
    );
    inspector.appendChild(condTypeField);

    // Condition-specific fields
    if (transition.condition.type === 'exitTime') {
      const exitTimeField = createField(
        'Normalized Time (0-1)',
        String(transition.condition.normalizedTime),
        (value) => {
          const num = parseFloat(value);
          if (!isNaN(num) && transition.condition.type === 'exitTime') {
            transition.condition = { type: 'exitTime', normalizedTime: Math.max(0, Math.min(1, num)) };
            render();
          }
        }
      );
      inspector.appendChild(exitTimeField);
    }

    if (transition.condition.type === 'event') {
      const eventIdField = createField(
        'Event ID',
        transition.condition.eventId,
        (value) => {
          if (transition.condition.type === 'event') {
            transition.condition = { type: 'event', eventId: value };
            render();
          }
        }
      );
      inspector.appendChild(eventIdField);
    }

    if (transition.condition.type === 'state') {
      const stateIdField = createField(
        'State ID',
        transition.condition.stateId,
        (value) => {
          if (transition.condition.type === 'state') {
            transition.condition = { ...transition.condition, stateId: value };
            render();
          }
        }
      );
      inspector.appendChild(stateIdField);

      const operatorField = createSelectField(
        'Operator',
        [
          { value: '==', label: 'Equals (==)' },
          { value: '!=', label: 'Not Equals (!=)' },
          { value: '>', label: 'Greater Than (>)' },
          { value: '<', label: 'Less Than (<)' },
        ],
        transition.condition.operator,
        (value) => {
          if (transition.condition.type === 'state') {
            transition.condition = {
              ...transition.condition,
              operator: value as '==' | '!=' | '>' | '<',
            };
            render();
          }
        }
      );
      inspector.appendChild(operatorField);

      const valueField = createField(
        'Value',
        String(transition.condition.value),
        (value) => {
          if (transition.condition.type === 'state') {
            // Try to parse as number or boolean
            let parsed: string | number | boolean = value;
            if (value === 'true') parsed = true;
            else if (value === 'false') parsed = false;
            else if (!isNaN(Number(value)) && value.trim() !== '') parsed = Number(value);
            transition.condition = { ...transition.condition, value: parsed };
            render();
          }
        }
      );
      inspector.appendChild(valueField);
    }

    // Priority
    const priorityField = createField(
      'Priority',
      String(transition.priority),
      (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
          transition.priority = num;
          render();
        }
      }
    );
    inspector.appendChild(priorityField);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'asm-editor__toolbar-button';
    deleteBtn.textContent = 'Delete Transition';
    deleteBtn.style.color = '#ff9fb3';
    deleteBtn.addEventListener('click', () => {
      uxFeedback.motion.pulse(deleteBtn);
      removeSelectedTransition();
    });
    inspector.appendChild(deleteBtn);
  }

  // --- Field helpers ---

  function createField(
    label: string,
    value: string,
    onChange: (value: string) => void
  ): HTMLElement {
    const field = document.createElement('div');
    field.className = 'asm-editor__field';

    const labelEl = document.createElement('label');
    labelEl.className = 'asm-editor__field-label';
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.className = 'irs-input asm-editor__field-input';
    input.type = 'text';
    input.value = value;
    input.addEventListener('change', () => onChange(input.value));

    field.appendChild(labelEl);
    field.appendChild(input);
    return field;
  }

  function createSelectField(
    label: string,
    options: Array<{ value: string; label: string }>,
    value: string,
    onChange: (value: string) => void
  ): HTMLElement {
    const field = document.createElement('div');
    field.className = 'asm-editor__field';

    const labelEl = document.createElement('label');
    labelEl.className = 'asm-editor__field-label';
    labelEl.textContent = label;

    const select = document.createElement('select');
    select.className = 'asm-editor__field-select';

    for (const opt of options) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    }
    select.value = value;
    select.addEventListener('change', () => onChange(select.value));

    field.appendChild(labelEl);
    field.appendChild(select);
    return field;
  }

  function createCheckboxField(
    label: string,
    checked: boolean,
    onChange: (value: boolean) => void
  ): HTMLElement {
    const field = document.createElement('div');
    field.className = 'asm-editor__field';

    const wrapper = document.createElement('label');
    wrapper.className = 'asm-editor__field-checkbox';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.addEventListener('change', () => onChange(checkbox.checked));

    const text = document.createTextNode(label);
    wrapper.appendChild(checkbox);
    wrapper.appendChild(text);
    field.appendChild(wrapper);
    return field;
  }

  // --- Save ---

  function saveMachine(): void {
    if (!editorState.machine) return;

    const machine = editorState.machine;

    if (editorState.isNew) {
      const saved = assetRegistry.addAnimStateMachine({
        name: machine.name,
        initialStateId: machine.initialStateId,
        states: machine.states,
        transitions: machine.transitions,
      });
      editorState.machine = { ...saved };
      editorState.isNew = false;
      titleEl.textContent = saved.name;
    } else {
      const saved = assetRegistry.updateAnimStateMachine(machine.id, {
        name: machine.name,
        initialStateId: machine.initialStateId,
        states: machine.states,
        transitions: machine.transitions,
      });
      if (saved) {
        editorState.machine = { ...saved };
        titleEl.textContent = saved.name;
      }
    }

    uxFeedback.combos.saved(saveButton, 'State machine saved.');
    config.onSave?.(editorState.machine!);
  }

  // --- API ---

  function openStateMachine(stateMachineId: string): void {
    const loaded = assetRegistry.getAnimStateMachine(stateMachineId);
    if (!loaded) return;

    editorState.machine = loaded;
    editorState.isNew = false;
    editorState.selectedStateId = null;
    editorState.selectedTransitionId = null;
    editorState.panX = canvas.getBoundingClientRect().width / 3;
    editorState.panY = canvas.getBoundingClientRect().height / 4;
    titleEl.textContent = loaded.name;
    renderInspector();
    render();
  }

  function createNew(): void {
    const defaultState: AnimState = {
      id: generateId(),
      name: 'Idle',
      animationId: '',
      loop: true,
      position: { x: 200, y: 150 },
    };

    editorState.machine = {
      id: '',
      name: 'New State Machine',
      initialStateId: defaultState.id,
      states: [defaultState],
      transitions: [],
      createdAt: Date.now(),
    };
    editorState.isNew = true;
    editorState.selectedStateId = null;
    editorState.selectedTransitionId = null;
    editorState.panX = canvas.getBoundingClientRect().width / 3;
    editorState.panY = canvas.getBoundingClientRect().height / 4;
    titleEl.textContent = 'New State Machine';
    renderInspector();
    render();
  }

  function refresh(): void {
    if (editorState.machine && !editorState.isNew) {
      const refreshed = assetRegistry.getAnimStateMachine(editorState.machine.id);
      if (refreshed) {
        editorState.machine = refreshed;
      }
    }
    render();
  }

  function destroy(): void {
    // Sim cleanup
    cancelAnimationFrame(simRafId);
    simClock?.destroy();
    simPanel?.remove();

    resizeObserver.disconnect();
    document.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    root.remove();
    styleEl.remove();
  }

  // Initial load
  if (config.initialStateMachineId) {
    openStateMachine(config.initialStateMachineId);
  }

  // Defer initial resize to next frame
  requestAnimationFrame(() => resizeCanvas());

  return {
    openStateMachine,
    createNew,
    refresh,
    destroy,
  };
}
