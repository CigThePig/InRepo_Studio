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
import { uxFeedback } from '@/editor/uxFeedback';

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
  .irs-bottom-panel {
    display: flex;
    flex-direction: column;
    background: var(--irs-surface-dark-alpha);
    border-top: 1px solid var(--irs-color-blue-alpha-22);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    overflow: hidden;
  }

  .irs-bottom-panel__context-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 10px 12px max(12px, env(safe-area-inset-bottom));
  }

  .irs-bottom-panel__tool-group {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px;
    border-radius: 14px;
    background: var(--irs-color-blue-alpha-12);
    align-self: flex-start;
  }

  .irs-bottom-panel__tool-button {
    height: 44px;
    min-width: 44px;
    padding: 0 12px;
    border-radius: 10px;
    border: none;
    background: var(--irs-color-blue-alpha-12);
    color: var(--irs-text-primary);
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

  .irs-bottom-panel__tool-button:active {
    background: var(--irs-color-blue-alpha-22);
  }

  .irs-bottom-panel__tool-button--active {
    background: var(--irs-color-blue-alpha-22);
    color: var(--irs-color-blue);
    box-shadow: inset 0 0 0 1px var(--irs-color-blue-border);
  }

  .irs-bottom-panel__tool-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .irs-bottom-panel__tool-icon {
    font-size: 16px;
    line-height: 1;
  }

  .irs-bottom-panel__tool-labels {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .irs-bottom-panel__tool-title {
    font-size: 14px;
    font-weight: 600;
  }

  .irs-bottom-panel__tool-sublabel {
    font-size: 11px;
    color: var(--irs-text-muted);
    font-weight: 500;
  }

  .irs-bottom-panel__tool-button--locked .irs-bottom-panel__tool-sublabel::after {
    content: ' • Locked';
    color: var(--irs-color-yellow);
  }

  .irs-bottom-panel__context-strip {
    flex: 1;
    min-width: 0;
    width: 100%;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('irs-bottom-panel-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'irs-bottom-panel-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

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

  ensureStyles();

  const panel = document.createElement('div');
  panel.className = 'irs-bottom-panel';

  const contextRow = document.createElement('div');
  contextRow.className = 'irs-bottom-panel__context-row';

  const toolGroup = document.createElement('div');
  toolGroup.className = 'irs-bottom-panel__tool-group';

  const placeButton = document.createElement('button');
  placeButton.type = 'button';
  placeButton.className = 'irs-bottom-panel__tool-button';
  placeButton.setAttribute('aria-label', 'Place');
  placeButton.setAttribute('title', 'Place');
  placeButton.innerHTML = `
    <span class="irs-bottom-panel__tool-icon">＋</span>
    <span class="irs-bottom-panel__tool-labels">
      <span class="irs-bottom-panel__tool-title">Place</span>
      <span class="irs-bottom-panel__tool-sublabel"></span>
    </span>
  `;

  placeButton.addEventListener('click', () => {
    uxFeedback.motion.pulse(placeButton);
    placeClickCallback?.();
  });

  const interactButton = document.createElement('button');
  interactButton.type = 'button';
  interactButton.className = 'irs-bottom-panel__tool-button';
  interactButton.setAttribute('aria-label', 'Interact');
  interactButton.setAttribute('title', 'Interact');
  interactButton.innerHTML = `
    <span class="irs-bottom-panel__tool-icon">⬚</span>
    <span class="irs-bottom-panel__tool-title">Interact</span>
  `;

  interactButton.addEventListener('click', () => {
    uxFeedback.motion.pulse(interactButton);
    interactClickCallback?.();
  });

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'irs-bottom-panel__tool-button';
  removeButton.setAttribute('aria-label', 'Remove');
  removeButton.setAttribute('title', 'Remove');
  removeButton.innerHTML = `
    <span class="irs-bottom-panel__tool-icon">⌫</span>
    <span class="irs-bottom-panel__tool-labels">
      <span class="irs-bottom-panel__tool-title">Remove</span>
      <span class="irs-bottom-panel__tool-sublabel"></span>
    </span>
  `;

  removeButton.addEventListener('click', () => {
    uxFeedback.motion.pulse(removeButton);
    removeClickCallback?.();
  });

  toolGroup.appendChild(placeButton);
  toolGroup.appendChild(interactButton);
  toolGroup.appendChild(removeButton);

  const contextStripContainer = document.createElement('div');
  contextStripContainer.className = 'irs-bottom-panel__context-strip';

  contextRow.appendChild(toolGroup);
  contextRow.appendChild(contextStripContainer);

  panel.appendChild(contextRow);
  container.appendChild(panel);

  function updateIntentButtons(): void {
    placeButton.classList.toggle('irs-bottom-panel__tool-button--active', state.currentIntent === 'place');
    interactButton.classList.toggle(
      'irs-bottom-panel__tool-button--active',
      state.currentIntent === 'interact'
    );
    removeButton.classList.toggle('irs-bottom-panel__tool-button--active', state.currentIntent === 'remove');

    placeButton.disabled = !intentContext.placeEnabled;
    removeButton.disabled = !intentContext.removeEnabled;

    placeButton.classList.toggle('irs-bottom-panel__tool-button--locked', intentContext.isLocked);
    removeButton.classList.toggle('irs-bottom-panel__tool-button--locked', intentContext.isLocked);

    const placeLabel = placeButton.querySelector('.irs-bottom-panel__tool-sublabel');
    const removeLabel = removeButton.querySelector('.irs-bottom-panel__tool-sublabel');
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

      // Acknowledge the intent switch
      if (intent === 'place') uxFeedback.motion.pulse(placeButton);
      if (intent === 'remove') uxFeedback.motion.pulse(removeButton);
      if (intent === 'interact') uxFeedback.motion.pulse(interactButton);
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
      const styleEl = document.getElementById('irs-bottom-panel-styles');
      if (styleEl) styleEl.remove();
      console.log(`${LOG_PREFIX} Bottom panel destroyed`);
    },
  };

  return controller;
}
