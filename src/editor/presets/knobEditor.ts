import type { KnobDef, PresetDefinition } from '@/types/preset';

export interface KnobEditorConfig {
  container: HTMLElement;
  definition: PresetDefinition;
  values: Record<string, unknown>;
  onChange: (knobId: string, value: unknown) => void;
}

export interface KnobEditorController {
  refresh(values: Record<string, unknown>): void;
  destroy(): void;
}

const STYLES = `
  .knob-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .knob-editor__group {
    border: 1px solid rgba(88, 116, 173, 0.7);
    border-radius: 12px;
    background: rgba(12, 19, 37, 0.95);
    overflow: hidden;
  }

  .knob-editor__summary {
    list-style: none;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 700;
    color: #dbe4ff;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .knob-editor__summary::-webkit-details-marker {
    display: none;
  }

  .knob-editor__rows {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0 10px 10px;
  }

  .knob-editor__row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .knob-editor__label {
    font-size: 12px;
    font-weight: 700;
    color: #dbe4ff;
  }

  .knob-editor__help {
    font-size: 11px;
    color: #9fb1e0;
    line-height: 1.35;
  }

  .knob-editor__control,
  .knob-editor__range,
  .knob-editor__number {
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid rgba(88, 116, 173, 0.7);
    background: rgba(14, 21, 40, 0.95);
    color: #dbe4ff;
    padding: 10px;
    font-size: 13px;
  }

  .knob-editor__range-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .knob-editor__range {
    flex: 1;
    min-height: 0;
    padding: 0;
    background: transparent;
    border: none;
  }

  .knob-editor__number {
    width: 92px;
    text-align: right;
  }

  .knob-editor__toggle {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #dbe4ff;
    font-size: 12px;
  }
`;

function ensureStyles(): void {
  if (document.getElementById('knob-editor-styles')) return;
  const style = document.createElement('style');
  style.id = 'knob-editor-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function getKnobValue(values: Record<string, unknown>, knob: KnobDef): unknown {
  const value = values[knob.id];
  return value === undefined ? knob.default : value;
}

function normalizeNumber(value: string, knob: KnobDef): number {
  const parsed = Number(value);
  const min = knob.constraints?.min;
  const max = knob.constraints?.max;
  const fallback = typeof knob.default === 'number' ? knob.default : 0;
  const finite = Number.isFinite(parsed) ? parsed : fallback;
  const minCapped = typeof min === 'number' ? Math.max(min, finite) : finite;
  return typeof max === 'number' ? Math.min(max, minCapped) : minCapped;
}

export function createKnobEditor(config: KnobEditorConfig): KnobEditorController {
  ensureStyles();

  const root = document.createElement('div');
  root.className = 'knob-editor';
  config.container.appendChild(root);

  function renderKnob(knob: KnobDef, values: Record<string, unknown>): HTMLElement {
    const row = document.createElement('div');
    row.className = 'knob-editor__row';

    const label = document.createElement('label');
    label.className = 'knob-editor__label';
    label.textContent = knob.label;
    row.appendChild(label);

    const value = getKnobValue(values, knob);

    if (knob.type === 'number') {
      const wrap = document.createElement('div');
      wrap.className = 'knob-editor__range-wrap';

      const range = document.createElement('input');
      range.className = 'knob-editor__range';
      range.type = 'range';
      range.min = String(knob.constraints?.min ?? 0);
      range.max = String(knob.constraints?.max ?? 100);
      range.step = String(knob.constraints?.step ?? 1);
      range.value = String(typeof value === 'number' ? value : Number(knob.default));

      const number = document.createElement('input');
      number.className = 'knob-editor__number';
      number.type = 'number';
      number.min = String(knob.constraints?.min ?? '');
      number.max = String(knob.constraints?.max ?? '');
      number.step = String(knob.constraints?.step ?? 1);
      number.value = String(typeof value === 'number' ? value : Number(knob.default));

      range.addEventListener('input', () => {
        number.value = range.value;
        config.onChange(knob.id, normalizeNumber(range.value, knob));
      });

      number.addEventListener('change', () => {
        const next = normalizeNumber(number.value, knob);
        number.value = String(next);
        range.value = String(next);
        config.onChange(knob.id, next);
      });

      wrap.append(range, number);
      row.appendChild(wrap);
      inputRefs.set(knob.id, { type: 'number', elements: [range, number] });
    } else if (knob.type === 'boolean') {
      const toggle = document.createElement('label');
      toggle.className = 'knob-editor__toggle';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(value);
      checkbox.addEventListener('change', () => {
        config.onChange(knob.id, checkbox.checked);
      });
      const text = document.createElement('span');
      text.textContent = checkbox.checked ? 'Enabled' : 'Disabled';
      checkbox.addEventListener('change', () => {
        text.textContent = checkbox.checked ? 'Enabled' : 'Disabled';
      });
      toggle.append(checkbox, text);
      row.appendChild(toggle);
      inputRefs.set(knob.id, { type: 'boolean', elements: [checkbox] });
    } else if (knob.type === 'enum') {
      const select = document.createElement('select');
      select.className = 'knob-editor__control';
      const options = knob.constraints?.options ?? [];
      for (const optionValue of options) {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        select.appendChild(option);
      }
      select.value = String(value ?? knob.default ?? options[0] ?? '');
      select.addEventListener('change', () => {
        config.onChange(knob.id, select.value);
      });
      row.appendChild(select);
      inputRefs.set(knob.id, { type: 'enum', elements: [select as unknown as HTMLInputElement] });
    } else {
      const input = document.createElement('input');
      input.className = 'knob-editor__control';
      input.type = 'text';
      input.value = String(value ?? '');
      input.addEventListener('change', () => {
        config.onChange(knob.id, input.value);
      });
      row.appendChild(input);
      inputRefs.set(knob.id, { type: 'string', elements: [input] });
    }

    const help = document.createElement('div');
    help.className = 'knob-editor__help';
    help.textContent = knob.description;
    row.appendChild(help);

    return row;
  }

  // Track input elements by knob ID for in-place value updates
  const inputRefs = new Map<string, { type: string; elements: HTMLInputElement[] }>();

  function render(values: Record<string, unknown>): void {
    root.innerHTML = '';
    inputRefs.clear();

    const basics = config.definition.knobs.filter((k) => !k.advanced);
    const advanced = config.definition.knobs.filter((k) => k.advanced);

    const sections: Array<{ title: string; knobs: readonly KnobDef[]; open: boolean }> = [
      { title: 'Basics', knobs: basics, open: true },
      { title: 'Advanced', knobs: advanced, open: false },
    ];

    for (const section of sections) {
      if (section.knobs.length === 0) continue;

      const details = document.createElement('details');
      details.className = 'knob-editor__group';
      details.open = section.open;

      const summary = document.createElement('summary');
      summary.className = 'knob-editor__summary';
      summary.textContent = `${section.title} (${section.knobs.length})`;
      details.appendChild(summary);

      const rows = document.createElement('div');
      rows.className = 'knob-editor__rows';
      for (const knob of section.knobs) {
        rows.appendChild(renderKnob(knob, values));
      }
      details.appendChild(rows);
      root.appendChild(details);
    }
  }

  /** Update input values in-place without rebuilding DOM. */
  function updateValues(values: Record<string, unknown>): void {
    for (const knob of config.definition.knobs) {
      const ref = inputRefs.get(knob.id);
      if (!ref) continue;
      const value = getKnobValue(values, knob);

      if (ref.type === 'number') {
        const [range, number] = ref.elements;
        const str = String(typeof value === 'number' ? value : Number(knob.default));
        if (document.activeElement !== range) range.value = str;
        if (document.activeElement !== number) number.value = str;
      } else if (ref.type === 'boolean') {
        const [checkbox] = ref.elements;
        if (document.activeElement !== checkbox) checkbox.checked = Boolean(value);
      } else if (ref.type === 'enum') {
        const [select] = ref.elements;
        if (document.activeElement !== select) select.value = String(value ?? knob.default ?? '');
      } else {
        const [input] = ref.elements;
        if (document.activeElement !== input) input.value = String(value ?? '');
      }
    }
  }

  render(config.values);

  return {
    refresh(nextValues) {
      if (inputRefs.size > 0) {
        updateValues(nextValues);
      } else {
        render(nextValues);
      }
    },
    destroy() {
      root.remove();
    },
  };
}
