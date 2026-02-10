export interface UndoToastController {
  show(message: string, onUndo: () => void): void;
  clear(): void;
  destroy(): void;
}

const STYLES = `
  .preset-undo-toast {
    position: sticky;
    bottom: 8px;
    display: none;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 44px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(107, 165, 255, 0.45);
    background: rgba(26, 43, 82, 0.95);
    color: #e6ecff;
    font-size: 12px;
    z-index: 3;
  }

  .preset-undo-toast--visible {
    display: flex;
  }

  .preset-undo-toast__message {
    line-height: 1.35;
  }

  .preset-undo-toast__actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .preset-undo-toast__button {
    min-width: 44px;
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid rgba(107, 165, 255, 0.5);
    background: rgba(74, 158, 255, 0.22);
    color: #cfe1ff;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .preset-undo-toast__button:active {
    background: rgba(74, 158, 255, 0.35);
  }
`;

function ensureStyles(): void {
  if (document.getElementById('preset-undo-toast-styles')) return;
  const style = document.createElement('style');
  style.id = 'preset-undo-toast-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

export function createUndoToast(container: HTMLElement): UndoToastController {
  ensureStyles();

  const root = document.createElement('div');
  root.className = 'preset-undo-toast';

  const messageEl = document.createElement('div');
  messageEl.className = 'preset-undo-toast__message';

  const actions = document.createElement('div');
  actions.className = 'preset-undo-toast__actions';

  const undoButton = document.createElement('button');
  undoButton.type = 'button';
  undoButton.className = 'preset-undo-toast__button';
  undoButton.textContent = 'Undo';

  actions.appendChild(undoButton);
  root.append(messageEl, actions);
  container.appendChild(root);

  let hideTimer: number | null = null;
  let onUndo: (() => void) | null = null;

  function clearTimer(): void {
    if (hideTimer === null) return;
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }

  function clear(): void {
    clearTimer();
    onUndo = null;
    root.classList.remove('preset-undo-toast--visible');
  }

  undoButton.addEventListener('click', () => {
    if (!onUndo) return;
    const callback = onUndo;
    clear();
    callback();
  });

  return {
    show(message, callback) {
      clearTimer();
      messageEl.textContent = message;
      onUndo = callback;
      root.classList.add('preset-undo-toast--visible');
      hideTimer = window.setTimeout(() => {
        clear();
      }, 5000);
    },
    clear,
    destroy() {
      clear();
      root.remove();
    },
  };
}
