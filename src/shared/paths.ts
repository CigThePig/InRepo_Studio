/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Centralize filesystem paths and URL resolution for game content.
 *
 * Defines:
 * - ContentPathContract — canonical repo-relative paths (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (resolver updates immediately)
 * - Apply hook: setContentVersionToken()
 */

export const GAME_ROOT = 'game';
export const ASSETS_ROOT = `${GAME_ROOT}/assets`;

export const PROJECT_JSON_PATH = `${GAME_ROOT}/project.json`;
export const SCENES_DIR = `${GAME_ROOT}/scenes`;
export const SCENE_INDEX_JSON_PATH = `${SCENES_DIR}/index.json`;
export const TILESETS_PATH = 'assets/tilesets';
export const PROPS_PATH = 'assets/props';
export const ENTITIES_PATH = 'assets/entities';
export const TILESETS_DIR = `${ASSETS_ROOT}/tilesets`;
export const PROPS_DIR = `${ASSETS_ROOT}/props`;
export const ENTITIES_DIR = `${ASSETS_ROOT}/entities`;

const LEGACY_SEGMENTS = {
  tiles: 'tiles',
  sprites: 'sprites',
} as const;

export const LEGACY_ASSET_DIRS = [
  [ASSETS_ROOT, LEGACY_SEGMENTS.tiles].join('/'),
  [ASSETS_ROOT, LEGACY_SEGMENTS.sprites].join('/'),
];

let contentVersionToken: string | null = null;

export function setContentVersionToken(token: string | null): void {
  contentVersionToken = token;
}

export function getContentVersionToken(): string | null {
  return contentVersionToken;
}

function getBasePath(): string {
  if (import.meta.env.BASE_URL) {
    return import.meta.env.BASE_URL;
  }
  return './';
}

function normalizeGameRelative(path: string): string {
  const cleaned = path.replace(/^\/+/, '');
  if (cleaned.startsWith(`${GAME_ROOT}/`)) {
    return cleaned.slice(GAME_ROOT.length + 1);
  }
  return cleaned;
}

export function resolveGamePath(path: string): string {
  const base = getBasePath();
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const relative = normalizeGameRelative(path);
  return `${cleanBase}${GAME_ROOT}/${relative}`;
}

export function resolveAssetUrl(
  assetPath: string,
  options?: { version?: string | null }
): string {
  if (/^(https?:|data:)/i.test(assetPath)) {
    return assetPath;
  }
  const relative = normalizeGameRelative(assetPath);
  const url = resolveGamePath(relative);
  const version = options?.version ?? contentVersionToken;
  if (!version) {
    return url;
  }
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}
