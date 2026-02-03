import type { EditorMode } from '@/editor/v2/editorMode';
import { RIGHT_BERRY_TABS, type RightBerryTab } from './rightBerryTabs';

const LOG_PREFIX = '[RightBerry]';

export interface RightBerryConfig {
  initialOpen?: boolean;
  initialTab?: EditorMode;
  tabs?: RightBerryTab[];
}

export interface RightBerryController {
  open(tab?: EditorMode): void;
  close(): void;
  isOpen(): boolean;
  getActiveTab(): EditorMode | null;
  setActiveTab(tab: EditorMode, options?: { silent?: boolean }): void;
  getTabContentContainer(tab: EditorMode): HTMLElement | null;
  onTabChange(callback: (tab: EditorMode) => void): void;
  onOpenChange(callback: (open: boolean) => void): void;
  destroy(): void;
}

const STYLES = `
  .right-berry-shell {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 20;
  }

  .right-berry-shell--open {
    pointer-events: auto;
  }

  .right-berry__overlay {
    position: absolute;
    inset: 0;
    background: rgba(5, 10, 24, 0.55);
    opacity: 0;
    transition: opacity 0.2s ease-out;
    pointer-events: none;
  }

  .right-berry-shell--open .right-berry__overlay {
    opacity: 1;
    pointer-events: auto;
  }

  .right-berry {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    width: min(320px, 85vw);
    background: #111a33;
    border-left: 1px solid #253461;
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.35);
    transform: translateX(100%);
    transition: transform 0.2s ease-out;
    display: flex;
    flex-direction: column;
  }

  .right-berry-shell--open .right-berry {
    transform: translateX(0);
  }

  .right-berry__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid #253461;
    background: #152040;
  }

  .right-berry__title {
    font-size: 14px;
    font-weight: 600;
    color: #e6ecff;
  }

  .right-berry__close {
    min-width: 44px;
    min-height: 44px;
    border-radius: 8px;
    border: 2px solid transparent;
    background: #2a2a4e;
    color: #e6ecff;
    font-size: 18px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .right-berry__close:active {
    background: #3a3a6e;
  }

  .right-berry__tabs {
    display: flex;
    gap: 6px;
    padding: 8px 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-bottom: 1px solid #253461;
  }

  .right-berry__tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    min-width: 44px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 2px solid transparent;
    background: #222b4f;
    color: #cfd8ff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }

  .right-berry__tab:active {
    background: #2f3b66;
  }

  .right-berry__tab--active {
    border-color: #4a9eff;
    background: #2f3b66;
    color: #fff;
  }

  .right-berry__tab-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(74, 158, 255, 0.2);
    color: #cfe6ff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
  }

  .right-berry__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .right-berry__tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: none;
  }

  .right-berry__tab-content--active {
    display: block;
  }

  .right-berry__placeholder {
    color: #9aa7d6;
    font-size: 13px;
    line-height: 1.4;
    background: rgba(20, 28, 52, 0.6);
    border: 1px dashed #2b3a66;
    border-radius: 12px;
    padding: 12px;
  }

  .right-berry__handle {
    position: absolute;
    right: max(20px, env(safe-area-inset-right));
    top: 50%;
    transform: translate(0, -50%);
    width: 96px;
    height: 92px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  /* Visible "berry" pill sits inside a larger invisible hit target. */
  .right-berry__handle-pill {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 86px;
    border-radius: 999px;
    border: 1px solid #2b3a66;
    background: linear-gradient(180deg, rgba(34, 43, 79, 0.95), rgba(20, 28, 52, 0.95));
    box-shadow: -6px 0 18px rgba(0, 0, 0, 0.28);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .right-berry__handle-icon {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: rgba(74, 158, 255, 0.18);
    color: #dbe4ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }

  .right-berry__handle:active .right-berry__handle-pill {
    background: linear-gradient(180deg, rgba(47, 59, 102, 0.98), rgba(20, 28, 52, 0.98));
  }

  .right-berry-shell--open .right-berry__handle {
    opacity: 0;
    pointer-events: none;
  }
`;

export function createRightBerry(container: HTMLElement, config: RightBerryConfig = {}): RightBerryController {
  const tabs = config.tabs ?? RIGHT_BERRY_TABS;
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  const shell = document.createElement('div');
  shell.className = 'right-berry-shell';

  const overlay = document.createElement('div');
  overlay.className = 'right-berry__overlay';

  const panel = document.createElement('div');
  panel.className = 'right-berry';

  const header = document.createElement('div');
  header.className = 'right-berry__header';

  const title = document.createElement('div');
  title.className = 'right-berry__title';
  title.textContent = 'World Modes';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'right-berry__close';
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', 'Close mode panel');

  header.appendChild(title);
  header.appendChild(closeButton);

  const tabBar = document.createElement('div');
  tabBar.className = 'right-berry__tabs';

  const content = document.createElement('div');
  content.className = 'right-berry__content';

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'right-berry__handle';
  handle.setAttribute('aria-label', 'Open mode panel');

  const handlePill = document.createElement('div');
  handlePill.className = 'right-berry__handle-pill';

  const handleIcon = document.createElement('div');
  handleIcon.className = 'right-berry__handle-icon';
  handleIcon.textContent = '≡';

  handlePill.appendChild(handleIcon);
  handle.appendChild(handlePill);

  panel.appendChild(header);
  panel.appendChild(tabBar);
  panel.appendChild(content);

  shell.appendChild(overlay);
  shell.appendChild(panel);
  shell.appendChild(handle);
  container.appendChild(shell);

  let tabChangeCallback: ((tab: EditorMode) => void) | null = null;
  let openChangeCallback: ((open: boolean) => void) | null = null;

  const tabButtons = new Map<EditorMode, HTMLButtonElement>();
  const tabContents = new Map<EditorMode, HTMLElement>();

  for (const tab of tabs) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'right-berry__tab';
    button.setAttribute('data-mode', tab.mode);

    const icon = document.createElement('span');
    icon.className = 'right-berry__tab-icon';
    icon.textContent = tab.icon;

    const label = document.createElement('span');
    label.textContent = tab.label;

    button.appendChild(icon);
    button.appendChild(label);

    tabBar.appendChild(button);
    tabButtons.set(tab.mode, button);

    const tabContent = document.createElement('div');
    tabContent.className = 'right-berry__tab-content';
    tabContent.setAttribute('data-mode', tab.mode);
    content.appendChild(tabContent);
    tabContents.set(tab.mode, tabContent);

    button.addEventListener('click', () => {
      setActiveTab(tab.mode, true);
      setOpen(true);
    });
  }

  let activeTab: EditorMode | null = config.initialTab ?? tabs[0]?.mode ?? 'ground';
  let isOpen = Boolean(config.initialOpen);

  function setOpen(nextOpen: boolean): void {
    if (isOpen === nextOpen) return;
    isOpen = nextOpen;
    shell.classList.toggle('right-berry-shell--open', isOpen);
    openChangeCallback?.(isOpen);
  }

  function setActiveTab(nextTab: EditorMode, emit = false): void {
    if (activeTab === nextTab) return;
    activeTab = nextTab;
    for (const [mode, button] of tabButtons) {
      button.classList.toggle('right-berry__tab--active', mode === nextTab);
    }
    for (const [mode, tabContent] of tabContents) {
      tabContent.classList.toggle('right-berry__tab-content--active', mode === nextTab);
    }
    if (emit) {
      tabChangeCallback?.(nextTab);
    }
  }

  function applyInitialState(): void {
    shell.classList.toggle('right-berry-shell--open', isOpen);
    // Force initial tab UI state even when activeTab is already set.
    if (activeTab) {
      const initial = activeTab;
      activeTab = null;
      setActiveTab(initial);
    }
  }

  function handleSwipeToClose(): void {
    let startX: number | null = null;
    let startY: number | null = null;

    panel.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
    });

    panel.addEventListener('touchmove', (event) => {
      if (!isOpen) return;
      const touch = event.touches[0];
      if (!touch || startX === null || startY === null) return;
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);
      if (deltaX > 70 && deltaY < 40) {
        setOpen(false);
        startX = null;
        startY = null;
      }
    });

    panel.addEventListener('touchend', () => {
      startX = null;
      startY = null;
    });
  }

  overlay.addEventListener('click', () => {
    setOpen(false);
  });

  closeButton.addEventListener('click', () => {
    setOpen(false);
  });

  handle.addEventListener('click', () => {
    setOpen(true);
  });

  handleSwipeToClose();
  applyInitialState();

  console.log(`${LOG_PREFIX} Right berry created`);

  return {
    open(tab) {
      if (tab) {
        setActiveTab(tab, true);
      }
      setOpen(true);
    },
    close() {
      setOpen(false);
    },
    isOpen() {
      return isOpen;
    },
    getActiveTab() {
      return activeTab;
    },
    setActiveTab(tab, options) {
      setActiveTab(tab, !options?.silent);
    },
    getTabContentContainer(tab) {
      return tabContents.get(tab) ?? null;
    },
    onTabChange(callback) {
      tabChangeCallback = callback;
    },
    onOpenChange(callback) {
      openChangeCallback = callback;
    },
    destroy() {
      shell.remove();
      styleEl.remove();
    },
  };
}

export function createRightBerryPlaceholder(text: string): HTMLDivElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'right-berry__placeholder';
  placeholder.textContent = text;
  return placeholder;
}
