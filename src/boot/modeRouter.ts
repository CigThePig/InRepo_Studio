/**
 * Mode Router
 *
 * Handles detection of editor vs game mode based on query parameters
 * and routes to the appropriate initialization sequence.
 */

const LOG_PREFIX = '[Boot/ModeRouter]';

// --- Playtest Session Keys ---

const PLAYTEST_FLAG = 'inrepo_playtest';
const PLAYTEST_SCENE = 'inrepo_playtest_scene';
const EDITOR_STATE_BACKUP = 'inrepo_editor_backup';

// --- Types ---

export type AppMode = 'editor' | 'game' | 'playtest';

export interface BootConfig {
  mode: AppMode;
  debug: boolean;
  sceneOverride: string | null;
}

// --- Query Parsing ---

/**
 * Parse query parameters from the URL
 */
function getQueryParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/**
 * Determine the app mode from query parameters
 * - ?tool=editor -> editor mode
 * - otherwise -> game mode
 */
export function detectMode(): AppMode {
  if (isPlaytestMode()) {
    console.log(`${LOG_PREFIX} Playtest mode detected (session flag)`);
    return 'playtest';
  }

  const params = getQueryParams();
  const tool = params.get('tool');

  if (tool === 'editor') {
    console.log(`${LOG_PREFIX} Editor mode detected (tool=editor)`);
    return 'editor';
  }

  console.log(`${LOG_PREFIX} Game mode detected (default)`);
  return 'game';
}

/**
 * Check if debug mode is enabled
 * - ?debug=true -> enable verbose logging
 */
export function isDebugMode(): boolean {
  const params = getQueryParams();
  return params.get('debug') === 'true';
}

/**
 * Get scene override from query params
 * - ?scene=myScene -> load specific scene
 */
export function getSceneOverride(): string | null {
  const params = getQueryParams();
  return params.get('scene');
}

/**
 * Get full boot configuration from query params
 */
export function getBootConfig(): BootConfig {
  return {
    mode: detectMode(),
    debug: isDebugMode(),
    sceneOverride: getSceneOverride(),
  };
}

// --- Playtest Session Helpers ---

export function isPlaytestMode(): boolean {
  return sessionStorage.getItem(PLAYTEST_FLAG) === 'true';
}

export function preparePlaytest(sceneId: string | null): void {
  sessionStorage.setItem(PLAYTEST_FLAG, 'true');
  if (sceneId) {
    sessionStorage.setItem(PLAYTEST_SCENE, sceneId);
  } else {
    sessionStorage.removeItem(PLAYTEST_SCENE);
  }
}

export function cleanupPlaytest(): void {
  sessionStorage.removeItem(PLAYTEST_FLAG);
  sessionStorage.removeItem(PLAYTEST_SCENE);
}

export function getPlaytestSceneId(): string | null {
  return sessionStorage.getItem(PLAYTEST_SCENE);
}

export function setEditorStateBackup(serialized: string): void {
  sessionStorage.setItem(EDITOR_STATE_BACKUP, serialized);
}

export function getEditorStateBackup(): string | null {
  return sessionStorage.getItem(EDITOR_STATE_BACKUP);
}

export function clearEditorStateBackup(): void {
  sessionStorage.removeItem(EDITOR_STATE_BACKUP);
}

// --- URL Helpers ---

/**
 * Build a URL with query parameters preserved
 */
export function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(path, window.location.origin);
  const existingParams = getQueryParams();

  // Preserve existing params
  existingParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Override with new params
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  });

  return url.toString();
}

/**
 * Get URL for editor mode
 */
export function getEditorUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.set('tool', 'editor');
  return url.toString();
}

/**
 * Get URL for game mode
 */
export function getGameUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete('tool');
  return url.toString();
}

/**
 * Switch to a different mode by updating the URL
 */
export function switchMode(mode: AppMode): void {
  const url = mode === 'editor' ? getEditorUrl() : getGameUrl();
  window.location.href = url;
}
