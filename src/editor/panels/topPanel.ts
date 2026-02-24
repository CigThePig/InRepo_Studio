/**
 * Top Panel Component
 *
 * Displays scene info and layer selection tabs.
 * Expandable/collapsible with tap on header.
 */

import type { LayerType } from '@/types';
import { uxFeedback } from '@/editor/uxFeedback';
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
    background: var(--irs-surface-dark-alpha, rgba(22, 33, 62, 0.85));
    border-bottom: 1px solid var(--irs-color-blueBorder);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .top-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: max(0px, env(safe-area-inset-top)) 0 0 0;
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
    color: var(--irs-color-text);
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
    color: var(--irs-color-text-muted);
    font-size: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
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
    border-radius: var(--irs-radius-sm);
    border: none;
    background: var(--irs-color-blue);
    color: var(--irs-color-text);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .top-panel__content {
    padding: 8px 12px 12px;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    transform-origin: top;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
  }

  .top-panel__content--hidden {
    transform: translateY(-10px);
    opacity: 0;
    pointer-events: none;
    position: absolute;
  }

  .top-panel__content:not(.top-panel__content--hidden) {
    transform: translateY(0);
    opacity: 1;
    position: relative;
  }

  .layer-tabs {
    display: block;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    mask-image: linear-gradient(to right, black 85%, transparent 100%);
    -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
  }

  .layer-tabs::-webkit-scrollbar {
    display: none;
  }

  .layer-tab {
    padding: 8px 12px;
    min-height: 44px;
    min-width: 44px;
    border-radius: var(--irs-radius-sm);
    border: 2px solid transparent;
    background: var(--irs-color-blueAlpha12);
    color: var(--irs-color-text-muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .layer-tab--active {
    border-color: var(--irs-color-blue);
    background: var(--irs-color-blueAlpha35);
    color: var(--irs-color-text);
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
  panel.className = 'top-panel';

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
    uxFeedback.motion.pulse(playtestButton);
    event.stopPropagation();
    playtestCallback?.();
  });

  const chevron = document.createElement('button');
  chevron.className = 'top-panel__chevron';
  chevron.type = 'button';
  chevron.textContent = state.expanded ? '▲' : '▼';

  chevron.addEventListener('click', (event) => {
    uxFeedback.motion.pulse(chevron);
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
      uxFeedback.motion.pulse(tab);
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
    content.classList.toggle('top-panel__content--hidden', !state.expanded);
    chevron.textContent = state.expanded ? '▲' : '▼';
  }

  updateExpandedState();

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
