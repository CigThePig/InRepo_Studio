export type SearchInputOptions = {
  placeholder?: string;
  value?: string;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
  onInput?: (value: string) => void;
  onClear?: () => void;
  showIcon?: boolean;
  showClear?: boolean;
};

export type SearchInputHandle = {
  root: HTMLDivElement;
  input: HTMLInputElement;
  setValue: (v: string) => void;
  getValue: () => string;
  setPlaceholder: (v: string) => void;
  setDisabled: (disabled: boolean) => void;
  destroy: () => void;
};

const SEARCH_ICON_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10.5 3a7.5 7.5 0 1 1 4.74 13.3l4.23 4.23a1 1 0 0 1-1.42 1.42l-4.23-4.23A7.5 7.5 0 0 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"/></svg>`;

export function createSearchInput(opts: SearchInputOptions = {}): SearchInputHandle {
  const {
    placeholder = '',
    value = '',
    ariaLabel = 'Search',
    className = '',
    inputClassName = '',
    onInput,
    onClear,
    showIcon = true,
    showClear = true,
  } = opts;

  const root = document.createElement('div');
  root.className = `irs-search${className ? ` ${className}` : ''}`;

  if (showIcon) {
    const icon = document.createElement('span');
    icon.className = 'irs-search__icon';
    icon.innerHTML = SEARCH_ICON_SVG;
    root.appendChild(icon);
  }

  const input = document.createElement('input');
  input.type = 'search';
  input.className = `irs-input irs-search__input${inputClassName ? ` ${inputClassName}` : ''}`;
  input.placeholder = placeholder;
  input.setAttribute('aria-label', ariaLabel);
  input.value = value;
  root.appendChild(input);

  let clearBtn: HTMLButtonElement | null = null;
  if (showClear) {
    clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'irs-search__clear';
    clearBtn.setAttribute('aria-label', 'Clear search');
    clearBtn.textContent = '\u00d7';
    root.appendChild(clearBtn);
  }

  const syncClearVisibility = (): void => {
    if (!clearBtn) return;
    clearBtn.hidden = input.value.length === 0;
  };

  const handleInput = (): void => {
    syncClearVisibility();
    onInput?.(input.value);
  };

  const handleClear = (): void => {
    input.value = '';
    syncClearVisibility();
    onInput?.('');
    onClear?.();
  };

  input.addEventListener('input', handleInput);
  clearBtn?.addEventListener('click', handleClear);

  syncClearVisibility();

  return {
    root,
    input,
    setValue(v: string) {
      input.value = v;
      syncClearVisibility();
    },
    getValue() {
      return input.value;
    },
    setPlaceholder(v: string) {
      input.placeholder = v;
    },
    setDisabled(disabled: boolean) {
      input.disabled = disabled;
      if (clearBtn) {
        clearBtn.disabled = disabled;
      }
    },
    destroy() {
      input.removeEventListener('input', handleInput);
      clearBtn?.removeEventListener('click', handleClear);
      root.remove();
    },
  };
}
