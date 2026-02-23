/**
 * Top Bar V2 Component
 *
 * Global-only top bar for Undo/Redo/Settings/Play.
 * Provides slots for scene selector and optional layer panel content.
 * Built using the Light DOM Factory Pattern for global CSS compatibility.
 */

import { uxFeedback } from '@/editor/uxFeedback';
import type { EditorEventBus } from '@/editor/core';
import { editorEventBus } from '@/editor/core';

const LOG_PREFIX = '[TopBarV2]';

export interface TopBarV2State {
  expanded: boolean;
  sceneName: string;
}

export interface TopBarV2Controller {
  setExpanded(expanded: boolean): void;
  isExpanded(): boolean;
  getSceneSelectorContainer(): HTMLElement;
  getLayerPanelContainer(): HTMLElement;
  onExpandToggle(callback: (expanded: boolean) => void): void;
  getSaveButtonEl(): HTMLElement;
  markDirty(): void;
  markSaved(): void;
  setVisible(visible: boolean): void;
  destroy(): void;
}

// Note: No @import needed! Global styles (.irs-btn, etc.) apply automatically in the Light DOM.
const STYLES = `
  .top-bar-v2 {
    display: flex;
    flex-direction: column;
    background: var(--irs-surface-panel);
    border-bottom: 1px solid var(--irs-border-light);
    overflow: hidden;
    width: 100%;
  }

  .top-bar-v2__main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    gap: 12px;
  }

  .top-bar-v2__group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .top-bar-v2__button {
    min-width: var(--irs-touch-target);
    min-height: var(--irs-touch-target);
    width: var(--irs-touch-target);
    height: var(--irs-touch-target);
    border-radius: var(--irs-radius-sm);
    font-size: 17px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .top-bar-v2__button--disabled,
  .top-bar-v2__button:disabled {
    opacity: 0.3;
  }

  .top-bar-v2__secondary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 12px 8px;
  }

  .top-bar-v2__scene-selector {
    flex: 1;
    min-width: 0;
  }

  .top-bar-v2__scene-title {
    color: var(--irs-text-primary);
    font-weight: 600;
    font-size: 14px;
    line-height: 1.2;
    padding: 0 4px;
    min-height: var(--irs-touch-target);
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .top-bar-v2__content-wrap {
    display: grid;
    grid-template-rows: 1fr;
    overflow: hidden;
    opacity: 1;
    transform: translateY(0);
    transition:
      grid-template-rows 200ms ease-in-out,
      opacity 200ms ease-in-out,
      transform 200ms ease-in-out;
  }

  .top-bar-v2__content {
    min-height: 0;
    padding: 0;
  }

  .top-bar-v2--collapsed .top-bar-v2__content-wrap {
    grid-template-rows: 0fr;
    opacity: 0;
    transform: translateY(calc(var(--irs-touch-target) * -0.25));
    pointer-events: none;
  }

  .top-bar-v2__content:empty + .top-bar-v2__content-empty {
    display: block;
  }

  .top-bar-v2__content-empty {
    display: none;
    height: 0;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('top-bar-v2-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'top-bar-v2-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createTopBarV2(
  container: HTMLElement,
  initialState: TopBarV2State,
  eventBus: EditorEventBus = editorEventBus
): TopBarV2Controller {
  ensureStyles();

  let isExpanded = initialState.expanded;
  let expandToggleCallback: ((expanded: boolean) => void) | null = null;
  const unsubscribers: Array<() => void> = [];

  // --- DOM Construction ---

  const wrapper = document.createElement('div');
  wrapper.className = 'top-bar-v2';

  const mainRow = document.createElement('div');
  mainRow.className = 'top-bar-v2__main';

  const leftGroup = document.createElement('div');
  leftGroup.className = 'top-bar-v2__group';

  const rightGroup = document.createElement('div');
  rightGroup.className = 'top-bar-v2__group';

  function createButton(text: string, label: string, className: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = className;
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    return button;
  }

  const undoButtonEl = createButton('↶', 'Undo', 'irs-btn irs-btn--secondary top-bar-v2__button top-bar-v2__button--disabled');
  undoButtonEl.disabled = true;
  undoButtonEl.addEventListener('click', () => {
    uxFeedback.motion.pulse(undoButtonEl);
    eventBus.dispatch('UI_ACTION_UNDO_REQUESTED', undefined);
  });

  const redoButtonEl = createButton('↷', 'Redo', 'irs-btn irs-btn--secondary top-bar-v2__button top-bar-v2__button--disabled');
  redoButtonEl.disabled = true;
  redoButtonEl.addEventListener('click', () => {
    uxFeedback.motion.pulse(redoButtonEl);
    eventBus.dispatch('UI_ACTION_REDO_REQUESTED', undefined);
  });

  const saveButtonEl = createButton('💾', 'Save', 'irs-btn irs-btn--secondary top-bar-v2__button');
  saveButtonEl.addEventListener('click', () => {
    uxFeedback.motion.pulse(saveButtonEl);
    eventBus.dispatch('UI_ACTION_SAVE_REQUESTED', undefined);
  });

  const settingsButton = createButton('⚙', 'Settings', 'irs-btn irs-btn--secondary top-bar-v2__button');
  settingsButton.addEventListener('click', () => {
    uxFeedback.motion.pulse(settingsButton);
    eventBus.dispatch('UI_ACTION_SETTINGS_REQUESTED', undefined);
  });

  const playButton = createButton('▶', 'Playtest', 'irs-btn irs-btn--primary top-bar-v2__button');
  playButton.addEventListener('click', () => {
    uxFeedback.motion.pulse(playButton);
    eventBus.dispatch('UI_ACTION_PLAYTEST_REQUESTED', undefined);
  });

  leftGroup.append(undoButtonEl, redoButtonEl, saveButtonEl);
  rightGroup.append(settingsButton, playButton);
  mainRow.append(leftGroup, rightGroup);

  const secondaryRow = document.createElement('div');
  secondaryRow.className = 'top-bar-v2__secondary';

  const sceneSelectorContainerEl = document.createElement('div');
  sceneSelectorContainerEl.className = 'top-bar-v2__scene-selector';

  const sceneTitleEl = document.createElement('span');
  sceneTitleEl.className = 'top-bar-v2__scene-title';
  sceneTitleEl.textContent = initialState.sceneName;

  sceneSelectorContainerEl.appendChild(sceneTitleEl);
  secondaryRow.appendChild(sceneSelectorContainerEl);

  const contentWrap = document.createElement('div');
  contentWrap.className = 'top-bar-v2__content-wrap';

  const contentEl = document.createElement('div');
  contentEl.className = 'top-bar-v2__content';

  const contentEmpty = document.createElement('div');
  contentEmpty.className = 'top-bar-v2__content-empty';

  contentWrap.append(contentEl, contentEmpty);
  wrapper.append(mainRow, secondaryRow, contentWrap);
  container.appendChild(wrapper);

  // --- Internal Helpers ---

  function applyExpandedState() {
    wrapper.classList.toggle('top-bar-v2--expanded', isExpanded);
    wrapper.classList.toggle('top-bar-v2--collapsed', !isExpanded);
  }

  function setUndoRedoState(canUndo: boolean, canRedo: boolean) {
    undoButtonEl.disabled = !canUndo;
    redoButtonEl.disabled = !canRedo;
    undoButtonEl.classList.toggle('top-bar-v2__button--disabled', !canUndo);
    redoButtonEl.classList.toggle('top-bar-v2__button--disabled', !canRedo);
  }

  // --- Event Subscriptions ---

  unsubscribers.push(
    eventBus.on('STATE_SCENE_CHANGED', ({ sceneName }) => {
      sceneTitleEl.textContent = sceneName;
    })
  );

  unsubscribers.push(
    eventBus.on('STATE_HISTORY_CHANGED', ({ canUndo, canRedo }) => {
      setUndoRedoState(canUndo, canRedo);
    })
  );

  // Initialization
  applyExpandedState();
  console.log(`${LOG_PREFIX} Top bar created`);

  // --- Controller API ---

  return {
    setExpanded(expanded: boolean): void {
      if (isExpanded === expanded) return;
      isExpanded = expanded;
      applyExpandedState();
      expandToggleCallback?.(isExpanded);
    },

    isExpanded(): boolean {
      return isExpanded;
    },

    getSceneSelectorContainer(): HTMLElement {
      return sceneSelectorContainerEl;
    },

    getLayerPanelContainer(): HTMLElement {
      return contentEl;
    },

    onExpandToggle(callback: (expanded: boolean) => void): void {
      expandToggleCallback = callback;
    },

    getSaveButtonEl(): HTMLElement {
      return saveButtonEl;
    },

    markDirty(): void {
      uxFeedback.storage.markDirty(saveButtonEl);
    },

    markSaved(): void {
      uxFeedback.storage.markSaved(saveButtonEl);
    },

    setVisible(visible: boolean): void {
      wrapper.style.display = visible ? '' : 'none';
    },

    destroy(): void {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribers.length = 0;
      wrapper.remove();
      console.log(`${LOG_PREFIX} Top bar destroyed`);
    },
  };
}
