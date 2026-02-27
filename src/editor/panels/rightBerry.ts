import type { EditorMode } from '@/editor/core/editorMode';
import { RIGHT_BERRY_TABS, type RightBerryTab } from './rightBerryTabs';
import { createBerryShell } from './berryShell';

const LOG_PREFIX = '[RightBerry]';

/** Generic tab definition for setTabSet(). */
export interface GenericBerryTab {
  readonly id: string;
  readonly label: string;
}

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
  /** Replace current tabs with a generic tab set (e.g., for Blockly Mode). */
  setTabSet(tabs: GenericBerryTab[]): Map<string, HTMLElement>;
  /** Restore the original World Mode tabs. */
  restoreDefaultTabs(): void;
  /** Get a content container by generic tab ID (for Blockly Mode tabs). */
  getGenericTabContentContainer(tabId: string): HTMLElement | null;
  destroy(): void;
}

export function createRightBerry(container: HTMLElement, config: RightBerryConfig = {}): RightBerryController {
  const tabs = config.tabs ?? RIGHT_BERRY_TABS;

  let isOpen = Boolean(config.initialOpen);
  const shell = createBerryShell({
    container,
    position: 'right',
    title: 'Layers',
    initialOpen: isOpen,
    onOpenChange: (open) => {
      isOpen = open;
      openChangeCallbacks.forEach((cb) => cb(open));
    },
  });
  const tabBar = shell.tabBar;
  const content = shell.content;

  let tabChangeCallback: ((tab: EditorMode) => void) | null = null;
  const openChangeCallbacks: Array<(open: boolean) => void> = [];

  const tabButtons = new Map<EditorMode, HTMLButtonElement>();
  const tabContents = new Map<EditorMode, HTMLElement>();

  // Track generic (Blockly Mode) tabs separately
  const genericTabButtons = new Map<string, HTMLButtonElement>();
  const genericTabContents = new Map<string, HTMLElement>();
  let genericMode = false;

  for (const tab of tabs) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'irs-berry__tab';
    button.setAttribute('data-mode', tab.mode);
    button.textContent = tab.label;

    tabBar.appendChild(button);
    tabButtons.set(tab.mode, button);

    const tabContent = document.createElement('div');
    tabContent.className = 'irs-berry__tab-content';
    tabContent.setAttribute('data-mode', tab.mode);
    content.appendChild(tabContent);
    tabContents.set(tab.mode, tabContent);

    button.addEventListener('click', () => {
      setActiveTab(tab.mode, true);
      setOpen(true);
    });
  }

  let activeTab: EditorMode | null = config.initialTab ?? tabs[0]?.mode ?? 'ground';

  function setOpen(nextOpen: boolean): void {
    shell.setOpen(nextOpen);
  }

  function setActiveTab(nextTab: EditorMode, emit = false): void {
    if (activeTab === nextTab) return;
    activeTab = nextTab;
    for (const [mode, button] of tabButtons) {
      button.classList.toggle('irs-berry__tab--active', mode === nextTab);
    }
    for (const [mode, tabContent] of tabContents) {
      tabContent.classList.toggle('irs-berry__tab-content--active', mode === nextTab);
    }
    if (emit) {
      tabChangeCallback?.(nextTab);
    }
  }

  function applyInitialState(): void {
    shell.setOpen(isOpen);
    // Force initial tab UI state even when activeTab is already set.
    if (activeTab) {
      const initial = activeTab;
      activeTab = null;
      setActiveTab(initial);
    }
  }

  function setActiveGenericTab(tabId: string): void {
    for (const [id, button] of genericTabButtons) {
      button.classList.toggle('irs-berry__tab--active', id === tabId);
    }
    for (const [id, tabEl] of genericTabContents) {
      tabEl.classList.toggle('irs-berry__tab-content--active', id === tabId);
    }
  }

  function clearGenericTabs(): void {
    for (const button of genericTabButtons.values()) button.remove();
    for (const el of genericTabContents.values()) el.remove();
    genericTabButtons.clear();
    genericTabContents.clear();
  }

  function hideWorldTabs(): void {
    for (const button of tabButtons.values()) button.style.display = 'none';
    for (const el of tabContents.values()) {
      el.classList.remove('irs-berry__tab-content--active');
      el.style.display = 'none';
    }
  }

  function showWorldTabs(): void {
    for (const button of tabButtons.values()) button.style.display = '';
    for (const el of tabContents.values()) el.style.display = '';
    // Re-apply active tab
    if (activeTab) {
      const saved = activeTab;
      activeTab = null;
      setActiveTab(saved);
    }
  }

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
      openChangeCallbacks.push(callback);
    },
    setTabSet(newTabs) {
      // Clear any previous generic tabs
      clearGenericTabs();
      // Hide world mode tabs
      hideWorldTabs();
      genericMode = true;

      const containers = new Map<string, HTMLElement>();

      for (const tab of newTabs) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'irs-berry__tab';
        button.setAttribute('data-tab-id', tab.id);
        button.textContent = tab.label;

        tabBar.appendChild(button);
        genericTabButtons.set(tab.id, button);

        const tabContent = document.createElement('div');
        tabContent.className = 'irs-berry__tab-content';
        tabContent.setAttribute('data-tab-id', tab.id);
        content.appendChild(tabContent);
        genericTabContents.set(tab.id, tabContent);
        containers.set(tab.id, tabContent);

        button.addEventListener('click', () => {
          setActiveGenericTab(tab.id);
          setOpen(true);
        });
      }

      // Activate first tab
      if (newTabs.length > 0) {
        setActiveGenericTab(newTabs[0].id);
      }

      console.log(`${LOG_PREFIX} Tab set switched to generic tabs: ${newTabs.map((t) => t.id).join(', ')}`);
      return containers;
    },
    restoreDefaultTabs() {
      if (!genericMode) return;
      clearGenericTabs();
      showWorldTabs();
      genericMode = false;
      console.log(`${LOG_PREFIX} Restored default World Mode tabs`);
    },
    getGenericTabContentContainer(tabId) {
      return genericTabContents.get(tabId) ?? null;
    },
    destroy() {
      shell.destroy();
    },
  };
}

export function createRightBerryPlaceholder(text: string): HTMLDivElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'irs-berry__placeholder';
  placeholder.textContent = text;
  return placeholder;
}
