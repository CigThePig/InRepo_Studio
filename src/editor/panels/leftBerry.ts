import { LEFT_BERRY_TABS, type LeftBerryTab, type LeftBerryTabId } from './leftBerryTabs';
import { createSpriteSlicerTab } from './spriteSlicerTab';
import { createAssetLibraryTab, type AssetLibraryTabController } from './assetLibraryTab';
import type { AssetEntryInput, AssetRegistry } from '@/editor/assets';

export interface LeftBerryConfig {
  initialOpen?: boolean;
  initialTab?: LeftBerryTabId;
  tabs?: LeftBerryTab[];
  assetRegistry?: AssetRegistry;
  assetLibraryEnabled?: boolean;
  assetUploadEnabled?: boolean;
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
    background: rgba(5, 10, 24, 0.6);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 0.25s ease-out;
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
    width: min(340px, 88vw);
    background: linear-gradient(180deg, #141d38 0%, #0f1629 100%);
    border-right: 1px solid rgba(74, 158, 255, 0.15);
    box-shadow: 8px 0 32px rgba(0, 0, 0, 0.5), 0 0 1px rgba(74, 158, 255, 0.3);
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .left-berry-shell--open .left-berry {
    transform: translateX(0);
  }

  .left-berry__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(74, 158, 255, 0.12);
    background: linear-gradient(180deg, rgba(74, 158, 255, 0.06) 0%, transparent 100%);
    flex-shrink: 0;
  }

  .left-berry__title {
    font-size: 15px;
    font-weight: 700;
    color: #e6ecff;
    letter-spacing: 0.3px;
  }

  .left-berry__close {
    min-width: 44px;
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
    color: #e6ecff;
    font-size: 20px;
    font-weight: 300;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, border-color 0.15s;
  }

  .left-berry__close:active {
    background: rgba(74, 158, 255, 0.15);
    border-color: rgba(74, 158, 255, 0.3);
  }

  .left-berry__tabs {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-bottom: 1px solid rgba(74, 158, 255, 0.1);
    scrollbar-width: none;
    flex-shrink: 0;
  }

  .left-berry__tabs::-webkit-scrollbar {
    display: none;
  }

  .left-berry__tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    min-width: 44px;
    padding: 8px 16px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    color: #b8c4e6;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.2s ease;
  }

  .left-berry__tab:active {
    background: rgba(74, 158, 255, 0.12);
  }

  .left-berry__tab--active {
    background: linear-gradient(180deg, rgba(74, 158, 255, 0.2) 0%, rgba(74, 158, 255, 0.1) 100%);
    border-color: rgba(74, 158, 255, 0.4);
    color: #fff;
    box-shadow: 0 0 12px rgba(74, 158, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .left-berry__tab-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 8px;
    background: rgba(74, 158, 255, 0.15);
    font-size: 12px;
  }

  .left-berry__tab--active .left-berry__tab-icon {
    background: rgba(74, 158, 255, 0.3);
  }

  .left-berry__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .left-berry__tab-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px;
    display: none;
    -webkit-overflow-scrolling: touch;
  }

  .left-berry__tab-content::-webkit-scrollbar {
    width: 6px;
  }

  .left-berry__tab-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  .left-berry__tab-content::-webkit-scrollbar-thumb {
    background: rgba(74, 158, 255, 0.3);
    border-radius: 3px;
  }

  .left-berry__tab-content--active {
    display: flex;
    flex-direction: column;
  }

  .left-berry__placeholder {
    color: #8899c4;
    font-size: 13px;
    line-height: 1.5;
    background: linear-gradient(180deg, rgba(74, 158, 255, 0.06) 0%, rgba(74, 158, 255, 0.02) 100%);
    border: 1px dashed rgba(74, 158, 255, 0.2);
    border-radius: 12px;
    padding: 16px;
  }

  /* Berry Handle - Matching size with right berry */
  .left-berry__handle {
    position: absolute;
    left: max(12px, calc(env(safe-area-inset-left, 0px) + 12px));
    top: 50%;
    transform: translate(0, -50%);
    width: 72px;
    height: 72px;
    padding: 0;
    border: none;
    background: transparent;
    color: #cfd8ff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
  }

  .left-berry__handle-pill {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    border: 1px solid rgba(74, 158, 255, 0.2);
    background: linear-gradient(180deg, rgba(30, 42, 74, 0.95) 0%, rgba(15, 22, 41, 0.95) 100%);
    box-shadow: 
      0 8px 24px rgba(0, 0, 0, 0.4),
      0 0 1px rgba(74, 158, 255, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .left-berry__handle:active .left-berry__handle-pill {
    background: linear-gradient(180deg, rgba(40, 55, 94, 0.98) 0%, rgba(20, 28, 52, 0.98) 100%);
    border-color: rgba(74, 158, 255, 0.4);
    transform: scale(0.95);
  }

  .left-berry__handle-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(74, 158, 255, 0.25) 0%, rgba(74, 158, 255, 0.15) 100%);
    color: #dbe4ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
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
  const assetUploadEnabled = config.assetUploadEnabled ?? false;
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
  handle.setAttribute('aria-label', 'Open asset panel');

  const handlePill = document.createElement('div');
  handlePill.className = 'left-berry__handle-pill';

  const handleIcon = document.createElement('div');
  handleIcon.className = 'left-berry__handle-icon';
  handleIcon.textContent = '⧉';

  handlePill.appendChild(handleIcon);
  handle.appendChild(handlePill);

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
          source: 'local',
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
        uploadEnabled: assetUploadEnabled,
      });
    } else {
      assetsContainer.appendChild(createLeftBerryPlaceholder('Asset library is disabled for this session.'));
    }
  }

  function setActiveTab(tab: LeftBerryTabId, options?: { silent?: boolean }): void {
    if (currentTab === tab) return;
    currentTab = tab;

    for (const button of tabBar.querySelectorAll<HTMLButtonElement>('.left-berry__tab')) {
      const isActive = button.dataset.tab === tab;
      button.classList.toggle('left-berry__tab--active', isActive);
    }

    for (const tabContent of tabContentMap.values()) {
      const isActive = tabContent.dataset.tab === tab;
      tabContent.classList.toggle('left-berry__tab-content--active', isActive);
    }

    if (!options?.silent) {
      tabChangeCallbacks.forEach((cb) => cb(tab));
    }
  }

  function updateOpenState(nextOpen: boolean): void {
    if (isOpen === nextOpen) return;
    isOpen = nextOpen;
    shell.classList.toggle('left-berry-shell--open', isOpen);
    openChangeCallbacks.forEach((cb) => cb(isOpen));
  }

  function handleClose(): void {
    updateOpenState(false);
  }

  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;

  function onTouchStart(evt: TouchEvent): void {
    if (!isOpen) return;
    if (evt.touches.length !== 1) return;
    const touch = evt.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchActive = true;
  }

  function onTouchEnd(evt: TouchEvent): void {
    if (!touchActive) return;
    touchActive = false;

    const touch = evt.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (Math.abs(dx) > 80 && Math.abs(dy) < 60 && dx < 0) {
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
