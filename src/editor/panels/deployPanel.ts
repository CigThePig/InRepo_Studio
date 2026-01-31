import type { AuthManager, AuthState } from '@/deploy';
import {
  createAuthModal,
  createChangeDetector,
  createCommitter,
  createConflictResolver,
  createDeployUI,
  createShaManager,
  deployChanges,
} from '@/deploy';
import { getAllScenes, getHotProject } from '@/storage';

export interface DeployPanelConfig {
  container: HTMLElement;
  authManager: AuthManager;
}

export interface DeployPanelController {
  destroy(): void;
}

interface RepoConfig {
  owner: string;
  repo: string;
  source: 'auto' | 'stored' | 'manual';
}

const STYLES = `
  .deploy-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px 0;
    color: #e6e6f0;
  }

  .deploy-status-card {
    background: #1f1f3a;
    border: 1px solid #2a2a4e;
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .deploy-status-title {
    font-size: 13px;
    font-weight: 600;
    color: #fff;
  }

  .deploy-status-subtitle {
    font-size: 12px;
    color: #aab0d4;
  }

  .deploy-status-actions {
    display: flex;
    gap: 8px;
  }

  .deploy-btn {
    flex: 1;
    min-height: 44px;
    border-radius: 8px;
    border: none;
    background: #4a9eff;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
  }

  .deploy-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .deploy-secondary-btn {
    min-height: 44px;
    border-radius: 8px;
    border: 1px solid #3a3a6e;
    background: #2a2a4e;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
    padding: 0 12px;
  }

  .deploy-scopes {
    font-size: 12px;
    color: #aab0d4;
  }

  .deploy-warning {
    font-size: 12px;
    color: #ffb347;
  }

  .deploy-input {
    width: 100%;
    min-height: 44px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid #3a3a6e;
    background: #131321;
    color: #fff;
    font-size: 13px;
  }

  .deploy-form-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: #aab0d4;
  }

  .deploy-inline {
    display: flex;
    gap: 8px;
  }

  .deploy-helper {
    font-size: 12px;
    color: #aab0d4;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('deploy-panel-styles')) {
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = 'deploy-panel-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createDeployPanel(config: DeployPanelConfig): DeployPanelController {
  const { container, authManager } = config;

  ensureStyles();

  const panel = document.createElement('div');
  panel.className = 'deploy-panel';
  container.appendChild(panel);

  const authModal = createAuthModal(document.body, {
    authManager,
    onClose: () => undefined,
    onSuccess: () => undefined,
  });

  let deployUI: ReturnType<typeof createDeployUI> | null = null;

  function loadStoredRepoConfig(): RepoConfig | null {
    const owner = localStorage.getItem('inrepo_repo_owner');
    const repo = localStorage.getItem('inrepo_repo_name');
    if (owner && repo) {
      return { owner, repo, source: 'stored' };
    }
    return null;
  }

  function inferRepoConfig(): RepoConfig | null {
    const baseUrl = import.meta.env.BASE_URL ?? '/';
    const trimmed = baseUrl.replace(/^\/|\/$/g, '');
    const repo = trimmed.split('/')[0];
    if (!repo) {
      return null;
    }

    const host = window.location.hostname;
    if (!host.endsWith('.github.io')) {
      return null;
    }

    const owner = host.replace('.github.io', '');
    if (!owner) {
      return null;
    }

    return { owner, repo, source: 'auto' };
  }

  function resolveRepoConfig(): RepoConfig | null {
    return loadStoredRepoConfig() ?? inferRepoConfig();
  }

  function updateRepoConfig(config: RepoConfig): void {
    localStorage.setItem('inrepo_repo_owner', config.owner);
    localStorage.setItem('inrepo_repo_name', config.repo);
  }

  function renderUnauthenticated(): void {
    deployUI?.destroy();
    deployUI = null;
    panel.innerHTML = `
      <div class="deploy-status-card">
        <div class="deploy-status-title">GitHub status</div>
        <div class="deploy-status-subtitle">Not connected</div>
        <div class="deploy-status-actions">
          <button class="deploy-btn" type="button">Connect to GitHub</button>
        </div>
        <div class="deploy-warning">Use a classic PAT with the <strong>repo</strong> scope.</div>
      </div>
      <button class="deploy-secondary-btn" type="button" disabled>Deploy (Track 13)</button>
    `;

    panel.querySelector('.deploy-btn')?.addEventListener('click', () => {
      authModal.show();
    });
  }

  function renderAuthenticated(state: AuthState): void {
    deployUI?.destroy();
    deployUI = null;
    const scopes = state.scopes.length > 0 ? state.scopes.join(', ') : 'unknown';
    const storageLabel = state.isPersistent ? 'Remembered on this device' : 'Session only';
    const resolvedRepo = resolveRepoConfig();
    panel.innerHTML = `
      <div class="deploy-status-card">
        <div class="deploy-status-title">Connected as ${state.username ?? 'Unknown'}</div>
        <div class="deploy-status-subtitle">${storageLabel}</div>
        <div class="deploy-scopes">Token scopes: ${scopes}</div>
        <div class="deploy-status-actions">
          <button class="deploy-secondary-btn" type="button">Disconnect</button>
        </div>
      </div>
      <div class="deploy-status-card">
        <div class="deploy-status-title">Repository</div>
        <div class="deploy-form-row">
          <label>Owner</label>
          <input class="deploy-input" name="owner" placeholder="octocat" value="${resolvedRepo?.owner ?? ''}" />
        </div>
        <div class="deploy-form-row">
          <label>Repository</label>
          <input class="deploy-input" name="repo" placeholder="my-game" value="${resolvedRepo?.repo ?? ''}" />
        </div>
        <div class="deploy-inline" data-repo-actions>
          <button class="deploy-secondary-btn" data-save-repo type="button">Save repo</button>
          <button class="deploy-secondary-btn" data-use-url type="button">Use URL</button>
        </div>
        <div class="deploy-helper">${resolvedRepo ? `Using ${resolvedRepo.source} config.` : 'Enter repository info to enable deploy.'}</div>
      </div>
      <div class="deploy-status-card" data-deploy-status>
        <div class="deploy-status-title">Deploy status</div>
        <div class="deploy-status-subtitle">Ready to deploy.</div>
      </div>
      <button class="deploy-btn" type="button">Deploy now</button>
    `;

    panel.querySelector('.deploy-secondary-btn')?.addEventListener('click', () => {
      const confirmed = window.confirm('Disconnect from GitHub and forget the stored token?');
      if (!confirmed) return;
      authManager.logout().catch(() => undefined);
    });

    const ownerInput = panel.querySelector<HTMLInputElement>('input[name="owner"]');
    const repoInput = panel.querySelector<HTMLInputElement>('input[name="repo"]');
    const saveButton = panel.querySelector<HTMLButtonElement>('[data-save-repo]');
    const useUrlButton = panel.querySelector<HTMLButtonElement>('[data-use-url]');
    const deployButton = panel.querySelector<HTMLButtonElement>('.deploy-btn');
    const statusCard = panel.querySelector<HTMLElement>('[data-deploy-status]');

    const conflictResolver = createConflictResolver(document.body);
    if (deployButton && statusCard) {
      deployUI = createDeployUI({
        container: statusCard,
        deployButton,
        conflictResolver,
      });
    }

    function syncButtonState(): void {
      if (!deployButton) return;
      const owner = ownerInput?.value.trim() ?? '';
      const repo = repoInput?.value.trim() ?? '';
      deployUI?.setDeployEnabled(Boolean(owner && repo));
    }

    saveButton?.addEventListener('click', () => {
      const owner = ownerInput?.value.trim() ?? '';
      const repo = repoInput?.value.trim() ?? '';
      if (!owner || !repo) {
        deployUI?.setStatus({
          phase: 'error',
          message: 'Repository details required.',
          error: 'Enter both owner and repo before saving.',
        });
        return;
      }
      updateRepoConfig({ owner, repo, source: 'manual' });
      deployUI?.setStatus({
        phase: 'done',
        message: 'Repository saved.',
      });
      syncButtonState();
    });

    useUrlButton?.addEventListener('click', () => {
      const inferred = inferRepoConfig();
      if (!inferred) {
        deployUI?.setStatus({
          phase: 'error',
          message: 'Cannot infer repository from URL.',
          error: 'Use a GitHub Pages URL or enter details manually.',
        });
        return;
      }
      if (ownerInput) ownerInput.value = inferred.owner;
      if (repoInput) repoInput.value = inferred.repo;
      updateRepoConfig(inferred);
      deployUI?.setStatus({
        phase: 'done',
        message: 'Repository updated from URL.',
      });
      syncButtonState();
    });

    ownerInput?.addEventListener('input', syncButtonState);
    repoInput?.addEventListener('input', syncButtonState);

    deployButton?.addEventListener('click', async () => {
      const owner = ownerInput?.value.trim() ?? '';
      const repo = repoInput?.value.trim() ?? '';
      if (!owner || !repo) {
        deployUI?.setStatus({
          phase: 'error',
          message: 'Repository details required.',
          error: 'Enter both owner and repo before deploying.',
        });
        return;
      }

      updateRepoConfig({ owner, repo, source: 'manual' });

      deployUI?.setDeployEnabled(false);

      const shaManager = createShaManager({ authManager, repoOwner: owner, repoName: repo });
      const changeDetector = createChangeDetector({
        getProject: getHotProject,
        getScenes: getAllScenes,
        getShaStore: () => shaManager.createStore(),
      });
      const committer = createCommitter({ authManager, repoOwner: owner, repoName: repo });

      await deployChanges({
        authManager,
        changeDetector,
        shaManager,
        committer,
        deployUI: deployUI!,
      });

      deployUI?.setDeployEnabled(true);
    });

    syncButtonState();
  }

  async function render(): Promise<void> {
    const state = await authManager.getState();
    if (state.isAuthenticated) {
      renderAuthenticated(state);
    } else {
      renderUnauthenticated();
    }
  }

  const unsubscribe = authManager.onStateChange(() => {
    render().catch(() => undefined);
  });

  render().catch(() => undefined);

  return {
    destroy() {
      unsubscribe();
      authModal.destroy();
      panel.remove();
    },
  };
}
