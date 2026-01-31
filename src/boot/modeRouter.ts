/**
 * Mode Router
 *
 * Handles detection of editor vs game mode based on query parameters
 * and routes to the appropriate initialization sequence.
 */

const LOG_PREFIX = '[Boot/ModeRouter]';

// --- Types ---

export type AppMode = 'editor' | 'game';

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
