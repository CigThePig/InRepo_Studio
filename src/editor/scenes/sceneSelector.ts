/**
 * Scene Selector Component
 *
 * Dropdown UI for scene selection and management.
 * Displays in top panel with scene list and action menus.
 */

import type { SceneListItem } from './sceneManager';

const LOG_PREFIX = '[SceneSelector]';

// --- Types ---

export type SceneAction = 'create' | 'rename' | 'duplicate' | 'resize' | 'delete';

export interface SceneSelectorConfig {
  scenes: SceneListItem[];
  currentSceneId: string | null;
  onSceneSelect: (sceneId: string) => void;
  onSceneAction: (action: SceneAction, sceneId: string) => void;
  onCreateScene: () => void;
}

export interface SceneSelector {
  /** Update the scene list */
  updateScenes(scenes: SceneListItem[]): void;

  /** Set current scene */
  setCurrentScene(sceneId: string | null): void;

  /** Set scene name display (for current scene in header) */
  setSceneName(name: string): void;

  /** Toggle dropdown open/closed */
  toggle(): void;

  /** Close the dropdown */
  close(): void;

  /** Check if dropdown is open */
  isOpen(): boolean;

  /** Get the root element */
  getElement(): HTMLElement;

  /** Clean up */
  destroy(): void;
}

// --- Styles ---

const STYLES = `
  .scene-selector {
    position: relative;
    flex: 1;
    min-width: 0;
  }

  .scene-selector__current {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }

  .scene-selector__current:active {
    background: rgba(255, 255, 255, 0.05);
  }

  .scene-selector__name {
    color: #fff;
    font-weight: bold;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .scene-selector__chevron {
    color: #888;
    font-size: 10px;
    transition: transform 0.2s;
  }

  .scene-selector__chevron--open {
    transform: rotate(180deg);
  }

  .scene-selector__dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #16213e;
    border: 1px solid #3a3a6e;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 100;
    max-height: 300px;
    overflow-y: auto;
    display: none;
  }

  .scene-selector__dropdown--open {
    display: block;
  }

  .scene-selector__list {
    padding: 8px 0;
  }

  .scene-selector__item {
    display: flex;
    align-items: center;
    padding: 0 12px;
    min-height: 44px;
    cursor: pointer;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .scene-selector__item:active {
    background: rgba(255, 255, 255, 0.1);
  }

  .scene-selector__item--current {
    background: rgba(74, 158, 255, 0.15);
  }

  .scene-selector__item-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4a9eff;
    margin-right: 10px;
    opacity: 0;
  }

  .scene-selector__item--current .scene-selector__item-indicator {
    opacity: 1;
  }

  .scene-selector__item-name {
    flex: 1;
    color: #e6ecff;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .scene-selector__item-menu {
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #888;
    font-size: 18px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    border-radius: 6px;
  }

  .scene-selector__item-menu:active {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .scene-selector__divider {
    height: 1px;
    background: #3a3a6e;
    margin: 8px 12px;
  }

  .scene-selector__create {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    min-height: 44px;
    color: #4a9eff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .scene-selector__create:active {
    background: rgba(74, 158, 255, 0.1);
  }

  .scene-selector__create-icon {
    font-size: 18px;
  }

  .scene-selector__menu-popup {
    position: fixed;
    background: #1f1f3a;
    border: 1px solid #3a3a6e;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    z-index: 200;
    min-width: 140px;
    padding: 6px 0;
    display: none;
  }

  .scene-selector__menu-popup--open {
    display: block;
  }

  .scene-selector__menu-item {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    min-height: 40px;
    color: #e6ecff;
    font-size: 14px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .scene-selector__menu-item:active {
    background: rgba(255, 255, 255, 0.1);
  }

  .scene-selector__menu-item--danger {
    color: #ff6b6b;
  }
`;

// --- Factory ---

export function createSceneSelector(
  container: HTMLElement,
  config: SceneSelectorConfig
): SceneSelector {
  let { scenes, currentSceneId, onSceneSelect, onSceneAction, onCreateScene } = config;
  let isDropdownOpen = false;
  let activeMenuSceneId: string | null = null;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // Create root element
  const root = document.createElement('div');
  root.className = 'scene-selector';

  // Current scene button
  const currentButton = document.createElement('button');
  currentButton.className = 'scene-selector__current';
  currentButton.type = 'button';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'scene-selector__name';
  nameSpan.textContent = getSceneName(currentSceneId);

  const chevron = document.createElement('span');
  chevron.className = 'scene-selector__chevron';
  chevron.textContent = '▼';

  currentButton.appendChild(nameSpan);
  currentButton.appendChild(chevron);

  // Dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'scene-selector__dropdown';

  // Menu popup
  const menuPopup = document.createElement('div');
  menuPopup.className = 'scene-selector__menu-popup';
  document.body.appendChild(menuPopup);

  root.appendChild(currentButton);
  root.appendChild(dropdown);
  container.appendChild(root);

  function getSceneName(sceneId: string | null): string {
    if (!sceneId) return 'No Scene';
    const scene = scenes.find(s => s.id === sceneId);
    return scene?.name ?? 'Unknown';
  }

  function renderDropdown(): void {
    dropdown.innerHTML = '';

    const list = document.createElement('div');
    list.className = 'scene-selector__list';

    for (const scene of scenes) {
      const item = document.createElement('div');
      item.className = 'scene-selector__item';
      if (scene.id === currentSceneId) {
        item.classList.add('scene-selector__item--current');
      }

      const indicator = document.createElement('div');
      indicator.className = 'scene-selector__item-indicator';

      const name = document.createElement('span');
      name.className = 'scene-selector__item-name';
      name.textContent = scene.name;

      const menuBtn = document.createElement('button');
      menuBtn.className = 'scene-selector__item-menu';
      menuBtn.type = 'button';
      menuBtn.textContent = '⋮';

      item.appendChild(indicator);
      item.appendChild(name);
      item.appendChild(menuBtn);

      // Click on item (not menu button) selects scene
      item.addEventListener('click', (e) => {
        if (e.target === menuBtn) return;
        if (scene.id !== currentSceneId) {
          onSceneSelect(scene.id);
        }
        closeDropdown();
      });

      // Click on menu button opens menu
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showMenuPopup(scene.id, menuBtn);
      });

      list.appendChild(item);
    }

    dropdown.appendChild(list);

    const divider = document.createElement('div');
    divider.className = 'scene-selector__divider';
    dropdown.appendChild(divider);

    const createBtn = document.createElement('div');
    createBtn.className = 'scene-selector__create';

    const createIcon = document.createElement('span');
    createIcon.className = 'scene-selector__create-icon';
    createIcon.textContent = '+';

    const createText = document.createElement('span');
    createText.textContent = 'New Scene';

    createBtn.appendChild(createIcon);
    createBtn.appendChild(createText);

    createBtn.addEventListener('click', () => {
      closeDropdown();
      onCreateScene();
    });

    dropdown.appendChild(createBtn);
  }

  function showMenuPopup(sceneId: string, anchor: HTMLElement): void {
    activeMenuSceneId = sceneId;

    const scene = scenes.find(s => s.id === sceneId);
    const isOnlyScene = scenes.length <= 1;

    menuPopup.innerHTML = '';

    const actions: { label: string; action: SceneAction; danger?: boolean }[] = [
      { label: 'Rename', action: 'rename' },
      { label: 'Duplicate', action: 'duplicate' },
      { label: 'Resize', action: 'resize' },
    ];

    if (!isOnlyScene) {
      actions.push({ label: 'Delete', action: 'delete', danger: true });
    }

    for (const { label, action, danger } of actions) {
      const item = document.createElement('div');
      item.className = 'scene-selector__menu-item';
      if (danger) {
        item.classList.add('scene-selector__menu-item--danger');
      }
      item.textContent = label;

      item.addEventListener('click', () => {
        closeMenuPopup();
        closeDropdown();
        onSceneAction(action, sceneId);
      });

      menuPopup.appendChild(item);
    }

    // Position popup
    const rect = anchor.getBoundingClientRect();
    menuPopup.style.top = `${rect.bottom + 4}px`;
    menuPopup.style.left = `${rect.left - 100}px`; // Offset left to not cover button

    // Ensure popup stays in viewport
    const popupRect = menuPopup.getBoundingClientRect();
    if (popupRect.right > window.innerWidth) {
      menuPopup.style.left = `${window.innerWidth - popupRect.width - 8}px`;
    }
    if (popupRect.left < 0) {
      menuPopup.style.left = '8px';
    }

    menuPopup.classList.add('scene-selector__menu-popup--open');

    console.log(`${LOG_PREFIX} Menu popup shown for scene "${scene?.name}"`);
  }

  function closeMenuPopup(): void {
    menuPopup.classList.remove('scene-selector__menu-popup--open');
    activeMenuSceneId = null;
  }

  function openDropdown(): void {
    if (isDropdownOpen) return;
    isDropdownOpen = true;
    renderDropdown();
    dropdown.classList.add('scene-selector__dropdown--open');
    chevron.classList.add('scene-selector__chevron--open');
    console.log(`${LOG_PREFIX} Dropdown opened`);
  }

  function closeDropdown(): void {
    if (!isDropdownOpen) return;
    isDropdownOpen = false;
    dropdown.classList.remove('scene-selector__dropdown--open');
    chevron.classList.remove('scene-selector__chevron--open');
    closeMenuPopup();
    console.log(`${LOG_PREFIX} Dropdown closed`);
  }

  function toggleDropdown(): void {
    if (isDropdownOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  // Event handlers
  currentButton.addEventListener('click', toggleDropdown);

  // Close dropdown when clicking outside
  function handleDocumentClick(e: MouseEvent): void {
    const target = e.target as Node;
    if (!root.contains(target) && !menuPopup.contains(target)) {
      closeDropdown();
    }
    if (!menuPopup.contains(target) && activeMenuSceneId) {
      closeMenuPopup();
    }
  }

  document.addEventListener('click', handleDocumentClick);

  // --- Controller ---

  const selector: SceneSelector = {
    updateScenes(newScenes: SceneListItem[]): void {
      scenes = newScenes;
      nameSpan.textContent = getSceneName(currentSceneId);
      if (isDropdownOpen) {
        renderDropdown();
      }
    },

    setCurrentScene(sceneId: string | null): void {
      currentSceneId = sceneId;
      nameSpan.textContent = getSceneName(sceneId);
      if (isDropdownOpen) {
        renderDropdown();
      }
    },

    setSceneName(name: string): void {
      nameSpan.textContent = name;
    },

    toggle(): void {
      toggleDropdown();
    },

    close(): void {
      closeDropdown();
    },

    isOpen(): boolean {
      return isDropdownOpen;
    },

    getElement(): HTMLElement {
      return root;
    },

    destroy(): void {
      document.removeEventListener('click', handleDocumentClick);
      container.removeChild(root);
      document.body.removeChild(menuPopup);
      document.head.removeChild(styleEl);
      console.log(`${LOG_PREFIX} Scene selector destroyed`);
    },
  };

  console.log(`${LOG_PREFIX} Scene selector created`);

  return selector;
}
