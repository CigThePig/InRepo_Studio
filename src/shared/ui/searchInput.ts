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

const SEARCH_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
const CLEAR_ICON_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

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
    clearBtn.innerHTML = CLEAR_ICON_SVG;
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
