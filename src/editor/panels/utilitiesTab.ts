import type { AuthManager } from '@/deploy';
import type { StorageQuotaInfo } from '@/storage/hot';
import { exportAllData, importAllData, checkStorageQuota } from '@/storage';
import { createDeployPanel, type DeployPanelController } from './deployPanel';

const STYLES = `
  .utilities-tab {
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: #e6ecff;
  }

  .utilities-tab__section {
    background: rgba(20, 30, 60, 0.85);
    border: 1px solid #253461;
    border-radius: 14px;
    padding: 12px;
  }

  .utilities-tab__section-title {
    font-size: 13px;
    font-weight: 700;
    color: #dbe4ff;
    margin-bottom: 8px;
  }

  .utilities-tab__section-desc {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 10px;
    line-height: 1.4;
  }

  .utilities-tab__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .utilities-tab__button {
    height: 44px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 10px;
    border: none;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
  }

  .utilities-tab__button:active {
    background: rgba(255, 255, 255, 0.14);
    transform: scale(0.98);
  }

  .utilities-tab__status {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    margin-top: 12px;
    padding: 8px 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

  .utilities-tab__placeholder {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    padding: 12px;
    border-radius: 10px;
    border: 1px dashed rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.02);
  }
`;

export interface UtilitiesTabConfig {
  container: HTMLElement;
  authManager?: AuthManager;
}

export interface UtilitiesTabController {
  destroy(): void;
}

export function createUtilitiesTab(config: UtilitiesTabConfig): UtilitiesTabController {
  const { container, authManager } = config;

  if (!document.getElementById('utilities-tab-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'utilities-tab-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  const root = document.createElement('div');
  root.className = 'utilities-tab';

  const deploySection = document.createElement('section');
  deploySection.className = 'utilities-tab__section';

  const deployTitle = document.createElement('div');
  deployTitle.className = 'utilities-tab__section-title';
  deployTitle.textContent = 'Deploy to GitHub';

  deploySection.appendChild(deployTitle);

  let deployPanelController: DeployPanelController | null = null;
  if (authManager) {
    deployPanelController = createDeployPanel({
      container: deploySection,
      authManager,
    });
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'utilities-tab__placeholder';
    placeholder.textContent = 'Deploy panel unavailable';
    deploySection.appendChild(placeholder);
  }

  const dataSection = document.createElement('section');
  dataSection.className = 'utilities-tab__section';

  const dataTitle = document.createElement('div');
  dataTitle.className = 'utilities-tab__section-title';
  dataTitle.textContent = 'Data Tools';

  const dataDesc = document.createElement('div');
  dataDesc.className = 'utilities-tab__section-desc';
  dataDesc.textContent = 'Export or import hot storage data (projects, scenes, editor state).';

  const dataActions = document.createElement('div');
  dataActions.className = 'utilities-tab__actions';

  const dataStatus = document.createElement('div');
  dataStatus.className = 'utilities-tab__status';
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

  const btnCheck = document.createElement('button');
  btnCheck.className = 'utilities-tab__button';
  btnCheck.textContent = 'Check Storage';
  btnCheck.addEventListener('click', async () => {
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
  btnExport.className = 'utilities-tab__button';
  btnExport.textContent = 'Export JSON';
  btnExport.addEventListener('click', async () => {
    try {
      dataStatus.textContent = 'Exporting...';
      const data = await exportAllData();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      downloadJson(`inrepo-export-${ts}.json`, data);
      dataStatus.textContent = 'Export complete.';
    } catch (error) {
      console.error(error);
      dataStatus.textContent = 'Export failed (see console).';
    }
  });

  const btnCopy = document.createElement('button');
  btnCopy.className = 'utilities-tab__button';
  btnCopy.textContent = 'Copy JSON';
  btnCopy.addEventListener('click', async () => {
    try {
      dataStatus.textContent = 'Preparing JSON...';
      const data = await exportAllData();
      const text = JSON.stringify(data, null, 2);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        dataStatus.textContent = 'Copied to clipboard.';
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
  btnImport.className = 'utilities-tab__button';
  btnImport.textContent = 'Import JSON';
  btnImport.addEventListener('click', () => {
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
      window.location.reload();
    } catch (error) {
      console.error(error);
      dataStatus.textContent = 'Import failed (invalid JSON or storage error).';
    }
  });

  dataActions.appendChild(btnCheck);
  dataActions.appendChild(btnExport);
  dataActions.appendChild(btnCopy);
  dataActions.appendChild(btnImport);

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
