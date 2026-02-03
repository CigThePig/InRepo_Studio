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

const STYLE_ID = 'berry-controls-styles';

const STYLES = `
  .berry-section {
    background: linear-gradient(180deg, rgba(74, 158, 255, 0.08) 0%, rgba(74, 158, 255, 0.03) 100%);
    border: 1px solid rgba(74, 158, 255, 0.15);
    border-radius: 16px;
    padding: 16px;
    color: #e6ecff;
  }

  .berry-section + .berry-section {
    margin-top: 12px;
  }

  .berry-section__title {
    font-size: 13px;
    font-weight: 700;
    color: #e6ecff;
    margin-bottom: 12px;
    letter-spacing: 0.3px;
  }

  .berry-brush-control {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .berry-brush-control__row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .berry-brush-control__label {
    font-size: 11px;
    color: #8899c4;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .berry-brush-control__buttons {
    display: flex;
    gap: 8px;
  }

  .berry-brush-control__button {
    min-width: 48px;
    min-height: 48px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
    color: #b8c4e6;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .berry-brush-control__button:active {
    background: rgba(74, 158, 255, 0.15);
    transform: scale(0.95);
  }

  .berry-brush-control__button--active {
    background: linear-gradient(180deg, rgba(74, 158, 255, 0.25) 0%, rgba(74, 158, 255, 0.15) 100%);
    border-color: rgba(74, 158, 255, 0.5);
    color: #ffffff;
    box-shadow: 0 0 12px rgba(74, 158, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .berry-brush-control__hint {
    font-size: 12px;
    color: #8899c4;
    line-height: 1.5;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.05);
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
  section.className = 'berry-section';

  const titleEl = document.createElement('div');
  titleEl.className = 'berry-section__title';
  titleEl.textContent = title;

  const control = document.createElement('div');
  control.className = 'berry-brush-control';

  const row = document.createElement('div');
  row.className = 'berry-brush-control__row';

  const label = document.createElement('span');
  label.className = 'berry-brush-control__label';
  label.textContent = 'Size';

  const buttons = document.createElement('div');
  buttons.className = 'berry-brush-control__buttons';

  const sizes: BrushSize[] = [1, 2, 3];
  const buttonMap = new Map<BrushSize, HTMLButtonElement>();

  sizes.forEach((size) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'berry-brush-control__button';
    button.textContent = String(size);
    button.setAttribute('aria-label', `Brush size ${size}`);
    button.setAttribute('title', `Brush size ${size}`);
    button.classList.toggle('berry-brush-control__button--active', size === currentSize);
    button.addEventListener('click', () => {
      if (currentSize === size) return;
      currentSize = size;
      buttonMap.forEach((btn, value) => {
        btn.classList.toggle('berry-brush-control__button--active', value === size);
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
    hintEl.className = 'berry-brush-control__hint';
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
        btn.classList.toggle('berry-brush-control__button--active', value === size);
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
