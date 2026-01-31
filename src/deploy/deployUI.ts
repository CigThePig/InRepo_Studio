import type { ConflictInfo } from './changeDetector';
import type { ConflictResolverUI, ResolvedConflict } from './conflictResolver';

export interface CommitProgress {
  current: number;
  total: number;
  currentFile: string;
}

export interface CommitResult {
  success: boolean;
  path: string;
  newSha?: string;
  error?: string;
}

export type DeployPhase = 'idle' | 'detecting' | 'fetching' | 'resolving' | 'committing' | 'done' | 'error';

export interface DeployStatus {
  phase: DeployPhase;
  message: string;
  progress?: CommitProgress;
  results?: CommitResult[];
  error?: string;
}

export interface DeployUIConfig {
  container: HTMLElement;
  deployButton: HTMLButtonElement;
  conflictResolver: ConflictResolverUI;
}

export interface DeployUI {
  setStatus(status: DeployStatus): void;
  showConflicts(conflicts: ConflictInfo[]): Promise<ResolvedConflict[] | null>;
  setDeployEnabled(enabled: boolean): void;
  destroy(): void;
}

const STYLES = `
  .deploy-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: #aab0d4;
  }

  .deploy-results {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: #aab0d4;
  }

  .deploy-result-item {
    display: flex;
    align-items: center;
    gap: 6px;
    word-break: break-all;
  }

  .deploy-result-item.success {
    color: #6bff95;
  }

  .deploy-result-item.error {
    color: #ff6b6b;
  }

  .deploy-error {
    color: #ff6b6b;
    font-size: 12px;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('deploy-ui-styles')) {
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = 'deploy-ui-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createDeployUI(config: DeployUIConfig): DeployUI {
  const { container, deployButton, conflictResolver } = config;

  ensureStyles();

  const messageEl = container.querySelector<HTMLElement>('.deploy-status-subtitle');
  const progressEl = document.createElement('div');
  progressEl.className = 'deploy-progress';
  const resultsEl = document.createElement('div');
  resultsEl.className = 'deploy-results';
  const errorEl = document.createElement('div');
  errorEl.className = 'deploy-error';

  container.appendChild(progressEl);
  container.appendChild(resultsEl);
  container.appendChild(errorEl);

  function clearExtras(): void {
    progressEl.textContent = '';
    resultsEl.textContent = '';
    errorEl.textContent = '';
  }

  return {
    setStatus(status) {
      if (messageEl) {
        messageEl.textContent = status.message;
      }
      clearExtras();

      if (status.progress) {
        progressEl.textContent = `Committing ${status.progress.current}/${status.progress.total}: ${status.progress.currentFile}`;
      }

      if (status.results && status.results.length > 0) {
        status.results.forEach((result) => {
          const item = document.createElement('div');
          item.className = `deploy-result-item ${result.success ? 'success' : 'error'}`;
          item.textContent = `${result.success ? '✓' : '✕'} ${result.path}`;
          resultsEl.appendChild(item);
        });
      }

      if (status.error) {
        errorEl.textContent = status.error;
      }
    },
    showConflicts(conflicts) {
      return conflictResolver.show(conflicts);
    },
    setDeployEnabled(enabled) {
      deployButton.disabled = !enabled;
    },
    destroy() {
      conflictResolver.destroy();
      progressEl.remove();
      resultsEl.remove();
      errorEl.remove();
    },
  };
}
