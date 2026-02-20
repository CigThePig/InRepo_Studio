/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Editor feature flag registry.
 *
 * Defines:
 * - EDITOR_FLAGS — feature flag keys (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (flags checked at runtime)
 */

const STORAGE_KEY = 'inrepo_editor_flags';

export const EDITOR_FLAGS = {
  BOTTOM_CONTEXT_STRIP: 'editor_v2_bottom_strip',
  TOP_BAR_GLOBAL: 'editor_v2_top_bar',
  RIGHT_BERRY: 'editor_v2_right_berry',
  ENTITY_MOVE_FIRST: 'editor_v2_entity_move_first',
  LEFT_BERRY: 'editor_v2_left_berry',
  ASSET_LIBRARY: 'editor_v2_asset_library',
  REPO_MIRRORING: 'editor_v2_repo_mirroring',
  ASSET_UPLOAD: 'editor_v2_asset_upload',
  HIDE_LAYER_PANEL: 'editor_v2_hide_layer_panel',
} as const;

export type EditorFlag = (typeof EDITOR_FLAGS)[keyof typeof EDITOR_FLAGS];

const DEFAULT_FLAGS: Record<EditorFlag, boolean> = {
  [EDITOR_FLAGS.BOTTOM_CONTEXT_STRIP]: true,
  [EDITOR_FLAGS.TOP_BAR_GLOBAL]: true,
  [EDITOR_FLAGS.RIGHT_BERRY]: true,
  [EDITOR_FLAGS.ENTITY_MOVE_FIRST]: true,
  [EDITOR_FLAGS.LEFT_BERRY]: true,
  [EDITOR_FLAGS.ASSET_LIBRARY]: true,
  [EDITOR_FLAGS.REPO_MIRRORING]: true,
  [EDITOR_FLAGS.ASSET_UPLOAD]: true,
  [EDITOR_FLAGS.HIDE_LAYER_PANEL]: true,
};

function readStoredFlags(): Partial<Record<EditorFlag, boolean>> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};

    const result: Partial<Record<EditorFlag, boolean>> = {};
    for (const flag of Object.values(EDITOR_FLAGS)) {
      if (typeof parsed[flag] === 'boolean') {
        result[flag] = parsed[flag] as boolean;
      }
    }
    return result;
  } catch (error) {
    console.warn('[EditorFlags] Failed to read feature flags:', error);
    return {};
  }
}

function writeStoredFlags(flags: Record<EditorFlag, boolean>): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch (error) {
    console.warn('[EditorFlags] Failed to persist feature flags:', error);
  }
}

export function isFlagEnabled(flag: EditorFlag): boolean {
  const stored = readStoredFlags();
  if (typeof stored[flag] === 'boolean') {
    return stored[flag] as boolean;
  }
  return DEFAULT_FLAGS[flag];
}

export function setFlag(flag: EditorFlag, enabled: boolean): void {
  const stored = readStoredFlags();
  const updated: Record<EditorFlag, boolean> = {
    ...DEFAULT_FLAGS,
    ...stored,
    [flag]: enabled,
  };

  writeStoredFlags(updated);
}
