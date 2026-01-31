import type { AuthManager, AuthState } from '@/deploy';
import { createAuthModal } from '@/deploy';

export interface DeployPanelConfig {
  container: HTMLElement;
  authManager: AuthManager;
}

export interface DeployPanelController {
  destroy(): void;
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

  function renderUnauthenticated(): void {
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
    const scopes = state.scopes.length > 0 ? state.scopes.join(', ') : 'unknown';
    const storageLabel = state.isPersistent ? 'Remembered on this device' : 'Session only';

    panel.innerHTML = `
      <div class="deploy-status-card">
        <div class="deploy-status-title">Connected as ${state.username ?? 'Unknown'}</div>
        <div class="deploy-status-subtitle">${storageLabel}</div>
        <div class="deploy-scopes">Token scopes: ${scopes}</div>
        <div class="deploy-status-actions">
          <button class="deploy-secondary-btn" type="button">Disconnect</button>
        </div>
      </div>
      <button class="deploy-btn" type="button" disabled>Deploy (Track 13)</button>
    `;

    panel.querySelector('.deploy-secondary-btn')?.addEventListener('click', () => {
      const confirmed = window.confirm('Disconnect from GitHub and forget the stored token?');
      if (!confirmed) return;
      authManager.logout().catch(() => undefined);
    });
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
