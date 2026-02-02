/**
 * Selection Action Bar
 *
 * Floating action bar for selection operations.
 */

import { EDITOR_V2_FLAGS, isV2Enabled } from '@/editor/v2/featureFlags';

const LOG_PREFIX = '[SelectionBar]';

export interface SelectionBarConfig {
  onMove: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onFill: () => void;
  onCancel: () => void;
}

export interface SelectionBarController {
  show(): void;
  hide(): void;
  setPosition(x: number, y: number): void;
  setPasteEnabled(enabled: boolean): void;
  destroy(): void;
}

const STYLES = `
  .selection-bar {
    position: absolute;
    z-index: 10;
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 6px;
    background: rgba(20, 24, 48, 0.95);
    border: 1px solid #30407a;
    border-radius: 10px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    transform: translate(-50%, -100%);
    pointer-events: auto;
  }

  .selection-bar--hidden {
    display: none;
  }

  .selection-bar__button {
    min-width: 44px;
    min-height: 44px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 2px solid transparent;
    background: #25305c;
    color: #e6ecff;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .selection-bar__button:active {
    background: #33407a;
  }

  .selection-bar__button--danger {
    background: #4b1f2c;
    border-color: #73283d;
    color: #ffd6e2;
  }

  .selection-bar__button--danger:active {
    background: #6b2a3f;
  }

  .selection-bar__button--ghost {
    min-width: 36px;
    min-height: 36px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid #33407a;
    color: #b8c4ff;
  }

  .selection-bar__button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export function createSelectionBar(
  container: HTMLElement,
  config: SelectionBarConfig
): SelectionBarController {
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  const bar = document.createElement('div');
  bar.className = 'selection-bar selection-bar--hidden';

  const moveButton = document.createElement('button');
  moveButton.type = 'button';
  moveButton.className = 'selection-bar__button';
  moveButton.textContent = 'Move';
  moveButton.addEventListener('click', (event) => {
    event.stopPropagation();
    config.onMove();
  });

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'selection-bar__button';
  copyButton.textContent = 'Copy';
  copyButton.addEventListener('click', (event) => {
    event.stopPropagation();
    config.onCopy();
  });

  const pasteButton = document.createElement('button');
  pasteButton.type = 'button';
  pasteButton.className = 'selection-bar__button';
  pasteButton.textContent = 'Paste';
  pasteButton.addEventListener('click', (event) => {
    event.stopPropagation();
    config.onPaste();
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'selection-bar__button selection-bar__button--danger';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', (event) => {
    event.stopPropagation();
    config.onDelete();
  });

  const fillButton = document.createElement('button');
  fillButton.type = 'button';
  fillButton.className = 'selection-bar__button';
  fillButton.textContent = 'Fill';
  fillButton.addEventListener('click', (event) => {
    event.stopPropagation();
    config.onFill();
  });

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'selection-bar__button selection-bar__button--ghost';
  cancelButton.textContent = '✕';
  cancelButton.addEventListener('click', (event) => {
    event.stopPropagation();
    config.onCancel();
  });

  bar.appendChild(moveButton);
  bar.appendChild(copyButton);
  bar.appendChild(pasteButton);
  bar.appendChild(deleteButton);
  bar.appendChild(fillButton);
  bar.appendChild(cancelButton);

  container.appendChild(bar);

  function show(): void {
    if (isV2Enabled(EDITOR_V2_FLAGS.BOTTOM_CONTEXT_STRIP)) {
      hide();
      return;
    }
    bar.classList.remove('selection-bar--hidden');
  }

  function hide(): void {
    bar.classList.add('selection-bar--hidden');
  }

  function setPosition(x: number, y: number): void {
    if (isV2Enabled(EDITOR_V2_FLAGS.BOTTOM_CONTEXT_STRIP)) {
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const padding = 8;

    const clampedX = Math.min(
      containerRect.width - padding - barRect.width / 2,
      Math.max(padding + barRect.width / 2, x)
    );

    const clampedY = Math.min(
      containerRect.height - padding,
      Math.max(padding + barRect.height, y)
    );

    bar.style.left = `${clampedX}px`;
    bar.style.top = `${clampedY}px`;
  }

  function setPasteEnabled(enabled: boolean): void {
    pasteButton.disabled = !enabled;
  }

  function destroy(): void {
    bar.remove();
    styleEl.remove();
  }

  console.log(`${LOG_PREFIX} Selection bar created`);

  return { show, hide, setPosition, setPasteEnabled, destroy };
}
