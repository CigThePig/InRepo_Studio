/**
 * Top Panel Component
 *
 * Displays scene info and layer selection tabs.
 * Expandable/collapsible with tap on header.
 */

import type { LayerType } from '@/types';
import { LAYER_ORDER } from '@/types';

const LOG_PREFIX = '[TopPanel]';

// --- Types ---

export interface TopPanelState {
  expanded: boolean;
  sceneName: string;
  activeLayer: LayerType;
}

export interface TopPanelController {
  /** Set the scene name display */
  setSceneName(name: string): void;

  /** Set the active layer */
  setActiveLayer(layer: LayerType): void;

  /** Set expanded state */
  setExpanded(expanded: boolean): void;

  /** Get current expanded state */
  isExpanded(): boolean;

  /** Get current active layer */
  getActiveLayer(): LayerType;

  /** Get the scene selector container */
  getSceneSelectorContainer(): HTMLElement;

  /** Get the content container for layer panel */
  getLayerPanelContainer(): HTMLElement;

  /** Register callback for layer changes */
  onLayerChange(callback: (layer: LayerType) => void): void;

  /** Register callback for expand/collapse toggle */
  onExpandToggle(callback: (expanded: boolean) => void): void;

  /** Register callback for playtest action */
  onPlaytest(callback: () => void): void;

  /** Clean up resources */
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
  .top-panel {
    display: flex;
    flex-direction: column;
    background: #16213e;
    border-bottom: 1px solid #0f3460;
    overflow: hidden;
    transition: max-height 0.2s ease-out;
  }

  .top-panel--collapsed {
    max-height: 48px;
  }

  .top-panel--expanded {
    max-height: 120px;
  }

  .top-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 0 0;
    height: 48px;
    min-height: 48px;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .top-panel__scene-selector-container {
    flex: 1;
    min-width: 0;
  }

  .top-panel__title {
    color: #fff;
    font-weight: bold;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 12px;
  }

  .top-panel__chevron {
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    font-size: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .top-panel__chevron:active {
    background: rgba(255, 255, 255, 0.05);
  }

  .top-panel__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .top-panel__playtest {
    min-height: 44px;
    min-width: 44px;
    padding: 6px 10px;
    border-radius: 8px;
    border: none;
    background: #4a9eff;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .top-panel__playtest:active {
    background: #3a7fd6;
  }

  .top-panel__content {
    padding: 8px 12px 12px;
  }

  .layer-tabs {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .layer-tabs::-webkit-scrollbar {
    display: none;
  }

  .layer-tab {
    padding: 8px 12px;
    min-height: 44px;
    min-width: 44px;
    border-radius: 6px;
    border: 2px solid transparent;
    background: #2a2a4e;
    color: #ccc;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .layer-tab:active {
    background: #3a3a6e;
  }

  .layer-tab--active {
    border-color: #4a9eff;
    background: #3a3a6e;
    color: #fff;
  }
`;

// --- Factory ---

export function createTopPanel(
  container: HTMLElement,
  initialState: TopPanelState
): TopPanelController {
  const state = { ...initialState };
  let layerChangeCallback: ((layer: LayerType) => void) | null = null;
  let expandToggleCallback: ((expanded: boolean) => void) | null = null;
  let playtestCallback: (() => void) | null = null;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // Create DOM
  const panel = document.createElement('div');
  panel.className = `top-panel ${state.expanded ? 'top-panel--expanded' : 'top-panel--collapsed'}`;

  const header = document.createElement('div');
  header.className = 'top-panel__header';

  // Scene selector container (will be populated by init.ts)
  const sceneSelectorContainer = document.createElement('div');
  sceneSelectorContainer.className = 'top-panel__scene-selector-container';

  // Fallback title (shown if scene selector not yet initialized)
  const title = document.createElement('span');
  title.className = 'top-panel__title';
  title.textContent = state.sceneName;
  sceneSelectorContainer.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'top-panel__actions';

  const playtestButton = document.createElement('button');
  playtestButton.className = 'top-panel__playtest';
  playtestButton.type = 'button';
  playtestButton.textContent = '▶ Playtest';

  playtestButton.addEventListener('click', (event) => {
    event.stopPropagation();
    playtestCallback?.();
  });

  const chevron = document.createElement('button');
  chevron.className = 'top-panel__chevron';
  chevron.type = 'button';
  chevron.textContent = state.expanded ? '▲' : '▼';

  chevron.addEventListener('click', (event) => {
    event.stopPropagation();
    state.expanded = !state.expanded;
    updateExpandedState();
    expandToggleCallback?.(state.expanded);
    console.log(`${LOG_PREFIX} Panel ${state.expanded ? 'expanded' : 'collapsed'}`);
  });

  actions.appendChild(playtestButton);
  actions.appendChild(chevron);

  header.appendChild(sceneSelectorContainer);
  header.appendChild(actions);

  const content = document.createElement('div');
  content.className = 'top-panel__content';

  const layerTabs = document.createElement('div');
  layerTabs.className = 'layer-tabs';

  // Create layer tabs
  const tabButtons: Map<LayerType, HTMLButtonElement> = new Map();

  for (const layerType of LAYER_ORDER) {
    const tab = document.createElement('button');
    tab.className = `layer-tab ${state.activeLayer === layerType ? 'layer-tab--active' : ''}`;
    tab.textContent = LAYER_LABELS[layerType];
    tab.setAttribute('data-layer', layerType);

    tab.addEventListener('click', () => {
      if (state.activeLayer === layerType) return;

      // Update state
      state.activeLayer = layerType;

      // Update UI
      tabButtons.forEach((btn, type) => {
        btn.classList.toggle('layer-tab--active', type === layerType);
      });

      // Notify
      layerChangeCallback?.(layerType);
      console.log(`${LOG_PREFIX} Layer changed to "${layerType}"`);
    });

    tabButtons.set(layerType, tab);
    layerTabs.appendChild(tab);
  }

  content.appendChild(layerTabs);

  function updateExpandedState(): void {
    panel.classList.toggle('top-panel--expanded', state.expanded);
    panel.classList.toggle('top-panel--collapsed', !state.expanded);
    chevron.textContent = state.expanded ? '▲' : '▼';
  }

  panel.appendChild(header);
  panel.appendChild(content);
  container.appendChild(panel);

  console.log(`${LOG_PREFIX} Top panel created`);

  // --- Controller ---

  const controller: TopPanelController = {
    setSceneName(name: string) {
      state.sceneName = name;
      // Only update fallback title if scene selector hasn't replaced it
      if (title.parentElement === sceneSelectorContainer) {
        title.textContent = name;
      }
    },

    setActiveLayer(layer: LayerType) {
      if (state.activeLayer === layer) return;

      state.activeLayer = layer;
      tabButtons.forEach((btn, type) => {
        btn.classList.toggle('layer-tab--active', type === layer);
      });
    },

    setExpanded(expanded: boolean) {
      if (state.expanded === expanded) return;

      state.expanded = expanded;
      updateExpandedState();
    },

    isExpanded() {
      return state.expanded;
    },

    getActiveLayer() {
      return state.activeLayer;
    },

    getSceneSelectorContainer() {
      return sceneSelectorContainer;
    },

    getLayerPanelContainer() {
      return content;
    },

    onLayerChange(callback) {
      layerChangeCallback = callback;
    },

    onExpandToggle(callback) {
      expandToggleCallback = callback;
    },

    onPlaytest(callback) {
      playtestCallback = callback;
    },

    destroy() {
      container.removeChild(panel);
      document.head.removeChild(styleEl);
      console.log(`${LOG_PREFIX} Top panel destroyed`);
    },
  };

  return controller;
}
