import { LEFT_BERRY_TABS, type LeftBerryTab, type LeftBerryTabId } from './leftBerryTabs';
import { createSpriteSlicerTab } from './spriteSlicerTab';
import { createAssetLibraryTab, type AssetLibraryTabController } from './assetLibraryTab';
import type { AssetEntryInput, AssetRegistry } from '@/editor/assets';

const LOG_PREFIX = '[LeftBerry]';

export interface LeftBerryConfig {
  initialOpen?: boolean;
  initialTab?: LeftBerryTabId;
  tabs?: LeftBerryTab[];
  assetRegistry?: AssetRegistry;
  assetLibraryEnabled?: boolean;
}

export interface LeftBerryController {
  open(tab?: LeftBerryTabId): void;
  close(): void;
  isOpen(): boolean;
  getActiveTab(): LeftBerryTabId | null;
  setActiveTab(tab: LeftBerryTabId, options?: { silent?: boolean }): void;
  getTabContentContainer(tab: LeftBerryTabId): HTMLElement | null;
  onTabChange(callback: (tab: LeftBerryTabId) => void): void;
  onOpenChange(callback: (open: boolean) => void): void;
  destroy(): void;
}

const STYLES = `
  .left-berry-shell {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 20;
  }

  .left-berry-shell--open {
    pointer-events: auto;
  }

  .left-berry__overlay {
    position: absolute;
    inset: 0;
    background: rgba(5, 10, 24, 0.55);
    opacity: 0;
    transition: opacity 0.2s ease-out;
    pointer-events: none;
  }

  .left-berry-shell--open .left-berry__overlay {
    opacity: 1;
    pointer-events: auto;
  }

  .left-berry {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: min(320px, 85vw);
    background: #111a33;
    border-right: 1px solid #253461;
    box-shadow: 8px 0 24px rgba(0, 0, 0, 0.35);
    transform: translateX(-100%);
    transition: transform 0.2s ease-out;
    display: flex;
    flex-direction: column;
  }

  .left-berry-shell--open .left-berry {
    transform: translateX(0);
  }

  .left-berry__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid #253461;
    background: #152040;
  }

  .left-berry__title {
    font-size: 14px;
    font-weight: 600;
    color: #e6ecff;
  }

  .left-berry__close {
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

  .left-berry__close:active {
    background: #3a3a6e;
  }

  .left-berry__tabs {
    display: flex;
    gap: 6px;
    padding: 8px 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-bottom: 1px solid #253461;
  }

  .left-berry__tab {
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

  .left-berry__tab:active {
    background: #2f3b66;
  }

  .left-berry__tab--active {
    border-color: #4a9eff;
    background: #2f3b66;
    color: #fff;
  }

  .left-berry__tab-icon {
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

  .left-berry__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .left-berry__tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: none;
  }

  .left-berry__tab-content--active {
    display: block;
  }

  .left-berry__placeholder {
    color: #9aa7d6;
    font-size: 13px;
    line-height: 1.4;
    background: rgba(20, 28, 52, 0.6);
    border: 1px dashed #2b3a66;
    border-radius: 12px;
    padding: 12px;
  }

  .left-berry__handle {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translate(-50%, -50%);
    min-width: 44px;
    min-height: 64px;
    border-radius: 16px;
    border: 2px solid #2b3a66;
    background: #1b2444;
    color: #cfd8ff;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }

  .left-berry-shell--open .left-berry__handle {
    opacity: 0;
    pointer-events: none;
  }

`;

function ensureStyles(): void {
  if (document.getElementById('left-berry-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'left-berry-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createLeftBerry(container: HTMLElement, config: LeftBerryConfig = {}): LeftBerryController {
  ensureStyles();

  const tabs = config.tabs ?? LEFT_BERRY_TABS;
  const activeTabId = config.initialTab ?? tabs[0]?.id ?? 'sprites';
  let isOpen = config.initialOpen ?? false;
  let currentTab: LeftBerryTabId = activeTabId;
  const tabChangeCallbacks: Array<(tab: LeftBerryTabId) => void> = [];
  const openChangeCallbacks: Array<(open: boolean) => void> = [];
  const assetRegistry = config.assetRegistry;
  const assetLibraryEnabled = config.assetLibraryEnabled ?? true;
  let assetLibraryController: AssetLibraryTabController | null = null;

  const shell = document.createElement('div');
  shell.className = 'left-berry-shell';

  const overlay = document.createElement('div');
  overlay.className = 'left-berry__overlay';

  const panel = document.createElement('div');
  panel.className = 'left-berry';

  const header = document.createElement('div');
  header.className = 'left-berry__header';

  const title = document.createElement('div');
  title.className = 'left-berry__title';
  title.textContent = 'Assets';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'left-berry__close';
  closeButton.textContent = '×';

  header.appendChild(title);
  header.appendChild(closeButton);

  const tabBar = document.createElement('div');
  tabBar.className = 'left-berry__tabs';

  const content = document.createElement('div');
  content.className = 'left-berry__content';

  const tabContentMap = new Map<LeftBerryTabId, HTMLElement>();

  tabs.forEach((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'left-berry__tab';
    button.dataset.tab = tab.id;
    button.innerHTML = `<span class="left-berry__tab-icon">${tab.icon}</span>${tab.label}`;
    button.addEventListener('click', () => setActiveTab(tab.id));
    tabBar.appendChild(button);

    const tabContent = document.createElement('div');
    tabContent.className = 'left-berry__tab-content';
    tabContent.dataset.tab = tab.id;
    content.appendChild(tabContent);
    tabContentMap.set(tab.id, tabContent);
  });

  panel.appendChild(header);
  panel.appendChild(tabBar);
  panel.appendChild(content);

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'left-berry__handle';
  handle.textContent = '▶';

  shell.appendChild(overlay);
  shell.appendChild(panel);
  shell.appendChild(handle);

  container.appendChild(shell);

  const spritesContainer = tabContentMap.get('sprites');
  if (spritesContainer) {
    createSpriteSlicerTab({
      container: spritesContainer,
      onSlicesConfirmed: (payload) => {
        if (!assetRegistry) return;
        const { slices, groupName, groupType, imageName, sliceSize } = payload;
        const baseName = groupName || imageName || 'Asset Group';
        const assetsToAdd: AssetEntryInput[] = slices.map((slice, index) => ({
          name: `${baseName} ${index + 1}`,
          type: groupType === 'entities' ? 'entity' : groupType === 'props' ? 'sprite' : 'tile',
          dataUrl: slice.dataUrl,
          width: sliceSize.width,
          height: sliceSize.height,
        }));
        assetRegistry.addAssets({
          groupType,
          groupName: baseName,
          assets: assetsToAdd,
        });
        setActiveTab('assets');
      },
    });
  }

  const assetsContainer = tabContentMap.get('assets');
  if (assetsContainer) {
    if (assetLibraryEnabled && assetRegistry) {
      assetLibraryController = createAssetLibraryTab({
        container: assetsContainer,
        assetRegistry,
      });
    } else {
      assetsContainer.appendChild(
        createLeftBerryPlaceholder('Asset library is disabled for this session.')
      );
    }
  }

  function updateOpenState(nextOpen: boolean): void {
    isOpen = nextOpen;
    shell.classList.toggle('left-berry-shell--open', isOpen);
    openChangeCallbacks.forEach((callback) => callback(isOpen));
  }

  function setActiveTab(tab: LeftBerryTabId, options?: { silent?: boolean }): void {
    const isSameTab = currentTab === tab;
    currentTab = tab;
    tabBar.querySelectorAll('.left-berry__tab').forEach((button) => {
      button.classList.toggle('left-berry__tab--active', button.getAttribute('data-tab') === tab);
    });
    tabContentMap.forEach((tabContent, key) => {
      tabContent.classList.toggle('left-berry__tab-content--active', key === tab);
    });
    if (!options?.silent && !isSameTab) {
      tabChangeCallbacks.forEach((callback) => callback(tab));
    }
  }

  function handleClose(): void {
    updateOpenState(false);
  }

  let swipeStartX: number | null = null;

  function onTouchStart(event: TouchEvent): void {
    swipeStartX = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent): void {
    if (swipeStartX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? swipeStartX;
    const deltaX = endX - swipeStartX;
    swipeStartX = null;
    if (deltaX < -60) {
      handleClose();
    }
  }

  overlay.addEventListener('click', handleClose);
  closeButton.addEventListener('click', handleClose);
  handle.addEventListener('click', () => updateOpenState(true));
  panel.addEventListener('touchstart', onTouchStart);
  panel.addEventListener('touchend', onTouchEnd);

  updateOpenState(isOpen);
  setActiveTab(currentTab, { silent: true });

  return {
    open: (tab) => {
      updateOpenState(true);
      if (tab) setActiveTab(tab);
    },
    close: () => updateOpenState(false),
    isOpen: () => isOpen,
    getActiveTab: () => currentTab,
    setActiveTab,
    getTabContentContainer: (tab) => tabContentMap.get(tab) ?? null,
    onTabChange: (callback) => tabChangeCallbacks.push(callback),
    onOpenChange: (callback) => openChangeCallbacks.push(callback),
    destroy: () => {
      panel.removeEventListener('touchstart', onTouchStart);
      panel.removeEventListener('touchend', onTouchEnd);
      assetLibraryController?.destroy();
      container.removeChild(shell);
    },
  };
}

export function createLeftBerryPlaceholder(text: string): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'left-berry__placeholder';
  placeholder.textContent = text;
  return placeholder;
}
