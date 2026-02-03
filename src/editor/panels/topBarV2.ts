/**
 * Top Bar V2 Component
 *
 * Global-only top bar for Undo/Redo/Settings/Play.
 * Provides slots for scene selector and optional layer panel content.
 */

const LOG_PREFIX = '[TopBarV2]';

export interface TopBarV2State {
  expanded: boolean;
  sceneName: string;
}

export interface TopBarV2Controller {
  /** Set the scene name display */
  setSceneName(name: string): void;

  /** Set expanded state */
  setExpanded(expanded: boolean): void;

  /** Get current expanded state */
  isExpanded(): boolean;

  /** Set undo/redo button enabled state */
  setUndoRedoState(canUndo: boolean, canRedo: boolean): void;

  /** Get the scene selector container */
  getSceneSelectorContainer(): HTMLElement;

  /** Get the content container for layer panel */
  getLayerPanelContainer(): HTMLElement;

  /** Register callback for undo */
  onUndo(callback: () => void): void;

  /** Register callback for redo */
  onRedo(callback: () => void): void;

  /** Register callback for settings */
  onSettings(callback: () => void): void;

  /** Register callback for playtest action */
  onPlaytest(callback: () => void): void;

  /** Register callback for expand/collapse toggle */
  onExpandToggle(callback: (expanded: boolean) => void): void;

  /** Clean up resources */
  destroy(): void;
}

const STYLES = `
  .top-bar-v2 {
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #141d38 0%, #0f1629 100%);
    border-bottom: 1px solid rgba(74, 158, 255, 0.15);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .top-bar-v2__main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    gap: 12px;
  }

  .top-bar-v2__group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .top-bar-v2__button {
    min-width: 44px;
    min-height: 44px;
    padding: 6px 10px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
    color: #e6ecff;
    font-size: 17px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .top-bar-v2__button:active {
    background: rgba(74, 158, 255, 0.2);
    border-color: rgba(74, 158, 255, 0.3);
    transform: scale(0.95);
  }

  .top-bar-v2__button--disabled,
  .top-bar-v2__button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .top-bar-v2__button--disabled:active,
  .top-bar-v2__button:disabled:active {
    transform: none;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
  }

  .top-bar-v2__button--play {
    background: linear-gradient(180deg, #4a9eff 0%, #2d7ee0 100%);
    border-color: rgba(74, 158, 255, 0.5);
    color: #fff;
    box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .top-bar-v2__button--play:active {
    background: linear-gradient(180deg, #3d8be6 0%, #2570cc 100%);
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
    color: #fff;
    font-weight: 600;
    font-size: 14px;
    padding: 0 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .top-bar-v2__content {
    padding: 0;
  }

  .top-bar-v2__content:empty {
    display: none;
  }

  .top-bar-v2--collapsed .top-bar-v2__content {
    display: none;
  }
`;

export function createTopBarV2(
  container: HTMLElement,
  initialState: TopBarV2State
): TopBarV2Controller {
  const state = { ...initialState };
  let undoCallback: (() => void) | null = null;
  let redoCallback: (() => void) | null = null;
  let settingsCallback: (() => void) | null = null;
  let playtestCallback: (() => void) | null = null;
  let expandToggleCallback: ((expanded: boolean) => void) | null = null;

  // Ensure styles are only added once
  if (!document.getElementById('top-bar-v2-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'top-bar-v2-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  const panel = document.createElement('div');
  panel.className = `top-bar-v2 ${state.expanded ? 'top-bar-v2--expanded' : 'top-bar-v2--collapsed'}`;

  const mainRow = document.createElement('div');
  mainRow.className = 'top-bar-v2__main';

  const leftGroup = document.createElement('div');
  leftGroup.className = 'top-bar-v2__group';

  const rightGroup = document.createElement('div');
  rightGroup.className = 'top-bar-v2__group';

  const undoButton = document.createElement('button');
  undoButton.className = 'top-bar-v2__button top-bar-v2__button--disabled';
  undoButton.type = 'button';
  undoButton.textContent = '↶';
  undoButton.setAttribute('aria-label', 'Undo');
  undoButton.disabled = true;

  const redoButton = document.createElement('button');
  redoButton.className = 'top-bar-v2__button top-bar-v2__button--disabled';
  redoButton.type = 'button';
  redoButton.textContent = '↷';
  redoButton.setAttribute('aria-label', 'Redo');
  redoButton.disabled = true;

  const settingsButton = document.createElement('button');
  settingsButton.className = 'top-bar-v2__button';
  settingsButton.type = 'button';
  settingsButton.textContent = '⚙';
  settingsButton.setAttribute('aria-label', 'Settings');

  const playButton = document.createElement('button');
  playButton.className = 'top-bar-v2__button top-bar-v2__button--play';
  playButton.type = 'button';
  playButton.textContent = '▶';
  playButton.setAttribute('aria-label', 'Playtest');

  undoButton.addEventListener('click', () => {
    undoCallback?.();
  });

  redoButton.addEventListener('click', () => {
    redoCallback?.();
  });

  settingsButton.addEventListener('click', () => {
    settingsCallback?.();
  });

  playButton.addEventListener('click', () => {
    playtestCallback?.();
  });

  leftGroup.appendChild(undoButton);
  leftGroup.appendChild(redoButton);
  rightGroup.appendChild(settingsButton);
  rightGroup.appendChild(playButton);

  mainRow.appendChild(leftGroup);
  mainRow.appendChild(rightGroup);

  const secondaryRow = document.createElement('div');
  secondaryRow.className = 'top-bar-v2__secondary';

  const sceneSelectorContainer = document.createElement('div');
  sceneSelectorContainer.className = 'top-bar-v2__scene-selector';

  const title = document.createElement('span');
  title.className = 'top-bar-v2__scene-title';
  title.textContent = state.sceneName;
  sceneSelectorContainer.appendChild(title);

  secondaryRow.appendChild(sceneSelectorContainer);

  const content = document.createElement('div');
  content.className = 'top-bar-v2__content';

  panel.appendChild(mainRow);
  panel.appendChild(secondaryRow);
  panel.appendChild(content);
  container.appendChild(panel);

  console.log(`${LOG_PREFIX} Top bar created`);

  function updateExpandedState(): void {
    panel.classList.toggle('top-bar-v2--expanded', state.expanded);
    panel.classList.toggle('top-bar-v2--collapsed', !state.expanded);
  }

  const controller: TopBarV2Controller = {
    setSceneName(name: string) {
      state.sceneName = name;
      if (title.parentElement === sceneSelectorContainer) {
        title.textContent = name;
      }
    },

    setExpanded(expanded: boolean) {
      if (state.expanded === expanded) return;
      state.expanded = expanded;
      updateExpandedState();
      expandToggleCallback?.(state.expanded);
    },

    isExpanded() {
      return state.expanded;
    },

    setUndoRedoState(canUndo: boolean, canRedo: boolean) {
      undoButton.disabled = !canUndo;
      redoButton.disabled = !canRedo;
      undoButton.classList.toggle('top-bar-v2__button--disabled', !canUndo);
      redoButton.classList.toggle('top-bar-v2__button--disabled', !canRedo);
    },

    getSceneSelectorContainer() {
      return sceneSelectorContainer;
    },

    getLayerPanelContainer() {
      return content;
    },

    onUndo(callback) {
      undoCallback = callback;
    },

    onRedo(callback) {
      redoCallback = callback;
    },

    onSettings(callback) {
      settingsCallback = callback;
    },

    onPlaytest(callback) {
      playtestCallback = callback;
    },

    onExpandToggle(callback) {
      expandToggleCallback = callback;
    },

    destroy() {
      container.removeChild(panel);
      const styleEl = document.getElementById('top-bar-v2-styles');
      if (styleEl) styleEl.remove();
      console.log(`${LOG_PREFIX} Top bar destroyed`);
    },
  };

  return controller;
}
