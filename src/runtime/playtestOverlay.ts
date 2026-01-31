/**
 * Playtest Overlay
 *
 * UI overlay for playtest mode, showing a badge and exit button.
 */

const STYLES = `
  .playtest-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 50;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .playtest-overlay__badge {
    position: absolute;
    left: 16px;
    bottom: 16px;
    padding: 6px 10px;
    background: rgba(15, 52, 96, 0.85);
    color: #fff;
    border-radius: 6px;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    pointer-events: none;
  }

  .playtest-overlay__exit {
    position: absolute;
    top: 12px;
    right: 12px;
    min-width: 44px;
    min-height: 44px;
    padding: 6px 12px;
    border-radius: 10px;
    background: rgba(42, 42, 78, 0.9);
    color: #fff;
    border: 1px solid rgba(74, 158, 255, 0.7);
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
  }

  .playtest-overlay__exit:active {
    background: rgba(58, 58, 110, 0.9);
  }

  .playtest-overlay--hidden {
    display: none;
  }
`;

export interface PlaytestOverlay {
  show(): void;
  hide(): void;
  onExit(callback: () => void): void;
  destroy(): void;
}

export function createPlaytestOverlay(container: HTMLElement): PlaytestOverlay {
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  const overlay = document.createElement('div');
  overlay.className = 'playtest-overlay';

  const badge = document.createElement('div');
  badge.className = 'playtest-overlay__badge';
  badge.textContent = 'Playtest';

  const exitButton = document.createElement('button');
  exitButton.className = 'playtest-overlay__exit';
  exitButton.type = 'button';
  exitButton.textContent = 'Exit';

  let exitCallback: (() => void) | null = null;

  exitButton.addEventListener('click', () => {
    exitCallback?.();
  });

  overlay.appendChild(badge);
  overlay.appendChild(exitButton);
  container.appendChild(overlay);

  const controller: PlaytestOverlay = {
    show() {
      overlay.classList.remove('playtest-overlay--hidden');
    },
    hide() {
      overlay.classList.add('playtest-overlay--hidden');
    },
    onExit(callback) {
      exitCallback = callback;
    },
    destroy() {
      container.removeChild(overlay);
      document.head.removeChild(styleEl);
    },
  };

  return controller;
}
