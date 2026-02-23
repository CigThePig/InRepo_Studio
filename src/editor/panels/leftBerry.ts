import { createBerryShell } from './berryShell';
import {
  type BerryTabPlugin,
  type EditorPluginContext,
  type TabController,
  TabRegistry,
} from '@/editor/core/tabRegistry';

const LEFT_BERRY_PLUGIN_STYLES = `
  .irs-berry__plugin-empty-state {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--irs-border-light);
    border-radius: var(--irs-radius-md);
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
    opacity: 1;
    transform: translateY(0);
    transition: opacity 140ms ease, transform 140ms ease;
  }

  .irs-berry__plugin-empty-title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--irs-text-primary);
  }

  .irs-berry__plugin-empty-description {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: var(--irs-text-secondary);
  }

  .irs-berry__plugin-empty-cta {
    align-self: flex-start;
    min-height: var(--irs-touch-target);
    min-width: var(--irs-touch-target);
  }
`;

function ensureLeftBerryPluginStyles(): void {
  if (document.getElementById('left-berry-plugin-styles')) {
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = 'left-berry-plugin-styles';
  styleEl.textContent = LEFT_BERRY_PLUGIN_STYLES;
  document.head.appendChild(styleEl);
}

export interface LeftBerryConfig {
  initialOpen?: boolean;
  initialTab?: string;
  tabRegistry?: TabRegistry;
  tabs?: BerryTabPlugin[];
  pluginContext: Omit<EditorPluginContext, 'openTab'>;
}

export interface LeftBerryController {
  open(tab?: string): void;
  openAnimation(animationId: string): void;
  close(): void;
  isOpen(): boolean;
  getActiveTab(): string | null;
  setActiveTab(tab: string, options?: { silent?: boolean }): void;
  getTabContentContainer(tab: string): HTMLElement | null;
  onTabChange(callback: (tab: string) => void): void;
  onOpenChange(callback: (open: boolean) => void): void;
  refreshTab(tab: string): void;
  setInsertBlockFn(fn: ((blockType: string) => void) | null): void;
  setOpenInBlocklyFn(fn: ((blockType: string) => void | Promise<void>) | null): void;
  destroy(): void;
}

export function createLeftBerry(container: HTMLElement, config: LeftBerryConfig): LeftBerryController {
  ensureLeftBerryPluginStyles();

  const plugins = config.tabs ?? config.tabRegistry?.getLeftBerryTabs() ?? [];
  const activeTabId = config.initialTab ?? plugins[0]?.id ?? null;
  let isOpen = config.initialOpen ?? false;
  let currentTab: string | null = null;
  const tabChangeCallbacks: Array<(tab: string) => void> = [];
  const openChangeCallbacks: Array<(open: boolean) => void> = [];

  const shell = createBerryShell({
    container,
    position: 'left',
    title: 'Assets',
    initialOpen: isOpen,
    onOpenChange: (open) => {
      isOpen = open;
      openChangeCallbacks.forEach((cb) => cb(open));
    },
  });

  const tabContentMap = new Map<string, HTMLElement>();
  const pluginControllers = new Map<string, TabController>();

  const pluginContext: EditorPluginContext = {
    ...config.pluginContext,
    openTab: (tabId: string) => setActiveTab(tabId),
    openAnimation: (animationId: string) => {
      shell.setOpen(true);
      setActiveTab('animation');
      pluginControllers.get('animation')?.openAnimation?.(animationId);
    },
  };

  plugins.forEach((plugin) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'irs-berry__tab';
    button.dataset.tab = plugin.id;
    button.style.minHeight = 'var(--irs-touch-target)';
    button.style.minWidth = 'var(--irs-touch-target)';
    button.innerHTML = `<span class="irs-berry__tab-icon">${plugin.icon}</span>${plugin.label}`;
    button.addEventListener('click', () => setActiveTab(plugin.id));
    shell.tabBar.appendChild(button);

    const tabContent = document.createElement('div');
    tabContent.className = 'irs-berry__tab-content';
    tabContent.dataset.tab = plugin.id;
    shell.content.appendChild(tabContent);
    tabContentMap.set(plugin.id, tabContent);

    const controller = plugin.mount(tabContent, pluginContext);
    pluginControllers.set(plugin.id, controller);
  });

  function setActiveTab(tab: string, options?: { silent?: boolean }): void {
    if (currentTab !== null && currentTab === tab) {
      return;
    }
    currentTab = tab;

    for (const button of shell.tabBar.querySelectorAll<HTMLButtonElement>('.irs-berry__tab')) {
      const isActive = button.dataset.tab === tab;
      button.classList.toggle('irs-berry__tab--active', isActive);
    }

    for (const tabContent of tabContentMap.values()) {
      const isActive = tabContent.dataset.tab === tab;
      tabContent.classList.toggle('irs-berry__tab-content--active', isActive);
    }

    pluginControllers.get(tab)?.refresh?.();

    if (!options?.silent) {
      tabChangeCallbacks.forEach((cb) => cb(tab));
    }
  }

  shell.setOpen(isOpen);
  if (activeTabId) {
    setActiveTab(activeTabId, { silent: true });
  }

  return {
    open: (tab) => {
      shell.setOpen(true);
      if (tab) {
        setActiveTab(tab);
      }
    },
    openAnimation: (animationId) => {
      shell.setOpen(true);
      setActiveTab('animation');
      pluginControllers.get('animation')?.openAnimation?.(animationId);
    },
    close: () => shell.setOpen(false),
    isOpen: () => shell.isOpen(),
    getActiveTab: () => currentTab,
    setActiveTab,
    getTabContentContainer: (tab) => tabContentMap.get(tab) ?? null,
    onTabChange: (callback) => tabChangeCallbacks.push(callback),
    onOpenChange: (callback) => openChangeCallbacks.push(callback),
    refreshTab: (tab) => {
      pluginControllers.get(tab)?.refresh?.();
    },
    setInsertBlockFn: (fn) => {
      pluginControllers.get('presets')?.setInsertBlockFn?.(fn);
    },
    setOpenInBlocklyFn: (fn) => {
      pluginControllers.get('presets')?.setOpenInBlocklyFn?.(fn);
    },
    destroy: () => {
      pluginControllers.forEach((controller) => {
        controller.destroy?.();
      });
      shell.destroy();
    },
  };
}

export function createLeftBerryPlaceholder(text: string): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'irs-berry__placeholder';
  placeholder.textContent = text;
  return placeholder;
}
