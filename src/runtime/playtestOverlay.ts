/**
 * Playtest Overlay
 *
 * UI overlay for playtest mode, showing a badge and exit button.
 */

import { clearMoveVector, setMoveVector } from '@/runtime/input/moveInput';

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
    background: var(--irs-surface-dark-alpha);
    color: var(--irs-text-primary);
    border-radius: var(--irs-radius-sm);
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
    border-radius: var(--irs-radius-md);
    background: var(--irs-surface-modal);
    color: var(--irs-text-primary);
    border: 1px solid var(--irs-border-medium);
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    pointer-events: auto;
    -webkit-tap-highlight-color: transparent;
  }

  .playtest-overlay__exit:active {
    background: var(--irs-border-heavy);
  }

  .playtest-overlay__joystick {
    position: absolute;
    left: 16px;
    bottom: 64px;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: 2px solid var(--irs-border-medium);
    background: var(--irs-color-blue-alpha-22);
    pointer-events: auto;
    touch-action: none;
  }

  .playtest-overlay__joystick-knob {
    position: absolute;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    left: 34px;
    top: 34px;
    background: var(--irs-color-blue);
    border: 1px solid var(--irs-border-light);
    box-shadow: var(--irs-shadow-panel);
    pointer-events: none;
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

  const joystick = document.createElement('div');
  joystick.className = 'playtest-overlay__joystick';
  const joystickKnob = document.createElement('div');
  joystickKnob.className = 'playtest-overlay__joystick-knob';
  joystick.appendChild(joystickKnob);

  let exitCallback: (() => void) | null = null;
  let activePointerId: number | null = null;
  let originX = 0;
  let originY = 0;
  const radius = 40;

  const setKnob = (x: number, y: number): void => {
    joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
  };

  const endJoystick = (): void => {
    activePointerId = null;
    setKnob(0, 0);
    clearMoveVector();
  };

  joystick.addEventListener('pointerdown', (event) => {
    activePointerId = event.pointerId;
    originX = event.clientX;
    originY = event.clientY;
    joystick.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  joystick.addEventListener('pointermove', (event) => {
    if (activePointerId !== event.pointerId) return;
    const dx = event.clientX - originX;
    const dy = event.clientY - originY;
    const dist = Math.hypot(dx, dy);
    const clampedScale = dist > radius ? radius / dist : 1;
    const clampedX = dx * clampedScale;
    const clampedY = dy * clampedScale;
    setKnob(clampedX, clampedY);
    setMoveVector({
      x: clampedX / radius,
      y: clampedY / radius,
    });
    event.preventDefault();
  });

  joystick.addEventListener('pointerup', (event) => {
    if (activePointerId === event.pointerId) {
      endJoystick();
    }
  });
  joystick.addEventListener('pointercancel', (event) => {
    if (activePointerId === event.pointerId) {
      endJoystick();
    }
  });

  exitButton.addEventListener('click', () => {
    exitCallback?.();
  });

  overlay.appendChild(badge);
  overlay.appendChild(exitButton);
  overlay.appendChild(joystick);
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
      endJoystick();
      container.removeChild(overlay);
      document.head.removeChild(styleEl);
    },
  };

  return controller;
}
