/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Category detail metadata for Presets UI.
 *
 * Defines:
 * - CATEGORY_LABELS — category title lookup for detail header
 *
 * Canonical key set:
 * - Preset categories: controls, movement, camera, animation, entity-animation
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (detail screen re-renders on config changes)
 */

import type { PresetCategoryId } from '@/types/preset';
import type { PresetRegistry } from '@/runtime/presets/presetRegistry';
import { uxFeedback } from '@/editor/uxFeedback';
import type { PresetConfigStore } from './presetConfigStore';
import { createKnobEditor, type KnobEditorController } from './knobEditor';
import { createBlocklyHooksTab, type BlocklyHooksTabController } from './blocklyHooksTab';
import { createPresetPicker, type PresetPickerController } from './presetPicker';

export interface CategoryDetailConfig {
  container: HTMLElement;
  categoryId: PresetCategoryId;
  registry: PresetRegistry;
  configStore: PresetConfigStore;
  getInsertBlockFn?: () => ((blockType: string) => void) | null;
  getOpenInBlocklyFn?: () => ((blockType: string) => void | Promise<void>) | null;
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
  'entity-animation': 'Entity Animation',
};

const STYLES = `
  .irs-preset-category {
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: var(--irs-text-primary);
  }

  .irs-preset-category__header,
  .irs-preset-category__section {
    background: var(--irs-surface-panel);
    border: 1px solid var(--irs-border-medium);
    border-radius: var(--irs-radius-xl);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .irs-preset-category__back {
    min-height: 44px;
    border: 1px solid var(--irs-border-medium);
    border-radius: var(--irs-radius-md);
    background: var(--irs-surface-input);
    color: var(--irs-text-primary);
    font-size: 12px;
    font-weight: 700;
    text-align: left;
    padding: 0 12px;
    cursor: pointer;
  }

  .irs-preset-category__title {
    font-size: 14px;
    font-weight: 700;
  }

  .irs-preset-category__tabs {
    display: flex;
    gap: 8px;
  }

  .irs-preset-category__tab {
    min-height: 44px;
    border-radius: var(--irs-radius-md);
    border: 1px solid var(--irs-border-medium);
    background: var(--irs-surface-input);
    color: var(--irs-text-primary);
    padding: 0 12px;
    font-size: 12px;
    font-weight: 700;
  }

  .irs-preset-category__tab--active {
    border-color: var(--irs-accent-primary);
    background: var(--irs-color-blue-alpha-22);
    color: var(--irs-text-primary);
  }

  .irs-preset-category__row {
    min-height: 44px;
    border-radius: var(--irs-radius-md);
    border: 1px solid var(--irs-border-medium);
    background: var(--irs-surface-dark);
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
  }

  .irs-preset-category__status {
    border-radius: var(--irs-radius-pill);
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid var(--irs-color-green-alpha-53);
    color: var(--irs-color-green);
    background: var(--irs-color-green-alpha-15);
  }

  .irs-preset-category__status--off {
    border-color: var(--irs-border-light);
    color: var(--irs-text-muted);
    background: var(--irs-surface-elevated);
  }

  .irs-preset-category__toggle {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .irs-preset-category__reset {
    min-height: 44px;
    border-radius: var(--irs-radius-md);
    border: 1px solid var(--irs-border-medium);
    background: var(--irs-surface-input);
    color: var(--irs-text-primary);
    font-size: 12px;
    font-weight: 700;
    padding: 0 12px;
    cursor: pointer;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('irs-preset-category-styles')) return;
  const style = document.createElement('style');
  style.id = 'irs-preset-category-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

export function createCategoryDetail(config: CategoryDetailConfig): CategoryDetailController {
  ensureStyles();

  const root = document.createElement('div');
  root.className = 'irs-preset-category';
  config.container.appendChild(root);

  const header = document.createElement('section');
  header.className = 'irs-preset-category__header';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'irs-preset-category__back';
  backButton.textContent = '‹ Back to Presets';
  backButton.addEventListener('click', () => config.onBack());

  const titleRow = document.createElement('div');
  titleRow.className = 'irs-preset-category__row';
  const title = document.createElement('div');
  title.className = 'irs-preset-category__title';
  title.textContent = CATEGORY_LABELS[config.categoryId];
  const statusChip = document.createElement('span');
  statusChip.className = 'irs-preset-category__status';
  titleRow.append(title, statusChip);

  const tabs = document.createElement('div');
  tabs.className = 'irs-preset-category__tabs';
  const configureTab = document.createElement('button');
  configureTab.type = 'button';
  configureTab.className = 'irs-preset-category__tab irs-preset-category__tab--active';
  configureTab.textContent = 'Configure';
  const hooksTab = document.createElement('button');
  hooksTab.type = 'button';
  hooksTab.className = 'irs-preset-category__tab';
  hooksTab.textContent = 'Blockly Hooks';
  tabs.append(configureTab, hooksTab);

  header.append(backButton, titleRow, tabs);

  const contentSection = document.createElement('section');
  contentSection.className = 'irs-preset-category__section';

  const enabledRow = document.createElement('label');
  enabledRow.className = 'irs-preset-category__row irs-preset-category__toggle';
  const enabledText = document.createElement('span');
  enabledText.textContent = 'Enabled';
  const enabledToggle = document.createElement('input');
  enabledToggle.type = 'checkbox';
  enabledRow.append(enabledText, enabledToggle);

  const presetRow = document.createElement('button');
  presetRow.type = 'button';
  presetRow.className = 'irs-preset-category__row';
  const presetLabel = document.createElement('span');
  presetLabel.textContent = 'Preset';
  const presetValue = document.createElement('strong');
  presetRow.append(presetLabel, presetValue);

  const knobsContainer = document.createElement('div');
  const hooksContainer = document.createElement('div');
  hooksContainer.hidden = true;

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'irs-preset-category__reset';
  resetButton.textContent = 'Reset to Defaults';

  contentSection.append(enabledRow, presetRow, knobsContainer, hooksContainer, resetButton);
  root.append(header, contentSection);

  let knobEditor: KnobEditorController | null = null;
  let hooksTabController: BlocklyHooksTabController | null = null;
  let presetPickerController: PresetPickerController | null = null;
  let activeTab: 'configure' | 'hooks' = 'configure';
  let currentPresetId: string | null = null;

  function render(): void {
    const categoryConfig = config.configStore.getCategoryConfig(config.categoryId);
    const entry = config.registry.getById(categoryConfig.presetId);
    const isEnabled = categoryConfig.enabled;
    const presetChanged = currentPresetId !== categoryConfig.presetId;
    currentPresetId = categoryConfig.presetId;

    statusChip.textContent = isEnabled ? 'Enabled' : 'Off';
    statusChip.classList.toggle('irs-preset-category__status--off', !isEnabled);
    enabledToggle.checked = isEnabled;

    if (entry) {
      presetValue.textContent = entry.definition.label;

      if (!knobEditor || presetChanged) {
        knobEditor?.destroy();
        knobEditor = createKnobEditor({
          container: knobsContainer,
          definition: entry.definition,
          values: categoryConfig.config,
          onChange: (knobId, value) => {
            const snapshot = config.configStore.snapshot();
            config.configStore.setKnobValue(config.categoryId, knobId, value);
            uxFeedback.undo.show('Knob updated. Undo?', () => config.configStore.restore(snapshot));
          },
        });
      } else {
        knobEditor.refresh(categoryConfig.config);
      }

      if (!hooksTabController || presetChanged) {
        hooksTabController?.destroy();
        hooksTabController = createBlocklyHooksTab({
          container: hooksContainer,
          definition: entry.definition,
          getInsertBlockFn: config.getInsertBlockFn,
          getOpenInBlocklyFn: config.getOpenInBlocklyFn,
        });
      }
    } else {
      if (knobEditor) {
        knobEditor.destroy();
        knobEditor = null;
      }
      hooksTabController?.destroy();
      hooksTabController = null;
      knobsContainer.innerHTML = '';
      const missing = document.createElement('div');
      missing.className = 'irs-preset-category__row';
      missing.textContent = `${categoryConfig.presetId} is missing from the preset registry.`;
      knobsContainer.appendChild(missing);
      presetValue.textContent = categoryConfig.presetId;
    }

    const showConfigure = activeTab === 'configure';
    enabledRow.hidden = !showConfigure;
    presetRow.hidden = !showConfigure;
    knobsContainer.hidden = !showConfigure;
    resetButton.hidden = !showConfigure;
    hooksContainer.hidden = showConfigure;
    configureTab.classList.toggle('irs-preset-category__tab--active', showConfigure);
    hooksTab.classList.toggle('irs-preset-category__tab--active', !showConfigure);
  }

  enabledToggle.addEventListener('change', () => {
    const snapshot = config.configStore.snapshot();
    const catConfig = config.configStore.getCategoryConfig(config.categoryId);
    if (enabledToggle.checked) {
      config.configStore.enableCategory(config.categoryId, catConfig.presetId);
      uxFeedback.undo.show('Category enabled. Undo?', () => config.configStore.restore(snapshot));
    } else {
      config.configStore.disableCategory(config.categoryId);
      uxFeedback.undo.show('Category disabled. Undo?', () => config.configStore.restore(snapshot));
    }
  });

  resetButton.addEventListener('click', () => {
    const snapshot = config.configStore.snapshot();
    config.configStore.resetCategory(config.categoryId);
    uxFeedback.undo.show('Reset to defaults. Undo?', () => config.configStore.restore(snapshot));
  });

  configureTab.addEventListener('click', () => {
    activeTab = 'configure';
    render();
  });

  hooksTab.addEventListener('click', () => {
    activeTab = 'hooks';
    render();
  });

  presetRow.addEventListener('click', () => {
    presetPickerController?.destroy();
    presetPickerController = createPresetPicker({
      container: config.container,
      categoryId: config.categoryId,
      registry: config.registry,
      configStore: config.configStore,
      onSelect: (presetId) => {
        const snapshot = config.configStore.snapshot();
        config.configStore.enableCategory(config.categoryId, presetId);
        uxFeedback.undo.show('Preset switched. Undo?', () => config.configStore.restore(snapshot));
      },
      onClose: () => {
        presetPickerController?.destroy();
        presetPickerController = null;
      },
    });
  });

  render();

  return {
    refresh: render,
    destroy() {
      knobEditor?.destroy();
      hooksTabController?.destroy();
      presetPickerController?.destroy();
      uxFeedback.undo.dismiss();
      root.remove();
    },
  };
}
