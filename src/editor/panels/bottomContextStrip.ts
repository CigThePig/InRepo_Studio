/**
 * Bottom Context Strip
 *
 * Contextual selection actions rendered inside the bottom bar.
 */

export type BottomContextSelection = 'none' | 'tiles' | 'entities' | 'propSprites' | 'triggers';

export interface BottomContextStripConfig {
  onMove: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: (buttonEl: HTMLButtonElement) => void;
  onFill: () => void;
  onCancel: () => void;
  onResize: () => void;
  onDuplicate: () => void;
  onClear: () => void;
  onConvertToEntity: () => void;
}

export interface BottomContextStripController {
  setSelectionType(type: BottomContextSelection): void;
  /** Whether the selection tool is currently active (shows tile actions even before a selection exists). */
  setSelectToolActive(active: boolean): void;
  setPasteEnabled(enabled: boolean): void;
  setSelectionCount(count: number): void;
  destroy(): void;
}

const STYLES = `
  .irs-context-strip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-top: 1px solid var(--irs-border-light);
    scrollbar-width: none;
  }

  .irs-context-strip::-webkit-scrollbar {
    display: none;
  }

  .irs-context-strip--hidden {
    display: none;
  }

  .irs-context-strip__label {
    color: var(--irs-text-muted);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    padding: 0 8px;
  }

  .irs-context-strip__group {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .irs-context-strip__button {
    min-height: var(--irs-touch-target);
    height: var(--irs-touch-target);
    padding: 0 14px;
    border-radius: 8px;
    border: none;
    background: var(--irs-border-light);
    color: var(--irs-text-primary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .irs-context-strip__button:active {
    background: var(--irs-color-blue-alpha-12);
    transform: scale(0.97);
  }

  .irs-context-strip__button--danger {
    background: var(--irs-color-red-alpha-15);
    color: var(--irs-accent-danger);
  }

  .irs-context-strip__button--danger:active {
    background: var(--irs-color-red-alpha-53);
  }

  .irs-context-strip__button--ghost {
    width: var(--irs-touch-target);
    min-height: var(--irs-touch-target);
    height: var(--irs-touch-target);
    padding: 0;
    background: transparent;
    color: var(--irs-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .irs-context-strip__button--ghost:active {
    background: var(--irs-border-light);
    color: var(--irs-text-primary);
  }

  .irs-context-strip__button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .irs-context-strip__button:disabled:active {
    transform: none;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('irs-context-strip-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'irs-context-strip-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createBottomContextStrip(
  container: HTMLElement,
  config: BottomContextStripConfig
): BottomContextStripController {
  // Ensure styles are only added once
  ensureStyles();

  container.classList.add('irs-context-strip', 'irs-context-strip--hidden');

  const label = document.createElement('div');
  label.className = 'irs-context-strip__label';
  label.textContent = '';

  const tileGroup = document.createElement('div');
  tileGroup.className = 'irs-context-strip__group';

  const moveButton = buildButton('Move', (_btn) => config.onMove());
  const copyButton = buildButton('Copy', (_btn) => config.onCopy());
  const pasteButton = buildButton('Paste', (_btn) => config.onPaste());
  const deleteButton = buildButton('Delete', (btn) => config.onDelete(btn), 'danger');
  const fillButton = buildButton('Fill', (_btn) => config.onFill());
  const cancelButton = buildButton('✕', (_btn) => config.onCancel(), 'ghost');

  tileGroup.appendChild(moveButton);
  tileGroup.appendChild(copyButton);
  tileGroup.appendChild(pasteButton);
  tileGroup.appendChild(deleteButton);
  tileGroup.appendChild(fillButton);
  tileGroup.appendChild(cancelButton);

  const entityGroup = document.createElement('div');
  entityGroup.className = 'irs-context-strip__group';

  const duplicateButton = buildButton('Duplicate', (_btn) => config.onDuplicate());
  const entityDeleteButton = buildButton('Delete', (btn) => config.onDelete(btn), 'danger');
  const clearButton = buildButton('✕', (_btn) => config.onClear(), 'ghost');

  entityGroup.appendChild(duplicateButton);
  entityGroup.appendChild(entityDeleteButton);
  entityGroup.appendChild(clearButton);


  const propSpriteGroup = document.createElement('div');
  propSpriteGroup.className = 'irs-context-strip__group';

  const propDuplicateButton = buildButton('Duplicate', (_btn) => config.onDuplicate());
  const moveToEntityButton = buildButton('Move to Entities', (_btn) => config.onConvertToEntity());
  const propDeleteButton = buildButton('Delete', (btn) => config.onDelete(btn), 'danger');
  const propClearButton = buildButton('✕', (_btn) => config.onClear(), 'ghost');

  propSpriteGroup.appendChild(propDuplicateButton);
  propSpriteGroup.appendChild(moveToEntityButton);
  propSpriteGroup.appendChild(propDeleteButton);
  propSpriteGroup.appendChild(propClearButton);

  const triggerGroup = document.createElement('div');
  triggerGroup.className = 'irs-context-strip__group';

  const resizeButton = buildButton('Resize', (_btn) => config.onResize());
  const triggerDuplicateButton = buildButton('Duplicate', (_btn) => config.onDuplicate());
  const triggerDeleteButton = buildButton('Delete', (btn) => config.onDelete(btn), 'danger');

  triggerGroup.appendChild(resizeButton);
  triggerGroup.appendChild(triggerDuplicateButton);
  triggerGroup.appendChild(triggerDeleteButton);

  container.appendChild(label);
  container.appendChild(tileGroup);
  container.appendChild(entityGroup);
  container.appendChild(propSpriteGroup);
  container.appendChild(triggerGroup);

  let selectionType: BottomContextSelection = 'none';
  let selectToolActive = false;
  let pasteEnabled = false;

  let selectionCount = 0;

  function updateVisibility(): void {
    const hasTileSelection = selectionType === 'tiles';
    const isHidden = selectionType === 'none' && !selectToolActive;
    container.classList.toggle('irs-context-strip--hidden', isHidden);

    if (selectionType === 'tiles') {
      label.textContent = 'Selection';
      tileGroup.style.display = 'flex';
      entityGroup.style.display = 'none';
      triggerGroup.style.display = 'none';
      propSpriteGroup.style.display = 'none';
    } else if (selectionType === 'entities') {
      label.textContent = `${selectionCount || 1} selected`;
      tileGroup.style.display = 'none';
      entityGroup.style.display = 'flex';
      triggerGroup.style.display = 'none';
    } else if (selectionType === 'propSprites') {
      label.textContent = `${selectionCount || 1} selected`;
      tileGroup.style.display = 'none';
      entityGroup.style.display = 'none';
      propSpriteGroup.style.display = 'flex';
      triggerGroup.style.display = 'none';
      propSpriteGroup.style.display = 'none';
    } else if (selectionType === 'triggers') {
      label.textContent = 'Trigger';
      tileGroup.style.display = 'none';
      entityGroup.style.display = 'none';
      triggerGroup.style.display = 'flex';
    } else {
      if (selectToolActive) {
        label.textContent = 'Select';
        tileGroup.style.display = 'flex';
        entityGroup.style.display = 'none';
        triggerGroup.style.display = 'none';
        propSpriteGroup.style.display = 'none';
      } else {
        label.textContent = '';
        tileGroup.style.display = 'none';
        entityGroup.style.display = 'none';
        triggerGroup.style.display = 'none';
        propSpriteGroup.style.display = 'none';
      }
    }

    moveButton.disabled = !hasTileSelection;
    copyButton.disabled = !hasTileSelection;
    deleteButton.disabled = !hasTileSelection;
    fillButton.disabled = !hasTileSelection;
    pasteButton.disabled = !hasTileSelection || !pasteEnabled;
  }

  function setSelectionType(type: BottomContextSelection): void {
    selectionType = type;
    updateVisibility();
  }

  function setSelectToolActive(active: boolean): void {
    selectToolActive = active;
    updateVisibility();
  }

  function setPasteEnabled(enabled: boolean): void {
    pasteEnabled = enabled;
    updateVisibility();
  }

  function setSelectionCount(count: number): void {
    selectionCount = count;
    if (selectionType === 'entities' || selectionType === 'propSprites') {
      label.textContent = `${selectionCount || 1} selected`;
    }
  }

  function destroy(): void {
    container.innerHTML = '';
    container.classList.remove('irs-context-strip', 'irs-context-strip--hidden');
    const styleEl = document.getElementById('irs-context-strip-styles');
    if (styleEl) styleEl.remove();
  }

  function buildButton(
    text: string,
    onClick: (btn: HTMLButtonElement) => void,
    variant: 'default' | 'danger' | 'ghost' = 'default'
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'irs-context-strip__button';
    if (variant === 'danger') {
      button.classList.add('irs-context-strip__button--danger');
    }
    if (variant === 'ghost') {
      button.classList.add('irs-context-strip__button--ghost');
    }
    button.textContent = text;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick(button);
    });
    return button;
  }

  updateVisibility();

  return {
    setSelectionType,
    setSelectToolActive,
    setPasteEnabled,
    setSelectionCount,
    destroy,
  };
}
