/**
 * SCHEMA INVENTORY (lists-of-truth)
 * - EditorEventMap: canonical editor event names + payload contracts
 *   Apply semantics: UI dispatches intent events; editor brain dispatches state events.
 */

export type EditorModeState = 'select' | 'ground' | 'props' | 'entities' | 'collision' | 'triggers';

export interface EditorEventMap {
  UI_ACTION_UNDO_REQUESTED: void;
  UI_ACTION_REDO_REQUESTED: void;
  UI_ACTION_SAVE_REQUESTED: void;
  UI_ACTION_SETTINGS_REQUESTED: void;
  UI_ACTION_PLAYTEST_REQUESTED: void;
  STATE_SCENE_CHANGED: { sceneName: string };
  STATE_HISTORY_CHANGED: { canUndo: boolean; canRedo: boolean };
  STATE_MODE_CHANGED: { mode: EditorModeState };
}

type EditorEventKey = keyof EditorEventMap;
type Listener<K extends EditorEventKey> = (payload: EditorEventMap[K]) => void;
type UnknownListener = (payload: unknown) => void;

export class EditorEventBus {
  private readonly listeners = new Map<EditorEventKey, Set<UnknownListener>>();

  on<K extends EditorEventKey>(event: K, listener: Listener<K>): () => void {
    const listenersForEvent = this.listeners.get(event) ?? new Set<UnknownListener>();
    listenersForEvent.add(listener as UnknownListener);
    this.listeners.set(event, listenersForEvent);
    return () => this.off(event, listener);
  }

  off<K extends EditorEventKey>(event: K, listener: Listener<K>): void {
    const listenersForEvent = this.listeners.get(event);
    if (!listenersForEvent) {
      return;
    }
    listenersForEvent.delete(listener as UnknownListener);
    if (listenersForEvent.size === 0) {
      this.listeners.delete(event);
    }
  }

  dispatch<K extends EditorEventKey>(event: K, payload: EditorEventMap[K]): void {
    const listenersForEvent = this.listeners.get(event);
    if (!listenersForEvent) {
      return;
    }
    listenersForEvent.forEach((listener) => {
      listener(payload as unknown);
    });
  }
}

export const editorEventBus = new EditorEventBus();
