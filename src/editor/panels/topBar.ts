/**
 * Top Bar V2 Component
 *
 * Global-only top bar for Undo/Redo/Settings/Play.
 * Provides slots for scene selector and optional layer panel content.
 */

import { uxFeedback } from '@/editor/uxFeedback';

const LOG_PREFIX = '[TopBarV2]';
const TOP_BAR_TAG = 'irs-top-bar';

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

  /** Register callback for save button click */
  onSave(callback: () => void): void;

  /** Get the save button element (for uxFeedback callers in init.ts) */
  getSaveButtonEl(): HTMLElement;

  /** Mark the save button as dirty (unsaved changes exist) */
  markDirty(): void;

  /** Mark the save button as cleanly saved (auto-save path, no toast) */
  markSaved(): void;

  /** Show or hide the entire top bar (for Blockly Mode switching). */
  setVisible(visible: boolean): void;

  /** Clean up resources */
  destroy(): void;
}

const STYLES = `
  @import url('/src/shared/common-styles.css');

  :host {
    display: block;
  }

  .top-bar-v2 {
    display: flex;
    flex-direction: column;
    background: var(--irs-surface-panel);
    border-bottom: 1px solid var(--irs-border-light);
    overflow: hidden;
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
    overflow: hidden;
    max-height: 280px;
    opacity: 1;
    transform: translateY(0);
    transition:
      max-height 180ms ease,
      opacity 180ms ease,
      transform 180ms ease;
  }

  .top-bar-v2__content {
    padding: 0;
  }

  .top-bar-v2--collapsed .top-bar-v2__content-wrap {
    max-height: 0;
    opacity: 0;
    transform: translateY(-6px);
  }

  .top-bar-v2__content:empty + .top-bar-v2__content-empty {
    display: block;
  }

  .top-bar-v2__content-empty {
    display: none;
    height: 0;
  }
`;

class TopBarElement extends HTMLElement implements TopBarV2Controller {
  static get observedAttributes(): string[] {
    return ['expanded', 'scene-name'];
  }

  private readonly shadowRootRef: ShadowRoot;
  private panelEl: HTMLDivElement | null = null;
  private sceneTitleEl: HTMLSpanElement | null = null;
  private undoButtonEl: HTMLButtonElement | null = null;
  private redoButtonEl: HTMLButtonElement | null = null;
  private saveButtonEl: HTMLButtonElement | null = null;
  private sceneSelectorContainerEl: HTMLDivElement | null = null;
  private contentEl: HTMLDivElement | null = null;

  private undoCallback: (() => void) | null = null;
  private redoCallback: (() => void) | null = null;
  private settingsCallback: (() => void) | null = null;
  private playtestCallback: (() => void) | null = null;
  private expandToggleCallback: ((expanded: boolean) => void) | null = null;
  private saveCallback: (() => void) | null = null;

  private isRendered = false;

  constructor() {
    super();
    this.shadowRootRef = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (!this.isRendered) {
      this.render();
      this.isRendered = true;
      console.log(`${LOG_PREFIX} Top bar created`);
    }
    this.applyExpandedState();
    this.applySceneName();
  }

  disconnectedCallback(): void {
    this.undoCallback = null;
    this.redoCallback = null;
    this.settingsCallback = null;
    this.playtestCallback = null;
    this.expandToggleCallback = null;
    this.saveCallback = null;
    console.log(`${LOG_PREFIX} Top bar disconnected`);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) {
      return;
    }

    if (name === 'expanded') {
      this.applyExpandedState();
      this.expandToggleCallback?.(this.isExpanded());
      return;
    }

    if (name === 'scene-name') {
      this.applySceneName();
    }
  }

  setSceneName(name: string): void {
    this.setAttribute('scene-name', name);
  }

  setExpanded(expanded: boolean): void {
    if (expanded) {
      this.setAttribute('expanded', 'true');
      return;
    }
    this.removeAttribute('expanded');
  }

  isExpanded(): boolean {
    return this.getAttribute('expanded') === 'true';
  }

  setUndoRedoState(canUndo: boolean, canRedo: boolean): void {
    if (!this.undoButtonEl || !this.redoButtonEl) {
      return;
    }

    this.undoButtonEl.disabled = !canUndo;
    this.redoButtonEl.disabled = !canRedo;
    this.undoButtonEl.classList.toggle('top-bar-v2__button--disabled', !canUndo);
    this.redoButtonEl.classList.toggle('top-bar-v2__button--disabled', !canRedo);
  }

  getSceneSelectorContainer(): HTMLElement {
    if (!this.sceneSelectorContainerEl) {
      throw new Error(`${LOG_PREFIX} Scene selector container unavailable`);
    }
    return this.sceneSelectorContainerEl;
  }

  getLayerPanelContainer(): HTMLElement {
    if (!this.contentEl) {
      throw new Error(`${LOG_PREFIX} Layer panel container unavailable`);
    }
    return this.contentEl;
  }

  onUndo(callback: () => void): void {
    this.undoCallback = callback;
  }

  onRedo(callback: () => void): void {
    this.redoCallback = callback;
  }

  onSettings(callback: () => void): void {
    this.settingsCallback = callback;
  }

  onPlaytest(callback: () => void): void {
    this.playtestCallback = callback;
  }

  onExpandToggle(callback: (expanded: boolean) => void): void {
    this.expandToggleCallback = callback;
  }

  onSave(callback: () => void): void {
    this.saveCallback = callback;
  }

  getSaveButtonEl(): HTMLElement {
    if (!this.saveButtonEl) {
      throw new Error(`${LOG_PREFIX} Save button unavailable`);
    }
    return this.saveButtonEl;
  }

  markDirty(): void {
    if (!this.saveButtonEl) {
      return;
    }
    uxFeedback.storage.markDirty(this.saveButtonEl);
  }

  markSaved(): void {
    if (!this.saveButtonEl) {
      return;
    }
    uxFeedback.storage.markSaved(this.saveButtonEl);
  }

  setVisible(visible: boolean): void {
    this.style.display = visible ? '' : 'none';
  }

  destroy(): void {
    this.remove();
  }

  private render(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'top-bar-v2';

    const styleEl = document.createElement('style');
    styleEl.textContent = STYLES;

    const mainRow = document.createElement('div');
    mainRow.className = 'top-bar-v2__main';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'top-bar-v2__group';

    const rightGroup = document.createElement('div');
    rightGroup.className = 'top-bar-v2__group';

    this.undoButtonEl = this.createButton('↶', 'Undo', 'irs-btn irs-btn--secondary top-bar-v2__button top-bar-v2__button--disabled');
    this.undoButtonEl.disabled = true;
    this.undoButtonEl.addEventListener('click', () => {
      this.undoCallback?.();
    });

    this.redoButtonEl = this.createButton('↷', 'Redo', 'irs-btn irs-btn--secondary top-bar-v2__button top-bar-v2__button--disabled');
    this.redoButtonEl.disabled = true;
    this.redoButtonEl.addEventListener('click', () => {
      this.redoCallback?.();
    });

    this.saveButtonEl = this.createButton('💾', 'Save', 'irs-btn irs-btn--secondary top-bar-v2__button');
    this.saveButtonEl.addEventListener('click', () => {
      this.saveCallback?.();
    });

    const settingsButton = this.createButton('⚙', 'Settings', 'irs-btn irs-btn--secondary top-bar-v2__button');
    settingsButton.addEventListener('click', () => {
      this.settingsCallback?.();
    });

    const playButton = this.createButton('▶', 'Playtest', 'irs-btn irs-btn--primary top-bar-v2__button');
    playButton.addEventListener('click', () => {
      this.playtestCallback?.();
    });

    leftGroup.append(this.undoButtonEl, this.redoButtonEl, this.saveButtonEl);
    rightGroup.append(settingsButton, playButton);
    mainRow.append(leftGroup, rightGroup);

    const secondaryRow = document.createElement('div');
    secondaryRow.className = 'top-bar-v2__secondary';

    this.sceneSelectorContainerEl = document.createElement('div');
    this.sceneSelectorContainerEl.className = 'top-bar-v2__scene-selector';

    this.sceneTitleEl = document.createElement('span');
    this.sceneTitleEl.className = 'top-bar-v2__scene-title';

    this.sceneSelectorContainerEl.appendChild(this.sceneTitleEl);
    secondaryRow.appendChild(this.sceneSelectorContainerEl);

    const contentWrap = document.createElement('div');
    contentWrap.className = 'top-bar-v2__content-wrap';

    this.contentEl = document.createElement('div');
    this.contentEl.className = 'top-bar-v2__content';

    const contentEmpty = document.createElement('div');
    contentEmpty.className = 'top-bar-v2__content-empty';

    contentWrap.append(this.contentEl, contentEmpty);

    wrapper.append(mainRow, secondaryRow, contentWrap);

    this.panelEl = wrapper;
    this.shadowRootRef.append(styleEl, wrapper);
  }

  private applyExpandedState(): void {
    if (!this.panelEl) {
      return;
    }
    this.panelEl.classList.toggle('top-bar-v2--expanded', this.isExpanded());
    this.panelEl.classList.toggle('top-bar-v2--collapsed', !this.isExpanded());
  }

  private applySceneName(): void {
    if (!this.sceneTitleEl) {
      return;
    }
    this.sceneTitleEl.textContent = this.getAttribute('scene-name') ?? '';
  }

  private createButton(text: string, label: string, className: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = className;
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    return button;
  }
}

if (!customElements.get(TOP_BAR_TAG)) {
  customElements.define(TOP_BAR_TAG, TopBarElement);
}

export function createTopBarV2(container: HTMLElement, initialState: TopBarV2State): TopBarV2Controller {
  const topBar = document.createElement(TOP_BAR_TAG) as TopBarElement;
  container.appendChild(topBar);

  topBar.setExpanded(initialState.expanded);
  topBar.setSceneName(initialState.sceneName);

  return topBar;
}
