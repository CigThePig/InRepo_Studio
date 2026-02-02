import type { EditorState } from '@/storage/hot';
import type { AssetRegistry } from '@/editor/assets';
import type { EntityInstance, Project } from '@/types';
import { validatePropertyValue, type PropertyDefinition } from '@/types/entity';
import type { EntityManager } from '@/editor/entities/entityManager';
import { generateOperationId, type HistoryManager, type Operation } from '@/editor/history';
import { createAssetPalette, type AssetPaletteController } from './assetPalette';

const STYLES = `
  .entities-tab {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .entities-tab__section {
    background: rgba(20, 30, 60, 0.85);
    border: 1px solid #253461;
    border-radius: 14px;
    padding: 12px;
    color: #e6ecff;
  }

  .entities-tab__section-title {
    font-size: 13px;
    font-weight: 700;
    color: #dbe4ff;
    margin-bottom: 8px;
  }

  .entities-tab__palette {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .entities-tab__palette-button {
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 2px solid transparent;
    background: #1b2a52;
    color: #dbe4ff;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .entities-tab__palette-button:active {
    background: #26386a;
  }

  .entities-tab__palette-button--active {
    border-color: #4a9eff;
    background: #2a3e74;
    color: #ffffff;
  }

  .entities-tab__palette-tag {
    font-size: 11px;
    color: #9fb2e3;
  }

  .entities-tab__selection-title {
    font-size: 14px;
    font-weight: 700;
  }

  .entities-tab__selection-subtitle {
    font-size: 12px;
    color: #9aa7d6;
    margin-top: 4px;
  }

  .entities-tab__empty {
    font-size: 12px;
    color: #8c94c9;
    padding: 6px 0;
  }

  .entities-tab__property-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .entities-tab__property-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(62, 84, 148, 0.25);
  }

  .entities-tab__property-row:last-child {
    border-bottom: none;
  }

  .entities-tab__label {
    font-size: 12px;
    font-weight: 600;
    color: #dbe4ff;
  }

  .entities-tab__input,
  .entities-tab__toggle {
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(22, 30, 60, 0.85);
    color: #f2f5ff;
    padding: 8px 12px;
    font-size: 13px;
  }

  .entities-tab__toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .entities-tab__toggle--active {
    border-color: #4a9eff;
    background: rgba(74, 158, 255, 0.2);
    color: #ffffff;
  }

  .entities-tab__hint {
    font-size: 11px;
    color: #8f98c8;
  }

  .entities-tab__error {
    font-size: 11px;
    color: #ff9fb3;
  }

  .entities-tab__property-row--error .entities-tab__input,
  .entities-tab__property-row--error .entities-tab__toggle {
    border-color: rgba(255, 124, 152, 0.8);
  }
`;

export interface EntitiesTabConfig {
  container: HTMLElement;
  getProject: () => Project | null;
  getEditorState: () => EditorState | null;
  entityManager: EntityManager;
  history: HistoryManager;
  assetRegistry?: AssetRegistry;
  onEntityTypeSelect?: (typeName: string | null) => void;
}

export interface EntitiesTabController {
  setSelection(selectedIds: string[]): void;
  refresh(): void;
  destroy(): void;
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

  for (const category of project.tileCategories ?? []) {
    for (const file of category.files ?? []) {
      options.push(`${category.path}/${file}`);
    }
  }

  for (const type of project.entityTypes ?? []) {
    if (type.sprite) {
      options.push(type.sprite);
    }
  }

  return Array.from(new Set(options));
}

function getEntityTypeLabel(entityType: Project['entityTypes'][number] | undefined): string {
  if (!entityType) return 'Unknown';
  return entityType.displayName ?? entityType.name;
}

export function createEntitiesTab(config: EntitiesTabConfig): EntitiesTabController {
  const {
    container,
    getProject,
    getEditorState,
    entityManager,
    history,
    assetRegistry,
    onEntityTypeSelect,
  } = config;

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  const root = document.createElement('div');
  root.className = 'entities-tab';

  const paletteSection = document.createElement('section');
  paletteSection.className = 'entities-tab__section';

  const paletteTitle = document.createElement('div');
  paletteTitle.className = 'entities-tab__section-title';
  paletteTitle.textContent = 'Entity Palette';

  const paletteList = document.createElement('div');
  paletteList.className = 'entities-tab__palette';

  paletteSection.appendChild(paletteTitle);
  paletteSection.appendChild(paletteList);

  let assetPaletteController: AssetPaletteController | null = null;
  const assetPaletteContainer = document.createElement('div');
  if (assetRegistry) {
    assetPaletteController = createAssetPalette({
      container: assetPaletteContainer,
      assetRegistry,
      groupType: 'entities',
      title: 'Entity Asset Groups',
    });
  }

  const selectionSection = document.createElement('section');
  selectionSection.className = 'entities-tab__section';

  const selectionTitle = document.createElement('div');
  selectionTitle.className = 'entities-tab__selection-title';

  const selectionSubtitle = document.createElement('div');
  selectionSubtitle.className = 'entities-tab__selection-subtitle';

  selectionSection.appendChild(selectionTitle);
  selectionSection.appendChild(selectionSubtitle);

  const propertiesSection = document.createElement('section');
  propertiesSection.className = 'entities-tab__section';

  const propertiesTitle = document.createElement('div');
  propertiesTitle.className = 'entities-tab__section-title';
  propertiesTitle.textContent = 'Properties';

  const propertiesBody = document.createElement('div');
  propertiesBody.className = 'entities-tab__property-list';

  propertiesSection.appendChild(propertiesTitle);
  propertiesSection.appendChild(propertiesBody);

  root.appendChild(paletteSection);
  if (assetRegistry) {
    root.appendChild(assetPaletteContainer);
  }
  root.appendChild(selectionSection);
  root.appendChild(propertiesSection);
  container.appendChild(root);

  let selectedIds: string[] = [];
  let assetList: HTMLDataListElement | null = null;
  const assetListId = `entity-asset-options-${Math.random().toString(36).slice(2, 8)}`;

  function renderAssetOptions(project: Project | null): void {
    const options = collectAssetOptions(project);
    if (options.length === 0) {
      assetList?.remove();
      assetList = null;
      return;
    }

    if (!assetList) {
      assetList = document.createElement('datalist');
      assetList.id = assetListId;
      root.appendChild(assetList);
    }

    assetList.innerHTML = '';
    for (const option of options) {
      const opt = document.createElement('option');
      opt.value = option;
      assetList.appendChild(opt);
    }
  }

  function setSelectedEntityType(nextType: string | null): void {
    if (onEntityTypeSelect) {
      onEntityTypeSelect(nextType);
    } else {
      const editorState = getEditorState();
      if (editorState) {
        editorState.selectedEntityType = nextType;
      }
    }
    renderPalette();
  }

  function renderPalette(): void {
    const project = getProject();
    const editorState = getEditorState();
    const selectedType = editorState?.selectedEntityType ?? null;
    paletteList.innerHTML = '';

    if (!project || project.entityTypes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'entities-tab__empty';
      empty.textContent = 'No entity types defined yet.';
      paletteList.appendChild(empty);
      return;
    }

    for (const entityType of project.entityTypes) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'entities-tab__palette-button';
      button.textContent = entityType.displayName ?? entityType.name;
      button.classList.toggle('entities-tab__palette-button--active', entityType.name === selectedType);

      const tag = document.createElement('span');
      tag.className = 'entities-tab__palette-tag';
      tag.textContent = entityType.name;
      button.appendChild(tag);

      button.addEventListener('click', () => {
        setSelectedEntityType(entityType.name);
      });

      paletteList.appendChild(button);
    }
  }

  function renderEmptyProperties(message: string): void {
    propertiesBody.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'entities-tab__empty';
    empty.textContent = message;
    propertiesBody.appendChild(empty);
  }

  function renderSelectionSummary(entities: EntityInstance[]): void {
    if (entities.length === 0) {
      selectionTitle.textContent = 'No entity selected';
      selectionSubtitle.textContent = 'Tap an entity to view details.';
      return;
    }

    if (entities.length > 1) {
      selectionTitle.textContent = `${entities.length} entities selected`;
      selectionSubtitle.textContent = 'Multi-select editing coming soon.';
      return;
    }

    const project = getProject();
    const entity = entities[0];
    const entityType = project?.entityTypes.find((type) => type.name === entity.type);
    selectionTitle.textContent = getEntityTypeLabel(entityType);
    selectionSubtitle.textContent = `ID: ${entity.id}`;
  }

  function applyPropertyChange(
    entity: EntityInstance,
    definition: PropertyDefinition,
    nextValue: string | number | boolean
  ): void {
    const previousValue = entity.properties?.[definition.name];
    if (previousValue === nextValue) return;

    const previousUpdates = [
      {
        id: entity.id,
        properties: {
          [definition.name]: previousValue,
        },
      },
    ];

    const nextUpdates = [
      {
        id: entity.id,
        properties: {
          [definition.name]: nextValue,
        },
      },
    ];

    entityManager.updateEntityProperties(nextUpdates);

    const operation: Operation = {
      id: generateOperationId(),
      type: 'entity_property_change',
      description: `Edit ${definition.label ?? definition.name}`,
      execute: () => {
        entityManager.updateEntityProperties(nextUpdates);
      },
      undo: () => {
        entityManager.updateEntityProperties(previousUpdates);
      },
    };

    history.push(operation);
  }

  function renderProperties(entities: EntityInstance[]): void {
    const project = getProject();
    if (entities.length === 0) {
      renderEmptyProperties('Select an entity to edit its properties.');
      return;
    }

    if (entities.length > 1) {
      renderEmptyProperties('Multi-select editing is not available yet.');
      return;
    }

    const entity = entities[0];
    const entityType = project?.entityTypes.find((type) => type.name === entity.type);
    if (!entityType) {
      renderEmptyProperties('Entity type not found.');
      return;
    }

    const definitions = entityType.properties ?? [];
    if (definitions.length === 0) {
      renderEmptyProperties('No editable properties for this entity.');
      return;
    }

    renderAssetOptions(project);
    propertiesBody.innerHTML = '';

    for (const definition of definitions) {
      const row = document.createElement('div');
      row.className = 'entities-tab__property-row';

      const label = document.createElement('label');
      label.className = 'entities-tab__label';
      label.textContent = definition.label ?? definition.name;

      const hint = document.createElement('div');
      hint.className = 'entities-tab__hint';
      const hintText = buildConstraintHint(definition);
      if (hintText) {
        hint.textContent = hintText;
      } else {
        hint.textContent = '';
      }

      const error = document.createElement('div');
      error.className = 'entities-tab__error';
      error.textContent = '';

      const setError = (message: string | null): void => {
        if (message) {
          row.classList.add('entities-tab__property-row--error');
          error.textContent = message;
        } else {
          row.classList.remove('entities-tab__property-row--error');
          error.textContent = '';
        }
      };

      if (definition.type === 'boolean') {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'entities-tab__toggle';

        const updateToggle = (value: boolean): void => {
          toggle.textContent = value ? 'On' : 'Off';
          toggle.classList.toggle('entities-tab__toggle--active', value);
        };

        const currentValue = Boolean(entity.properties?.[definition.name] ?? definition.default);
        updateToggle(currentValue);

        toggle.addEventListener('click', () => {
          const nextValue = !Boolean(entity.properties?.[definition.name]);
          if (!validatePropertyValue(nextValue, definition)) {
            setError('Invalid value.');
            return;
          }
          setError(null);
          applyPropertyChange(entity, definition, nextValue);
          updateToggle(nextValue);
        });

        row.appendChild(label);
        row.appendChild(toggle);
      } else {
        const input = document.createElement('input');
        input.className = 'entities-tab__input';
        input.type = definition.type === 'number' ? 'number' : 'text';
        if (definition.type === 'number') {
          input.step = 'any';
        }

        const value = entity.properties?.[definition.name] ?? definition.default;
        input.value = value !== undefined ? String(value) : '';

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
          applyPropertyChange(entity, definition, parsed);
        });

        row.appendChild(label);
        row.appendChild(input);
      }

      if (hintText) {
        row.appendChild(hint);
      }
      row.appendChild(error);
      propertiesBody.appendChild(row);
    }
  }

  function renderSelection(): void {
    const entities = selectedIds.length > 0 ? entityManager.getEntities(selectedIds) : [];
    renderSelectionSummary(entities);
    renderProperties(entities);
  }

  function refresh(): void {
    renderPalette();
    renderSelection();
  }

  refresh();

  return {
    setSelection(nextIds: string[]): void {
      selectedIds = [...nextIds];
      renderSelection();
    },
    refresh,
    destroy(): void {
      assetPaletteController?.destroy();
      root.remove();
      styleEl.remove();
      assetList?.remove();
    },
  };
}
