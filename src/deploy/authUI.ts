import type { AuthManager } from './auth';

export interface AuthModalConfig {
  authManager: AuthManager;
  onClose: () => void;
  onSuccess: (username: string) => void;
}

export interface AuthModal {
  show(): void;
  hide(): void;
  destroy(): void;
}

const STYLES = `
  .auth-modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease-out;
    z-index: 1000;
    padding: 16px;
  }

  .auth-modal-overlay.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .auth-modal {
    width: min(420px, 100%);
    background: #1c1c2f;
    border-radius: 12px;
    border: 1px solid #2a2a4e;
    color: #e6e6f0;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
  }

  .auth-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #2a2a4e;
  }

  .auth-modal-header h2 {
    font-size: 16px;
    margin: 0;
  }

  .auth-modal-close {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    border: none;
    background: #2a2a4e;
    color: #fff;
    font-size: 18px;
    cursor: pointer;
  }

  .auth-modal-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 14px;
    line-height: 1.4;
  }

  .auth-modal-body a {
    color: #4a9eff;
    text-decoration: none;
    font-weight: 600;
  }

  .auth-modal-body a:active {
    opacity: 0.8;
  }

  .auth-token-input {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #3a3a6e;
    background: #131321;
    color: #fff;
    font-size: 14px;
  }

  .auth-persist-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .auth-persist-label input {
    width: 20px;
    height: 20px;
  }

  .auth-persist-warning {
    color: #ffb347;
    font-size: 12px;
    margin: 0;
  }

  .auth-status {
    font-size: 12px;
    margin: 0;
  }

  .auth-status-error {
    color: #ff6b6b;
  }

  .auth-status-success {
    color: #6bff95;
  }

  .auth-status-loading {
    color: #ffd66b;
  }

  .auth-status-ready {
    color: #aab0d4;
  }

  .auth-modal-footer {
    display: flex;
    gap: 12px;
    padding: 16px;
    border-top: 1px solid #2a2a4e;
  }

  .auth-modal-footer button {
    flex: 1;
    min-height: 44px;
    border-radius: 8px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .auth-cancel-btn {
    background: #2a2a4e;
    color: #fff;
  }

  .auth-connect-btn {
    background: #4a9eff;
    color: #fff;
  }

  .auth-connect-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('auth-modal-styles')) {
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = 'auth-modal-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createAuthModal(container: HTMLElement, config: AuthModalConfig): AuthModal {
  const { authManager, onClose, onSuccess } = config;

  let modalOverlay: HTMLElement | null = null;
  let tokenInput: HTMLInputElement | null = null;
  let persistCheckbox: HTMLInputElement | null = null;
  let statusEl: HTMLElement | null = null;
  let connectBtn: HTMLButtonElement | null = null;

  function setStatus(message: string, type: 'ready' | 'loading' | 'success' | 'error'): void {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = `auth-status auth-status-${type}`;
  }

  function setConnectEnabled(enabled: boolean): void {
    if (connectBtn) {
      connectBtn.disabled = !enabled;
    }
  }

  async function handleConnect(): Promise<void> {
    const token = tokenInput?.value.trim() ?? '';
    if (!token) {
      setStatus('Please enter a token.', 'error');
      return;
    }

    const persistent = persistCheckbox?.checked ?? false;

    setStatus('Validating token...', 'loading');
    setConnectEnabled(false);

    const result = await authManager.authenticate(token, persistent);
    if (result.valid) {
      const username = result.username ?? 'Unknown';
      setStatus(`Connected as ${username}.`, 'success');
      window.setTimeout(() => {
        onSuccess(username);
        hide();
      }, 600);
      return;
    }

    setStatus(result.error ?? 'Authentication failed.', 'error');
    setConnectEnabled(true);
  }

  function render(): void {
    ensureStyles();

    modalOverlay = document.createElement('div');
    modalOverlay.className = 'auth-modal-overlay';
    modalOverlay.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true" aria-label="Connect to GitHub">
        <div class="auth-modal-header">
          <h2>Connect to GitHub</h2>
          <button class="auth-modal-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="auth-modal-body">
          <p>To deploy your game, you need a GitHub Personal Access Token (PAT).</p>
          <p><strong>Required scope:</strong> repo</p>
          <a href="https://github.com/settings/tokens/new?scopes=repo&description=InRepo%20Studio" target="_blank" rel="noopener">Create a token on GitHub →</a>
          <input
            class="auth-token-input"
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            autocomplete="off"
          />
          <label class="auth-persist-label">
            <input class="auth-persist-checkbox" type="checkbox" />
            Remember token on this device
          </label>
          <p class="auth-persist-warning">⚠️ Only enable on trusted, personal devices.</p>
          <p class="auth-status auth-status-ready">Ready to connect.</p>
        </div>
        <div class="auth-modal-footer">
          <button class="auth-cancel-btn" type="button">Cancel</button>
          <button class="auth-connect-btn" type="button">Connect</button>
        </div>
      </div>
    `;

    tokenInput = modalOverlay.querySelector('.auth-token-input');
    persistCheckbox = modalOverlay.querySelector('.auth-persist-checkbox');
    statusEl = modalOverlay.querySelector('.auth-status');
    connectBtn = modalOverlay.querySelector('.auth-connect-btn');

    modalOverlay.querySelector('.auth-modal-close')?.addEventListener('click', hide);
    modalOverlay.querySelector('.auth-cancel-btn')?.addEventListener('click', hide);
    connectBtn?.addEventListener('click', () => {
      handleConnect().catch(() => {
        setStatus('Unexpected error while authenticating.', 'error');
        setConnectEnabled(true);
      });
    });

    container.appendChild(modalOverlay);
  }

  function show(): void {
    if (!modalOverlay) {
      render();
    }

    if (modalOverlay) {
      modalOverlay.classList.add('visible');
      tokenInput?.focus();
      setStatus('Ready to connect.', 'ready');
      setConnectEnabled(true);
    }
  }

  function hide(): void {
    modalOverlay?.classList.remove('visible');
    if (tokenInput) {
      tokenInput.value = '';
    }
    if (persistCheckbox) {
      persistCheckbox.checked = false;
    }
    onClose();
  }

  function destroy(): void {
    modalOverlay?.remove();
    modalOverlay = null;
  }

  return { show, hide, destroy };
}
