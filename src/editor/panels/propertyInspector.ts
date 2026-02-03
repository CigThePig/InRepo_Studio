/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Entity property inspector UI for editing instance properties
 *
 * Defines:
 * - PropertyInspectorConfig — inspector wiring (type: interface)
 * - PropertyInspectorController — inspector public API (type: interface)
 *
 * Canonical key set:
 * - Keys come from: project.entityTypes (property definitions)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (property edits update scene immediately)
 */

import type { EntityInstance, Project } from '@/types';
import { validatePropertyValue, type PropertyDefinition } from '@/types/entity';
import type { EntityManager } from '@/editor/entities/entityManager';
import { generateOperationId, type HistoryManager, type Operation } from '@/editor/history';
const LOG_PREFIX = '[PropertyInspector]';

const STYLES = `
  .property-inspector {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 12px;
    max-height: 45vh;
    display: flex;
    flex-direction: column;
    background: rgba(18, 24, 48, 0.98);
    border: 1px solid #2b3f7a;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    z-index: 10;
  }

  .property-inspector--hidden {
    display: none;
  }

  .property-inspector__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px 8px;
    border-bottom: 1px solid rgba(62, 84, 148, 0.4);
  }

  .property-inspector__title {
    font-size: 14px;
    font-weight: 700;
    color: #e6ecff;
  }

  .property-inspector__subtitle {
    font-size: 12px;
    color: #aab0d4;
    margin-top: 4px;
  }

  .property-inspector__close {
    min-width: 44px;
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: transparent;
    color: #cfe0ff;
    font-size: 16px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .property-inspector__close:active {
    background: rgba(62, 84, 148, 0.3);
  }

  .property-inspector__body {
    padding: 10px 14px 14px;
    overflow-y: auto;
  }

  .property-inspector__empty {
    font-size: 12px;
    color: #8c94c9;
    padding: 10px 0 6px;
  }

  .property-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(62, 84, 148, 0.25);
  }

  .property-row:last-child {
    border-bottom: none;
  }

  .property-label {
    font-size: 12px;
    font-weight: 600;
    color: #dbe4ff;
  }

  .property-input,
  .property-select,
  .property-toggle {
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(22, 30, 60, 0.85);
    color: #f2f5ff;
    padding: 8px 12px;
    font-size: 13px;
  }

  .property-input::placeholder {
    color: rgba(170, 176, 212, 0.7);
  }

  .property-input--mixed,
  .property-toggle--mixed {
    border-style: dashed;
    color: #b8c4ff;
  }

  .property-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .property-toggle--active {
    border-color: #4a9eff;
    background: rgba(74, 158, 255, 0.2);
    color: #ffffff;
  }

  .property-toggle:active {
    background: rgba(62, 84, 148, 0.35);
  }

  .property-hint {
    font-size: 11px;
    color: #8f98c8;
  }

  .property-error {
    font-size: 11px;
    color: #ff9fb3;
  }

  .property-row--error .property-input,
  .property-row--error .property-select,
  .property-row--error .property-toggle {
    border-color: rgba(255, 124, 152, 0.8);
  }
`;

export interface PropertyInspectorConfig {
  container: HTMLElement;
  getProject: () => Project | null;
  entityManager: EntityManager;
  history: HistoryManager;
  onClose?: () => void;
}

export interface PropertyInspectorController {
  setSelection(selectedIds: string[]): void;
  hide(): void;
  show(): void;
  destroy(): void;
}

function formatEntityTitle(selected: EntityInstance[], project: Project | null): string {
  if (selected.length === 0) return 'No entity selected';
  if (selected.length === 1) {
    const entity = selected[0];
    const entityType = project?.entityTypes.find((type) => type.name === entity.type);
    return entityType?.displayName ?? entityType?.name ?? entity.type;
  }
  return `${selected.length} entities selected`;
}

function formatEntitySubtitle(selected: EntityInstance[], project: Project | null): string {
  if (selected.length === 0) return '';
  if (selected.length === 1) {
    return `ID: ${selected[0].id}`;
  }

  const types = new Set(
    selected.map((entity) => project?.entityTypes.find((t) => t.name === entity.type)?.displayName ?? entity.type)
  );
  const typeList = Array.from(types).slice(0, 3).join(', ');
  const suffix = types.size > 3 ? ` +${types.size - 3} more` : '';
  return `Types: ${typeList}${suffix}`;
}

function getCommonPropertyDefinitions(
  selected: EntityInstance[],
  project: Project | null
): PropertyDefinition[] {
  if (!project || selected.length === 0) return [];

  const typeMap = new Map(project.entityTypes.map((type) => [type.name, type]));
  let common: PropertyDefinition[] | null = null;

  for (const entity of selected) {
    const entityType = typeMap.get(entity.type);
    if (!entityType) {
      return [];
    }

    if (!common) {
      common = [...entityType.properties];
      continue;
    }

    common = common.filter((definition) =>
      entityType.properties.some(
        (candidate) => candidate.name === definition.name && candidate.type === definition.type
      )
    );
  }

  return common ?? [];
}

function buildConstraintHint(definition: PropertyDefinition): string | null {
  const constraints = definition.constraints;
  if (!constraints) return null;

  const parts: string[] = [];
  if (definition.type === 'number') {
    if (constraints.min !== undefined) parts.push(`Min ${constraints.min}`);
    if (constraints.max !== undefined) parts.push(`Max ${constraints.max}`);
  }

  if (definition.type === 'string' || definition.type === 'assetRef') {
    if (constraints.minLength !== undefined) parts.push(`Min length ${constraints.minLength}`);
    if (constraints.maxLength !== undefined) parts.push(`Max length ${constraints.maxLength}`);
    if (constraints.pattern) parts.push('Pattern required');
  }

  if (constraints.assetType) {
    parts.push(`Asset type: ${constraints.assetType}`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

function collectAssetOptions(project: Project | null): string[] {
  if (!project) return [];
  const options: string[] = [];

  for (const category of project.tileCategories) {
    for (const file of category.files) {
      options.push(`${category.path}/${file}`);
    }
  }

  for (const type of project.entityTypes) {
    if (type.sprite) {
      options.push(type.sprite);
    }
  }

  return Array.from(new Set(options));
}

export function createPropertyInspector(config: PropertyInspectorConfig): PropertyInspectorController {
  const { container, getProject, entityManager, history, onClose } = config;
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  const panel = document.createElement('div');
  panel.className = 'property-inspector property-inspector--hidden';

  const header = document.createElement('div');
  header.className = 'property-inspector__header';

  const titleWrap = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'property-inspector__title';
  title.textContent = 'Entity Properties';

  const subtitle = document.createElement('div');
  subtitle.className = 'property-inspector__subtitle';
  subtitle.textContent = '';

  titleWrap.appendChild(title);
  titleWrap.appendChild(subtitle);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'property-inspector__close';
  closeButton.textContent = '✕';
  closeButton.addEventListener('click', () => {
    onClose?.();
  });

  header.appendChild(titleWrap);
  header.appendChild(closeButton);

  const body = document.createElement('div');
  body.className = 'property-inspector__body';

  panel.appendChild(header);
  panel.appendChild(body);
  container.appendChild(panel);

  let selectedIds: string[] = [];

  function show(): void {
    panel.classList.remove('property-inspector--hidden');
  }

  function hide(): void {
    panel.classList.add('property-inspector--hidden');
  }

  function renderEmpty(message: string): void {
    body.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'property-inspector__empty';
    empty.textContent = message;
    body.appendChild(empty);
  }

  function refreshSelection(): void {
    if (selectedIds.length === 0) {
      hide();
      return;
    }

    const selectedEntities = entityManager.getEntities(selectedIds);
    if (selectedEntities.length === 0) {
      hide();
      return;
    }

    const project = getProject();
    title.textContent = formatEntityTitle(selectedEntities, project);
    subtitle.textContent = formatEntitySubtitle(selectedEntities, project);

    const definitions = getCommonPropertyDefinitions(selectedEntities, project);
    if (definitions.length === 0) {
      renderEmpty('No shared properties available for this selection.');
      show();
      return;
    }

    body.innerHTML = '';
    const assetOptions = collectAssetOptions(project);
    const assetListId = `asset-options-${Math.random().toString(36).slice(2, 8)}`;
    let assetList: HTMLDataListElement | null = null;

    if (assetOptions.length > 0) {
      assetList = document.createElement('datalist');
      assetList.id = assetListId;
      for (const option of assetOptions) {
        const opt = document.createElement('option');
        opt.value = option;
        assetList.appendChild(opt);
      }
      body.appendChild(assetList);
    }

    for (const definition of definitions) {
      const row = document.createElement('div');
      row.className = 'property-row';

      const label = document.createElement('label');
      label.className = 'property-label';
      label.textContent = definition.label ?? definition.name;

      const hint = document.createElement('div');
      hint.className = 'property-hint';
      const hintText = buildConstraintHint(definition);
      if (hintText) {
        hint.textContent = hintText;
      } else {
        hint.textContent = '';
      }

      const error = document.createElement('div');
      error.className = 'property-error';
      error.textContent = '';

      const values = selectedEntities.map(
        (entity) => entity.properties[definition.name]
      );
      const firstValue = values[0];
      const mixed = values.some((value) => value !== firstValue);

      const applyChange = (nextValue: string | number | boolean): void => {
        const previousUpdates = selectedEntities.map((entity) => ({
          id: entity.id,
          properties: {
            [definition.name]: entity.properties[definition.name],
          },
        }));

        const nextUpdates = selectedEntities.map((entity) => ({
          id: entity.id,
          properties: {
            [definition.name]: nextValue,
          },
        }));

        entityManager.updateEntityProperties(nextUpdates);

        const description =
          selectedEntities.length > 1
            ? `Edit ${definition.label ?? definition.name}`
            : `Edit ${definition.label ?? definition.name}`;

        const operation: Operation = {
          id: generateOperationId(),
          type: 'entity_property_change',
          description,
          execute: () => {
            entityManager.updateEntityProperties(nextUpdates);
          },
          undo: () => {
            entityManager.updateEntityProperties(previousUpdates);
          },
        };

        history.push(operation);
        refreshSelection();
      };

      const setError = (message: string | null): void => {
        if (message) {
          row.classList.add('property-row--error');
          error.textContent = message;
        } else {
          row.classList.remove('property-row--error');
          error.textContent = '';
        }
      };

      if (definition.type === 'boolean') {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'property-toggle';
        let currentValue: boolean | null = mixed ? null : Boolean(firstValue);

        const updateToggle = (value: boolean | null): void => {
          currentValue = value;
          if (value === null) {
            toggle.textContent = 'Mixed';
            toggle.classList.add('property-toggle--mixed');
            toggle.classList.remove('property-toggle--active');
            return;
          }
          toggle.textContent = value ? 'On' : 'Off';
          toggle.classList.toggle('property-toggle--active', value);
          toggle.classList.remove('property-toggle--mixed');
        };

        updateToggle(currentValue);

        toggle.addEventListener('click', () => {
          const nextValue = currentValue === null ? true : !currentValue;
          if (!validatePropertyValue(nextValue, definition)) {
            setError('Invalid value.');
            return;
          }
          setError(null);
          applyChange(nextValue);
          updateToggle(nextValue);
        });

        row.appendChild(label);
        row.appendChild(toggle);
      } else {
        const input = document.createElement('input');
        input.className = 'property-input';

        if (definition.type === 'number') {
          input.type = 'number';
          input.step = 'any';
        } else {
          input.type = 'text';
        }

        if (mixed) {
          input.value = '';
          input.placeholder = 'Mixed';
          input.classList.add('property-input--mixed');
        } else {
          input.value = firstValue !== undefined ? String(firstValue) : '';
          input.placeholder = '';
        }

        if (definition.type === 'assetRef' && assetList) {
          input.setAttribute('list', assetListId);
        }

        input.addEventListener('change', () => {
          const raw = input.value;
          let parsed: string | number | boolean = raw;

          if (definition.type === 'number') {
            parsed = Number(raw);
            if (raw.trim() === '' || Number.isNaN(parsed)) {
              setError('Enter a valid number.');
              return;
            }
          }

          if (!validatePropertyValue(parsed, definition)) {
            setError('Invalid value.');
            return;
          }

          setError(null);
          applyChange(parsed);
        });

        row.appendChild(label);
        row.appendChild(input);
      }

      if (hintText) {
        row.appendChild(hint);
      }
      row.appendChild(error);
      body.appendChild(row);
    }

    show();
  }

  console.log(`${LOG_PREFIX} Property inspector created`);

  return {
    setSelection(ids: string[]): void {
      selectedIds = [...ids];
      refreshSelection();
    },
    hide,
    show,
    destroy(): void {
      panel.remove();
      styleEl.remove();
    },
  };
}
