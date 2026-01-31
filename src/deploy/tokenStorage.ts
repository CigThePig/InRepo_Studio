/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Secure token storage keys and persistence policy.
 *
 * Defines:
 * - StorageKeys — session/IndexedDB keys for GitHub token storage (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: not exported
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (reads on auth state checks)
 * - Apply hook: createTokenStorage().getToken()
 *
 * Excluded / not exposed:
 * - Token values are never logged or surfaced
 *
 * Verification (minimum):
 * - [ ] Session token reads/writes work
 * - [ ] Persistent token reads/writes work
 * - [ ] Clear removes from both storages
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const SESSION_KEY = 'inrepo_github_token';
const DB_NAME = 'inrepo-auth';
const DB_VERSION = 1;
const DB_STORE = 'auth';
const DB_KEY = 'github_token';

const LOG_PREFIX = '[Deploy/TokenStorage]';

interface AuthDB extends DBSchema {
  auth: {
    key: string;
    value: string;
  };
}

let db: IDBPDatabase<AuthDB> | null = null;

async function openAuthDB(): Promise<IDBPDatabase<AuthDB>> {
  if (db) {
    return db;
  }

  db = await openDB<AuthDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(DB_STORE)) {
        database.createObjectStore(DB_STORE);
      }
    },
    blocked() {
      console.warn(`${LOG_PREFIX} Database blocked - close other tabs`);
    },
    blocking() {
      console.warn(`${LOG_PREFIX} Database blocking upgrade`);
    },
  });

  return db;
}

export interface TokenStorage {
  getToken(): Promise<string | null>;
  setToken(token: string, persistent: boolean): Promise<void>;
  clearToken(): Promise<void>;
  hasPersistentToken(): Promise<boolean>;
  getStorageType(): Promise<'session' | 'persistent' | null>;
}

export function createTokenStorage(): TokenStorage {
  return {
    async getToken() {
      const sessionToken = sessionStorage.getItem(SESSION_KEY);
      if (sessionToken) {
        return sessionToken;
      }

      try {
        const database = await openAuthDB();
        const token = await database.get(DB_STORE, DB_KEY);
        return token ?? null;
      } catch (error) {
        console.warn(`${LOG_PREFIX} Failed to read persistent token`, error);
        return null;
      }
    },

    async setToken(token: string, persistent: boolean) {
      await this.clearToken();

      if (persistent) {
        const database = await openAuthDB();
        await database.put(DB_STORE, token, DB_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, token);
      }
    },

    async clearToken() {
      sessionStorage.removeItem(SESSION_KEY);

      try {
        const database = await openAuthDB();
        await database.delete(DB_STORE, DB_KEY);
      } catch (error) {
        console.warn(`${LOG_PREFIX} Failed to clear persistent token`, error);
      }
    },

    async hasPersistentToken() {
      try {
        const database = await openAuthDB();
        const token = await database.get(DB_STORE, DB_KEY);
        return Boolean(token);
      } catch (error) {
        console.warn(`${LOG_PREFIX} Failed to check persistent token`, error);
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

export const StorageKeys = {
  sessionKey: SESSION_KEY,
  dbName: DB_NAME,
  dbStore: DB_STORE,
  dbKey: DB_KEY,
} as const;
