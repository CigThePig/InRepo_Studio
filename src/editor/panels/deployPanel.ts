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
import type { AssetRegistry } from '@/editor/assets';
import { uxFeedback } from '@/editor/uxFeedback';
import { loadWorkspaceContent } from '@/storage';

export interface DeployPanelConfig {
  container: HTMLElement;
  authManager: AuthManager;
  assetRegistry?: AssetRegistry;
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
  .irs-deploy-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px 0;
    color: var(--irs-text-primary);
  }

  .irs-deploy-panel__status-card {
    background: var(--irs-surface-panel);
    border: 1px solid var(--irs-border-heavy);
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .irs-deploy-panel__status-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--irs-text-primary);
  }

  .irs-deploy-panel__status-subtitle {
    font-size: 12px;
    color: var(--irs-text-secondary);
  }

  .irs-deploy-panel__status-actions {
    display: flex;
    gap: 8px;
  }

  .irs-deploy-panel__secondary-btn {
    min-height: 44px;
    border-radius: 8px;
    border: 1px solid var(--irs-border-heavy);
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
    font-weight: 600;
    cursor: pointer;
    padding: 0 12px;
  }

  .irs-deploy-panel__scopes {
    font-size: 12px;
    color: var(--irs-text-secondary);
  }

  .irs-deploy-panel__warning {
    font-size: 12px;
    color: var(--irs-color-yellow);
  }

  .irs-deploy-panel__input {
    width: 100%;
    min-height: 44px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--irs-border-heavy);
    background: var(--irs-surface-input);
    color: var(--irs-text-primary);
    font-size: 13px;
  }

  .irs-deploy-panel__form-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: var(--irs-text-secondary);
  }

  .irs-deploy-panel__inline {
    display: flex;
    gap: 8px;
  }

  .irs-deploy-panel__helper {
    font-size: 12px;
    color: var(--irs-text-secondary);
  }
`;

function ensureStyles(): void {
  if (document.getElementById('irs-deploy-panel-styles')) {
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = 'irs-deploy-panel-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createDeployPanel(config: DeployPanelConfig): DeployPanelController {
  const { container, authManager, assetRegistry } = config;

  ensureStyles();

  const panel = document.createElement('div');
  panel.className = 'irs-deploy-panel';
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
      <div class="irs-deploy-panel__status-card">
        <div class="irs-deploy-panel__status-title">GitHub status</div>
        <div class="irs-deploy-panel__status-subtitle">Not connected</div>
        <div class="irs-deploy-panel__status-actions">
          <button class="irs-btn irs-btn--primary" type="button">Connect to GitHub</button>
        </div>
        <div class="irs-deploy-panel__warning">Use a classic PAT with the <strong>repo</strong> scope.</div>
      </div>
      <button class="irs-deploy-panel__secondary-btn" type="button" disabled>Deploy (Track 13)</button>
    `;

    panel.querySelector('.irs-btn')?.addEventListener('click', () => {
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
      <div class="irs-deploy-panel__status-card">
        <div class="irs-deploy-panel__status-title">Connected as ${state.username ?? 'Unknown'}</div>
        <div class="irs-deploy-panel__status-subtitle">${storageLabel}</div>
        <div class="irs-deploy-panel__scopes">Token scopes: ${scopes}</div>
        <div class="irs-deploy-panel__status-actions">
          <button class="irs-deploy-panel__secondary-btn" type="button">Disconnect</button>
        </div>
      </div>
      <div class="irs-deploy-panel__status-card">
        <div class="irs-deploy-panel__status-title">Repository</div>
        <div class="irs-deploy-panel__form-row">
          <label>Owner</label>
          <input class="irs-deploy-panel__input" name="owner" placeholder="octocat" value="${resolvedRepo?.owner ?? ''}" />
        </div>
        <div class="irs-deploy-panel__form-row">
          <label>Repository</label>
          <input class="irs-deploy-panel__input" name="repo" placeholder="my-game" value="${resolvedRepo?.repo ?? ''}" />
        </div>
        <div class="irs-deploy-panel__inline" data-repo-actions>
          <button class="irs-deploy-panel__secondary-btn" data-save-repo type="button">Save repo</button>
          <button class="irs-deploy-panel__secondary-btn" data-use-url type="button">Use URL</button>
        </div>
        <div class="irs-deploy-panel__helper">${resolvedRepo ? `Using ${resolvedRepo.source} config.` : 'Enter repository info to enable deploy.'}</div>
      </div>
      <div class="irs-deploy-panel__status-card" data-deploy-status>
        <div class="irs-deploy-panel__status-title">Deploy status</div>
        <div class="irs-deploy-panel__status-subtitle">Ready to deploy.</div>
      </div>
      <button class="irs-btn irs-btn--primary" type="button">Deploy now</button>
    `;

    panel.querySelector('.irs-deploy-panel__secondary-btn')?.addEventListener('click', () => {
      const confirmed = window.confirm('Disconnect from GitHub and forget the stored token?');
      if (!confirmed) return;
      authManager.logout().catch(() => undefined);
    });

    const ownerInput = panel.querySelector<HTMLInputElement>('input[name="owner"]');
    const repoInput = panel.querySelector<HTMLInputElement>('input[name="repo"]');
    const saveButton = panel.querySelector<HTMLButtonElement>('[data-save-repo]');
    const useUrlButton = panel.querySelector<HTMLButtonElement>('[data-use-url]');
    const deployButton = panel.querySelector<HTMLButtonElement>('.irs-btn');
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
        getWorkspace: loadWorkspaceContent,
        getShaStore: () => shaManager.createStore(),
        getAssetRegistryState: assetRegistry
          ? () => assetRegistry.getState()
          : undefined,
      });
      const committer = createCommitter({ authManager, repoOwner: owner, repoName: repo });

      try {
        await deployChanges({
          authManager,
          changeDetector,
          shaManager,
          committer,
          deployUI: deployUI!,
        });
        if (deployButton) {
          uxFeedback.combos.committed(deployButton, 'Changes committed to repository.');
        }
      } catch {
        uxFeedback.toast.error('Deploy failed. Check your connection.');
      }

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
