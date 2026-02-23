import type { BrushSize } from '@/storage/hot';

export interface BrushSizeControlConfig {
  container: HTMLElement;
  initialSize: BrushSize;
  title?: string;
  hint?: string;
  onChange?: (size: BrushSize) => void;
}

export interface BrushSizeControlController {
  setSize(size: BrushSize): void;
  getSize(): BrushSize;
  destroy(): void;
}

const STYLE_ID = 'irs-berry-controls-styles';

const STYLES = `
  .irs-berry-section {
    background: var(--irs-surface-elevated);
    border: 1px solid var(--irs-border-light);
    border-radius: var(--irs-radius-lg);
    padding: 16px;
    color: var(--irs-text-primary);
  }

  .irs-berry-section + .irs-berry-section {
    margin-top: 12px;
  }

  .irs-berry-section__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--irs-text-primary);
    margin-bottom: 12px;
  }

  .irs-brush-control {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .irs-brush-control__row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .irs-brush-control__label {
    font-size: 12px;
    color: var(--irs-text-muted);
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.5px;
    min-width: 40px;
  }

  .irs-brush-control__buttons {
    display: flex;
    gap: 8px;
  }

  .irs-brush-control__button {
    min-width: var(--irs-touch-target);
    width: var(--irs-touch-target);
    min-height: var(--irs-touch-target);
    font-size: 15px;
    padding: 0;
  }

  .irs-brush-control__button:active {
    background: var(--irs-color-blue-alpha-12);
    transform: scale(0.95);
  }

  .irs-brush-control__button--active {
    background: var(--irs-color-blue-alpha-22);
    color: var(--irs-text-primary);
    box-shadow: inset 0 0 0 1px var(--irs-color-blue-alpha-45);
  }

  .irs-brush-control__hint {
    font-size: 12px;
    color: var(--irs-text-muted);
    line-height: 1.5;
    padding: 10px 12px;
    background: var(--irs-surface-base);
    border-radius: var(--irs-radius-sm);
  }
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createBrushSizeControl(config: BrushSizeControlConfig): BrushSizeControlController {
  ensureStyles();

  const { container, title = 'Brush Size', hint, onChange } = config;
  let currentSize: BrushSize = config.initialSize;

  const section = document.createElement('section');
  section.className = 'irs-berry-section';

  const titleEl = document.createElement('div');
  titleEl.className = 'irs-berry-section__title';
  titleEl.textContent = title;

  const control = document.createElement('div');
  control.className = 'irs-brush-control';

  const row = document.createElement('div');
  row.className = 'irs-brush-control__row';

  const label = document.createElement('span');
  label.className = 'irs-brush-control__label';
  label.textContent = 'Size';

  const buttons = document.createElement('div');
  buttons.className = 'irs-brush-control__buttons';

  const sizes: BrushSize[] = [1, 2, 3];
  const buttonMap = new Map<BrushSize, HTMLButtonElement>();

  sizes.forEach((size) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'irs-btn irs-btn--secondary irs-brush-control__button';
    button.textContent = String(size);
    button.setAttribute('aria-label', `Brush size ${size}`);
    button.setAttribute('title', `Brush size ${size}`);
    button.classList.toggle('irs-brush-control__button--active', size === currentSize);
    button.addEventListener('click', () => {
      if (currentSize === size) return;
      currentSize = size;
      buttonMap.forEach((btn, value) => {
        btn.classList.toggle('irs-brush-control__button--active', value === size);
      });
      onChange?.(size);
    });
    buttonMap.set(size, button);
    buttons.appendChild(button);
  });

  row.appendChild(label);
  row.appendChild(buttons);
  control.appendChild(row);

  if (hint) {
    const hintEl = document.createElement('div');
    hintEl.className = 'irs-brush-control__hint';
    hintEl.textContent = hint;
    control.appendChild(hintEl);
  }

  section.appendChild(titleEl);
  section.appendChild(control);
  container.appendChild(section);

  return {
    setSize(size: BrushSize) {
      if (currentSize === size) return;
      currentSize = size;
      buttonMap.forEach((btn, value) => {
        btn.classList.toggle('irs-brush-control__button--active', value === size);
      });
    },
    getSize() {
      return currentSize;
    },
    destroy() {
      section.remove();
    },
  };
}
