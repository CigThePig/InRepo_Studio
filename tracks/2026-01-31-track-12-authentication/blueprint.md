# Track 12: Authentication — Blueprint

## Overview

This blueprint details the technical design for GitHub PAT authentication, including secure token handling, validation, and storage options. The system prioritizes security defaults while allowing opt-in persistence.

---

## Architecture

### Module Structure

```
src/deploy/
├── auth.ts              # NEW - Token management
├── authUI.ts            # NEW - Authentication modal
├── tokenStorage.ts      # NEW - Secure token storage abstraction
└── AGENTS.md            # NEW - Deploy module rules

src/editor/panels/
├── deployPanel.ts       # NEW - Deploy panel (basic)
└── bottomPanel.ts       # MODIFY - Add deploy button
```

### Security Architecture

```
Token Entry:
  User input → Validation → Storage decision
                ↓
         GitHub API test
                ↓
         Success: Store token
         Failure: Show error, don't store

Token Storage:
  Session (default): sessionStorage['inrepo_token']
  Persistent (opt-in): IndexedDB encrypted

Token Usage:
  Deploy request → Get token → Add to header → API call
                      ↓
              Token not found?
                      ↓
              Show auth modal
```

---

## Detailed Design

### 1. Auth State Schema

**Type definition:**

```typescript
interface AuthState {
  /** GitHub username (if authenticated) */
  username: string | null;

  /** Token scopes (from validation) */
  scopes: string[];

  /** Whether token is persistent */
  isPersistent: boolean;

  /** Whether currently authenticated */
  isAuthenticated: boolean;
}

interface TokenValidationResult {
  valid: boolean;
  username?: string;
  scopes?: string[];
  error?: string;
}
```

### 2. Token Storage Abstraction

**Interface:**

```typescript
interface TokenStorage {
  /** Get stored token */
  getToken(): Promise<string | null>;

  /** Store token */
  setToken(token: string, persistent: boolean): Promise<void>;

  /** Clear stored token */
  clearToken(): Promise<void>;

  /** Check if persistent token exists */
  hasPersistentToken(): Promise<boolean>;

  /** Get storage type of current token */
  getStorageType(): Promise<'session' | 'persistent' | null>;
}

function createTokenStorage(): TokenStorage;
```

**Implementation:**

```typescript
const SESSION_KEY = 'inrepo_github_token';
const DB_STORE = 'auth';
const DB_KEY = 'github_token';

function createTokenStorage(): TokenStorage {
  return {
    async getToken() {
      // Try session first
      const sessionToken = sessionStorage.getItem(SESSION_KEY);
      if (sessionToken) {
        return sessionToken;
      }

      // Try IndexedDB
      try {
        const db = await openAuthDB();
        const token = await db.get(DB_STORE, DB_KEY);
        return token || null;
      } catch {
        return null;
      }
    },

    async setToken(token: string, persistent: boolean) {
      // Always clear both first
      await this.clearToken();

      if (persistent) {
        const db = await openAuthDB();
        await db.put(DB_STORE, token, DB_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, token);
      }
    },

    async clearToken() {
      sessionStorage.removeItem(SESSION_KEY);

      try {
        const db = await openAuthDB();
        await db.delete(DB_STORE, DB_KEY);
      } catch {
        // Ignore DB errors on clear
      }
    },

    async hasPersistentToken() {
      try {
        const db = await openAuthDB();
        const token = await db.get(DB_STORE, DB_KEY);
        return !!token;
      } catch {
        return false;
      }
    },

    async getStorageType() {
      if (sessionStorage.getItem(SESSION_KEY)) {
        return 'session';
      }
      if (await this.hasPersistentToken()) {
        return 'persistent';
      }
      return null;
    },
  };
}
```

### 3. Token Validation

**Interface:**

```typescript
interface ValidateTokenConfig {
  token: string;
  timeout?: number;
}

async function validateToken(config: ValidateTokenConfig): Promise<TokenValidationResult>;
```

**Implementation:**

```typescript
async function validateToken(config: ValidateTokenConfig): Promise<TokenValidationResult> {
  const { token, timeout = 10000 } = config;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      return {
        valid: false,
        error: 'Invalid token. Please check your Personal Access Token.',
      };
    }

    if (response.status === 403) {
      // Rate limited or forbidden
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining === '0') {
        return {
          valid: false,
          error: 'GitHub API rate limit exceeded. Please try again later.',
        };
      }
      return {
        valid: false,
        error: 'Access forbidden. Token may lack required permissions.',
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        error: `GitHub API error: ${response.status}`,
      };
    }

    const data = await response.json();

    // Extract scopes from header
    const scopeHeader = response.headers.get('X-OAuth-Scopes') || '';
    const scopes = scopeHeader.split(',').map(s => s.trim()).filter(Boolean);

    return {
      valid: true,
      username: data.login,
      scopes,
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        valid: false,
        error: 'Connection timed out. Please check your network.',
      };
    }

    return {
      valid: false,
      error: 'Network error. Please check your connection.',
    };
  }
}
```

### 4. Auth Manager

**Interface:**

```typescript
interface AuthManager {
  /** Get current auth state */
  getState(): Promise<AuthState>;

  /** Authenticate with token */
  authenticate(token: string, persistent: boolean): Promise<TokenValidationResult>;

  /** Clear authentication */
  logout(): Promise<void>;

  /** Get token for API calls (internal use) */
  getToken(): Promise<string | null>;

  /** Subscribe to auth state changes */
  onStateChange(callback: (state: AuthState) => void): () => void;
}

function createAuthManager(storage: TokenStorage): AuthManager;
```

**Implementation:**

```typescript
function createAuthManager(storage: TokenStorage): AuthManager {
  let cachedState: AuthState | null = null;
  const listeners: Set<(state: AuthState) => void> = new Set();

  function notifyListeners(state: AuthState): void {
    for (const listener of listeners) {
      listener(state);
    }
  }

  return {
    async getState() {
      if (cachedState) {
        return cachedState;
      }

      const token = await storage.getToken();
      if (!token) {
        cachedState = {
          username: null,
          scopes: [],
          isPersistent: false,
          isAuthenticated: false,
        };
        return cachedState;
      }

      // Validate stored token
      const result = await validateToken({ token });
      if (result.valid) {
        const storageType = await storage.getStorageType();
        cachedState = {
          username: result.username!,
          scopes: result.scopes!,
          isPersistent: storageType === 'persistent',
          isAuthenticated: true,
        };
      } else {
        // Invalid stored token - clear it
        await storage.clearToken();
        cachedState = {
          username: null,
          scopes: [],
          isPersistent: false,
          isAuthenticated: false,
        };
      }

      return cachedState;
    },

    async authenticate(token: string, persistent: boolean) {
      const result = await validateToken({ token });

      if (result.valid) {
        await storage.setToken(token, persistent);
        cachedState = {
          username: result.username!,
          scopes: result.scopes!,
          isPersistent: persistent,
          isAuthenticated: true,
        };
        notifyListeners(cachedState);
      }

      return result;
    },

    async logout() {
      await storage.clearToken();
      cachedState = {
        username: null,
        scopes: [],
        isPersistent: false,
        isAuthenticated: false,
      };
      notifyListeners(cachedState);
    },

    async getToken() {
      return storage.getToken();
    },

    onStateChange(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}
```

### 5. Auth UI Modal

**Interface:**

```typescript
interface AuthModalConfig {
  authManager: AuthManager;
  onClose: () => void;
  onSuccess: (username: string) => void;
}

interface AuthModal {
  show(): void;
  hide(): void;
  destroy(): void;
}

function createAuthModal(container: HTMLElement, config: AuthModalConfig): AuthModal;
```

**Visual design:**

```
+----------------------------------------+
|         Connect to GitHub        [X]   |
+----------------------------------------+
|                                        |
| To deploy your game, you need a        |
| GitHub Personal Access Token (PAT).    |
|                                        |
| Required scope: repo                   |
|                                        |
| [Create a token on GitHub →]           |
|                                        |
| +------------------------------------+ |
| | ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx   | |
| +------------------------------------+ |
|                                        |
| [ ] Remember token on this device      |
|     ⚠️ Only on trusted devices         |
|                                        |
| [    Cancel    ]  [   Connect    ]     |
|                                        |
| Status: Ready to connect               |
+----------------------------------------+
```

**Implementation outline:**

```typescript
function createAuthModal(container: HTMLElement, config: AuthModalConfig): AuthModal {
  const { authManager, onClose, onSuccess } = config;

  let modal: HTMLElement | null = null;
  let tokenInput: HTMLInputElement | null = null;
  let persistCheckbox: HTMLInputElement | null = null;
  let statusEl: HTMLElement | null = null;
  let connectBtn: HTMLButtonElement | null = null;

  function render() {
    modal = document.createElement('div');
    modal.className = 'auth-modal-overlay';
    modal.innerHTML = `
      <div class="auth-modal">
        <div class="auth-modal-header">
          <h2>Connect to GitHub</h2>
          <button class="auth-modal-close">×</button>
        </div>
        <div class="auth-modal-body">
          <p>To deploy your game, you need a GitHub Personal Access Token (PAT).</p>
          <p><strong>Required scope:</strong> repo</p>
          <a href="https://github.com/settings/tokens/new?scopes=repo&description=InRepo%20Studio"
             target="_blank" rel="noopener">
            Create a token on GitHub →
          </a>

          <input type="password"
                 class="auth-token-input"
                 placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                 autocomplete="off" />

          <label class="auth-persist-label">
            <input type="checkbox" class="auth-persist-checkbox" />
            Remember token on this device
          </label>
          <p class="auth-persist-warning">
            ⚠️ Only enable on trusted, personal devices
          </p>

          <p class="auth-status">Ready to connect</p>
        </div>
        <div class="auth-modal-footer">
          <button class="auth-cancel-btn">Cancel</button>
          <button class="auth-connect-btn">Connect</button>
        </div>
      </div>
    `;

    // Get references
    tokenInput = modal.querySelector('.auth-token-input');
    persistCheckbox = modal.querySelector('.auth-persist-checkbox');
    statusEl = modal.querySelector('.auth-status');
    connectBtn = modal.querySelector('.auth-connect-btn');

    // Wire up events
    modal.querySelector('.auth-modal-close')?.addEventListener('click', hide);
    modal.querySelector('.auth-cancel-btn')?.addEventListener('click', hide);
    connectBtn?.addEventListener('click', handleConnect);

    container.appendChild(modal);
  }

  async function handleConnect() {
    const token = tokenInput?.value.trim();
    if (!token) {
      setStatus('Please enter a token', 'error');
      return;
    }

    const persistent = persistCheckbox?.checked || false;

    setStatus('Validating...', 'loading');
    setConnectEnabled(false);

    const result = await authManager.authenticate(token, persistent);

    if (result.valid) {
      setStatus(`Connected as ${result.username}`, 'success');
      setTimeout(() => {
        onSuccess(result.username!);
        hide();
      }, 1000);
    } else {
      setStatus(result.error || 'Authentication failed', 'error');
      setConnectEnabled(true);
    }
  }

  function setStatus(message: string, type: 'ready' | 'loading' | 'success' | 'error') {
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `auth-status auth-status-${type}`;
    }
  }

  function setConnectEnabled(enabled: boolean) {
    if (connectBtn) {
      connectBtn.disabled = !enabled;
    }
  }

  function show() {
    if (!modal) render();
    modal?.classList.add('visible');
    tokenInput?.focus();
  }

  function hide() {
    modal?.classList.remove('visible');
    if (tokenInput) tokenInput.value = '';
    onClose();
  }

  function destroy() {
    modal?.remove();
    modal = null;
  }

  return { show, hide, destroy };
}
```

### 6. Deploy Panel Auth Integration

**Basic deploy panel:**

```typescript
interface DeployPanelConfig {
  authManager: AuthManager;
  container: HTMLElement;
}

function createDeployPanel(config: DeployPanelConfig): void {
  const { authManager, container } = config;

  // Render based on auth state
  async function render() {
    const state = await authManager.getState();

    if (state.isAuthenticated) {
      renderAuthenticatedState(state);
    } else {
      renderUnauthenticatedState();
    }
  }

  function renderAuthenticatedState(state: AuthState) {
    container.innerHTML = `
      <div class="deploy-panel">
        <div class="deploy-auth-status">
          Connected as <strong>${state.username}</strong>
          <button class="deploy-disconnect-btn">Disconnect</button>
        </div>
        <button class="deploy-btn" disabled>Deploy (Track 13)</button>
      </div>
    `;

    container.querySelector('.deploy-disconnect-btn')
      ?.addEventListener('click', async () => {
        await authManager.logout();
        render();
      });
  }

  function renderUnauthenticatedState() {
    container.innerHTML = `
      <div class="deploy-panel">
        <div class="deploy-auth-status">
          Not connected to GitHub
        </div>
        <button class="deploy-connect-btn">Connect to Deploy</button>
      </div>
    `;

    container.querySelector('.deploy-connect-btn')
      ?.addEventListener('click', () => {
        showAuthModal();
      });
  }

  // Subscribe to auth changes
  authManager.onStateChange(() => render());

  // Initial render
  render();
}
```

---

## State Management

### Auth State (not persisted as a whole)

```typescript
interface AuthState {
  username: string | null;
  scopes: string[];
  isPersistent: boolean;
  isAuthenticated: boolean;
}
```

### Token Storage

```
Session: sessionStorage['inrepo_github_token']
Persistent: IndexedDB 'inrepo_auth' store, key 'github_token'
```

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/deploy/auth.ts` | Create | Auth manager and validation |
| `src/deploy/authUI.ts` | Create | Authentication modal |
| `src/deploy/tokenStorage.ts` | Create | Token storage abstraction |
| `src/deploy/AGENTS.md` | Create | Deploy module rules |
| `src/editor/panels/deployPanel.ts` | Create | Basic deploy panel |
| `src/editor/panels/bottomPanel.ts` | Modify | Add deploy button |

---

## API Contracts

### AuthManager

```typescript
const storage = createTokenStorage();
const auth = createAuthManager(storage);

// Check state
const state = await auth.getState();
if (state.isAuthenticated) {
  console.log(`Logged in as ${state.username}`);
}

// Authenticate
const result = await auth.authenticate('ghp_xxx', persistent: false);
if (result.valid) {
  console.log(`Welcome ${result.username}`);
}

// Logout
await auth.logout();
```

### AuthModal

```typescript
const modal = createAuthModal(document.body, {
  authManager: auth,
  onClose: () => console.log('Closed'),
  onSuccess: (username) => console.log(`Connected as ${username}`),
});

modal.show();
```

---

## Edge Cases

1. **Invalid Token Format**: Basic format check, let API validate
2. **Network Offline**: Show network error, retry option
3. **Rate Limited**: Show rate limit message with reset time
4. **Tab Closed Mid-Auth**: No impact (token not stored yet)
5. **Multiple Tabs**: Each tab manages own session token
6. **Stored Token Expired**: Re-validate on load, clear if invalid

---

## Security Considerations

1. **Token Never Logged**: No console.log of token values
2. **Session Storage Default**: Token cleared on tab close
3. **Persistent Warning**: Clear warning when enabling
4. **HTTPS Only**: GitHub API requires HTTPS
5. **No Token in URL**: Never pass token as query param
6. **Input Type Password**: Mask token during entry

---

## Testing Strategy

### Manual Tests

1. Enter valid token → shows username, stores token
2. Enter invalid token → shows error, doesn't store
3. Close tab, reopen → session token gone
4. Enable persist, close browser → token remembered
5. Click disconnect → token cleared
6. Test with no network → shows network error

### Unit Tests

1. `validateToken`: Returns correct result for valid/invalid
2. `tokenStorage`: Set/get/clear operations
3. `authManager`: State management, listeners

---

## Notes

- Classic PAT with `repo` scope required for deployment
- Fine-grained tokens could be supported later
- Token validation uses /user endpoint (1 API call)
- Consider rate limit budget for validation
- IndexedDB used for persistence (not localStorage)
- Never store token in application state/memory longer than needed
