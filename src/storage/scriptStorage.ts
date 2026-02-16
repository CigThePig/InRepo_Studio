/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Hot storage (IndexedDB) operations for Blockly script files.
 *
 * Defines:
 * - ScriptStore — IndexedDB schema for script persistence
 * - CRUD operations keyed by scriptId
 *
 * Canonical key set:
 * - Keys come from: resolveScriptId() in src/types/script.ts
 *   "main" for Game Logic, "map:<mapId>" for Map Logic
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (auto-save from Blockly workspace)
 * - Apply hook: debounced save from workspace change listener
 *
 * Verification:
 * - [ ] Save → load round-trips ScriptFile cleanly
 * - [ ] Missing script returns null (no throw)
 * - [ ] listScriptIds returns all stored keys
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ScriptFile } from '@/types/script';
import type { WorkspaceContent } from '@/types/workspace';

// --- Constants ---

const DB_NAME = 'inrepo-scripts';
const DB_VERSION = 1;
const STORE_NAME = 'scripts';

const LOG_PREFIX = '[Storage/Scripts]';
const STUDIO_DB_NAME = 'inrepo-studio';
const STUDIO_DB_VERSION = 2;

interface StudioWorkspaceDB extends DBSchema {
  workspace: {
    key: string;
    value: WorkspaceContent;
  };
}

async function updateWorkspaceScripts(mutator: (scripts: Record<string, ScriptFile>) => void): Promise<void> {
  const studioDb = await openDB<StudioWorkspaceDB>(STUDIO_DB_NAME, STUDIO_DB_VERSION);
  const workspace = await studioDb.get('workspace', 'current');
  if (!workspace) return;
  const scripts = { ...(workspace.scripts ?? {}) };
  mutator(scripts);
  await studioDb.put('workspace', { ...workspace, scripts }, 'current');
}

// --- Database Schema ---

interface ScriptStoreDB extends DBSchema {
  scripts: {
    key: string;
    value: ScriptFile;
  };
}

// --- Database Instance ---

let db: IDBPDatabase<ScriptStoreDB> | null = null;

// --- Initialization ---

export async function initScriptStorage(): Promise<void> {
  if (db) return;

  console.log(`${LOG_PREFIX} Initializing script storage...`);

  db = await openDB<ScriptStoreDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    },
    blocked() {
      console.warn(`${LOG_PREFIX} Script database blocked - close other tabs`);
    },
    blocking() {
      console.warn(`${LOG_PREFIX} Script database blocking upgrade`);
    },
  });

  console.log(`${LOG_PREFIX} Script storage initialized`);
}

function getDB(): IDBPDatabase<ScriptStoreDB> {
  if (!db) {
    throw new Error(`${LOG_PREFIX} Script database not initialized. Call initScriptStorage() first.`);
  }
  return db;
}

// --- CRUD Operations ---

/**
 * Save a script file to hot storage.
 * Key is the scriptId (e.g., "main" or "map:forest").
 */
export async function saveScript(script: ScriptFile): Promise<void> {
  const database = getDB();
  await database.put(STORE_NAME, script, script.scriptId);
  await updateWorkspaceScripts((scripts) => {
    scripts[script.scriptId] = script;
  });
  console.log(`${LOG_PREFIX} Script "${script.scriptId}" saved`);
}

/**
 * Load a script file from hot storage.
 * Returns null if no script exists for the given scriptId.
 */
export async function loadScript(scriptId: string): Promise<ScriptFile | null> {
  const database = getDB();
  const script = await database.get(STORE_NAME, scriptId);

  if (!script) {
    console.log(`${LOG_PREFIX} Script "${scriptId}" not found in hot storage`);
    return null;
  }

  console.log(`${LOG_PREFIX} Script "${scriptId}" loaded`);
  return script;
}

/**
 * Delete a script file from hot storage.
 */
export async function deleteScript(scriptId: string): Promise<void> {
  const database = getDB();
  await database.delete(STORE_NAME, scriptId);
  await updateWorkspaceScripts((scripts) => {
    delete scripts[scriptId];
  });
  console.log(`${LOG_PREFIX} Script "${scriptId}" deleted`);
}

/**
 * List all script IDs in hot storage.
 */
export async function listScriptIds(): Promise<string[]> {
  const database = getDB();
  return await database.getAllKeys(STORE_NAME);
}

export async function listScripts(): Promise<ScriptFile[]> {
  const database = getDB();
  return await database.getAll(STORE_NAME);
}

/**
 * Check if a script exists in hot storage.
 */
export async function hasScript(scriptId: string): Promise<boolean> {
  const database = getDB();
  const script = await database.get(STORE_NAME, scriptId);
  return script !== undefined;
}

export async function clearScriptStorage(): Promise<void> {
  const database = getDB();
  await database.clear(STORE_NAME);
  const studioDb = await openDB<StudioWorkspaceDB>(STUDIO_DB_NAME, STUDIO_DB_VERSION);
  const workspace = await studioDb.get('workspace', 'current');
  if (workspace) {
    await studioDb.put('workspace', { ...workspace, scripts: {} }, 'current');
  }
  console.log(`${LOG_PREFIX} Cleared all scripts`);
}
