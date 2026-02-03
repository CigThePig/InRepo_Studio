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
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 0.25s ease-out;
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
    background: #0d1220;
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
    transform: translateX(100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .right-berry-shell--open .right-berry {
    transform: translateX(0);
  }

  .right-berry__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
  }

  .right-berry__title {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }

  .right-berry__close {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: none;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.6);
    font-size: 18px;
    font-weight: 300;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, color 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .right-berry__close:active {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .right-berry__tabs {
    display: flex;
    gap: 6px;
    padding: 12px 16px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    scrollbar-width: none;
    flex-shrink: 0;
  }

  .right-berry__tabs::-webkit-scrollbar {
    display: none;
  }

  .right-berry__tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    padding: 0 14px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
  }

  .right-berry__tab:active {
    background: rgba(255, 255, 255, 0.05);
  }

  .right-berry__tab--active {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-weight: 600;
  }

  .right-berry__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .right-berry__tab-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px;
    display: none;
    -webkit-overflow-scrolling: touch;
  }

  .right-berry__tab-content::-webkit-scrollbar {
    width: 4px;
  }

  .right-berry__tab-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .right-berry__tab-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
  }

  .right-berry__tab-content--active {
    display: flex;
    flex-direction: column;
  }

  .right-berry__placeholder {
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
    line-height: 1.5;
    background: rgba(255, 255, 255, 0.03);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 16px;
  }

  /* Slim edge handle */
  .right-berry__handle {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 64px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .right-berry__handle-tab {
    width: 20px;
    height: 56px;
    background: rgba(30, 40, 60, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-right: none;
    border-radius: 10px 0 0 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
  }

  .right-berry__handle:active .right-berry__handle-tab {
    background: rgba(40, 55, 80, 0.95);
    width: 24px;
  }

  .right-berry__handle-icon {
    color: rgba(255, 255, 255, 0.5);
    font-size: 10px;
    transition: color 0.2s;
  }

  .right-berry__handle:active .right-berry__handle-icon {
    color: rgba(255, 255, 255, 0.8);
  }

  .right-berry-shell--open .right-berry__handle {
    opacity: 0;
    pointer-events: none;
  }
`;

export function createRightBerry(container: HTMLElement, config: RightBerryConfig = {}): RightBerryController {
  const tabs = config.tabs ?? RIGHT_BERRY_TABS;
  
  // Ensure styles are only added once
  if (!document.getElementById('right-berry-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'right-berry-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

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
  title.textContent = 'Layers';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'right-berry__close';
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', 'Close panel');

  header.appendChild(title);
  header.appendChild(closeButton);

  const tabBar = document.createElement('div');
  tabBar.className = 'right-berry__tabs';

  const content = document.createElement('div');
  content.className = 'right-berry__content';

  // Slim edge-hugging handle
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'right-berry__handle';
  handle.setAttribute('aria-label', 'Open layer panel');

  const handleTab = document.createElement('div');
  handleTab.className = 'right-berry__handle-tab';

  const handleIcon = document.createElement('div');
  handleIcon.className = 'right-berry__handle-icon';
  handleIcon.textContent = '‹';

  handleTab.appendChild(handleIcon);
  handle.appendChild(handleTab);

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
    button.textContent = tab.label;

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
      const styleEl = document.getElementById('right-berry-styles');
      if (styleEl) styleEl.remove();
    },
  };
}

export function createRightBerryPlaceholder(text: string): HTMLDivElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'right-berry__placeholder';
  placeholder.textContent = text;
  return placeholder;
}
