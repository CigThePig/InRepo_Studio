import type { PresetCategoryId } from '@/types/preset';
import type { PresetConfigStore } from './presetConfigStore';
import type { PresetRegistry } from '@/runtime/presets/presetRegistry';

export interface PresetPickerConfig {
  container: HTMLElement;
  categoryId: PresetCategoryId;
  registry: PresetRegistry;
  configStore: PresetConfigStore;
  onSelect: (presetId: string) => void;
  onClose: () => void;
}

export interface PresetPickerController {
  destroy(): void;
}

const STYLES = `
  .preset-picker-overlay {
    position: absolute;
    inset: 0;
    z-index: 15;
    background: rgba(2, 8, 20, 0.75);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: flex-end;
  }

  .preset-picker {
    width: 100%;
    max-height: 78%;
    overflow-y: auto;
    background: #121b33;
    border-top: 1px solid rgba(88, 116, 173, 0.75);
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .preset-picker__close,
  .preset-picker__card {
    min-height: 44px;
  }

  .preset-picker__close {
    align-self: flex-end;
  }

  .preset-picker__card {
    border-radius: 12px;
    border: 1px solid rgba(88, 116, 173, 0.65);
    background: rgba(12, 19, 37, 0.95);
    color: #e6ecff;
    text-align: left;
    padding: 10px;
  }

  .preset-picker__label { font-weight: 700; font-size: 13px; }
  .preset-picker__desc { font-size: 11px; color: #9fb1e0; margin-top: 3px; }
  .preset-picker__meta { margin-top: 5px; font-size: 11px; color: #c8d7ff; }
  .preset-picker__warning { color: #ffc870; }
`;

function ensureStyles(): void {
  if (document.getElementById('preset-picker-styles')) return;
  const style = document.createElement('style');
  style.id = 'preset-picker-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

export function createPresetPicker(config: PresetPickerConfig): PresetPickerController {
  ensureStyles();

  const overlay = document.createElement('div');
  overlay.className = 'preset-picker-overlay';

  const sheet = document.createElement('div');
  sheet.className = 'preset-picker';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'irs-btn irs-btn--secondary preset-picker__close';
  close.textContent = 'Close';
  close.addEventListener('click', () => config.onClose());
  sheet.appendChild(close);

  const entries = config.registry.getByCategory(config.categoryId);
  const conflicts = config.configStore.getConflicts();
  const activePresetIds = new Set<string>();
  for (const category of Object.values(config.configStore.getConfig().categories)) {
    if (category.enabled) activePresetIds.add(category.presetId);
  }

  for (const entry of entries) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-picker__card';

    const warning = entry.definition.compatibility.conflictsWith?.some((id) => activePresetIds.has(id));
    const isRecommended = (entry.definition.recommendedProfiles ?? []).includes(config.configStore.getConfig().profile);

    const conflictsWith = conflicts
      .filter((item) => item.presetA === entry.definition.id || item.presetB === entry.definition.id)
      .map((item) => `${item.presetA} ↔ ${item.presetB}`)
      .join(', ');

    button.innerHTML = `
      <div class="preset-picker__label">${entry.definition.label}</div>
      <div class="preset-picker__desc">${entry.definition.description}</div>
      <div class="preset-picker__meta">${isRecommended ? 'Recommended for current profile' : 'Available preset'}</div>
      ${warning ? `<div class="preset-picker__meta preset-picker__warning">May conflict with active presets${conflictsWith ? `: ${conflictsWith}` : ''}</div>` : ''}
    `;
    button.addEventListener('click', () => {
      config.onSelect(entry.definition.id);
      config.onClose();
    });
    sheet.appendChild(button);
  }

  overlay.appendChild(sheet);
  overlay.addEventListener('click', (evt) => {
    if (evt.target === overlay) {
      config.onClose();
    }
  });

  config.container.appendChild(overlay);

  return {
    destroy() {
      overlay.remove();
    },
  };
}
