/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: GitHub authentication state and validation contracts.
 *
 * Defines:
 * - AuthStateSchema — in-memory auth state for deploy UI (type: schema)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: not exported
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (auth state drives UI immediately)
 * - Apply hook: AuthManager.onStateChange
 *
 * Excluded / not exposed:
 * - Token values are never logged or exposed in state
 *
 * Verification (minimum):
 * - [ ] Valid token yields username + scopes
 * - [ ] Invalid token yields clear error
 * - [ ] Stored invalid token clears on getState
 */

import type { TokenStorage } from './tokenStorage';
import { createTokenStorage } from './tokenStorage';

const LOG_PREFIX = '[Deploy/Auth]';

export interface AuthState {
  username: string | null;
  scopes: string[];
  isPersistent: boolean;
  isAuthenticated: boolean;
}

export interface TokenValidationResult {
  valid: boolean;
  username?: string;
  scopes?: string[];
  error?: string;
}

export interface ValidateTokenConfig {
  token: string;
  timeout?: number;
}

export async function validateToken(config: ValidateTokenConfig): Promise<TokenValidationResult> {
  const { token, timeout = 10000 } = config;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);

    if (response.status === 401) {
      return {
        valid: false,
        error: 'Invalid token. Please check your Personal Access Token.',
      };
    }

    if (response.status === 403) {
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

    const data = (await response.json()) as { login?: string };

    const scopeHeader = response.headers.get('X-OAuth-Scopes') ?? '';
    const scopes = scopeHeader
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean);

    return {
      valid: true,
      username: data.login ?? 'Unknown',
      scopes,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        valid: false,
        error: 'Connection timed out. Please check your network.',
      };
    }

    console.warn(`${LOG_PREFIX} Token validation failed`, error);
    return {
      valid: false,
      error: 'Network error. Please check your connection.',
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export interface AuthManager {
  getState(): Promise<AuthState>;
  authenticate(token: string, persistent: boolean): Promise<TokenValidationResult>;
  logout(): Promise<void>;
  getToken(): Promise<string | null>;
  onStateChange(callback: (state: AuthState) => void): () => void;
}

export function createAuthManager(storage: TokenStorage = createTokenStorage()): AuthManager {
  let cachedState: AuthState | null = null;
  const listeners = new Set<(state: AuthState) => void>();

  function notify(state: AuthState): void {
    listeners.forEach((listener) => listener(state));
  }

  async function resolveStateFromStorage(): Promise<AuthState> {
    const token = await storage.getToken();
    if (!token) {
      return {
        username: null,
        scopes: [],
        isPersistent: false,
        isAuthenticated: false,
      };
    }

    const result = await validateToken({ token });
    if (result.valid) {
      const storageType = await storage.getStorageType();
      return {
        username: result.username ?? null,
        scopes: result.scopes ?? [],
        isPersistent: storageType === 'persistent',
        isAuthenticated: true,
      };
    }

    console.warn(`${LOG_PREFIX} Stored token invalid, clearing`);
    await storage.clearToken();
    return {
      username: null,
      scopes: [],
      isPersistent: false,
      isAuthenticated: false,
    };
  }

  return {
    async getState() {
      if (cachedState) {
        return cachedState;
      }

      cachedState = await resolveStateFromStorage();
      return cachedState;
    },

    async authenticate(token: string, persistent: boolean) {
      const result = await validateToken({ token });
      if (result.valid) {
        await storage.setToken(token, persistent);
        cachedState = {
          username: result.username ?? null,
          scopes: result.scopes ?? [],
          isPersistent: persistent,
          isAuthenticated: true,
        };
        notify(cachedState);
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
      notify(cachedState);
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
