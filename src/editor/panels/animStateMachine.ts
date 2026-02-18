import type { AssetRegistry, AnimStateMachineAsset } from '@/editor/assets';
import type { AnimState, AnimTransition, TransitionCondition } from '@/types/animStateMachine';

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

  toolbar.appendChild(backButton);
  toolbar.appendChild(titleEl);
  toolbar.appendChild(addStateButton);
  toolbar.appendChild(saveButton);

  // Canvas area
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'asm-editor__canvas-wrap';

  const canvas = document.createElement('canvas');
  canvas.className = 'asm-editor__canvas';
  canvasWrap.appendChild(canvas);

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
  };

  const animFrameId = 0;

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

  function drawNode(state: AnimState, isSelected: boolean, isInitial: boolean): void {
    const { zoom, panX, panY } = editorState;
    const cx = state.position.x * zoom + panX;
    const cy = state.position.y * zoom + panY;
    const w = NODE_WIDTH * zoom;
    const h = NODE_HEIGHT * zoom;
    const r = NODE_RADIUS * zoom;

    // Node body
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
    ctx.fillStyle = isSelected ? NODE_FILL_SELECTED : NODE_FILL;
    ctx.fill();
    ctx.strokeStyle = isSelected ? NODE_BORDER_SELECTED : NODE_BORDER;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.stroke();

    // Initial state indicator
    if (isInitial) {
      const indicatorSize = 8 * zoom;
      ctx.beginPath();
      ctx.arc(cx - w / 2 + 14 * zoom, cy, indicatorSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = NODE_INITIAL_INDICATOR;
      ctx.fill();
    }

    // State name
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = `${Math.round(12 * zoom)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameOffsetX = isInitial ? 6 * zoom : 0;
    ctx.fillText(state.name, cx + nameOffsetX, cy - 6 * zoom, w - 24 * zoom);

    // Animation name hint
    const animations = assetRegistry.getAnimations();
    const anim = animations.find((a) => a.id === state.animationId);
    const animLabel = anim ? anim.name : (state.animationId || 'No anim');
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = `${Math.round(10 * zoom)}px system-ui, sans-serif`;
    ctx.fillText(animLabel, cx + nameOffsetX, cy + 10 * zoom, w - 24 * zoom);
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

    // Label
    if (label) {
      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2;
      ctx.fillStyle = TEXT_MUTED;
      ctx.font = `${Math.round(9 * zoom)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, midX, midY - 4 * zoom);
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
    for (const state of machine.states) {
      const isSelected = editorState.selectedStateId === state.id;
      const isInitial = state.id === machine.initialStateId;
      drawNode(state, isSelected, isInitial);
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
        state.position.x = world.x - editorState.dragOffsetX;
        state.position.y = world.y - editorState.dragOffsetY;
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
    isPanning = false;
    canvas.releasePointerCapture(e.pointerId);
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

  const resizeObserver = new ResizeObserver(() => resizeCanvas());
  resizeObserver.observe(canvasWrap);

  // --- State Management ---

  function addNewState(): void {
    if (!editorState.machine) return;

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
    renderInspector();
    render();
  }

  function removeSelectedState(): void {
    if (!editorState.machine || !editorState.selectedStateId) return;

    const stateId = editorState.selectedStateId;
    editorState.machine.states = editorState.machine.states.filter((s) => s.id !== stateId);
    editorState.machine.transitions = editorState.machine.transitions.filter(
      (t) => t.fromStateId !== stateId && t.toStateId !== stateId
    );

    // Fix initial state if deleted
    if (editorState.machine.initialStateId === stateId) {
      editorState.machine.initialStateId = editorState.machine.states[0]?.id ?? '';
    }

    editorState.selectedStateId = null;
    renderInspector();
    render();
  }

  function removeSelectedTransition(): void {
    if (!editorState.machine || !editorState.selectedTransitionId) return;

    editorState.machine.transitions = editorState.machine.transitions.filter(
      (t) => t.id !== editorState.selectedTransitionId
    );

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
      startTransitionCreation();
    });
    inspector.appendChild(createTransBtn);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'asm-editor__toolbar-button';
    deleteBtn.textContent = 'Delete State';
    deleteBtn.style.color = '#ff9fb3';
    deleteBtn.addEventListener('click', () => removeSelectedState());
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
    deleteBtn.addEventListener('click', () => removeSelectedTransition());
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
    input.className = 'asm-editor__field-input';
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
    cancelAnimationFrame(animFrameId);
    resizeObserver.disconnect();
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
