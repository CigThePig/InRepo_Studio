/**
 * Entity Selection Action Bar
 *
 * Floating action bar for entity manipulation actions.
 */

const LOG_PREFIX = '[EntitySelectionBar]';

export interface EntitySelectionBarConfig {
  onDuplicate: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export interface EntitySelectionBarController {
  show(): void;
  hide(): void;
  setPosition(x: number, y: number): void;
  setSelectionCount(count: number): void;
  destroy(): void;
}

const STYLES = `
  .entity-selection-bar {
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

  .entity-selection-bar--hidden {
    display: none;
  }

  .entity-selection-bar__count {
    color: #cfe0ff;
    font-size: 12px;
    font-weight: 700;
    padding: 0 6px;
  }

  .entity-selection-bar__button {
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

  .entity-selection-bar__button:active {
    background: #33407a;
  }

  .entity-selection-bar__button--danger {
    background: #4b1f2c;
    border-color: #73283d;
    color: #ffd6e2;
  }

  .entity-selection-bar__button--ghost {
    min-width: 36px;
    min-height: 36px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid #33407a;
    color: #b8c4ff;
  }
`;

export function createEntitySelectionBar(
  container: HTMLElement,
  config: EntitySelectionBarConfig
): EntitySelectionBarController {
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  const bar = document.createElement('div');
  bar.className = 'entity-selection-bar entity-selection-bar--hidden';

  const countLabel = document.createElement('div');
  countLabel.className = 'entity-selection-bar__count';
  countLabel.textContent = '1 selected';

  const duplicateButton = document.createElement('button');
  duplicateButton.type = 'button';
  duplicateButton.className = 'entity-selection-bar__button';
  duplicateButton.textContent = 'Duplicate';
  duplicateButton.addEventListener('click', (event) => {
    event.stopPropagation();
    config.onDuplicate();
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'entity-selection-bar__button entity-selection-bar__button--danger';
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', (event) => {
    event.stopPropagation();
    config.onDelete();
  });

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'entity-selection-bar__button entity-selection-bar__button--ghost';
  clearButton.textContent = '✕';
  clearButton.addEventListener('click', (event) => {
    event.stopPropagation();
    config.onClear();
  });

  bar.appendChild(countLabel);
  bar.appendChild(duplicateButton);
  bar.appendChild(deleteButton);
  bar.appendChild(clearButton);
  container.appendChild(bar);

  function show(): void {
    bar.classList.remove('entity-selection-bar--hidden');
  }

  function hide(): void {
    bar.classList.add('entity-selection-bar--hidden');
  }

  function setPosition(x: number, y: number): void {
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

  function setSelectionCount(count: number): void {
    countLabel.textContent = `${count} selected`;
  }

  function destroy(): void {
    bar.remove();
    styleEl.remove();
  }

  console.log(`${LOG_PREFIX} Entity selection bar created`);

  return { show, hide, setPosition, setSelectionCount, destroy };
}
