/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Presets dashboard rendering metadata.
 *
 * Defines:
 * - CATEGORY_META — canonical dashboard category order + labels/icons
 *
 * Canonical key set:
 * - Preset categories: controls, movement, camera, animation
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (render updates when configStore changes)
 */

import { GAME_PROFILES } from '@/runtime/presets/gameProfiles';
import type { PresetCategoryId } from '@/types/preset';
import type { GameProfile } from '@/types/presetDefaults';
import type { PresetRegistry } from '@/runtime/presets/presetRegistry';
import type { PresetConfigStore } from './presetConfigStore';
import { createUndoToast, type UndoToastController } from './undoToast';
import { createCategoryDetail, type CategoryDetailController } from './categoryDetail';
import { createIssuesModal, type IssuesModalController } from './issuesModal';

export interface PresetsTabController {
  refresh(): void;
  setInsertBlockFn(fn: ((blockType: string) => void) | null): void;
  destroy(): void;
}

export interface PresetsTabConfig {
  container: HTMLElement;
  registry: PresetRegistry;
  configStore: PresetConfigStore;
  onCategorySelect?: (categoryId: PresetCategoryId) => void;
}

interface CategoryMeta {
  id: PresetCategoryId;
  label: string;
  icon: string;
}

const CATEGORY_META: readonly CategoryMeta[] = [
  { id: 'controls', label: 'Controls', icon: '🎮' },
  { id: 'movement', label: 'Movement', icon: '🏃' },
  { id: 'camera', label: 'Camera', icon: '📷' },
  { id: 'animation', label: 'Animation', icon: '✨' },
];

const STYLES = `
  .presets-tab {
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: #e6ecff;
  }

  .presets-tab__section {
    background: rgba(18, 28, 53, 0.9);
    border: 1px solid rgba(88, 116, 173, 0.6);
    border-radius: 14px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .presets-tab__heading {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #dbe4ff;
  }

  .presets-tab__subtext {
    margin: 0;
    font-size: 12px;
    color: #9fb1e0;
    line-height: 1.4;
  }

  .presets-tab__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .presets-tab__chip {
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(88, 116, 173, 0.7);
    background: rgba(14, 21, 40, 0.95);
    color: #dbe4ff;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .presets-tab__chip:active {
    background: rgba(35, 55, 95, 0.95);
  }

  .presets-tab__chip--active {
    border-color: #4a9eff;
    background: rgba(74, 158, 255, 0.2);
    color: #ffffff;
  }

  .presets-tab__status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(88, 116, 173, 0.7);
    background: rgba(12, 19, 37, 0.95);
    padding: 10px 12px;
    font-size: 12px;
  }

  .presets-tab__warning {
    min-height: 44px;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid rgba(255, 181, 71, 0.6);
    color: #ffc870;
    background: rgba(79, 53, 11, 0.7);
    cursor: pointer;
  }

  .presets-tab__categories {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .presets-tab__row {
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(88, 116, 173, 0.7);
    background: rgba(12, 19, 37, 0.95);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    color: #e6ecff;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .presets-tab__row:active {
    background: rgba(34, 54, 92, 0.95);
  }

  .presets-tab__icon {
    width: 24px;
    text-align: center;
    font-size: 16px;
  }

  .presets-tab__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .presets-tab__name {
    font-size: 13px;
    font-weight: 700;
  }

  .presets-tab__preset {
    font-size: 11px;
    color: #9fb1e0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .presets-tab__right {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .presets-tab__chip-status {
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
  }

  .presets-tab__chip-status--off {
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #96a0bf;
    background: rgba(255, 255, 255, 0.06);
  }

  .presets-tab__chip-status--default {
    border: 1px solid rgba(107, 191, 122, 0.55);
    color: #aef9bd;
    background: rgba(26, 77, 33, 0.65);
  }

  .presets-tab__chip-status--modified {
    border: 1px solid rgba(74, 158, 255, 0.6);
    color: #cde6ff;
    background: rgba(26, 58, 97, 0.75);
  }

  .presets-tab__chip-status--conflict {
    border: 1px solid rgba(255, 105, 105, 0.7);
    color: #ffd4d4;
    background: rgba(103, 28, 28, 0.72);
  }

  .presets-tab__chip-status--missing {
    border: 1px solid rgba(255, 181, 71, 0.7);
    color: #ffe3b5;
    background: rgba(88, 55, 16, 0.8);
  }

  .presets-tab__chevron {
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('presets-tab-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'presets-tab-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

function createStatusChip(status: string): HTMLElement {
  const chip = document.createElement('span');
  chip.className = `presets-tab__chip-status presets-tab__chip-status--${status.toLowerCase()}`;
  chip.textContent = status;
  return chip;
}

export function createPresetsTab(config: PresetsTabConfig): PresetsTabController {
  ensureStyles();

  const root = document.createElement('div');
  root.className = 'presets-tab';

  const profileSection = document.createElement('section');
  profileSection.className = 'presets-tab__section';
  const profileHeading = document.createElement('h3');
  profileHeading.className = 'presets-tab__heading';
  profileHeading.textContent = 'Game Profile';
  const profileSubtext = document.createElement('p');
  profileSubtext.className = 'presets-tab__subtext';
  profileSubtext.textContent = 'Choose a preset mix for your game style.';
  const chipWrap = document.createElement('div');
  chipWrap.className = 'presets-tab__chips';

  const profileButtons = new Map<GameProfile, HTMLButtonElement>();

  for (const profile of GAME_PROFILES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'presets-tab__chip';
    button.textContent = profile.label;
    button.title = profile.description;
    button.addEventListener('click', () => {
      const snapshot = config.configStore.snapshot();
      config.configStore.setProfile(profile.id);
      toast.show('Profile applied. Undo?', () => config.configStore.restore(snapshot));
    });
    chipWrap.appendChild(button);
    profileButtons.set(profile.id, button);
  }

  profileSection.append(profileHeading, profileSubtext, chipWrap);

  const statusSection = document.createElement('section');
  statusSection.className = 'presets-tab__section';
  const statusRow = document.createElement('div');
  statusRow.className = 'presets-tab__status';
  const statusText = document.createElement('span');
  const warningBadge = document.createElement('button');
  warningBadge.type = 'button';
  warningBadge.className = 'presets-tab__warning';
  warningBadge.hidden = true;
  statusRow.append(statusText, warningBadge);
  statusSection.appendChild(statusRow);

  const categoriesSection = document.createElement('section');
  categoriesSection.className = 'presets-tab__section';
  const categoriesHeading = document.createElement('h3');
  categoriesHeading.className = 'presets-tab__heading';
  categoriesHeading.textContent = 'Categories';
  const categoriesWrap = document.createElement('div');
  categoriesWrap.className = 'presets-tab__categories';
  categoriesSection.append(categoriesHeading, categoriesWrap);

  root.append(profileSection, statusSection, categoriesSection);
  config.container.innerHTML = '';
  config.container.appendChild(root);
  const toast: UndoToastController = createUndoToast(config.container);
  let categoryDetailController: CategoryDetailController | null = null;
  let issuesModalController: IssuesModalController | null = null;
  let insertBlockFn: ((blockType: string) => void) | null = null;
  let selectedCategory: PresetCategoryId | null = null;

  function showDashboard(): void {
    selectedCategory = null;
    categoryDetailController?.destroy();
    categoryDetailController = null;
    root.hidden = false;
    toast.clear();
    refresh();
  }

  function showCategoryDetail(categoryId: PresetCategoryId): void {
    selectedCategory = categoryId;
    root.hidden = true;
    categoryDetailController?.destroy();
    categoryDetailController = createCategoryDetail({
      container: config.container,
      categoryId,
      registry: config.registry,
      configStore: config.configStore,
      getInsertBlockFn: () => insertBlockFn,
      onBack: showDashboard,
    });
  }

  function refresh(): void {
    if (selectedCategory) {
      categoryDetailController?.refresh();
      return;
    }
    const activeProfile = config.configStore.getConfig().profile as GameProfile;
    for (const [id, button] of profileButtons.entries()) {
      button.classList.toggle('presets-tab__chip--active', id === activeProfile);
    }

    const conflicts = config.configStore.getConflicts();
    const conflictCategories = new Set<PresetCategoryId>();
    for (const item of conflicts) {
      conflictCategories.add(item.categoryA);
      conflictCategories.add(item.categoryB);
    }

    const enabledCount = CATEGORY_META
      .map((cat) => config.configStore.getCategoryConfig(cat.id))
      .filter((catConfig) => catConfig.enabled).length;

    statusText.textContent = `${enabledCount} categories enabled`;
    if (conflicts.length > 0) {
      warningBadge.hidden = false;
      warningBadge.textContent = `${conflicts.length} issues`;
    } else {
      warningBadge.hidden = true;
      warningBadge.textContent = '';
    }

    categoriesWrap.innerHTML = '';

    for (const category of CATEGORY_META) {
      const categoryConfig = config.configStore.getCategoryConfig(category.id);
      const presetEntry = config.registry.getById(categoryConfig.presetId);
      const isMissing = !presetEntry;
      const isConflict = conflictCategories.has(category.id);
      const isModified = config.configStore.isModified(category.id);

      let status = 'Default';
      if (!categoryConfig.enabled) {
        status = 'Off';
      } else if (isMissing) {
        status = 'Missing';
      } else if (isConflict) {
        status = 'Conflict';
      } else if (isModified) {
        status = 'Modified';
      }

      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'presets-tab__row';
      row.addEventListener('click', () => {
        config.onCategorySelect?.(category.id);
        showCategoryDetail(category.id);
      });

      const icon = document.createElement('span');
      icon.className = 'presets-tab__icon';
      icon.textContent = category.icon;

      const info = document.createElement('div');
      info.className = 'presets-tab__info';

      const name = document.createElement('div');
      name.className = 'presets-tab__name';
      name.textContent = category.label;

      const presetText = document.createElement('div');
      presetText.className = 'presets-tab__preset';
      presetText.textContent = presetEntry
        ? presetEntry.definition.label
        : `${categoryConfig.presetId} (missing)`;

      info.append(name, presetText);

      const right = document.createElement('div');
      right.className = 'presets-tab__right';
      const statusChip = createStatusChip(status);
      const chevron = document.createElement('span');
      chevron.className = 'presets-tab__chevron';
      chevron.textContent = '›';
      right.append(statusChip, chevron);

      row.append(icon, info, right);
      categoriesWrap.appendChild(row);
    }
  }

  const unsubscribe = config.configStore.onChange(refresh);

  warningBadge.addEventListener('click', () => {
    if (warningBadge.hidden) return;
    issuesModalController?.destroy();
    issuesModalController = createIssuesModal({
      container: config.container,
      configStore: config.configStore,
      registry: config.registry,
      onJumpToCategory: (categoryId) => {
        showCategoryDetail(categoryId);
      },
      onClose: () => {
        issuesModalController?.destroy();
        issuesModalController = null;
      },
    });
  });

  refresh();

  return {
    refresh,
    setInsertBlockFn(fn) {
      insertBlockFn = fn;
      categoryDetailController?.refresh();
    },
    destroy() {
      unsubscribe();
      categoryDetailController?.destroy();
      issuesModalController?.destroy();
      toast.destroy();
      root.remove();
    },
  };
}
