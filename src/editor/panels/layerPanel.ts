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

const STYLES = `
  .layer-panel {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 8px 8px;
    flex: 1 1 auto;
    min-height: 0;
  }

  .layer-panel__list {
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

  .layer-panel__list::-webkit-scrollbar {
    display: none;
  }

  .layer-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 4px 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 4px;
  }

  .layer-panel__title {
    color: #8a90b8;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .layer-row {
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

  .layer-row:active {
    background: rgba(255, 255, 255, 0.05);
  }

  .layer-row--active {
    background: rgba(74, 158, 255, 0.12);
    border-color: rgba(74, 158, 255, 0.35);
  }

  .layer-row--locked {
    opacity: 0.7;
  }

  .layer-row--hidden {
    opacity: 0.5;
  }

  .layer-row__reorder-group {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-right: 2px;
  }

  .layer-row__reorder {
    width: 24px;
    height: 18px;
    padding: 0;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: #6a70a0;
    cursor: pointer;
    font-size: 10px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s, color 0.12s;
  }

  .layer-row__reorder:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #aab0d4;
  }

  .layer-row__reorder:active {
    background: rgba(255, 255, 255, 0.12);
  }

  .layer-row__reorder--disabled,
  .layer-row__reorder:disabled {
    opacity: 0.25;
    cursor: default;
    pointer-events: none;
  }

  .layer-row__indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: transparent;
    flex-shrink: 0;
    border: 2px solid transparent;
    transition: all 0.15s;
  }

  .layer-row--active .layer-row__indicator {
    background: #4a9eff;
    border-color: #4a9eff;
    box-shadow: 0 0 8px rgba(74, 158, 255, 0.5);
  }

  .layer-row__name {
    flex: 1;
    color: #e6ecff;
    font-size: 13px;
    font-weight: 500;
    padding: 0 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .layer-row--hidden .layer-row__name {
    color: #888;
    text-decoration: line-through;
  }

  .layer-row__toggle {
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
    color: #555;
    transition: background 0.12s, color 0.12s;
  }

  .layer-row__toggle:active {
    background: rgba(255, 255, 255, 0.1);
  }

  .layer-row__toggle--on {
    color: #4a9eff;
  }

  .layer-row__toggle--off {
    color: #555;
  }

  .layer-row__toggle--warning {
    color: #ff6b6b;
  }

  .layer-row__toggles {
    display: flex;
    align-items: center;
    gap: 2px;
  }
`;

// --- Factory ---

export function createLayerPanel(
  container: HTMLElement,
  config: LayerPanelConfig
): LayerPanelController {
  let { activeLayer, visibility, locks, order, onLayerSelect, onVisibilityChange, onLocksChange, onOrderChange } = config;
  let layerOrder: LayerType[] = order ? [...order] : [...LAYER_ORDER];
  const emitOrderChange = onOrderChange ?? (() => {});

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // Create root element
  const root = document.createElement('div');
  root.className = 'layer-panel';

  // Add header
  const header = document.createElement('div');
  header.className = 'layer-panel__header';
  const title = document.createElement('span');
  title.className = 'layer-panel__title';
  title.textContent = 'Layers';
  header.appendChild(title);
  root.appendChild(header);

  // Scrollable list container
  const list = document.createElement('div');
  list.className = 'layer-panel__list';
  root.appendChild(list);

  // Layer rows
  const rows: Map<LayerType, HTMLDivElement> = new Map();
  const visibilityToggles: Map<LayerType, HTMLButtonElement> = new Map();
  const lockToggles: Map<LayerType, HTMLButtonElement> = new Map();
  const moveUpButtons: Map<LayerType, HTMLButtonElement> = new Map();
  const moveDownButtons: Map<LayerType, HTMLButtonElement> = new Map();

  for (const layerType of layerOrder) {
    const row = document.createElement('div');
    row.className = 'layer-row';
    row.dataset.layer = layerType;

    if (layerType === activeLayer) {
      row.classList.add('layer-row--active');
    }
    if (!visibility[layerType]) {
      row.classList.add('layer-row--hidden');
    }
    if (locks[layerType]) {
      row.classList.add('layer-row--locked');
    }

    // Reorder controls group (left side)
    const reorderGroup = document.createElement('div');
    reorderGroup.className = 'layer-row__reorder-group';

    const moveUp = document.createElement('button');
    moveUp.className = 'layer-row__reorder';
    moveUp.type = 'button';
    moveUp.textContent = '▲';
    moveUp.setAttribute('aria-label', 'Move layer up');
    moveUp.setAttribute('title', 'Move layer up');
    moveUp.addEventListener('click', (e) => {
      e.stopPropagation();
      moveLayer(layerType, -1);
    });

    const moveDown = document.createElement('button');
    moveDown.className = 'layer-row__reorder';
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
    indicator.className = 'layer-row__indicator';

    // Layer name
    const name = document.createElement('span');
    name.className = 'layer-row__name';
    name.textContent = LAYER_LABELS[layerType];

    // Toggles group (right side)
    const togglesGroup = document.createElement('div');
    togglesGroup.className = 'layer-row__toggles';

    // Visibility toggle - use clearer icons
    const visToggle = document.createElement('button');
    visToggle.className = 'layer-row__toggle';
    visToggle.type = 'button';
    visToggle.textContent = visibility[layerType] ? '👁' : '○';
    if (visibility[layerType]) {
      visToggle.classList.add('layer-row__toggle--on');
    } else {
      visToggle.classList.add('layer-row__toggle--off');
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
    lockToggle.className = 'layer-row__toggle';
    lockToggle.type = 'button';
    lockToggle.textContent = locks[layerType] ? '🔒' : '🔓';
    if (locks[layerType]) {
      lockToggle.classList.add('layer-row__toggle--warning');
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
      up.classList.toggle('layer-row__reorder--disabled', up.disabled);
      down.classList.toggle('layer-row__reorder--disabled', down.disabled);
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
    row.classList.toggle('layer-row--active', layerType === activeLayer);

    // Update visibility state
    row.classList.toggle('layer-row--hidden', !visibility[layerType]);
    visToggle.textContent = visibility[layerType] ? '👁' : '○';
    visToggle.classList.toggle('layer-row__toggle--on', visibility[layerType]);
    visToggle.classList.toggle('layer-row__toggle--off', !visibility[layerType]);
    visToggle.title = visibility[layerType] ? 'Hide layer' : 'Show layer';

    // Update lock state
    row.classList.toggle('layer-row--locked', locks[layerType]);
    lockToggle.textContent = locks[layerType] ? '🔒' : '🔓';
    lockToggle.classList.toggle('layer-row__toggle--warning', locks[layerType]);
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
      document.head.removeChild(styleEl);
      console.log(`${LOG_PREFIX} Layer panel destroyed`);
    },
  };

  console.log(`${LOG_PREFIX} Layer panel created`);

  return controller;
}
