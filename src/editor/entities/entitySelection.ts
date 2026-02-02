/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Track selected entity IDs for manipulation workflows
 *
 * Defines:
 * - EntitySelectionState — selected entity tracking (type: interface)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (selection updates immediately)
 */

import type { EditorState } from '@/storage/hot';

export interface EntitySelectionState {
  selectedIds: string[];
}

export interface EntitySelectionConfig {
  getEditorState: () => EditorState | null;
  onSelectionChange?: (selectedIds: string[]) => void;
}

export interface EntitySelection {
  getSelectedIds(): string[];
  isSelected(id: string): boolean;
  setSelection(ids: string[]): void;
  addToSelection(id: string): void;
  toggleSelection(id: string): void;
  clear(): void;
}

function normalizeSelection(ids: string[]): string[] {
  return Array.from(new Set(ids)).filter((id) => typeof id === 'string' && id.length > 0);
}

export function createEntitySelection(config: EntitySelectionConfig): EntitySelection {
  const { getEditorState, onSelectionChange } = config;

  function updateSelection(nextIds: string[]): void {
    const editorState = getEditorState();
    if (!editorState) return;

    const normalized = normalizeSelection(nextIds);
    const current = editorState.selectedEntityIds ?? [];
    const changed =
      normalized.length !== current.length ||
      normalized.some((id, index) => id !== current[index]);

    if (!changed) return;

    editorState.selectedEntityIds = normalized;
    onSelectionChange?.(normalized);
  }

  return {
    getSelectedIds(): string[] {
      return getEditorState()?.selectedEntityIds ?? [];
    },

    isSelected(id: string): boolean {
      return (getEditorState()?.selectedEntityIds ?? []).includes(id);
    },

    setSelection(ids: string[]): void {
      updateSelection(ids);
    },

    addToSelection(id: string): void {
      const current = getEditorState()?.selectedEntityIds ?? [];
      updateSelection([...current, id]);
    },

    toggleSelection(id: string): void {
      const current = getEditorState()?.selectedEntityIds ?? [];
      if (current.includes(id)) {
        updateSelection(current.filter((entry) => entry !== id));
      } else {
        updateSelection([...current, id]);
      }
    },

    clear(): void {
      updateSelection([]);
    },
  };
}
