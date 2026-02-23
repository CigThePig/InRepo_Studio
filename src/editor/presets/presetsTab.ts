/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Presets dashboard rendering metadata.
 *
 * Defines:
 * - CATEGORY_META — canonical dashboard category order + labels/icons
 *
 * Canonical key set:
 * - Preset categories: controls, movement, camera, animation, entity-animation
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (render updates when configStore changes)
 */

import { GAME_PROFILES } from '@/runtime/presets/gameProfiles';
import type { PresetCategoryId } from '@/types/preset';
import type { GameProfile } from '@/types/presetDefaults';
import type { PresetRegistry } from '@/runtime/presets/presetRegistry';
import type { PresetConfigStore } from './presetConfigStore';
import { uxFeedback } from '@/editor/uxFeedback';
import { createCategoryDetail, type CategoryDetailController } from './categoryDetail';
import { createIssuesModal, type IssuesModalController } from './issuesModal';

export interface PresetsTabController {
  refresh(): void;
  setInsertBlockFn(fn: ((blockType: string) => void) | null): void;
  setOpenInBlocklyFn(fn: ((blockType: string) => void | Promise<void>) | null): void;
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
  { id: 'entity-animation', label: 'Entity Animation', icon: '🎭' },
];

const STYLES = `
  .irs-presets-tab {
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: var(--irs-text-primary);
  }

  .irs-presets-tab__section {
    background: var(--irs-surface-panel);
    border: 1px solid var(--irs-border-medium);
    border-radius: var(--irs-radius-xl);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .irs-presets-tab__heading {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--irs-text-primary);
  }

  .irs-presets-tab__subtext {
    margin: 0;
    font-size: 12px;
    color: var(--irs-text-secondary);
    line-height: 1.4;
  }

  .irs-presets-tab__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .irs-presets-tab__chip {
    min-height: 44px;
    border-radius: var(--irs-radius-lg);
    border: 1px solid var(--irs-border-medium);
    background: var(--irs-surface-input);
    color: var(--irs-text-primary);
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .irs-presets-tab__chip:active {
    background: var(--irs-color-blue-alpha-16);
  }

  .irs-presets-tab__chip--active {
    border-color: var(--irs-accent-primary);
    background: var(--irs-color-blue-alpha-22);
    color: var(--irs-text-primary);
  }

  .irs-presets-tab__status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 44px;
    border-radius: var(--irs-radius-lg);
    border: 1px solid var(--irs-border-medium);
    background: var(--irs-surface-dark);
    padding: 10px 12px;
    font-size: 12px;
  }

  .irs-presets-tab__warning {
    min-height: 44px;
    border-radius: var(--irs-radius-pill);
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid var(--irs-color-yellow-border);
    color: var(--irs-color-yellow);
    background: var(--irs-color-yellow-alpha-20);
    cursor: pointer;
  }

  .irs-presets-tab__categories {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .irs-presets-tab__row {
    min-height: 44px;
    border-radius: var(--irs-radius-lg);
    border: 1px solid var(--irs-border-medium);
    background: var(--irs-surface-dark);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    color: var(--irs-text-primary);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .irs-presets-tab__row:active {
    background: var(--irs-color-blue-alpha-16);
  }

  .irs-presets-tab__icon {
    width: 24px;
    text-align: center;
    font-size: 16px;
  }

  .irs-presets-tab__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .irs-presets-tab__name {
    font-size: 13px;
    font-weight: 700;
  }

  .irs-presets-tab__preset {
    font-size: 11px;
    color: var(--irs-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .irs-presets-tab__right {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .irs-presets-tab__chip-status {
    border-radius: var(--irs-radius-pill);
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
  }

  .irs-presets-tab__chip-status--off {
    border: 1px solid var(--irs-border-light);
    color: var(--irs-text-muted);
    background: var(--irs-surface-elevated);
  }

  .irs-presets-tab__chip-status--default {
    border: 1px solid var(--irs-color-green-alpha-53);
    color: var(--irs-color-green);
    background: var(--irs-color-green-alpha-15);
  }

  .irs-presets-tab__chip-status--modified {
    border: 1px solid var(--irs-color-blue-border);
    color: var(--irs-text-primary);
    background: var(--irs-color-blue-alpha-22);
  }

  .irs-presets-tab__chip-status--conflict {
    border: 1px solid var(--irs-color-red-alpha-53);
    color: var(--irs-text-primary);
    background: var(--irs-color-red-alpha-15);
  }

  .irs-presets-tab__chip-status--missing {
    border: 1px solid var(--irs-color-yellow-border);
    color: var(--irs-color-yellow);
    background: var(--irs-color-yellow-alpha-20);
  }

  .irs-presets-tab__chevron {
    color: var(--irs-text-secondary);
    font-size: 14px;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('irs-presets-tab-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'irs-presets-tab-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

function createStatusChip(status: string): HTMLElement {
  const chip = document.createElement('span');
  chip.className = `irs-presets-tab__chip-status irs-presets-tab__chip-status--${status.toLowerCase()}`;
  chip.textContent = status;
  return chip;
}

export function createPresetsTab(config: PresetsTabConfig): PresetsTabController {
  ensureStyles();

  const root = document.createElement('div');
  root.className = 'irs-presets-tab';

  const profileSection = document.createElement('section');
  profileSection.className = 'irs-presets-tab__section';
  const profileHeading = document.createElement('h3');
  profileHeading.className = 'irs-presets-tab__heading';
  profileHeading.textContent = 'Game Profile';
  const profileSubtext = document.createElement('p');
  profileSubtext.className = 'irs-presets-tab__subtext';
  profileSubtext.textContent = 'Choose a preset mix for your game style.';
  const chipWrap = document.createElement('div');
  chipWrap.className = 'irs-presets-tab__chips';

  const profileButtons = new Map<GameProfile, HTMLButtonElement>();

  function buildProfileDiffSummary(profileId: GameProfile): string {
    const currentConfig = config.configStore.getConfig();
    const fromEntries: string[] = [];
    for (const category of CATEGORY_META) {
      const before = currentConfig.categories[category.id]?.presetId ?? 'off';
      const profileEntry = GAME_PROFILES.find((p) => p.id === profileId);
      const after = profileEntry?.recommendations[category.id] ?? before;
      if (before !== after) {
        fromEntries.push(`${category.label} (${before} → ${after})`);
      }
    }
    return fromEntries.length > 0
      ? `Will change: ${fromEntries.join(', ')}`
      : 'No category changes detected.';
  }

  for (const profile of GAME_PROFILES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'irs-presets-tab__chip';
    button.textContent = profile.label;
    button.title = profile.description;
    button.addEventListener('click', () => {
      uxFeedback.undo.dismiss();
      const confirmMessage = `Switch to ${profile.label}? This will change all preset categories. Your current settings will be saved for undo.\n\n${buildProfileDiffSummary(profile.id)}`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
      const snapshot = config.configStore.snapshot();
      uxFeedback.motion.pulse(button);
      config.configStore.setProfile(profile.id);
      refresh();
      uxFeedback.undo.show('Profile applied. Undo?', () => config.configStore.restore(snapshot), {
        durationMs: 10000,
        destructive: true,
      });
    });
    chipWrap.appendChild(button);
    profileButtons.set(profile.id, button);
  }

  profileSection.append(profileHeading, profileSubtext, chipWrap);

  const statusSection = document.createElement('section');
  statusSection.className = 'irs-presets-tab__section';
  const statusRow = document.createElement('div');
  statusRow.className = 'irs-presets-tab__status';
  const statusText = document.createElement('span');
  const warningBadge = document.createElement('button');
  warningBadge.type = 'button';
  warningBadge.className = 'irs-presets-tab__warning';
  warningBadge.hidden = true;
  statusRow.append(statusText, warningBadge);
  statusSection.appendChild(statusRow);

  const categoriesSection = document.createElement('section');
  categoriesSection.className = 'irs-presets-tab__section';
  const categoriesHeading = document.createElement('h3');
  categoriesHeading.className = 'irs-presets-tab__heading';
  categoriesHeading.textContent = 'Categories';
  const categoriesWrap = document.createElement('div');
  categoriesWrap.className = 'irs-presets-tab__categories';
  categoriesSection.append(categoriesHeading, categoriesWrap);

  root.append(profileSection, statusSection, categoriesSection);
  config.container.innerHTML = '';
  config.container.appendChild(root);
  let categoryDetailController: CategoryDetailController | null = null;
  let issuesModalController: IssuesModalController | null = null;
  let insertBlockFn: ((blockType: string) => void) | null = null;
  let openInBlocklyFn: ((blockType: string) => void | Promise<void>) | null = null;
  let selectedCategory: PresetCategoryId | null = null;

  function showDashboard(): void {
    selectedCategory = null;
    categoryDetailController?.destroy();
    categoryDetailController = null;
    root.hidden = false;
    uxFeedback.undo.dismiss();
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
      getOpenInBlocklyFn: () => openInBlocklyFn,
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
      button.classList.toggle('irs-presets-tab__chip--active', id === activeProfile);
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
      row.className = 'irs-presets-tab__row';
      row.addEventListener('click', () => {
        config.onCategorySelect?.(category.id);
        showCategoryDetail(category.id);
      });

      const icon = document.createElement('span');
      icon.className = 'irs-presets-tab__icon';
      icon.textContent = category.icon;

      const info = document.createElement('div');
      info.className = 'irs-presets-tab__info';

      const name = document.createElement('div');
      name.className = 'irs-presets-tab__name';
      name.textContent = category.label;

      const presetText = document.createElement('div');
      presetText.className = 'irs-presets-tab__preset';
      presetText.textContent = presetEntry
        ? presetEntry.definition.label
        : `${categoryConfig.presetId} (missing)`;

      info.append(name, presetText);

      const right = document.createElement('div');
      right.className = 'irs-presets-tab__right';
      const statusChip = createStatusChip(status);
      const chevron = document.createElement('span');
      chevron.className = 'irs-presets-tab__chevron';
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

    setOpenInBlocklyFn(fn) {
      openInBlocklyFn = fn;
      categoryDetailController?.refresh();
    },
    destroy() {
      unsubscribe();
      categoryDetailController?.destroy();
      issuesModalController?.destroy();
      uxFeedback.undo.dismiss();
      root.remove();
    },
  };
}
