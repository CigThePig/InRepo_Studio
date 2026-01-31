/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Track deployed file SHAs and local content hashes for deploy flow.
 *
 * Defines:
 * - ShaEntrySchema — per-file deploy record (type: schema)
 * - ShaStoreSchema — persisted deploy SHA store (type: schema)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: not exported
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (updated after successful deploy)
 * - Apply hook: ShaStore.save()
 *
 * Excluded / not exposed:
 * - Token values never stored or logged
 *
 * Verification (minimum):
 * - [ ] SHA store loads/saves in IndexedDB
 * - [ ] Remote SHA fetch handles 404 and rate limits
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AuthManager } from './auth';

const LOG_PREFIX = '[Deploy/ShaManager]';
const DB_NAME = 'inrepo-deploy';
const DB_VERSION = 1;
const DB_STORE = 'shaStore';
const DB_KEY = 'deploy';

interface ShaDb extends DBSchema {
  shaStore: {
    key: string;
    value: ShaStoreData;
  };
}

export interface ShaEntry {
  sha: string;
  contentHash: string;
  updatedAt: string;
}

export interface ShaStoreData {
  entries: Record<string, ShaEntry>;
  lastUpdated: string | null;
}

export interface ShaStore {
  get(path: string): ShaEntry | null;
  set(path: string, entry: ShaEntry): void;
  remove(path: string): void;
  getAll(): Record<string, ShaEntry>;
  save(): Promise<void>;
}

export interface ShaManagerConfig {
  authManager: AuthManager;
  repoOwner: string;
  repoName: string;
}

export interface ShaManager {
  createStore(): Promise<ShaStore>;
  fetchRemoteSha(path: string): Promise<string | null>;
  fetchRemoteShas(paths: string[]): Promise<Record<string, string | null>>;
  fetchRemoteContent(path: string): Promise<{ sha: string; content: string } | null>;
}

let db: IDBPDatabase<ShaDb> | null = null;

async function openShaDb(): Promise<IDBPDatabase<ShaDb>> {
  if (db) {
    return db;
  }

  db = await openDB<ShaDb>(DB_NAME, DB_VERSION, {
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

function normalizePath(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path;
}

function decodeBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getToken(authManager: AuthManager): Promise<string> {
  const token = await authManager.getToken();
  if (!token) {
    throw new Error('Not authenticated');
  }
  return token;
}

function parseRateLimitError(response: Response): string | null {
  if (response.status !== 403) {
    return null;
  }
  const remaining = response.headers.get('X-RateLimit-Remaining');
  if (remaining === '0') {
    return 'GitHub API rate limit exceeded. Please try again later.';
  }
  return null;
}

export function createShaManager(config: ShaManagerConfig): ShaManager {
  const { authManager, repoOwner, repoName } = config;

  return {
    async createStore() {
      const database = await openShaDb();
      const data =
        (await database.get(DB_STORE, DB_KEY)) ?? {
          entries: {},
          lastUpdated: null,
        };

      const storeData: ShaStoreData = {
        entries: { ...data.entries },
        lastUpdated: data.lastUpdated,
      };

      return {
        get(path) {
          return storeData.entries[path] ?? null;
        },
        set(path, entry) {
          storeData.entries[path] = entry;
          storeData.lastUpdated = new Date().toISOString();
        },
        remove(path) {
          delete storeData.entries[path];
          storeData.lastUpdated = new Date().toISOString();
        },
        getAll() {
          return { ...storeData.entries };
        },
        async save() {
          const dbInstance = await openShaDb();
          await dbInstance.put(DB_STORE, storeData, DB_KEY);
        },
      };
    },

    async fetchRemoteSha(path) {
      const token = await getToken(authManager);
      const cleanPath = normalizePath(path);

      const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${cleanPath}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );

      if (response.status === 404) {
        return null;
      }

      const rateLimitError = parseRateLimitError(response);
      if (rateLimitError) {
        throw new Error(rateLimitError);
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = (await response.json()) as { sha?: string };
      return data.sha ?? null;
    },

    async fetchRemoteShas(paths) {
      const entries = await Promise.all(
        paths.map(async (path) => {
          const sha = await this.fetchRemoteSha(path);
          return [path, sha] as const;
        })
      );

      return entries.reduce<Record<string, string | null>>((acc, [path, sha]) => {
        acc[path] = sha;
        return acc;
      }, {});
    },

    async fetchRemoteContent(path) {
      const token = await getToken(authManager);
      const cleanPath = normalizePath(path);

      const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${cleanPath}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );

      if (response.status === 404) {
        return null;
      }

      const rateLimitError = parseRateLimitError(response);
      if (rateLimitError) {
        throw new Error(rateLimitError);
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = (await response.json()) as { sha?: string; content?: string; encoding?: string };
      if (!data.sha || !data.content) {
        return null;
      }

      if (data.encoding !== 'base64') {
        throw new Error('Unsupported GitHub content encoding');
      }

      const normalizedContent = data.content.replace(/\n/g, '');
      const decoded = decodeBase64(normalizedContent);
      return { sha: data.sha, content: decoded };
    },
  };
}
