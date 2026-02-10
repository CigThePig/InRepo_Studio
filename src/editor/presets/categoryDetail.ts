/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Category detail metadata for Presets UI.
 *
 * Defines:
 * - CATEGORY_LABELS — category title lookup for detail header
 *
 * Canonical key set:
 * - Preset categories: controls, movement, camera, animation
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (detail screen re-renders on config changes)
 */

import type { PresetCategoryId } from '@/types/preset';
import type { PresetRegistry } from '@/runtime/presets/presetRegistry';
import type { PresetConfigStore } from './presetConfigStore';
import { createUndoToast, type UndoToastController } from './undoToast';
import { createKnobEditor, type KnobEditorController } from './knobEditor';

export interface CategoryDetailConfig {
  container: HTMLElement;
  categoryId: PresetCategoryId;
  registry: PresetRegistry;
  configStore: PresetConfigStore;
  onBack: () => void;
}

export interface CategoryDetailController {
  refresh(): void;
  destroy(): void;
}

const CATEGORY_LABELS: Record<PresetCategoryId, string> = {
  controls: 'Controls',
  movement: 'Movement',
  camera: 'Camera',
  animation: 'Animation',
};

const STYLES = `
  .preset-category-detail {
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: #e6ecff;
  }

  .preset-category-detail__header,
  .preset-category-detail__section {
    background: rgba(18, 28, 53, 0.9);
    border: 1px solid rgba(88, 116, 173, 0.6);
    border-radius: 14px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .preset-category-detail__back {
    min-height: 44px;
    border: 1px solid rgba(88, 116, 173, 0.7);
    border-radius: 10px;
    background: rgba(14, 21, 40, 0.95);
    color: #dbe4ff;
    font-size: 12px;
    font-weight: 700;
    text-align: left;
    padding: 0 12px;
    cursor: pointer;
  }

  .preset-category-detail__title {
    font-size: 14px;
    font-weight: 700;
  }

  .preset-category-detail__tabs {
    display: flex;
    gap: 8px;
  }

  .preset-category-detail__tab {
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid rgba(88, 116, 173, 0.7);
    background: rgba(14, 21, 40, 0.95);
    color: #dbe4ff;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 700;
  }

  .preset-category-detail__tab--active {
    border-color: #4a9eff;
    background: rgba(74, 158, 255, 0.2);
    color: #fff;
  }

  .preset-category-detail__row {
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid rgba(88, 116, 173, 0.7);
    background: rgba(12, 19, 37, 0.95);
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
  }

  .preset-category-detail__status {
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid rgba(107, 191, 122, 0.55);
    color: #aef9bd;
    background: rgba(26, 77, 33, 0.65);
  }

  .preset-category-detail__status--off {
    border-color: rgba(255, 255, 255, 0.2);
    color: #96a0bf;
    background: rgba(255, 255, 255, 0.06);
  }

  .preset-category-detail__toggle {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .preset-category-detail__reset {
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid rgba(88, 116, 173, 0.7);
    background: rgba(14, 21, 40, 0.95);
    color: #dbe4ff;
    font-size: 12px;
    font-weight: 700;
    padding: 0 12px;
    cursor: pointer;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('preset-category-detail-styles')) return;
  const style = document.createElement('style');
  style.id = 'preset-category-detail-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

export function createCategoryDetail(config: CategoryDetailConfig): CategoryDetailController {
  ensureStyles();

  const root = document.createElement('div');
  root.className = 'preset-category-detail';
  config.container.innerHTML = '';
  config.container.appendChild(root);

  const toast: UndoToastController = createUndoToast(config.container);

  const header = document.createElement('section');
  header.className = 'preset-category-detail__header';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'preset-category-detail__back';
  backButton.textContent = '‹ Back to Presets';
  backButton.addEventListener('click', () => config.onBack());

  const titleRow = document.createElement('div');
  titleRow.className = 'preset-category-detail__row';
  const title = document.createElement('div');
  title.className = 'preset-category-detail__title';
  title.textContent = CATEGORY_LABELS[config.categoryId];
  const statusChip = document.createElement('span');
  statusChip.className = 'preset-category-detail__status';
  titleRow.append(title, statusChip);

  const tabs = document.createElement('div');
  tabs.className = 'preset-category-detail__tabs';
  const configureTab = document.createElement('button');
  configureTab.type = 'button';
  configureTab.className = 'preset-category-detail__tab preset-category-detail__tab--active';
  configureTab.textContent = 'Configure';
  const hooksTab = document.createElement('button');
  hooksTab.type = 'button';
  hooksTab.className = 'preset-category-detail__tab';
  hooksTab.textContent = 'Blockly Hooks';
  tabs.append(configureTab, hooksTab);

  header.append(backButton, titleRow, tabs);

  const contentSection = document.createElement('section');
  contentSection.className = 'preset-category-detail__section';

  const enabledRow = document.createElement('label');
  enabledRow.className = 'preset-category-detail__row preset-category-detail__toggle';
  const enabledText = document.createElement('span');
  enabledText.textContent = 'Enabled';
  const enabledToggle = document.createElement('input');
  enabledToggle.type = 'checkbox';
  enabledRow.append(enabledText, enabledToggle);

  const presetRow = document.createElement('div');
  presetRow.className = 'preset-category-detail__row';
  const presetLabel = document.createElement('span');
  presetLabel.textContent = 'Preset';
  const presetValue = document.createElement('strong');
  presetRow.append(presetLabel, presetValue);

  const knobsContainer = document.createElement('div');
  const hooksPlaceholder = document.createElement('div');
  hooksPlaceholder.className = 'preset-category-detail__row';
  hooksPlaceholder.textContent = 'Blockly Hooks will be available in the next phase.';
  hooksPlaceholder.hidden = true;

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'preset-category-detail__reset';
  resetButton.textContent = 'Reset to Defaults';

  contentSection.append(enabledRow, presetRow, knobsContainer, hooksPlaceholder, resetButton);
  root.append(header, contentSection);

  let knobEditor: KnobEditorController | null = null;
  let activeTab: 'configure' | 'hooks' = 'configure';

  function render(): void {
    const categoryConfig = config.configStore.getCategoryConfig(config.categoryId);
    const entry = config.registry.getById(categoryConfig.presetId);
    const isEnabled = categoryConfig.enabled;

    statusChip.textContent = isEnabled ? 'Enabled' : 'Off';
    statusChip.classList.toggle('preset-category-detail__status--off', !isEnabled);
    enabledToggle.checked = isEnabled;

    if (entry) {
      presetValue.textContent = entry.definition.label;

      if (!knobEditor) {
        knobEditor = createKnobEditor({
          container: knobsContainer,
          definition: entry.definition,
          values: categoryConfig.config,
          onChange: (knobId, value) => {
            const snapshot = config.configStore.snapshot();
            config.configStore.setKnobValue(config.categoryId, knobId, value);
            toast.show('Knob updated. Undo?', () => config.configStore.restore(snapshot));
          },
        });
      } else {
        knobEditor.refresh(categoryConfig.config);
      }
    } else {
      if (knobEditor) {
        knobEditor.destroy();
        knobEditor = null;
      }
      knobsContainer.innerHTML = '';
      const missing = document.createElement('div');
      missing.className = 'preset-category-detail__row';
      missing.textContent = `${categoryConfig.presetId} is missing from the preset registry.`;
      knobsContainer.appendChild(missing);
      presetValue.textContent = categoryConfig.presetId;
    }

    const showConfigure = activeTab === 'configure';
    enabledRow.hidden = !showConfigure;
    presetRow.hidden = !showConfigure;
    knobsContainer.hidden = !showConfigure;
    resetButton.hidden = !showConfigure;
    hooksPlaceholder.hidden = showConfigure;
    configureTab.classList.toggle('preset-category-detail__tab--active', showConfigure);
    hooksTab.classList.toggle('preset-category-detail__tab--active', !showConfigure);
  }

  enabledToggle.addEventListener('change', () => {
    const snapshot = config.configStore.snapshot();
    const catConfig = config.configStore.getCategoryConfig(config.categoryId);
    if (enabledToggle.checked) {
      config.configStore.enableCategory(config.categoryId, catConfig.presetId);
      toast.show('Category enabled. Undo?', () => config.configStore.restore(snapshot));
    } else {
      config.configStore.disableCategory(config.categoryId);
      toast.show('Category disabled. Undo?', () => config.configStore.restore(snapshot));
    }
  });

  resetButton.addEventListener('click', () => {
    const snapshot = config.configStore.snapshot();
    config.configStore.resetCategory(config.categoryId);
    toast.show('Reset to defaults. Undo?', () => config.configStore.restore(snapshot));
  });

  configureTab.addEventListener('click', () => {
    activeTab = 'configure';
    render();
  });

  hooksTab.addEventListener('click', () => {
    activeTab = 'hooks';
    render();
  });

  const unsubscribe = config.configStore.onChange(render);
  render();

  return {
    refresh: render,
    destroy() {
      unsubscribe();
      knobEditor?.destroy();
      toast.destroy();
      root.remove();
    },
  };
}
