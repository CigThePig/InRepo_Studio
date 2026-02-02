/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Editor V2 feature flag registry for staged rollout.
 *
 * Defines:
 * - EDITOR_V2_FLAGS — feature flag keys (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (flags checked at runtime)
 */

const STORAGE_KEY = 'inrepo_editor_v2_flags';

export const EDITOR_V2_FLAGS = {
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

export type EditorV2Flag = (typeof EDITOR_V2_FLAGS)[keyof typeof EDITOR_V2_FLAGS];

const DEFAULT_V2_FLAGS: Record<EditorV2Flag, boolean> = {
  [EDITOR_V2_FLAGS.BOTTOM_CONTEXT_STRIP]: true,
  [EDITOR_V2_FLAGS.TOP_BAR_GLOBAL]: true,
  [EDITOR_V2_FLAGS.RIGHT_BERRY]: true,
  [EDITOR_V2_FLAGS.ENTITY_MOVE_FIRST]: false,
  [EDITOR_V2_FLAGS.LEFT_BERRY]: false,
  [EDITOR_V2_FLAGS.ASSET_LIBRARY]: false,
  [EDITOR_V2_FLAGS.REPO_MIRRORING]: false,
  [EDITOR_V2_FLAGS.ASSET_UPLOAD]: false,
  [EDITOR_V2_FLAGS.HIDE_LAYER_PANEL]: false,
};

function readStoredFlags(): Partial<Record<EditorV2Flag, boolean>> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};

    const result: Partial<Record<EditorV2Flag, boolean>> = {};
    for (const flag of Object.values(EDITOR_V2_FLAGS)) {
      if (typeof parsed[flag] === 'boolean') {
        result[flag] = parsed[flag] as boolean;
      }
    }
    return result;
  } catch (error) {
    console.warn('[EditorV2] Failed to read feature flags:', error);
    return {};
  }
}

function writeStoredFlags(flags: Record<EditorV2Flag, boolean>): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch (error) {
    console.warn('[EditorV2] Failed to persist feature flags:', error);
  }
}

export function isV2Enabled(flag: EditorV2Flag): boolean {
  const stored = readStoredFlags();
  if (typeof stored[flag] === 'boolean') {
    return stored[flag] as boolean;
  }
  return DEFAULT_V2_FLAGS[flag];
}

export function setV2Flag(flag: EditorV2Flag, enabled: boolean): void {
  const stored = readStoredFlags();
  const updated: Record<EditorV2Flag, boolean> = {
    ...DEFAULT_V2_FLAGS,
    ...stored,
    [flag]: enabled,
  };

  writeStoredFlags(updated);
}
