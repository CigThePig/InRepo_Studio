/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Primary editing mode state for Editor V2.
 *
 * Defines:
 * - EditorMode — editor mode union (type: lookup)
 *
 * Canonical key set:
 * - Keys come from: this file
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (mode changes apply immediately)
 */

export type EditorMode = 'select' | 'ground' | 'props' | 'entities' | 'collision' | 'triggers';

type EditorModeListener = (mode: EditorMode) => void;

let currentMode: EditorMode = 'select';
const listeners = new Set<EditorModeListener>();

export function getEditorMode(): EditorMode {
  return currentMode;
}

export function setEditorMode(mode: EditorMode): void {
  if (currentMode === mode) return;
  currentMode = mode;
  listeners.forEach((listener) => listener(mode));
}

export function onEditorModeChange(listener: EditorModeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setInitialEditorMode(mode: EditorMode): void {
  currentMode = mode;
}
