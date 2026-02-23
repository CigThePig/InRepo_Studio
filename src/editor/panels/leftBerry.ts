import { LEFT_BERRY_TABS, type LeftBerryTab, type LeftBerryTabId } from './leftBerryTabs';
import { createSpriteSlicerTab } from './spriteSlicerTab';
import { createAssetLibraryTab, type AssetLibraryTabController } from './assetLibraryTab';
import type { AssetEntryInput, AssetRegistry } from '@/editor/assets';
import type { EditorState } from '@/storage/hot';
import type { EntityManager } from '@/editor/entities/entityManager';
import type { HistoryManager } from '@/editor/history';
import type { Scene } from '@/types';
import { createAnimationTab, type AnimationTabController } from './animationTab';
import type { PresetRegistry } from '@/runtime/presets/presetRegistry';
import type { PresetConfigStore } from '@/editor/presets/presetConfigStore';
import { createPresetsTab, type PresetsTabController } from '@/editor/presets/presetsTab';
import { createBerryShell } from './berryShell';

export interface LeftBerryConfig {
  initialOpen?: boolean;
  initialTab?: LeftBerryTabId;
  tabs?: LeftBerryTab[];
  assetRegistry?: AssetRegistry;
  assetLibraryEnabled?: boolean;
  assetUploadEnabled?: boolean;
  getEditorState?: () => EditorState | null;
  getCurrentScene?: () => Scene | null;
  entityManager?: EntityManager;
  history?: HistoryManager;
  presetRegistry?: PresetRegistry;
  presetConfigStore?: PresetConfigStore;
}

export interface LeftBerryController {
  open(tab?: LeftBerryTabId): void;
  openAnimation(animationId: string): void;
  close(): void;
  isOpen(): boolean;
  getActiveTab(): LeftBerryTabId | null;
  setActiveTab(tab: LeftBerryTabId, options?: { silent?: boolean }): void;
  getTabContentContainer(tab: LeftBerryTabId): HTMLElement | null;
  onTabChange(callback: (tab: LeftBerryTabId) => void): void;
  onOpenChange(callback: (open: boolean) => void): void;
  refreshTab(tab: LeftBerryTabId): void;
  setInsertBlockFn(fn: ((blockType: string) => void) | null): void;
  setOpenInBlocklyFn(fn: ((blockType: string) => void | Promise<void>) | null): void;
  destroy(): void;
}

export function createLeftBerry(container: HTMLElement, config: LeftBerryConfig = {}): LeftBerryController {
  const tabs = config.tabs ?? LEFT_BERRY_TABS;
  const activeTabId = config.initialTab ?? tabs[0]?.id ?? 'sprites';
  let isOpen = config.initialOpen ?? false;
  let currentTab: LeftBerryTabId | null = null;
  const tabChangeCallbacks: Array<(tab: LeftBerryTabId) => void> = [];
  const openChangeCallbacks: Array<(open: boolean) => void> = [];
  const assetRegistry = config.assetRegistry;
  const assetLibraryEnabled = config.assetLibraryEnabled ?? true;
  const assetUploadEnabled = config.assetUploadEnabled ?? false;
  const getEditorState = config.getEditorState;
  const entityManager = config.entityManager;
  const history = config.history;
  let assetLibraryController: AssetLibraryTabController | null = null;
  let animationTabController: AnimationTabController | null = null;
  let presetsTabController: PresetsTabController | null = null;

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

  const tabContentMap = new Map<LeftBerryTabId, HTMLElement>();

  tabs.forEach((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'irs-berry__tab';
    button.dataset.tab = tab.id;
    button.innerHTML = `<span class="irs-berry__tab-icon">${tab.icon}</span>${tab.label}`;
    button.addEventListener('click', () => setActiveTab(tab.id));
    shell.tabBar.appendChild(button);

    const tabContent = document.createElement('div');
    tabContent.className = 'irs-berry__tab-content';
    tabContent.dataset.tab = tab.id;
    shell.content.appendChild(tabContent);
    tabContentMap.set(tab.id, tabContent);
  });

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
      onAtlasConfirmed: (payload) => {
        if (!assetRegistry) return;
        const { imageDataUrl, imageWidth, imageHeight, slices, groupName, groupType, imageName } = payload;
        const baseName = groupName || imageName || 'Asset Group';
        const assetType = groupType === 'entities' ? 'entity' as const : groupType === 'props' ? 'sprite' as const : 'tile' as const;

        const sourceAssets = assetRegistry.addAssets({
          groupType,
          groupName: baseName,
          assets: [{
            name: `${baseName} (sheet)`,
            type: assetType,
            dataUrl: imageDataUrl,
            width: imageWidth,
            height: imageHeight,
            source: 'local',
          }],
        });
        const sourceAsset = sourceAssets[0];
        if (!sourceAsset) return;

        const sliceAssets: AssetEntryInput[] = slices.map((slice) => ({
          name: slice.name,
          type: assetType,
          dataUrl: imageDataUrl,
          width: slice.rect.w,
          height: slice.rect.h,
          source: 'local' as const,
          sourceAssetId: sourceAsset.id,
          rect: { ...slice.rect },
        }));
        assetRegistry.addAssets({
          groupType,
          groupName: baseName,
          assets: sliceAssets,
        });
        setActiveTab('assets');
      },
    });
  }

  const animationContainer = tabContentMap.get('animation');
  if (animationContainer) {
    if (assetRegistry) {
      animationTabController = createAnimationTab({
        container: animationContainer,
        assetRegistry,
        getEditorState: getEditorState ?? (() => null),
        entityManager,
        history,
        onBackToList: () => setActiveTab('assets'),
      });
    } else {
      animationContainer.appendChild(
        createLeftBerryPlaceholder('Animation tools need an asset registry to run.')
      );
    }
  }

  const assetsContainer = tabContentMap.get('assets');
  if (assetsContainer) {
    if (assetLibraryEnabled && assetRegistry) {
      assetLibraryController = createAssetLibraryTab({
        container: assetsContainer,
        assetRegistry,
        uploadEnabled: assetUploadEnabled,
        getCurrentScene: config.getCurrentScene,
        entityManager,
        onOpenAnimation: (id) => {
          setActiveTab('animation');
          animationTabController?.openAnimation(id);
        },
      });
    } else {
      assetsContainer.appendChild(createLeftBerryPlaceholder('Asset library is disabled for this session.'));
    }
  }

  const presetsContainer = tabContentMap.get('presets');
  if (presetsContainer) {
    if (config.presetRegistry && config.presetConfigStore) {
      presetsTabController = createPresetsTab({
        container: presetsContainer,
        registry: config.presetRegistry,
        configStore: config.presetConfigStore,
      });
    } else {
      presetsContainer.appendChild(
        createLeftBerryPlaceholder('Presets require a project to be loaded.')
      );
    }
  }

  function setActiveTab(tab: LeftBerryTabId, options?: { silent?: boolean }): void {
    if (currentTab !== null && currentTab === tab) return;
    currentTab = tab;

    for (const button of shell.tabBar.querySelectorAll<HTMLButtonElement>('.irs-berry__tab')) {
      const isActive = button.dataset.tab === tab;
      button.classList.toggle('irs-berry__tab--active', isActive);
    }

    for (const tabContent of tabContentMap.values()) {
      const isActive = tabContent.dataset.tab === tab;
      tabContent.classList.toggle('irs-berry__tab-content--active', isActive);
    }

    if (tab === 'animation') {
      animationTabController?.refresh();
    }

    if (!options?.silent) {
      tabChangeCallbacks.forEach((cb) => cb(tab));
    }
  }

  shell.setOpen(isOpen);
  setActiveTab(activeTabId, { silent: true });

  return {
    open: (tab) => {
      shell.setOpen(true);
      if (tab) setActiveTab(tab);
    },
    openAnimation: (animationId) => {
      shell.setOpen(true);
      setActiveTab('animation');
      animationTabController?.openAnimation(animationId);
    },
    close: () => shell.setOpen(false),
    isOpen: () => shell.isOpen(),
    getActiveTab: () => currentTab,
    setActiveTab,
    getTabContentContainer: (tab) => tabContentMap.get(tab) ?? null,
    onTabChange: (callback) => tabChangeCallbacks.push(callback),
    onOpenChange: (callback) => openChangeCallbacks.push(callback),
    refreshTab: (tab) => {
      if (tab === 'animation') {
        animationTabController?.refresh();
      }
      if (tab === 'assets') {
        assetLibraryController?.refresh();
      }
      if (tab === 'presets') {
        presetsTabController?.refresh();
      }
    },
    setInsertBlockFn: (fn) => {
      presetsTabController?.setInsertBlockFn(fn);
    },

    setOpenInBlocklyFn: (fn) => {
      presetsTabController?.setOpenInBlocklyFn(fn);
    },
    destroy: () => {
      assetLibraryController?.destroy();
      animationTabController?.destroy();
      presetsTabController?.destroy();
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
