/**
 * Layer Panel Component
 *
 * Displays layer list with visibility and lock toggles.
 * Allows layer selection by tapping layer rows.
 */

import { LAYER_ORDER, type LayerType } from '@/types';
import type { LayerVisibility, LayerLocks } from '@/storage/hot';

const LOG_PREFIX = '[LayerPanel]';

// --- Types ---

export interface LayerPanelConfig {
  /** Optional custom render order (bottom to top). Defaults to LAYER_ORDER. */
  order?: LayerType[];
  activeLayer: LayerType;
  visibility: LayerVisibility;
  locks: LayerLocks;
  onLayerSelect: (layer: LayerType) => void;
  onVisibilityChange: (visibility: LayerVisibility) => void;
  onLocksChange: (locks: LayerLocks) => void;
  /** Called when the layer order changes */
  onOrderChange?: (order: LayerType[]) => void;
}

export interface LayerPanelController {
  /** Set the active layer */
  setActiveLayer(layer: LayerType): void;

  /** Set layer visibility state */
  setVisibility(visibility: LayerVisibility): void;

  /** Set layer locks state */
  setLocks(locks: LayerLocks): void;

  /** Set layer order (bottom to top) */
  setOrder(order: LayerType[]): void;

  /** Get current layer order */
  getOrder(): LayerType[];

  /** Get the root element */
  getElement(): HTMLElement;

  /** Clean up */
  destroy(): void;
}

// --- Layer Labels ---

const LAYER_LABELS: Record<LayerType, string> = {
  ground: 'Ground',
  props: 'Props',
  collision: 'Collision',
  triggers: 'Triggers',
};

// --- Styles ---

const STYLE_ID = 'irs-layer-panel-styles';

const STYLES = `
  .irs-layer-panel {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 8px 8px;
    flex: 1 1 auto;
    min-height: 0;
  }

  .irs-layer-panel--hidden {
    display: none;
  }

  .irs-layer-panel__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  .irs-layer-panel__list::-webkit-scrollbar {
    display: none;
  }

  .irs-layer-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 4px 6px;
    border-bottom: 1px solid var(--irs-border-light);
    margin-bottom: 4px;
  }

  .irs-layer-panel__title {
    color: var(--irs-text-secondary);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .irs-layer-panel__row {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 44px;
    padding: 4px 6px;
    border-radius: 10px;
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, border-color 0.15s;
    border: 1px solid transparent;
  }

  .irs-layer-panel__row:active {
    background: var(--irs-surface-elevated);
  }

  .irs-layer-panel__row--active {
    background: var(--irs-color-blue-alpha-12);
    border-color: var(--irs-color-blue-alpha-35);
  }

  .irs-layer-panel__row--locked {
    opacity: 0.7;
  }

  .irs-layer-panel__row--hidden {
    opacity: 0.5;
  }

  .irs-layer-panel__row__reorder-group {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-right: 2px;
  }

  .irs-layer-panel__row__reorder {
    width: 24px;
    height: 18px;
    padding: 0;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--irs-text-muted);
    cursor: pointer;
    font-size: 10px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s, color 0.12s;
  }

  .irs-layer-panel__row__reorder:hover {
    background: var(--irs-color-blue-alpha-8);
    color: #aab0d4;
  }

  .irs-layer-panel__row__reorder:active {
    background: var(--irs-color-blue-alpha-12);
  }

  .irs-layer-panel__row__reorder--disabled,
  .irs-layer-panel__row__reorder:disabled {
    opacity: 0.25;
    cursor: default;
    pointer-events: none;
  }

  .irs-layer-panel__row__indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: transparent;
    flex-shrink: 0;
    border: 2px solid transparent;
    transition: all 0.15s;
  }

  .irs-layer-panel__row--active .irs-layer-panel__row__indicator {
    background: var(--irs-color-blue);
    border-color: var(--irs-color-blue);
    box-shadow: 0 0 8px var(--irs-color-blue-alpha-45);
  }

  .irs-layer-panel__row__name {
    flex: 1;
    color: var(--irs-text-primary);
    font-size: 13px;
    font-weight: 500;
    padding: 0 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .irs-layer-panel__row--hidden .irs-layer-panel__row__name {
    color: var(--irs-text-muted);
    text-decoration: line-through;
  }

  .irs-layer-panel__row__toggle {
    min-width: 40px;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    font-size: 15px;
    color: var(--irs-text-muted);
    transition: background 0.12s, color 0.12s;
  }

  .irs-layer-panel__row__toggle:active {
    background: var(--irs-color-blue-alpha-12);
  }

  .irs-layer-panel__row__toggle--on {
    color: var(--irs-color-blue);
  }

  .irs-layer-panel__row__toggle--off {
    color: var(--irs-text-muted);
  }

  .irs-layer-panel__row__toggle--warning {
    color: var(--irs-accent-danger);
  }

  .irs-layer-panel__row__toggles {
    display: flex;
    align-items: center;
    gap: 2px;
  }
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

// --- Factory ---

export function createLayerPanel(
  container: HTMLElement,
  config: LayerPanelConfig
): LayerPanelController {
  let { activeLayer, visibility, locks } = config;
  const { order, onLayerSelect, onVisibilityChange, onLocksChange, onOrderChange } = config;
  let layerOrder: LayerType[] = order ? [...order] : [...LAYER_ORDER];
  const emitOrderChange = onOrderChange ?? (() => {});

  // Inject styles
  ensureStyles();

  // Create root element
  const root = document.createElement('div');
  root.className = 'irs-layer-panel';

  // Add header
  const header = document.createElement('div');
  header.className = 'irs-layer-panel__header';
  const title = document.createElement('span');
  title.className = 'irs-layer-panel__title';
  title.textContent = 'Layers';
  header.appendChild(title);
  root.appendChild(header);

  // Scrollable list container
  const list = document.createElement('div');
  list.className = 'irs-layer-panel__list';
  root.appendChild(list);

  // Layer rows
  const rows: Map<LayerType, HTMLDivElement> = new Map();
  const visibilityToggles: Map<LayerType, HTMLButtonElement> = new Map();
  const lockToggles: Map<LayerType, HTMLButtonElement> = new Map();
  const moveUpButtons: Map<LayerType, HTMLButtonElement> = new Map();
  const moveDownButtons: Map<LayerType, HTMLButtonElement> = new Map();

  for (const layerType of layerOrder) {
    const row = document.createElement('div');
    row.className = 'irs-layer-panel__row';
    row.dataset.layer = layerType;

    if (layerType === activeLayer) {
      row.classList.add('irs-layer-panel__row--active');
    }
    if (!visibility[layerType]) {
      row.classList.add('irs-layer-panel__row--hidden');
    }
    if (locks[layerType]) {
      row.classList.add('irs-layer-panel__row--locked');
    }

    // Reorder controls group (left side)
    const reorderGroup = document.createElement('div');
    reorderGroup.className = 'irs-layer-panel__row__reorder-group';

    const moveUp = document.createElement('button');
    moveUp.className = 'irs-layer-panel__row__reorder';
    moveUp.type = 'button';
    moveUp.textContent = '▲';
    moveUp.setAttribute('aria-label', 'Move layer up');
    moveUp.setAttribute('title', 'Move layer up');
    moveUp.addEventListener('click', (e) => {
      e.stopPropagation();
      moveLayer(layerType, -1);
    });

    const moveDown = document.createElement('button');
    moveDown.className = 'irs-layer-panel__row__reorder';
    moveDown.type = 'button';
    moveDown.textContent = '▼';
    moveDown.setAttribute('aria-label', 'Move layer down');
    moveDown.setAttribute('title', 'Move layer down');
    moveDown.addEventListener('click', (e) => {
      e.stopPropagation();
      moveLayer(layerType, 1);
    });

    reorderGroup.appendChild(moveUp);
    reorderGroup.appendChild(moveDown);

    // Active indicator
    const indicator = document.createElement('div');
    indicator.className = 'irs-layer-panel__row__indicator';

    // Layer name
    const name = document.createElement('span');
    name.className = 'irs-layer-panel__row__name';
    name.textContent = LAYER_LABELS[layerType];

    // Toggles group (right side)
    const togglesGroup = document.createElement('div');
    togglesGroup.className = 'irs-layer-panel__row__toggles';

    // Visibility toggle - use clearer icons
    const visToggle = document.createElement('button');
    visToggle.className = 'irs-layer-panel__row__toggle';
    visToggle.type = 'button';
    visToggle.textContent = visibility[layerType] ? '👁' : '○';
    if (visibility[layerType]) {
      visToggle.classList.add('irs-layer-panel__row__toggle--on');
    } else {
      visToggle.classList.add('irs-layer-panel__row__toggle--off');
    }
    visToggle.title = visibility[layerType] ? 'Hide layer' : 'Show layer';

    visToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const newVisibility = { ...visibility };
      newVisibility[layerType] = !newVisibility[layerType];
      visibility = newVisibility;
      updateRow(layerType);
      onVisibilityChange(newVisibility);
    });

    // Lock toggle
    const lockToggle = document.createElement('button');
    lockToggle.className = 'irs-layer-panel__row__toggle';
    lockToggle.type = 'button';
    lockToggle.textContent = locks[layerType] ? '🔒' : '🔓';
    if (locks[layerType]) {
      lockToggle.classList.add('irs-layer-panel__row__toggle--warning');
    }
    lockToggle.title = locks[layerType] ? 'Unlock layer' : 'Lock layer';

    lockToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const newLocks = { ...locks };
      newLocks[layerType] = !newLocks[layerType];
      locks = newLocks;
      updateRow(layerType);
      onLocksChange(newLocks);
    });

    // Row click = select layer
    row.addEventListener('click', () => {
      if (layerType !== activeLayer) {
        onLayerSelect(layerType);
      }
    });

    togglesGroup.appendChild(visToggle);
    togglesGroup.appendChild(lockToggle);

    // Assemble row: reorder | indicator | name | toggles
    row.appendChild(reorderGroup);
    row.appendChild(indicator);
    row.appendChild(name);
    row.appendChild(togglesGroup);

    rows.set(layerType, row);
    visibilityToggles.set(layerType, visToggle);
    lockToggles.set(layerType, lockToggle);
    moveUpButtons.set(layerType, moveUp);
    moveDownButtons.set(layerType, moveDown);
    list.appendChild(row);
  }


  function normalizeOrder(order: LayerType[]): LayerType[] {
    const unique = Array.from(new Set(order));
    const valid = unique.length === LAYER_ORDER.length && LAYER_ORDER.every((l) => unique.includes(l));
    return valid ? unique : [...LAYER_ORDER];
  }

  function rebuildRowOrder(): void {
    // Re-append rows in the current order to update DOM order.
    for (const layerType of layerOrder) {
      const row = rows.get(layerType);
      if (row) list.appendChild(row);
    }
    updateReorderButtonStates();
  }

  function updateReorderButtonStates(): void {
    for (const layerType of LAYER_ORDER) {
      const idx = layerOrder.indexOf(layerType);
      const up = moveUpButtons.get(layerType);
      const down = moveDownButtons.get(layerType);
      if (!up || !down) continue;
      up.disabled = idx <= 0;
      down.disabled = idx < 0 || idx >= layerOrder.length - 1;
      up.classList.toggle('irs-layer-panel__row__reorder--disabled', up.disabled);
      down.classList.toggle('irs-layer-panel__row__reorder--disabled', down.disabled);
    }
  }

  function moveLayer(layerType: LayerType, delta: -1 | 1): void {
    const idx = layerOrder.indexOf(layerType);
    if (idx < 0) return;
    const next = idx + delta;
    if (next < 0 || next >= layerOrder.length) return;

    const newOrder = [...layerOrder];
    const [moved] = newOrder.splice(idx, 1);
    newOrder.splice(next, 0, moved);
    layerOrder = normalizeOrder(newOrder);

    rebuildRowOrder();
    emitOrderChange([...layerOrder]);
  }

  container.appendChild(root);

  // Initialize reorder button states
  updateReorderButtonStates();

  function updateRow(layerType: LayerType): void {
    const row = rows.get(layerType);
    const visToggle = visibilityToggles.get(layerType);
    const lockToggle = lockToggles.get(layerType);

    if (!row || !visToggle || !lockToggle) return;

    // Update active state
    row.classList.toggle('irs-layer-panel__row--active', layerType === activeLayer);

    // Update visibility state
    row.classList.toggle('irs-layer-panel__row--hidden', !visibility[layerType]);
    visToggle.textContent = visibility[layerType] ? '👁' : '○';
    visToggle.classList.toggle('irs-layer-panel__row__toggle--on', visibility[layerType]);
    visToggle.classList.toggle('irs-layer-panel__row__toggle--off', !visibility[layerType]);
    visToggle.title = visibility[layerType] ? 'Hide layer' : 'Show layer';

    // Update lock state
    row.classList.toggle('irs-layer-panel__row--locked', locks[layerType]);
    lockToggle.textContent = locks[layerType] ? '🔒' : '🔓';
    lockToggle.classList.toggle('irs-layer-panel__row__toggle--warning', locks[layerType]);
    lockToggle.title = locks[layerType] ? 'Unlock layer' : 'Lock layer';
  }

  function updateAllRows(): void {
    for (const layerType of layerOrder) {
      updateRow(layerType);
    }
  }

  // --- Controller ---

  const controller: LayerPanelController = {
    setActiveLayer(layer: LayerType): void {
      if (activeLayer !== layer) {
        activeLayer = layer;
        updateAllRows();
      }
    },

    setVisibility(newVisibility: LayerVisibility): void {
      visibility = { ...newVisibility };
      updateAllRows();
    },

    setLocks(newLocks: LayerLocks): void {
      locks = { ...newLocks };
      updateAllRows();
    },

    setOrder(newOrder: LayerType[]): void {
      layerOrder = normalizeOrder(newOrder);
      rebuildRowOrder();
    },

    getOrder(): LayerType[] {
      return [...layerOrder];
    },

    getElement(): HTMLElement {
      return root;
    },

    destroy(): void {
      container.removeChild(root);
      console.log(`${LOG_PREFIX} Layer panel destroyed`);
    },
  };

  console.log(`${LOG_PREFIX} Layer panel created`);

  return controller;
}
