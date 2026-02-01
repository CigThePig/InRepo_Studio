/**
 * Selection Clipboard
 *
 * Stores copied tile selections for paste operations.
 * In-memory only (session scoped).
 */

import type { SelectionData } from '@/editor/tools/select';

export interface Clipboard {
  copy(data: SelectionData): void;
  paste(): SelectionData | null;
  hasData(): boolean;
  clear(): void;
}

export function createClipboard(): Clipboard {
  let data: SelectionData | null = null;

  return {
    copy(next: SelectionData): void {
      data = {
        selection: { ...next.selection },
        tiles: next.tiles.map((row) => [...row]),
      };
    },

    paste(): SelectionData | null {
      if (!data) return null;
      return {
        selection: { ...data.selection },
        tiles: data.tiles.map((row) => [...row]),
      };
    },

    hasData(): boolean {
      return data !== null;
    },

    clear(): void {
      data = null;
    },
  };
}
