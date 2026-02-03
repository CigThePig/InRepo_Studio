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
    background: rgba(20, 30, 60, 0.85);
    border: 1px solid #253461;
    border-radius: 14px;
    padding: 12px;
    color: #e6ecff;
  }

  .berry-section + .berry-section {
    margin-top: 12px;
  }

  .berry-section__title {
    font-size: 13px;
    font-weight: 700;
    color: #dbe4ff;
    margin-bottom: 8px;
  }

  .berry-brush-control {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .berry-brush-control__row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .berry-brush-control__label {
    font-size: 11px;
    color: #9fb2e6;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  .berry-brush-control__buttons {
    display: flex;
    gap: 8px;
  }

  .berry-brush-control__button {
    min-width: 44px;
    min-height: 44px;
    border-radius: 10px;
    border: 2px solid transparent;
    background: #1f2745;
    color: #cfd8ff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .berry-brush-control__button:active {
    background: #2c3563;
  }

  .berry-brush-control__button--active {
    border-color: #4a9eff;
    background: #2c3563;
    color: #ffffff;
  }

  .berry-brush-control__hint {
    font-size: 12px;
    color: #9aa7d6;
    line-height: 1.4;
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
