import type { PresetCategoryId } from '@/types/preset';
import type { PresetRegistry } from '@/runtime/presets/presetRegistry';
import type { PresetConfigStore } from './presetConfigStore';

export interface IssuesModalConfig {
  container: HTMLElement;
  configStore: PresetConfigStore;
  registry: PresetRegistry;
  onJumpToCategory: (categoryId: PresetCategoryId) => void;
  onClose: () => void;
}

export interface IssuesModalController {
  destroy(): void;
}

const STYLES = `
  .preset-issues-overlay {
    position: absolute;
    inset: 0;
    z-index: 15;
    background: var(--irs-surface-dark-alpha);
    display: flex;
    align-items: flex-end;
  }

  .preset-issues-sheet {
    width: 100%;
    max-height: 78%;
    overflow-y: auto;
    background: var(--irs-surface-modal);
    border-top: 1px solid var(--irs-border-heavy);
    border-top-left-radius: var(--irs-radius-lg);
    border-top-right-radius: var(--irs-radius-lg);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--irs-text-primary);
  }

  .preset-issues-close,
  .preset-issues-item { min-height: 44px; }

  .preset-issues-item {
    border-radius: var(--irs-radius-md);
    border: 1px solid var(--irs-accent-danger);
    background: var(--irs-surface-input);
    color: var(--irs-text-primary);
    text-align: left;
    padding: 8px 10px;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('preset-issues-styles')) return;
  const style = document.createElement('style');
  style.id = 'preset-issues-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

export function createIssuesModal(config: IssuesModalConfig): IssuesModalController {
  ensureStyles();

  const overlay = document.createElement('div');
  overlay.className = 'preset-issues-overlay';

  const sheet = document.createElement('div');
  sheet.className = 'preset-issues-sheet';
  sheet.innerHTML = '<strong>Preset Issues</strong>';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'irs-btn irs-btn--secondary preset-issues-close';
  close.textContent = 'Close';
  close.addEventListener('click', () => config.onClose());
  sheet.appendChild(close);

  const conflicts = config.configStore.getConflicts();
  for (const issue of conflicts) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'irs-btn preset-issues-item';
    item.textContent = `${issue.categoryA} (${issue.presetA}) conflicts with ${issue.categoryB} (${issue.presetB})`;
    item.addEventListener('click', () => {
      config.onJumpToCategory(issue.categoryA);
      config.onClose();
    });
    sheet.appendChild(item);
  }

  for (const [categoryId, categoryConfig] of Object.entries(config.configStore.getConfig().categories)) {
    const preset = config.registry.getById(categoryConfig.presetId);
    if (categoryConfig.enabled && !preset) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'irs-btn preset-issues-item';
      item.textContent = `${categoryId}: preset ${categoryConfig.presetId} is missing`;
      item.addEventListener('click', () => {
        config.onJumpToCategory(categoryId as PresetCategoryId);
        config.onClose();
      });
      sheet.appendChild(item);
    }
  }

  if (sheet.childElementCount <= 2) {
    const empty = document.createElement('div');
    empty.textContent = 'No issues detected.';
    sheet.appendChild(empty);
  }

  overlay.addEventListener('click', (evt) => {
    if (evt.target === overlay) config.onClose();
  });

  overlay.appendChild(sheet);
  config.container.appendChild(overlay);

  return {
    destroy() {
      overlay.remove();
    },
  };
}
