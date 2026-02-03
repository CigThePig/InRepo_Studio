/**
 * Bottom Context Strip
 *
 * Contextual selection actions rendered inside the bottom bar.
 */

export type BottomContextSelection = 'none' | 'tiles' | 'entities' | 'triggers';

export interface BottomContextStripConfig {
  onMove: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onFill: () => void;
  onCancel: () => void;
  onResize: () => void;
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
    padding: 8px 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    scrollbar-width: none;
  }

  .bottom-context-strip::-webkit-scrollbar {
    display: none;
  }

  .bottom-context-strip--hidden {
    display: none;
  }

  .bottom-context-strip__label {
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    padding: 0 8px;
  }

  .bottom-context-strip__group {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .bottom-context-strip__button {
    height: 40px;
    padding: 0 14px;
    border-radius: 8px;
    border: none;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .bottom-context-strip__button:active {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(0.97);
  }

  .bottom-context-strip__button--danger {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
  }

  .bottom-context-strip__button--danger:active {
    background: rgba(239, 68, 68, 0.25);
  }

  .bottom-context-strip__button--ghost {
    width: 40px;
    height: 40px;
    padding: 0;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bottom-context-strip__button--ghost:active {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.8);
  }

  .bottom-context-strip__button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .bottom-context-strip__button:disabled:active {
    transform: none;
  }
`;

export function createBottomContextStrip(
  container: HTMLElement,
  config: BottomContextStripConfig
): BottomContextStripController {
  // Ensure styles are only added once
  if (!document.getElementById('bottom-context-strip-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'bottom-context-strip-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

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

  const triggerGroup = document.createElement('div');
  triggerGroup.className = 'bottom-context-strip__group';

  const resizeButton = buildButton('Resize', () => config.onResize());
  const triggerDuplicateButton = buildButton('Duplicate', () => config.onDuplicate());
  const triggerDeleteButton = buildButton('Delete', () => config.onDelete(), 'danger');

  triggerGroup.appendChild(resizeButton);
  triggerGroup.appendChild(triggerDuplicateButton);
  triggerGroup.appendChild(triggerDeleteButton);

  container.appendChild(label);
  container.appendChild(tileGroup);
  container.appendChild(entityGroup);
  container.appendChild(triggerGroup);

  let selectionType: BottomContextSelection = 'none';
  let selectionCount = 0;

  function updateVisibility(): void {
    const isHidden = selectionType === 'none';
    container.classList.toggle('bottom-context-strip--hidden', isHidden);

    if (selectionType === 'tiles') {
      label.textContent = 'Selection';
      tileGroup.style.display = 'flex';
      entityGroup.style.display = 'none';
      triggerGroup.style.display = 'none';
    } else if (selectionType === 'entities') {
      label.textContent = `${selectionCount || 1} selected`;
      tileGroup.style.display = 'none';
      entityGroup.style.display = 'flex';
      triggerGroup.style.display = 'none';
    } else if (selectionType === 'triggers') {
      label.textContent = 'Trigger';
      tileGroup.style.display = 'none';
      entityGroup.style.display = 'none';
      triggerGroup.style.display = 'flex';
    } else {
      label.textContent = '';
      tileGroup.style.display = 'none';
      entityGroup.style.display = 'none';
      triggerGroup.style.display = 'none';
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
    const styleEl = document.getElementById('bottom-context-strip-styles');
    if (styleEl) styleEl.remove();
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
