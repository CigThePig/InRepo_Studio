import type { EditorState } from '@/storage/hot';
import type { AssetRegistry } from '@/editor/assets';
import type { EntityInstance, Project } from '@/types';
import { validatePropertyValue, type PropertyDefinition } from '@/types/entity';
import type { EntityManager } from '@/editor/entities/entityManager';
import { generateOperationId, type HistoryManager, type Operation } from '@/editor/history';
import { createAssetPalette, type AssetPaletteController } from './assetPalette';
import { createAnimationClock, type AnimationClock } from '@/editor/canvas/animationClock';
import { uxFeedback } from '@/editor/uxFeedback';

const STYLE_ID = 'irs-entities-tab-styles';

const STYLES = `
  .entities-tab {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .entities-tab__section {
    background: var(--irs-surface-panel);
    border: 1px solid var(--irs-border-heavy);
    border-radius: 14px;
    padding: 12px;
    color: var(--irs-text-primary);
  }

  .entities-tab__section-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--irs-text-primary);
    margin-bottom: 8px;
  }

  .entities-tab__palette {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .entities-tab__palette-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .entities-tab__palette-button {
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 2px solid transparent;
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    flex: 1;
  }

  .entities-tab__palette-button:active {
    background: var(--irs-color-blue-alpha-12);
  }

  .entities-tab__palette-button--active {
    border-color: var(--irs-accent-primary);
    background: var(--irs-color-blue-alpha-22);
    color: var(--irs-text-primary);
  }

  .entities-tab__palette-tag {
    font-size: 11px;
    color: var(--irs-text-secondary);
  }

  .entities-tab__place-button {
    min-width: 64px;
    height: 44px;
    padding: 0 12px;
    border-radius: 12px;
    border: none;
    background: var(--irs-color-blue-alpha-12);
    color: var(--irs-text-primary);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .entities-tab__place-button:active {
    background: var(--irs-color-blue-alpha-22);
  }

  .entities-tab__selection-title {
    font-size: 14px;
    font-weight: 700;
  }

  .entities-tab__selection-subtitle {
    font-size: 12px;
    color: var(--irs-text-secondary);
    margin-top: 4px;
  }

  .entities-tab__empty {
    font-size: 12px;
    color: var(--irs-text-muted);
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
    border-bottom: 1px solid var(--irs-border-light);
  }

  .entities-tab__property-row:last-child {
    border-bottom: none;
  }

  .entities-tab__label {
    font-size: 12px;
    font-weight: 600;
    color: var(--irs-text-primary);
  }

  .entities-tab__input,
  .entities-tab__toggle {
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid var(--irs-border-heavy);
    background: var(--irs-surface-modal);
    color: var(--irs-text-primary);
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
    border-color: var(--irs-accent-primary);
    background: var(--irs-color-blue-alpha-22);
    color: var(--irs-text-primary);
  }

  .entities-tab__hint {
    font-size: 11px;
    color: var(--irs-text-muted);
  }

  .entities-tab__error {
    font-size: 11px;
    color: var(--irs-accent-danger);
  }

  .entities-tab__property-row--error .entities-tab__input,
  .entities-tab__property-row--error .entities-tab__toggle {
    border-color: var(--irs-color-red-alpha-53);
  }

  .entities-tab__toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .entities-tab__action-row {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .entities-tab__action-button {
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid var(--irs-border-heavy);
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
    font-size: 13px;
    font-weight: 700;
    padding: 10px 12px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    flex: 1;
  }

  .entities-tab__action-button:active {
    background: var(--irs-color-blue-alpha-22);
  }

  .entities-tab__action-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .entities-tab__anim-preview-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }

  .entities-tab__anim-preview {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    border: 1px solid var(--irs-border-heavy);
    background: var(--irs-surface-input);
    display: block;
    flex-shrink: 0;
  }

  .entities-tab__anim-preview-label {
    font-size: 11px;
    color: var(--irs-text-muted);
  }

  .entities-tab__anim-dropdown {
    position: relative;
    min-height: 44px;
    border-radius: 10px;
    border: 1px solid var(--irs-border-heavy);
    background: var(--irs-surface-modal);
    color: var(--irs-text-primary);
    font-size: 13px;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    user-select: none;
    box-sizing: border-box;
    width: 100%;
  }

  .entities-tab__anim-dropdown:focus-visible {
    outline: 2px solid var(--irs-color-blue);
    outline-offset: 1px;
  }

  .entities-tab__anim-dropdown--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .entities-tab__anim-dropdown-thumb {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    object-fit: cover;
    background: var(--irs-surface-input);
    flex-shrink: 0;
  }

  .entities-tab__anim-dropdown-thumb-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    background: var(--irs-color-blue-alpha-16);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: var(--irs-text-muted);
  }

  .entities-tab__anim-dropdown-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }

  .entities-tab__anim-dropdown-arrow {
    font-size: 10px;
    color: var(--irs-text-muted);
    flex-shrink: 0;
  }

  .entities-tab__anim-dropdown-list {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 1000;
    background: var(--irs-surface-dark);
    border: 1px solid var(--irs-border-heavy);
    border-radius: 10px;
    max-height: 240px;
    overflow-y: auto;
    box-shadow: 0 8px 32px var(--irs-surface-dark-alpha);
  }

  .entities-tab__anim-dropdown-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    min-height: 44px;
    cursor: pointer;
    border-bottom: 1px solid var(--irs-border-light);
    box-sizing: border-box;
  }

  .entities-tab__anim-dropdown-option:last-child {
    border-bottom: none;
  }

  .entities-tab__anim-dropdown-option:hover,
  .entities-tab__anim-dropdown-option--hovered {
    background: var(--irs-color-blue-alpha-12);
  }

  .entities-tab__anim-dropdown-option--selected {
    background: var(--irs-color-blue-alpha-8);
  }

  .entities-tab__hover-preview {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    background: var(--irs-surface-dark);
    border: 1px solid var(--irs-border-heavy);
    border-radius: 8px;
    padding: 4px;
    box-shadow: 0 4px 16px var(--irs-surface-dark-alpha);
    display: none;
  }

  .entities-tab__hover-preview-canvas {
    display: block;
    border-radius: 4px;
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
  onEntityTypePlace?: (typeName: string) => void;
  onEntitySnapChange?: (enabled: boolean) => void;
  onEditAnimation?: (animationId: string) => void;
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

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
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

  ensureStyles();

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

  const placementSection = document.createElement('section');
  placementSection.className = 'entities-tab__section';

  const placementTitle = document.createElement('div');
  placementTitle.className = 'entities-tab__section-title';
  placementTitle.textContent = 'Placement';

  const placementRow = document.createElement('div');
  placementRow.className = 'entities-tab__toggle-row';

  const placementLabel = document.createElement('div');
  placementLabel.className = 'entities-tab__label';
  placementLabel.textContent = 'Snap to Grid';

  const snapToggle = document.createElement('button');
  snapToggle.type = 'button';
  snapToggle.className = 'entities-tab__toggle';
  snapToggle.setAttribute('aria-label', 'Toggle entity grid snap');
  snapToggle.setAttribute('title', 'Toggle entity grid snap');

  placementRow.appendChild(placementLabel);
  placementRow.appendChild(snapToggle);
  placementSection.appendChild(placementTitle);
  placementSection.appendChild(placementRow);

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
  root.appendChild(placementSection);
  root.appendChild(selectionSection);
  root.appendChild(propertiesSection);
  container.appendChild(root);

  let selectedIds: string[] = [];
  let assetList: HTMLDataListElement | null = null;
  const assetListId = `entity-asset-options-${Math.random().toString(36).slice(2, 8)}`;

  // --- Animation Preview (inline canvas) ---

  const inspectorClock: AnimationClock = createAnimationClock();
  const inspectorImageCache = new Map<string, HTMLImageElement>();
  let currentPreviewAnimId: string | null = null;
  let previewRafId = 0;
  let lastPreviewTime = 0;

  const previewCanvas = document.createElement('canvas');
  previewCanvas.className = 'entities-tab__anim-preview';
  previewCanvas.width = 56;
  previewCanvas.height = 56;
  const previewCtx = previewCanvas.getContext('2d')!;

  function loadPreviewImage(sourceAssetId: string, onLoaded: () => void): void {
    if (inspectorImageCache.has(sourceAssetId)) {
      onLoaded();
      return;
    }
    const asset = assetRegistry?.getAsset(sourceAssetId);
    if (!asset) return;
    const img = new Image();
    img.onload = () => {
      inspectorImageCache.set(sourceAssetId, img);
      onLoaded();
    };
    img.src = asset.dataUrl;
  }

  function drawPreviewFrame(): void {
    previewCtx.clearRect(0, 0, 56, 56);
    if (!currentPreviewAnimId) return;
    const snapshot = inspectorClock.getCurrentFrameSnapshot(currentPreviewAnimId);
    if (!snapshot) return;
    const { frame } = snapshot;
    const cached = inspectorImageCache.get(frame.sourceAssetId);
    if (cached) {
      const { rect } = frame;
      previewCtx.drawImage(cached, rect.x, rect.y, rect.w, rect.h, 0, 0, 56, 56);
    } else {
      loadPreviewImage(frame.sourceAssetId, () => drawPreviewFrame());
    }
  }

  function previewRafLoop(timestamp: number): void {
    const delta = lastPreviewTime > 0 ? timestamp - lastPreviewTime : 0;
    lastPreviewTime = timestamp;
    if (currentPreviewAnimId) {
      const dirty = inspectorClock.tick(Math.min(delta, 100));
      if (dirty.has(currentPreviewAnimId)) {
        drawPreviewFrame();
      }
    }
    previewRafId = requestAnimationFrame(previewRafLoop);
  }
  previewRafId = requestAnimationFrame(previewRafLoop);

  function setPreviewAnimation(animationId: string | null): void {
    if (currentPreviewAnimId && currentPreviewAnimId !== animationId) {
      inspectorClock.unregister(currentPreviewAnimId);
    }
    currentPreviewAnimId = animationId;
    if (animationId) {
      const anim = assetRegistry?.getAnimations().find((a) => a.id === animationId) ?? null;
      if (anim) {
        inspectorClock.register(animationId, anim);
      }
    }
    drawPreviewFrame();
  }

  // --- Hover Preview (desktop only) ---

  const hoverClock: AnimationClock = createAnimationClock();
  const hoverImageCache = new Map<string, HTMLImageElement>();
  let currentHoverAnimId: string | null = null;
  let hoverRafId = 0;
  let lastHoverTime = 0;

  const hoverPreviewEl = document.createElement('div');
  hoverPreviewEl.className = 'entities-tab__hover-preview';
  const hoverPreviewCanvas = document.createElement('canvas');
  hoverPreviewCanvas.className = 'entities-tab__hover-preview-canvas';
  hoverPreviewCanvas.width = 80;
  hoverPreviewCanvas.height = 80;
  hoverPreviewCanvas.style.width = '80px';
  hoverPreviewCanvas.style.height = '80px';
  const hoverPreviewCtx = hoverPreviewCanvas.getContext('2d')!;
  hoverPreviewEl.appendChild(hoverPreviewCanvas);
  document.body.appendChild(hoverPreviewEl);

  function loadHoverImage(sourceAssetId: string, onLoaded: () => void): void {
    if (hoverImageCache.has(sourceAssetId)) {
      onLoaded();
      return;
    }
    const asset = assetRegistry?.getAsset(sourceAssetId);
    if (!asset) return;
    const img = new Image();
    img.onload = () => {
      hoverImageCache.set(sourceAssetId, img);
      onLoaded();
    };
    img.src = asset.dataUrl;
  }

  function drawHoverFrame(): void {
    hoverPreviewCtx.clearRect(0, 0, 80, 80);
    if (!currentHoverAnimId) return;
    const snapshot = hoverClock.getCurrentFrameSnapshot(currentHoverAnimId);
    if (!snapshot) return;
    const { frame } = snapshot;
    const cached = hoverImageCache.get(frame.sourceAssetId);
    if (cached) {
      const { rect } = frame;
      hoverPreviewCtx.drawImage(cached, rect.x, rect.y, rect.w, rect.h, 0, 0, 80, 80);
    } else {
      loadHoverImage(frame.sourceAssetId, () => drawHoverFrame());
    }
  }

  function hoverRafLoop(timestamp: number): void {
    const delta = lastHoverTime > 0 ? timestamp - lastHoverTime : 0;
    lastHoverTime = timestamp;
    if (currentHoverAnimId && hoverPreviewEl.style.display !== 'none') {
      const dirty = hoverClock.tick(Math.min(delta, 100));
      if (dirty.has(currentHoverAnimId)) {
        drawHoverFrame();
      }
    }
    hoverRafId = requestAnimationFrame(hoverRafLoop);
  }
  hoverRafId = requestAnimationFrame(hoverRafLoop);

  function showHoverPreview(animationId: string, clientX: number, clientY: number): void {
    const anim = assetRegistry?.getAnimations().find((a) => a.id === animationId) ?? null;
    if (!anim) return;
    if (currentHoverAnimId !== animationId) {
      if (currentHoverAnimId) hoverClock.unregister(currentHoverAnimId);
      currentHoverAnimId = animationId;
      hoverClock.register(animationId, anim);
      drawHoverFrame();
    }
    hoverPreviewEl.style.display = '';
    hoverPreviewEl.style.left = `${clientX + 12}px`;
    hoverPreviewEl.style.top = `${clientY - 48}px`;
  }

  function hideHoverPreview(): void {
    hoverPreviewEl.style.display = 'none';
  }

  // --- Custom Animation Dropdown ---

  interface AnimDropdownOption {
    value: string;
    label: string;
    posterDataUrl?: string;
  }

  function createAnimationDropdown(
    options: AnimDropdownOption[],
    initialValue: string,
    isDisabled: boolean,
    onChange: (value: string) => void,
    enableHoverPreview = false
  ): { el: HTMLElement; getValue: () => string; setValue: (v: string) => void } {
    const wrap = document.createElement('div');
    wrap.style.position = 'relative';

    const trigger = document.createElement('div');
    trigger.className = 'entities-tab__anim-dropdown';
    if (isDisabled) trigger.classList.add('entities-tab__anim-dropdown--disabled');
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    if (!isDisabled) trigger.tabIndex = 0;

    let currentValue = initialValue;
    let closeListFn: (() => void) | null = null;

    function findOption(val: string): AnimDropdownOption | undefined {
      return options.find((o) => o.value === val);
    }

    function updateTrigger(val: string): void {
      trigger.innerHTML = '';
      const selected = findOption(val);
      if (selected?.posterDataUrl) {
        const thumb = document.createElement('img');
        thumb.className = 'entities-tab__anim-dropdown-thumb';
        thumb.src = selected.posterDataUrl;
        thumb.alt = '';
        trigger.appendChild(thumb);
      } else {
        const ph = document.createElement('div');
        ph.className = 'entities-tab__anim-dropdown-thumb-placeholder';
        ph.textContent = '◻';
        trigger.appendChild(ph);
      }
      const nameEl = document.createElement('span');
      nameEl.className = 'entities-tab__anim-dropdown-name';
      nameEl.textContent = selected?.label ?? '';
      trigger.appendChild(nameEl);
      const arrow = document.createElement('span');
      arrow.className = 'entities-tab__anim-dropdown-arrow';
      arrow.textContent = '▼';
      trigger.appendChild(arrow);
    }

    updateTrigger(currentValue);

    function closeList(): void {
      closeListFn?.();
    }

    function openList(): void {
      if (closeListFn || isDisabled) return;

      const listEl = document.createElement('div');
      listEl.className = 'entities-tab__anim-dropdown-list';
      listEl.setAttribute('role', 'listbox');

      for (const opt of options) {
        const optEl = document.createElement('div');
        optEl.className = 'entities-tab__anim-dropdown-option';
        optEl.setAttribute('role', 'option');
        optEl.setAttribute('aria-selected', opt.value === currentValue ? 'true' : 'false');
        if (opt.value === currentValue) {
          optEl.classList.add('entities-tab__anim-dropdown-option--selected');
        }
        if (opt.posterDataUrl) {
          const thumb = document.createElement('img');
          thumb.className = 'entities-tab__anim-dropdown-thumb';
          thumb.src = opt.posterDataUrl;
          thumb.alt = '';
          optEl.appendChild(thumb);
        } else {
          const ph = document.createElement('div');
          ph.className = 'entities-tab__anim-dropdown-thumb-placeholder';
          ph.textContent = '◻';
          optEl.appendChild(ph);
        }
        const nameEl = document.createElement('span');
        nameEl.className = 'entities-tab__anim-dropdown-name';
        nameEl.textContent = opt.label;
        optEl.appendChild(nameEl);

        if (enableHoverPreview && opt.value) {
          optEl.addEventListener('mouseenter', (e) => {
            showHoverPreview(opt.value, e.clientX, e.clientY);
          });
          optEl.addEventListener('mousemove', (e) => {
            if (hoverPreviewEl.style.display !== 'none') {
              hoverPreviewEl.style.left = `${e.clientX + 12}px`;
              hoverPreviewEl.style.top = `${e.clientY - 48}px`;
            }
          });
          optEl.addEventListener('mouseleave', () => hideHoverPreview());
        }

        optEl.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          hideHoverPreview();
          const newVal = opt.value;
          currentValue = newVal;
          updateTrigger(newVal);
          closeList();
          onChange(newVal);
        });

        listEl.appendChild(optEl);
      }

      trigger.setAttribute('aria-expanded', 'true');
      wrap.appendChild(listEl);

      const handleDocPointer = (e: PointerEvent): void => {
        if (!wrap.contains(e.target as Node)) {
          closeList();
        }
      };
      document.addEventListener('pointerdown', handleDocPointer, { capture: true });

      closeListFn = (): void => {
        document.removeEventListener('pointerdown', handleDocPointer, { capture: true });
        listEl.remove();
        trigger.setAttribute('aria-expanded', 'false');
        closeListFn = null;
      };
    }

    trigger.addEventListener('click', () => {
      if (closeListFn) closeList();
      else openList();
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (closeListFn) closeList();
        else openList();
      } else if (e.key === 'Escape') {
        closeList();
      }
    });

    wrap.appendChild(trigger);

    return {
      el: wrap,
      getValue: () => currentValue,
      setValue: (v: string) => {
        currentValue = v;
        updateTrigger(v);
      },
    };
  }

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
      const row = document.createElement('div');
      row.className = 'entities-tab__palette-row';

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
        uxFeedback.selection.mark(button);
      });

      const placeButton = document.createElement('button');
      placeButton.type = 'button';
      placeButton.className = 'entities-tab__place-button';
      placeButton.textContent = 'Place';
      placeButton.addEventListener('click', () => {
        uxFeedback.motion.pulse(placeButton);
        setSelectedEntityType(entityType.name);
        config.onEntityTypePlace?.(entityType.name);
      });

      row.appendChild(button);
      row.appendChild(placeButton);
      paletteList.appendChild(row);
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
      uxFeedback.emptyState.render(propertiesBody, {
        message: 'No entities placed.',
        actionLabel: 'Select from palette',
        onAction: () => paletteSection.scrollIntoView({ behavior: 'smooth' }),
      });
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

    renderAssetOptions(project);
    propertiesBody.innerHTML = '';

    const typeRow = document.createElement('div');
    typeRow.className = 'entities-tab__property-row';

    const typeLabel = document.createElement('label');
    typeLabel.className = 'entities-tab__label';
    typeLabel.textContent = 'Entity Type';

    const typeSelect = document.createElement('select');
    typeSelect.className = 'entities-tab__input';

    const entityTypes = project?.entityTypes ?? [];
    for (const candidate of entityTypes) {
      const option = document.createElement('option');
      option.value = candidate.name;
      option.textContent = `${getEntityTypeLabel(candidate)} (${candidate.name})`;
      typeSelect.appendChild(option);
    }
    typeSelect.value = entity.type;

    const typeActionRow = document.createElement('div');
    typeActionRow.className = 'entities-tab__action-row';

    const applyTypeButton = document.createElement('button');
    applyTypeButton.type = 'button';
    applyTypeButton.className = 'entities-tab__action-button';
    applyTypeButton.textContent = 'Apply Type';

    typeActionRow.appendChild(applyTypeButton);
    typeRow.appendChild(typeLabel);
    typeRow.appendChild(typeSelect);
    typeRow.appendChild(typeActionRow);
    propertiesBody.appendChild(typeRow);

    const applyEntityTypeChange = (): void => {
      const nextType = typeSelect.value;
      if (!nextType || nextType === entity.type) return;

      const previousType = entity.type;
      entityManager.changeEntityType(entity.id, nextType);

      const operation: Operation = {
        id: generateOperationId(),
        type: 'entity_property_change',
        description: `Change entity type to ${nextType}`,
        execute: () => {
          entityManager.changeEntityType(entity.id, nextType);
        },
        undo: () => {
          entityManager.changeEntityType(entity.id, previousType);
        },
      };

      history.push(operation);
      renderSelection();
    };

    applyTypeButton.addEventListener('click', applyEntityTypeChange);

    const canApplyType = typeSelect.value !== entity.type;
    applyTypeButton.disabled = !canApplyType;

    typeSelect.addEventListener('change', () => {
      applyTypeButton.disabled = typeSelect.value === entity.type;
    });

    const animationRow = document.createElement('div');
    animationRow.className = 'entities-tab__property-row';

    const animationLabel = document.createElement('label');
    animationLabel.className = 'entities-tab__label';
    animationLabel.textContent = 'Animation';

    const animations = assetRegistry?.getAnimations() ?? [];
    const animationSets = assetRegistry?.getAnimationSets() ?? [];
    const stateMachines = assetRegistry?.getAnimStateMachines() ?? [];

    const currentAnimationSetId = String(entity.properties?.animationSetId ?? '');
    const currentAnimationId = String(entity.properties?.animationId ?? '');
    const currentStateMachineId = String(entity.properties?.animStateMachineId ?? '');

    // Validate IDs exist in the registry
    const resolvedAnimSetId = animationSets.some((s) => s.id === currentAnimationSetId) ? currentAnimationSetId : '';
    const resolvedAnimId = animations.some((a) => a.id === currentAnimationId) ? currentAnimationId : '';
    const resolvedSmId = stateMachines.some((s) => s.id === currentStateMachineId) ? currentStateMachineId : '';

    // State machine — plain select
    const stateMachineSelect = document.createElement('select');
    stateMachineSelect.className = 'entities-tab__input';
    const noSmOption = document.createElement('option');
    noSmOption.value = '';
    noSmOption.textContent = 'State Machine: None';
    stateMachineSelect.appendChild(noSmOption);
    for (const sm of stateMachines) {
      const option = document.createElement('option');
      option.value = sm.id;
      option.textContent = `${sm.name} (${sm.id})`;
      stateMachineSelect.appendChild(option);
    }
    stateMachineSelect.value = resolvedSmId;
    stateMachineSelect.disabled = !assetRegistry;

    // Animation Set — custom dropdown (sets have no posterDataUrl)
    const animSetOptions: AnimDropdownOption[] = [
      { value: '', label: 'Animation Set: None' },
      ...animationSets.map((s) => ({ value: s.id, label: `${s.name}` })),
    ];
    const animSetDropdown = createAnimationDropdown(
      animSetOptions,
      resolvedAnimSetId,
      !assetRegistry,
      (newVal) => {
        setPreviewAnimation(newVal ? null : animDropdown.getValue() || null);
        applyAnimationChange(animDropdown.getValue(), newVal, stateMachineSelect.value);
      },
      false
    );

    // Animation Clip — custom dropdown with poster thumbnails + hover preview
    const animOptions: AnimDropdownOption[] = [
      { value: '', label: 'Animation Clip: None' },
      ...animations.map((a) => ({ value: a.id, label: a.name, posterDataUrl: a.posterDataUrl })),
    ];
    const animDropdown = createAnimationDropdown(
      animOptions,
      resolvedAnimId,
      !assetRegistry,
      (newVal) => {
        setPreviewAnimation(newVal || null);
        applyAnimationChange(newVal, animSetDropdown.getValue(), stateMachineSelect.value);
      },
      true
    );

    const animationHint = document.createElement('div');
    animationHint.className = 'entities-tab__hint';
    animationHint.textContent = assetRegistry
      ? animationSets.length > 0 || animations.length > 0 || stateMachines.length > 0
        ? 'State machines override sets. Sets override single clips.'
        : 'No saved animations, sets, or state machines yet. Create them in the Animation tab.'
      : 'Animation assignment is unavailable without the asset registry.';

    const animationActionRow = document.createElement('div');
    animationActionRow.className = 'entities-tab__action-row';

    const editAnimationButton = document.createElement('button');
    editAnimationButton.type = 'button';
    editAnimationButton.className = 'entities-tab__action-button';
    editAnimationButton.textContent = '▶ Edit Anim';
    editAnimationButton.disabled = !resolvedAnimId;

    editAnimationButton.addEventListener('click', () => {
      const animationId = animDropdown.getValue();
      if (!animationId) return;
      config.onEditAnimation?.(animationId);
    });

    const applyAnimationChange = (
      nextAnimationId: string,
      nextAnimationSetId: string,
      nextStateMachineId: string
    ): void => {
      const previousAnimationIdRaw = entity.properties?.animationId;
      const previousAnimationSetIdRaw = entity.properties?.animationSetId;
      const previousStateMachineIdRaw = entity.properties?.animStateMachineId;
      const previousAnimationId =
        typeof previousAnimationIdRaw === 'string' ? previousAnimationIdRaw : undefined;
      const previousAnimationSetId =
        typeof previousAnimationSetIdRaw === 'string' ? previousAnimationSetIdRaw : undefined;
      const previousStateMachineId =
        typeof previousStateMachineIdRaw === 'string' ? previousStateMachineIdRaw : undefined;
      if (
        previousAnimationId === (nextAnimationId || undefined)
        && previousAnimationSetId === (nextAnimationSetId || undefined)
        && previousStateMachineId === (nextStateMachineId || undefined)
      ) {
        editAnimationButton.disabled = !nextAnimationId;
        return;
      }

      const previousStateRaw = entity.properties?.animationState;
      const previousAnimationState =
        typeof previousStateRaw === 'string' ? previousStateRaw : undefined;
      const nextAnimationState = (nextAnimationId || nextAnimationSetId || nextStateMachineId)
        ? previousAnimationState ?? 'idle'
        : undefined;

      const nextUpdates = {
        id: entity.id,
        properties: {
          animationId: nextAnimationId || undefined,
          animationSetId: nextAnimationSetId || undefined,
          animStateMachineId: nextStateMachineId || undefined,
          animationState: nextAnimationState,
        },
      };

      const previousUpdates = {
        id: entity.id,
        properties: {
          animationId: previousAnimationId,
          animationSetId: previousAnimationSetId,
          animStateMachineId: previousStateMachineId,
          animationState: previousAnimationState,
        },
      };

      entityManager.updateEntityProperties([nextUpdates]);

      const operation: Operation = {
        id: generateOperationId(),
        type: 'entity_property_change',
        description: nextStateMachineId
          ? 'Assign entity state machine'
          : nextAnimationSetId
            ? 'Assign entity animation set'
            : nextAnimationId
              ? 'Assign entity animation'
              : 'Clear entity animation',
        execute: () => {
          entityManager.updateEntityProperties([nextUpdates]);
        },
        undo: () => {
          entityManager.updateEntityProperties([previousUpdates]);
        },
      };

      history.push(operation);
      editAnimationButton.disabled = !nextAnimationId;
    };

    stateMachineSelect.addEventListener('change', () => {
      applyAnimationChange(
        animDropdown.getValue(),
        animSetDropdown.getValue(),
        stateMachineSelect.value
      );
    });

    animationActionRow.appendChild(editAnimationButton);
    animationRow.appendChild(animationLabel);
    animationRow.appendChild(stateMachineSelect);
    animationRow.appendChild(animSetDropdown.el);
    animationRow.appendChild(animDropdown.el);
    animationRow.appendChild(animationHint);
    animationRow.appendChild(animationActionRow);
    propertiesBody.appendChild(animationRow);

    // Inline animation preview canvas
    setPreviewAnimation(resolvedAnimId || null);
    const previewWrap = document.createElement('div');
    previewWrap.className = 'entities-tab__anim-preview-wrap';
    previewWrap.style.display = resolvedAnimId ? '' : 'none';
    previewWrap.appendChild(previewCanvas);
    const previewLabel = document.createElement('div');
    previewLabel.className = 'entities-tab__anim-preview-label';
    previewLabel.textContent = resolvedAnimId
      ? (animations.find((a) => a.id === resolvedAnimId)?.name ?? 'Preview')
      : '';
    previewWrap.appendChild(previewLabel);
    propertiesBody.appendChild(previewWrap);

    // Keep preview in sync when dropdown changes
    animDropdown.el.addEventListener('pointerdown', () => {
      // preview updated immediately in onChange
    });

    const definitions = entityType.properties ?? [];
    if (definitions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'entities-tab__empty';
      empty.textContent = 'No editable type-specific properties for this entity.';
      propertiesBody.appendChild(empty);
      return;
    }

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
          const nextValue = !entity.properties?.[definition.name];
          if (!validatePropertyValue(nextValue, definition)) {
            setError('Invalid value.');
            return;
          }
          setError(null);
          uxFeedback.motion.pulse(toggle);
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
          uxFeedback.motion.pulse(input);
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

  function updateSnapToggle(nextValue?: boolean): void {
    const editorState = getEditorState();
    const isEnabled = nextValue ?? editorState?.entitySnapToGrid ?? true;
    snapToggle.textContent = isEnabled ? 'On' : 'Off';
    snapToggle.classList.toggle('entities-tab__toggle--active', isEnabled);
  }

  snapToggle.addEventListener('click', () => {
    const editorState = getEditorState();
    const nextValue = !(editorState?.entitySnapToGrid ?? true);
    if (config.onEntitySnapChange) {
      config.onEntitySnapChange(nextValue);
    } else if (editorState) {
      editorState.entitySnapToGrid = nextValue;
    }
    updateSnapToggle(nextValue);
  });

  function refresh(): void {
    renderPalette();
    renderSelection();
    updateSnapToggle();
  }

  refresh();

  return {
    setSelection(nextIds: string[]): void {
      selectedIds = [...nextIds];
      renderSelection();
      if (nextIds.length > 0) {
        uxFeedback.selection.mark(selectionSection);
      } else {
        uxFeedback.selection.clear();
      }
    },
    refresh,
    destroy(): void {
      cancelAnimationFrame(previewRafId);
      cancelAnimationFrame(hoverRafId);
      inspectorClock.destroy();
      hoverClock.destroy();
      hoverPreviewEl.remove();
      assetPaletteController?.destroy();
      root.remove();
      assetList?.remove();
    },
  };
}
