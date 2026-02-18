/**
 * Bottom Panel Component
 *
 * Holds the persistent intent buttons and context actions.
 */

/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Bottom panel intent + legacy tool definitions.
 *
 * Defines:
 * - IntentType — primary intent list (type: lookup)
 * - ToolType — legacy tool list (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (UI reacts immediately)
 */

import type { EditorIntent } from '@/storage/hot';

const LOG_PREFIX = '[BottomPanel]';

// --- Types ---

export type IntentType = EditorIntent;
export type ToolType = 'select' | 'paint' | 'erase' | 'entity';

export interface BottomPanelState {
  currentIntent: IntentType;
}

export interface BottomPanelController {
  /** Set the current intent */
  setCurrentIntent(intent: IntentType): void;

  /** Get the current intent */
  getCurrentIntent(): IntentType;

  /** Update intent context (layer + availability) */
  setIntentContext(context: { layerLabel: string; placeEnabled: boolean; removeEnabled: boolean; isLocked: boolean }): void;

  /** Register callback for place button */
  onPlaceClick(callback: () => void): void;

  /** Register callback for interact button */
  onInteractClick(callback: () => void): void;

  /** Register callback for remove button */
  onRemoveClick(callback: () => void): void;

  /** Get the context strip container */
  getContextStripContainer(): HTMLElement;

  /** Clean up resources */
  destroy(): void;
}


// --- Styles ---

const STYLES = `
  .bottom-panel {
    display: flex;
    flex-direction: column;
    background: #0d1220;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .bottom-panel__context-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 10px 12px 12px;
  }

  .bottom-panel__tool-group {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    align-self: flex-start;
  }

  .bottom-panel__tool-button {
    height: 44px;
    min-width: 44px;
    padding: 0 12px;
    border-radius: 10px;
    border: none;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
    text-align: left;
  }

  .bottom-panel__tool-button:active {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(0.97);
  }

  .bottom-panel__tool-button--active {
    background: rgba(74, 158, 255, 0.2);
    color: #fff;
    box-shadow: inset 0 0 0 1px rgba(74, 158, 255, 0.4);
  }

  .bottom-panel__tool-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .bottom-panel__tool-icon {
    font-size: 16px;
    line-height: 1;
  }

  .bottom-panel__tool-labels {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .bottom-panel__tool-title {
    font-size: 12px;
    font-weight: 600;
  }

  .bottom-panel__tool-sublabel {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.55);
    font-weight: 500;
  }

  .bottom-panel__tool-button--locked .bottom-panel__tool-sublabel::after {
    content: ' • Locked';
    color: rgba(255, 179, 86, 0.9);
  }

  .bottom-panel__context-strip {
    flex: 1;
    min-width: 0;
    width: 100%;
  }
`;

// --- Factory ---

export function createBottomPanel(
  container: HTMLElement,
  initialState: BottomPanelState
): BottomPanelController {
  const state = { ...initialState };
  let placeClickCallback: (() => void) | null = null;
  let interactClickCallback: (() => void) | null = null;
  let removeClickCallback: (() => void) | null = null;
  let intentContext = {
    layerLabel: 'Ground',
    placeEnabled: true,
    removeEnabled: true,
    isLocked: false,
  };

  if (!document.getElementById('bottom-panel-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'bottom-panel-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  const panel = document.createElement('div');
  panel.className = 'bottom-panel';

  const contextRow = document.createElement('div');
  contextRow.className = 'bottom-panel__context-row';

  const toolGroup = document.createElement('div');
  toolGroup.className = 'bottom-panel__tool-group';

  const placeButton = document.createElement('button');
  placeButton.type = 'button';
  placeButton.className = 'bottom-panel__tool-button';
  placeButton.setAttribute('aria-label', 'Place');
  placeButton.setAttribute('title', 'Place');
  placeButton.innerHTML = `
    <span class="bottom-panel__tool-icon">＋</span>
    <span class="bottom-panel__tool-labels">
      <span class="bottom-panel__tool-title">Place</span>
      <span class="bottom-panel__tool-sublabel"></span>
    </span>
  `;

  placeButton.addEventListener('click', () => {
    placeClickCallback?.();
  });

  const interactButton = document.createElement('button');
  interactButton.type = 'button';
  interactButton.className = 'bottom-panel__tool-button';
  interactButton.setAttribute('aria-label', 'Interact');
  interactButton.setAttribute('title', 'Interact');
  interactButton.innerHTML = `
    <span class="bottom-panel__tool-icon">⬚</span>
    <span class="bottom-panel__tool-title">Interact</span>
  `;

  interactButton.addEventListener('click', () => {
    interactClickCallback?.();
  });

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'bottom-panel__tool-button';
  removeButton.setAttribute('aria-label', 'Remove');
  removeButton.setAttribute('title', 'Remove');
  removeButton.innerHTML = `
    <span class="bottom-panel__tool-icon">⌫</span>
    <span class="bottom-panel__tool-labels">
      <span class="bottom-panel__tool-title">Remove</span>
      <span class="bottom-panel__tool-sublabel"></span>
    </span>
  `;

  removeButton.addEventListener('click', () => {
    removeClickCallback?.();
  });

  toolGroup.appendChild(placeButton);
  toolGroup.appendChild(interactButton);
  toolGroup.appendChild(removeButton);

  const contextStripContainer = document.createElement('div');
  contextStripContainer.className = 'bottom-panel__context-strip';

  contextRow.appendChild(toolGroup);
  contextRow.appendChild(contextStripContainer);

  panel.appendChild(contextRow);
  container.appendChild(panel);

  function updateIntentButtons(): void {
    placeButton.classList.toggle('bottom-panel__tool-button--active', state.currentIntent === 'place');
    interactButton.classList.toggle(
      'bottom-panel__tool-button--active',
      state.currentIntent === 'interact'
    );
    removeButton.classList.toggle('bottom-panel__tool-button--active', state.currentIntent === 'remove');

    placeButton.disabled = !intentContext.placeEnabled;
    removeButton.disabled = !intentContext.removeEnabled;

    placeButton.classList.toggle('bottom-panel__tool-button--locked', intentContext.isLocked);
    removeButton.classList.toggle('bottom-panel__tool-button--locked', intentContext.isLocked);

    const placeLabel = placeButton.querySelector('.bottom-panel__tool-sublabel');
    const removeLabel = removeButton.querySelector('.bottom-panel__tool-sublabel');
    if (placeLabel) placeLabel.textContent = intentContext.layerLabel;
    if (removeLabel) removeLabel.textContent = intentContext.layerLabel;
  }

  updateIntentButtons();

  console.log(`${LOG_PREFIX} Bottom panel created`);

  const controller: BottomPanelController = {
    setCurrentIntent(intent: IntentType) {
      if (state.currentIntent === intent) return;
      state.currentIntent = intent;
      updateIntentButtons();
    },

    getCurrentIntent() {
      return state.currentIntent;
    },

    setIntentContext(context) {
      intentContext = { ...intentContext, ...context };
      updateIntentButtons();
    },

    onPlaceClick(callback) {
      placeClickCallback = callback;
    },

    onInteractClick(callback) {
      interactClickCallback = callback;
    },

    onRemoveClick(callback) {
      removeClickCallback = callback;
    },

    getContextStripContainer() {
      return contextStripContainer;
    },

    destroy() {
      container.removeChild(panel);
      const styleEl = document.getElementById('bottom-panel-styles');
      if (styleEl) styleEl.remove();
      console.log(`${LOG_PREFIX} Bottom panel destroyed`);
    },
  };

  return controller;
}
