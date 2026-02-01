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
  activeLayer: LayerType;
  visibility: LayerVisibility;
  locks: LayerLocks;
  onLayerSelect: (layer: LayerType) => void;
  onVisibilityChange: (visibility: LayerVisibility) => void;
  onLocksChange: (locks: LayerLocks) => void;
}

export interface LayerPanelController {
  /** Set the active layer */
  setActiveLayer(layer: LayerType): void;

  /** Set layer visibility state */
  setVisibility(visibility: LayerVisibility): void;

  /** Set layer locks state */
  setLocks(locks: LayerLocks): void;

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
    gap: 4px;
    padding: 8px 12px;
  }

  .layer-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 4px 8px;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s;
  }

  .layer-row:active {
    background: rgba(255, 255, 255, 0.05);
  }

  .layer-row--active {
    background: rgba(74, 158, 255, 0.15);
    border: 1px solid rgba(74, 158, 255, 0.3);
  }

  .layer-row--locked {
    opacity: 0.6;
  }

  .layer-row__indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: transparent;
    flex-shrink: 0;
  }

  .layer-row--active .layer-row__indicator {
    background: #4a9eff;
  }

  .layer-row__name {
    flex: 1;
    color: #e6ecff;
    font-size: 13px;
    font-weight: 500;
  }

  .layer-row--hidden .layer-row__name {
    opacity: 0.5;
    text-decoration: line-through;
  }

  .layer-row__toggle {
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    font-size: 16px;
    color: #888;
  }

  .layer-row__toggle:active {
    background: rgba(255, 255, 255, 0.1);
  }

  .layer-row__toggle--on {
    color: #4a9eff;
  }

  .layer-row__toggle--warning {
    color: #ff6b6b;
  }
`;

// --- Factory ---

export function createLayerPanel(
  container: HTMLElement,
  config: LayerPanelConfig
): LayerPanelController {
  let { activeLayer, visibility, locks, onLayerSelect, onVisibilityChange, onLocksChange } = config;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // Create root element
  const root = document.createElement('div');
  root.className = 'layer-panel';

  // Layer rows
  const rows: Map<LayerType, HTMLDivElement> = new Map();
  const visibilityToggles: Map<LayerType, HTMLButtonElement> = new Map();
  const lockToggles: Map<LayerType, HTMLButtonElement> = new Map();

  for (const layerType of LAYER_ORDER) {
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

    // Active indicator
    const indicator = document.createElement('div');
    indicator.className = 'layer-row__indicator';

    // Layer name
    const name = document.createElement('span');
    name.className = 'layer-row__name';
    name.textContent = LAYER_LABELS[layerType];

    // Visibility toggle
    const visToggle = document.createElement('button');
    visToggle.className = 'layer-row__toggle';
    visToggle.type = 'button';
    visToggle.textContent = visibility[layerType] ? '👁' : '👁‍🗨';
    if (visibility[layerType]) {
      visToggle.classList.add('layer-row__toggle--on');
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

    row.appendChild(indicator);
    row.appendChild(name);
    row.appendChild(visToggle);
    row.appendChild(lockToggle);

    rows.set(layerType, row);
    visibilityToggles.set(layerType, visToggle);
    lockToggles.set(layerType, lockToggle);
    root.appendChild(row);
  }

  container.appendChild(root);

  function updateRow(layerType: LayerType): void {
    const row = rows.get(layerType);
    const visToggle = visibilityToggles.get(layerType);
    const lockToggle = lockToggles.get(layerType);

    if (!row || !visToggle || !lockToggle) return;

    // Update active state
    row.classList.toggle('layer-row--active', layerType === activeLayer);

    // Update visibility state
    row.classList.toggle('layer-row--hidden', !visibility[layerType]);
    visToggle.textContent = visibility[layerType] ? '👁' : '👁‍🗨';
    visToggle.classList.toggle('layer-row__toggle--on', visibility[layerType]);
    visToggle.title = visibility[layerType] ? 'Hide layer' : 'Show layer';

    // Update lock state
    row.classList.toggle('layer-row--locked', locks[layerType]);
    lockToggle.textContent = locks[layerType] ? '🔒' : '🔓';
    lockToggle.classList.toggle('layer-row__toggle--warning', locks[layerType]);
    lockToggle.title = locks[layerType] ? 'Unlock layer' : 'Lock layer';
  }

  function updateAllRows(): void {
    for (const layerType of LAYER_ORDER) {
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
