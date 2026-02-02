/**
 * Bottom Context Strip
 *
 * Contextual selection actions rendered inside the bottom bar.
 */

export type BottomContextSelection = 'none' | 'tiles' | 'entities';

export interface BottomContextStripConfig {
  onMove: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onFill: () => void;
  onCancel: () => void;
  onDuplicate: () => void;
  onClear: () => void;
}

export interface BottomContextStripController {
  setSelectionType(type: BottomContextSelection): void;
  setPasteEnabled(enabled: boolean): void;
  setSelectionCount(count: number): void;
  destroy(): void;
}

const STYLES = `
  .bottom-context-strip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-top: 1px solid #0f3460;
  }

  .bottom-context-strip--hidden {
    display: none;
  }

  .bottom-context-strip__label {
    color: #9fb2e6;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    white-space: nowrap;
  }

  .bottom-context-strip__group {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .bottom-context-strip__button {
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

  .bottom-context-strip__button:active {
    background: #33407a;
  }

  .bottom-context-strip__button--danger {
    background: #4b1f2c;
    border-color: #73283d;
    color: #ffd6e2;
  }

  .bottom-context-strip__button--ghost {
    min-width: 36px;
    min-height: 36px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid #33407a;
    color: #b8c4ff;
  }

  .bottom-context-strip__button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export function createBottomContextStrip(
  container: HTMLElement,
  config: BottomContextStripConfig
): BottomContextStripController {
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  container.classList.add('bottom-context-strip', 'bottom-context-strip--hidden');

  const label = document.createElement('div');
  label.className = 'bottom-context-strip__label';
  label.textContent = '';

  const tileGroup = document.createElement('div');
  tileGroup.className = 'bottom-context-strip__group';

  const moveButton = buildButton('Move', () => config.onMove());
  const copyButton = buildButton('Copy', () => config.onCopy());
  const pasteButton = buildButton('Paste', () => config.onPaste());
  const deleteButton = buildButton('Delete', () => config.onDelete(), 'danger');
  const fillButton = buildButton('Fill', () => config.onFill());
  const cancelButton = buildButton('✕', () => config.onCancel(), 'ghost');

  tileGroup.appendChild(moveButton);
  tileGroup.appendChild(copyButton);
  tileGroup.appendChild(pasteButton);
  tileGroup.appendChild(deleteButton);
  tileGroup.appendChild(fillButton);
  tileGroup.appendChild(cancelButton);

  const entityGroup = document.createElement('div');
  entityGroup.className = 'bottom-context-strip__group';

  const duplicateButton = buildButton('Duplicate', () => config.onDuplicate());
  const entityDeleteButton = buildButton('Delete', () => config.onDelete(), 'danger');
  const clearButton = buildButton('✕', () => config.onClear(), 'ghost');

  entityGroup.appendChild(duplicateButton);
  entityGroup.appendChild(entityDeleteButton);
  entityGroup.appendChild(clearButton);

  container.appendChild(label);
  container.appendChild(tileGroup);
  container.appendChild(entityGroup);

  let selectionType: BottomContextSelection = 'none';
  let selectionCount = 0;

  function updateVisibility(): void {
    const isHidden = selectionType === 'none';
    container.classList.toggle('bottom-context-strip--hidden', isHidden);

    if (selectionType === 'tiles') {
      label.textContent = 'Tile selection';
      tileGroup.style.display = 'flex';
      entityGroup.style.display = 'none';
    } else if (selectionType === 'entities') {
      label.textContent = `${selectionCount || 1} selected`;
      tileGroup.style.display = 'none';
      entityGroup.style.display = 'flex';
    } else {
      label.textContent = '';
      tileGroup.style.display = 'none';
      entityGroup.style.display = 'none';
    }
  }

  function setSelectionType(type: BottomContextSelection): void {
    selectionType = type;
    updateVisibility();
  }

  function setPasteEnabled(enabled: boolean): void {
    pasteButton.disabled = !enabled;
  }

  function setSelectionCount(count: number): void {
    selectionCount = count;
    if (selectionType === 'entities') {
      label.textContent = `${selectionCount || 1} selected`;
    }
  }

  function destroy(): void {
    container.innerHTML = '';
    container.classList.remove('bottom-context-strip', 'bottom-context-strip--hidden');
    styleEl.remove();
  }

  function buildButton(
    text: string,
    onClick: () => void,
    variant: 'default' | 'danger' | 'ghost' = 'default'
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bottom-context-strip__button';
    if (variant === 'danger') {
      button.classList.add('bottom-context-strip__button--danger');
    }
    if (variant === 'ghost') {
      button.classList.add('bottom-context-strip__button--ghost');
    }
    button.textContent = text;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  updateVisibility();

  return {
    setSelectionType,
    setPasteEnabled,
    setSelectionCount,
    destroy,
  };
}
