import type { AuthManager } from '@/deploy';
import type { AssetRegistry } from '@/editor/assets';
import type { StorageQuotaInfo } from '@/storage/hot';
import {
  exportAllData,
  importAllData,
  checkStorageQuota,
  clearAllData,
  forceRefreshFromCold,
} from '@/storage';
import { uxFeedback } from '@/editor/uxFeedback';
import { createDeployPanel, type DeployPanelController } from './deployPanel';

const STYLES = `
  .irs-utilities-tab {
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: var(--irs-text-primary);
  }

  .irs-utilities-tab__section {
    background: var(--irs-surface-dark-alpha);
    border: 1px solid var(--irs-border-medium);
    border-radius: var(--irs-radius-xl);
    padding: 12px;
  }

  .irs-utilities-tab__section-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--irs-text-primary);
    margin-bottom: 8px;
  }

  .irs-utilities-tab__section-desc {
    font-size: 12px;
    color: var(--irs-text-secondary);
    margin-bottom: 10px;
    line-height: 1.4;
  }

  .irs-utilities-tab__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .irs-utilities-tab__button {
    min-height: var(--irs-touch-target);
    min-width: var(--irs-touch-target);
    padding: 0 14px;
    font-size: 13px;
  }

  .irs-utilities-tab__status {
    font-size: 12px;
    color: var(--irs-text-secondary);
    margin-top: 12px;
    padding: 8px 10px;
    background: var(--irs-surface-base);
    border-radius: var(--irs-radius-sm);
  }

  .irs-utilities-tab__placeholder {
    font-size: 12px;
    color: var(--irs-text-muted);
    padding: 12px;
    border-radius: var(--irs-radius-md);
    border: 1px dashed var(--irs-border-light);
    background: var(--irs-surface-elevated);
  }

  .irs-utilities-tab__confirm-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .irs-utilities-tab__confirm-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .irs-utilities-tab__confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 6px;
  }
`;

export interface UtilitiesTabConfig {
  container: HTMLElement;
  authManager?: AuthManager;
  assetRegistry?: AssetRegistry;
}

export interface UtilitiesTabController {
  destroy(): void;
}

function ensureStyles(): void {
  if (document.getElementById('utilities-tab-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'utilities-tab-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createUtilitiesTab(config: UtilitiesTabConfig): UtilitiesTabController {
  const { container, authManager, assetRegistry } = config;

  ensureStyles();

  const root = document.createElement('div');
  root.className = 'irs-utilities-tab';

  const deploySection = document.createElement('section');
  deploySection.className = 'irs-utilities-tab__section';

  const deployTitle = document.createElement('div');
  deployTitle.className = 'irs-utilities-tab__section-title';
  deployTitle.textContent = 'Deploy to GitHub';

  deploySection.appendChild(deployTitle);

  let deployPanelController: DeployPanelController | null = null;
  if (authManager) {
    deployPanelController = createDeployPanel({
      container: deploySection,
      authManager,
      assetRegistry,
    });
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'irs-utilities-tab__placeholder';
    placeholder.textContent = 'Deploy panel unavailable';
    deploySection.appendChild(placeholder);
  }

  const dataSection = document.createElement('section');
  dataSection.className = 'irs-utilities-tab__section';

  const dataTitle = document.createElement('div');
  dataTitle.className = 'irs-utilities-tab__section-title';
  dataTitle.textContent = 'Data Tools';

  const dataDesc = document.createElement('div');
  dataDesc.className = 'irs-utilities-tab__section-desc';
  dataDesc.textContent = 'Export or import hot storage data (projects, scenes, editor state).';

  const dataActions = document.createElement('div');
  dataActions.className = 'irs-utilities-tab__actions';

  const dataStatus = document.createElement('div');
  dataStatus.className = 'irs-utilities-tab__status';
  dataStatus.textContent = '';

  function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
  }

  function downloadJson(filename: string, data: unknown): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function confirmReset(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'irs-overlay irs-utilities-tab__confirm-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'irs-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-label', 'Confirm environment reset');

      const body = document.createElement('div');
      body.className = 'irs-utilities-tab__confirm-body';
      const title = document.createElement('strong');
      title.textContent = 'Reset environment?';
      const copy = document.createElement('p');
      copy.textContent = message;

      const actions = document.createElement('div');
      actions.className = 'irs-utilities-tab__confirm-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'irs-btn irs-btn--secondary';
      cancelBtn.textContent = 'Cancel';

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'irs-btn irs-btn--danger';
      confirmBtn.textContent = 'Reset';

      let closed = false;
      const close = (result: boolean): void => {
        if (closed) return;
        closed = true;
        overlay.remove();
        resolve(result);
      };

      cancelBtn.addEventListener('click', () => {
        uxFeedback.motion.pulse(cancelBtn);
        close(false);
      });
      confirmBtn.addEventListener('click', () => {
        uxFeedback.motion.pulse(confirmBtn);
        close(true);
      });
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close(false);
      });

      actions.append(cancelBtn, confirmBtn);
      body.append(title, copy, actions);
      dialog.appendChild(body);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      confirmBtn.focus();
    });
  }

  const btnCheck = document.createElement('button');
  btnCheck.className = 'irs-btn irs-btn--secondary irs-utilities-tab__button';
  btnCheck.textContent = 'Check Storage';
  btnCheck.addEventListener('click', async () => {
    uxFeedback.motion.pulse(btnCheck);
    try {
      dataStatus.textContent = 'Checking storage...';
      const info: StorageQuotaInfo | null = await checkStorageQuota();
      if (!info) {
        dataStatus.textContent = 'Storage estimate not available in this browser.';
        return;
      }
      const used = formatBytes(info.used);
      const quota = formatBytes(info.quota);
      dataStatus.textContent = `Used ${used} of ${quota} (${info.percentUsed.toFixed(1)}%).` +
        (info.isNearLimit ? ' ⚠ Near limit.' : '');
    } catch (error) {
      console.error(error);
      dataStatus.textContent = 'Storage check failed (see console).';
    }
  });

  const btnExport = document.createElement('button');
  btnExport.className = 'irs-btn irs-btn--secondary irs-utilities-tab__button';
  btnExport.textContent = 'Export JSON';
  btnExport.addEventListener('click', async () => {
    uxFeedback.motion.pulse(btnExport);
    try {
      dataStatus.textContent = 'Exporting...';
      const data = await exportAllData();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      downloadJson(`inrepo-export-${ts}.json`, data);
      dataStatus.textContent = 'Export complete.';
      uxFeedback.toast.success('Export complete.');
    } catch (error) {
      console.error(error);
      dataStatus.textContent = 'Export failed (see console).';
    }
  });

  const btnCopy = document.createElement('button');
  btnCopy.className = 'irs-btn irs-btn--secondary irs-utilities-tab__button';
  btnCopy.textContent = 'Copy JSON';
  btnCopy.addEventListener('click', async () => {
    uxFeedback.motion.pulse(btnCopy);
    try {
      dataStatus.textContent = 'Preparing JSON...';
      const data = await exportAllData();
      const text = JSON.stringify(data, null, 2);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        dataStatus.textContent = 'Copied to clipboard.';
        uxFeedback.toast.success('Copied to clipboard.');
        return;
      }
      window.prompt('Copy the JSON below:', text);
      dataStatus.textContent = 'Copy prompt opened.';
    } catch (error) {
      console.error(error);
      dataStatus.textContent = 'Copy failed (see console).';
    }
  });

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json,.json';
  importInput.style.display = 'none';

  const btnImport = document.createElement('button');
  btnImport.className = 'irs-btn irs-btn--secondary irs-utilities-tab__button';
  btnImport.textContent = 'Import JSON';
  btnImport.addEventListener('click', () => {
    uxFeedback.motion.pulse(btnImport);
    importInput.value = '';
    importInput.click();
  });

  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      dataStatus.textContent = 'Importing...';
      const text = await file.text();
      const parsed = JSON.parse(text);
      await importAllData(parsed);
      dataStatus.textContent = 'Import complete. Reloading...';
      uxFeedback.toast.success('Import complete. Reloading…');
      window.location.reload();
    } catch (error) {
      console.error(error);
      dataStatus.textContent = 'Import failed (invalid JSON or storage error).';
    }
  });

  const btnResetEnvironment = document.createElement('button');
  btnResetEnvironment.className = 'irs-btn irs-btn--danger irs-utilities-tab__button';
  btnResetEnvironment.textContent = 'Reset Environment';
  btnResetEnvironment.addEventListener('click', async () => {
    uxFeedback.motion.pulse(btnResetEnvironment);
    const confirmed = await confirmReset(
      'This clears local IndexedDB project/scenes/editor-state cache. '
      + 'Repo token is kept. Unsaved local changes not deployed to the repo will be lost.'
    );
    if (!confirmed) {
      dataStatus.textContent = 'Reset cancelled.';
      return;
    }

    try {
      if (navigator.onLine) {
        dataStatus.textContent = 'Resetting local environment from repo...';
        await forceRefreshFromCold();
      } else {
        dataStatus.textContent = 'Offline: clearing local hot storage only...';
        await clearAllData();
      }
      dataStatus.textContent = 'Environment reset complete. Reloading...';
      uxFeedback.toast.success('Environment reset complete. Reloading…');
      window.location.reload();
    } catch (error) {
      console.error(error);
      dataStatus.textContent = 'Reset failed (see console).';
    }
  });

  dataActions.appendChild(btnCheck);
  dataActions.appendChild(btnExport);
  dataActions.appendChild(btnCopy);
  dataActions.appendChild(btnImport);
  dataActions.appendChild(btnResetEnvironment);

  dataSection.appendChild(dataTitle);
  dataSection.appendChild(dataDesc);
  dataSection.appendChild(dataActions);
  dataSection.appendChild(importInput);
  dataSection.appendChild(dataStatus);

  root.appendChild(deploySection);
  root.appendChild(dataSection);
  container.appendChild(root);

  return {
    destroy: () => {
      deployPanelController?.destroy();
      root.remove();
    },
  };
}
