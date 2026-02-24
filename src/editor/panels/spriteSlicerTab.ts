import {
  computeNonEmptyTileMask,
  sliceImage,
  sliceImageRegions,
  type AssetGroupType,
  type SliceResult,
} from '@/editor/assets';
import { uxFeedback } from '@/editor/uxFeedback';

export type SliceMode = 'separate' | 'atlas';

export interface AtlasSliceEntry {
  name: string;
  rect: { x: number; y: number; w: number; h: number };
}

interface CustomRegion {
  id: string;
  name: string;
  rect: { x: number; y: number; w: number; h: number };
}

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface RegionSnapshot {
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
}

interface HandleRect {
  id: HandleId;
  rect: { x: number; y: number; w: number; h: number };
}

interface InteractionState {
  kind: 'none' | 'dragNew' | 'move' | 'handle';
  pointerId: number | null;
  startPointerPx: { x: number; y: number } | null;
  startTile: { col: number; row: number } | null;
  startRegion: RegionSnapshot | null;
  active: boolean;
  handle: HandleId | null;
}

const STYLES = `
  .irs-sprite-slicer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: var(--irs-text-primary);
  }

  .irs-sprite-slicer__section {
    background: var(--irs-surface-dark-alpha);
    border: 1px solid var(--irs-border-heavy);
    border-radius: var(--irs-radius-xl);
    padding: 12px;
  }

  .irs-sprite-slicer__title {
    font-size: 13px;
    font-weight: 700;
    color: var(--irs-text-primary);
    margin-bottom: 8px;
  }

  .irs-sprite-slicer__button {
    min-height: var(--irs-touch-target);
    padding: 8px 12px;
    border-radius: var(--irs-radius-lg);
    border: 2px solid transparent;
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .irs-sprite-slicer__button:active {
    background: var(--irs-accent-primary-active);
  }

  .irs-sprite-slicer__button--primary {
    background: var(--irs-color-blue-alpha-22);
    color: var(--irs-text-primary);
  }

  .irs-sprite-slicer__button--primary:active {
    background: var(--irs-accent-primary-active);
  }

  .irs-sprite-slicer__button--active {
    background: var(--irs-accent-primary-active);
    border-color: var(--irs-color-blue-border);
  }

  .irs-sprite-slicer__row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .irs-sprite-slicer__select,
  .irs-sprite-slicer__input {
    min-height: var(--irs-touch-target);
    padding: 6px 10px;
    border-radius: var(--irs-radius-md);
    border: 1px solid var(--irs-border-medium);
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
    font-size: 13px;
  }

  .irs-sprite-slicer__hint {
    font-size: 12px;
    color: var(--irs-text-secondary);
  }

  .irs-sprite-slicer__preview {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .irs-sprite-slicer__canvas {
    width: 100%;
    border-radius: var(--irs-radius-lg);
    border: 1px solid var(--irs-border-medium);
    background: var(--irs-surface-base);
    touch-action: none;
  }

  .irs-sprite-slicer__meta {
    font-size: 12px;
    color: var(--irs-text-secondary);
  }

  .irs-sprite-slicer__slice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 8px;
  }

  .irs-sprite-slicer__slice {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--irs-radius-md);
    border: 1px solid var(--irs-border-medium);
    background: var(--irs-surface-panel);
    object-fit: cover;
  }

  .irs-sprite-slicer__mode-toggle {
    display: flex;
    gap: 0;
    border-radius: var(--irs-radius-md);
    overflow: hidden;
    border: 1px solid var(--irs-border-medium);
  }

  .irs-sprite-slicer__mode-option {
    flex: 1;
    min-height: var(--irs-touch-target);
    padding: 6px 10px;
    border: none;
    background: var(--irs-surface-panel);
    color: var(--irs-text-secondary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .irs-sprite-slicer__mode-option--active {
    background: var(--irs-color-blue-alpha-22);
    color: var(--irs-text-primary);
  }

  .irs-sprite-slicer__mode-option:not(:last-child) {
    border-right: 1px solid var(--irs-border-medium);
  }

  .irs-sprite-slicer__regions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .irs-sprite-slicer__region-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--irs-text-primary);
  }

  .irs-sprite-slicer__region-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .irs-sprite-slicer__region-name {
    min-height: var(--irs-touch-target);
    border: none;
    background: transparent;
    color: var(--irs-text-primary);
    font-size: 12px;
    font-weight: 600;
    text-align: left;
    padding: 4px 0;
    cursor: pointer;
  }

  .irs-sprite-slicer__region-name-input {
    min-height: var(--irs-touch-target);
    max-width: 180px;
    padding: 4px 8px;
    border-radius: var(--irs-radius-sm);
    border: 1px solid var(--irs-border-medium);
    background: var(--irs-surface-dark);
    color: var(--irs-text-primary);
    font-size: 12px;
  }

  .irs-sprite-slicer__region-size {
    color: var(--irs-text-secondary);
    font-size: 11px;
    white-space: nowrap;
  }

  .irs-sprite-slicer__region-remove {
    min-height: var(--irs-touch-target);
    padding: 4px 8px;
    border-radius: var(--irs-radius-sm);
    border: 1px solid var(--irs-border-medium);
    background: var(--irs-surface-panel);
    color: var(--irs-text-primary);
    cursor: pointer;
  }

  .irs-sprite-slicer__region-item--active {
    border-radius: var(--irs-radius-md);
    padding: 4px 6px;
    background: var(--irs-color-blue-alpha-22);
    border: 1px solid var(--irs-color-blue-border);
  }

  .irs-sprite-slicer__selection-controls {
    display: none;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--irs-border-medium);
    border-radius: var(--irs-radius-lg);
    background: var(--irs-surface-dark);
  }

  .irs-sprite-slicer__selection-controls--visible {
    display: flex;
  }

  .irs-sprite-slicer__selection-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .irs-sprite-slicer__selection-label {
    font-size: 11px;
    color: var(--irs-text-secondary);
    margin-bottom: 4px;
  }

  .irs-sprite-slicer__dpad {
    display: grid;
    grid-template-columns: repeat(3, minmax(44px, 1fr));
    gap: 6px;
    max-width: 190px;
  }

  .irs-sprite-slicer__dpad button:nth-child(1) {
    grid-column: 2;
  }

  .irs-sprite-slicer__dpad button:nth-child(2) {
    grid-column: 1;
  }

  .irs-sprite-slicer__dpad button:nth-child(3) {
    grid-column: 3;
  }

  .irs-sprite-slicer__dpad button:nth-child(4) {
    grid-column: 2;
  }

  .irs-sprite-slicer__selection-actions {
    display: flex;
    gap: 8px;
  }

  .irs-sprite-slicer__selection-actions .irs-sprite-slicer__button {
    flex: 1;
  }
`;

export interface SpriteSlicerTabConfig {
  container: HTMLElement;
  onSlicesConfirmed?: (payload: {
    slices: SliceResult[];
    groupName: string;
    groupType: AssetGroupType;
    imageName: string | null;
    sliceSize: { width: number; height: number };
  }) => void;
  onAtlasConfirmed?: (payload: {
    imageDataUrl: string;
    imageWidth: number;
    imageHeight: number;
    slices: AtlasSliceEntry[];
    groupName: string;
    groupType: AssetGroupType;
    imageName: string | null;
    sliceSize: { width: number; height: number };
  }) => void;
}

type SlicePreset = '16' | '32' | 'custom';

interface SpriteSlicerState {
  imageBlob: Blob | null;
  imageUrl: string | null;
  imageName: string | null;
  imageWidth: number;
  imageHeight: number;
  groupName: string;
  groupType: AssetGroupType;
  slicePreset: SlicePreset;
  sliceWidth: number;
  sliceHeight: number;
  slices: SliceResult[];
  sliceMode: SliceMode;
  skipEmptyTiles: boolean;
  customRegions: CustomRegion[];
  selectionMode: 'tile' | 'region';
  pendingRegion: null | { startCol: number; startRow: number; endCol: number; endRow: number };
  activeRegionId: string | null;
  activeMode: 'move' | 'resize';
  activeStep: 1 | 4;
  activeRegionOriginal: RegionSnapshot | null;
  interaction: InteractionState;
  handleRects: HandleRect[];
  cachedMaskKey: string | null;
  cachedNonEmptyMask: boolean[][] | null;
  nextRegionIndex: number;
  previewRenderId: number;
  previewImage: HTMLImageElement | null;
  previewImageReady: boolean;
  previewImageUrlLoaded: string | null;
  previewRafPending: boolean;
  lastPreviewLayout: { w: number; h: number; scale: number; dpr: number } | null;
}

function ensureStyles(): void {
  if (document.getElementById('irs-sprite-slicer-tab-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'irs-sprite-slicer-tab-styles';
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createSpriteSlicerTab(config: SpriteSlicerTabConfig): { destroy: () => void } {
  const { container, onSlicesConfirmed, onAtlasConfirmed } = config;

  ensureStyles();

  const state: SpriteSlicerState = {
    imageBlob: null,
    imageUrl: null,
    imageName: null,
    imageWidth: 0,
    imageHeight: 0,
    groupName: '',
    groupType: 'tilesets',
    slicePreset: '16',
    sliceWidth: 16,
    sliceHeight: 16,
    slices: [],
    sliceMode: 'atlas',
    skipEmptyTiles: true,
    customRegions: [],
    selectionMode: 'tile',
    pendingRegion: null,
    activeRegionId: null,
    activeMode: 'move',
    activeStep: 1,
    activeRegionOriginal: null,
    interaction: {
      kind: 'none',
      pointerId: null,
      startPointerPx: null,
      startTile: null,
      startRegion: null,
      active: false,
      handle: null,
    },
    handleRects: [],
    cachedMaskKey: null,
    cachedNonEmptyMask: null,
    nextRegionIndex: 1,
    previewRenderId: 0,
    previewImage: null,
    previewImageReady: false,
    previewImageUrlLoaded: null,
    previewRafPending: false,
    lastPreviewLayout: null,
  };

  const root = document.createElement('div');
  root.className = 'irs-sprite-slicer';

  const importSection = document.createElement('section');
  importSection.className = 'irs-sprite-slicer__section';

  const importTitle = document.createElement('div');
  importTitle.className = 'irs-sprite-slicer__title';
  importTitle.textContent = 'Import Sprite Sheet';

  const importRow = document.createElement('div');
  importRow.className = 'irs-sprite-slicer__row';

  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.className = 'irs-btn irs-btn--secondary irs-sprite-slicer__button';
  importButton.textContent = 'Import Image';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';

  importButton.addEventListener('click', () => fileInput.click());

  const importHint = document.createElement('div');
  importHint.className = 'irs-sprite-slicer__hint';
  importHint.textContent = 'PNG or GIF sprite sheets work best.';

  importRow.appendChild(importButton);
  importRow.appendChild(importHint);
  importSection.appendChild(importTitle);
  importSection.appendChild(importRow);

  const modeSection = document.createElement('section');
  modeSection.className = 'irs-sprite-slicer__section';

  const modeTitle = document.createElement('div');
  modeTitle.className = 'irs-sprite-slicer__title';
  modeTitle.textContent = 'Import Mode';

  const modeToggle = document.createElement('div');
  modeToggle.className = 'irs-sprite-slicer__mode-toggle';

  const atlasOption = document.createElement('button');
  atlasOption.type = 'button';
  atlasOption.className = 'irs-sprite-slicer__mode-option irs-sprite-slicer__mode-option--active';
  atlasOption.textContent = 'Keep sheet + register slices';

  const separateOption = document.createElement('button');
  separateOption.type = 'button';
  separateOption.className = 'irs-sprite-slicer__mode-option';
  separateOption.textContent = 'Export as separate images';

  modeToggle.appendChild(atlasOption);
  modeToggle.appendChild(separateOption);

  const modeHint = document.createElement('div');
  modeHint.className = 'irs-sprite-slicer__hint';
  modeHint.textContent = 'Atlas mode keeps the spritesheet intact and registers slice regions as assets.';

  const sliceSection = document.createElement('section');
  sliceSection.className = 'irs-sprite-slicer__section';

  const sliceTitle = document.createElement('div');
  sliceTitle.className = 'irs-sprite-slicer__title';
  sliceTitle.textContent = 'Slice Settings';

  const sliceRow = document.createElement('div');
  sliceRow.className = 'irs-sprite-slicer__row';

  const sizeSelect = document.createElement('select');
  sizeSelect.className = 'irs-input irs-sprite-slicer__select';
  sizeSelect.innerHTML = `
    <option value="16">16 × 16</option>
    <option value="32">32 × 32</option>
    <option value="custom">Custom</option>
  `;

  const widthInput = document.createElement('input');
  widthInput.type = 'number';
  widthInput.min = '1';
  widthInput.value = '16';
  widthInput.className = 'irs-input irs-sprite-slicer__input';
  widthInput.style.display = 'none';

  const heightInput = document.createElement('input');
  heightInput.type = 'number';
  heightInput.min = '1';
  heightInput.value = '16';
  heightInput.className = 'irs-input irs-sprite-slicer__input';
  heightInput.style.display = 'none';

  const sizeHint = document.createElement('div');
  sizeHint.className = 'irs-sprite-slicer__hint';
  sizeHint.textContent = 'Choose tile size to match your grid.';

  const skipEmptyWrap = document.createElement('label');
  skipEmptyWrap.className = 'irs-sprite-slicer__row';
  const skipEmptyInput = document.createElement('input');
  skipEmptyInput.type = 'checkbox';
  skipEmptyInput.checked = true;
  const skipEmptyText = document.createElement('span');
  skipEmptyText.className = 'irs-sprite-slicer__hint';
  skipEmptyText.textContent = 'Skip empty tiles';
  skipEmptyWrap.appendChild(skipEmptyInput);
  skipEmptyWrap.appendChild(skipEmptyText);

  const groupRow = document.createElement('div');
  groupRow.className = 'irs-sprite-slicer__row';

  const groupInput = document.createElement('input');
  groupInput.type = 'text';
  groupInput.className = 'irs-input irs-sprite-slicer__input';
  groupInput.placeholder = 'Group name (e.g., Trees)';

  const groupSelect = document.createElement('select');
  groupSelect.className = 'irs-input irs-sprite-slicer__select';
  groupSelect.innerHTML = `
    <option value="tilesets">Tilesets</option>
    <option value="props">Props</option>
    <option value="entities">Entities</option>
  `;

  const groupHint = document.createElement('div');
  groupHint.className = 'irs-sprite-slicer__hint';
  groupHint.textContent = 'Choose where these slices should appear in palettes.';

  groupRow.appendChild(groupInput);
  groupRow.appendChild(groupSelect);

  sliceRow.appendChild(sizeSelect);
  sliceRow.appendChild(widthInput);
  sliceRow.appendChild(heightInput);
  sliceRow.appendChild(sizeHint);

  sliceSection.appendChild(sliceTitle);
  sliceSection.appendChild(sliceRow);
  sliceSection.appendChild(skipEmptyWrap);
  sliceSection.appendChild(groupRow);
  sliceSection.appendChild(groupHint);

  const previewSection = document.createElement('section');
  previewSection.className = 'irs-sprite-slicer__section';

  const previewTitle = document.createElement('div');
  previewTitle.className = 'irs-sprite-slicer__title';
  previewTitle.textContent = 'Preview';

  const preview = document.createElement('div');
  preview.className = 'irs-sprite-slicer__preview';

  const previewControls = document.createElement('div');
  previewControls.className = 'irs-sprite-slicer__row';
  const regionSelectButton = document.createElement('button');
  regionSelectButton.type = 'button';
  regionSelectButton.className = 'irs-btn irs-btn--secondary irs-sprite-slicer__button';
  regionSelectButton.textContent = 'Region Select';
  const regionHint = document.createElement('div');
  regionHint.className = 'irs-sprite-slicer__hint';
  regionHint.textContent = 'Drag on the preview to create a larger sprite region aligned to the grid.';
  previewControls.appendChild(regionSelectButton);
  previewControls.appendChild(regionHint);

  const previewCanvas = document.createElement('canvas');
  previewCanvas.className = 'irs-sprite-slicer__canvas';

  const previewMeta = document.createElement('div');
  previewMeta.className = 'irs-sprite-slicer__meta';
  previewMeta.textContent = 'Import an image to preview slices.';

  const selectionControls = document.createElement('div');
  selectionControls.className = 'irs-sprite-slicer__selection-controls';

  const selectionTop = document.createElement('div');
  selectionTop.className = 'irs-sprite-slicer__selection-grid';

  const modeGroup = document.createElement('div');
  const modeLabel = document.createElement('div');
  modeLabel.className = 'irs-sprite-slicer__selection-label';
  modeLabel.textContent = 'Mode';
  const modeToggleControls = document.createElement('div');
  modeToggleControls.className = 'irs-sprite-slicer__mode-toggle';
  const moveModeButton = document.createElement('button');
  moveModeButton.type = 'button';
  moveModeButton.className = 'irs-sprite-slicer__mode-option irs-sprite-slicer__mode-option--active';
  moveModeButton.textContent = 'Move';
  const resizeModeButton = document.createElement('button');
  resizeModeButton.type = 'button';
  resizeModeButton.className = 'irs-sprite-slicer__mode-option';
  resizeModeButton.textContent = 'Resize';
  modeToggleControls.appendChild(moveModeButton);
  modeToggleControls.appendChild(resizeModeButton);
  modeGroup.appendChild(modeLabel);
  modeGroup.appendChild(modeToggleControls);

  const stepGroup = document.createElement('div');
  const stepLabel = document.createElement('div');
  stepLabel.className = 'irs-sprite-slicer__selection-label';
  stepLabel.textContent = 'Step';
  const stepToggleControls = document.createElement('div');
  stepToggleControls.className = 'irs-sprite-slicer__mode-toggle';
  const stepOneButton = document.createElement('button');
  stepOneButton.type = 'button';
  stepOneButton.className = 'irs-sprite-slicer__mode-option irs-sprite-slicer__mode-option--active';
  stepOneButton.textContent = '1 tile';
  const stepFourButton = document.createElement('button');
  stepFourButton.type = 'button';
  stepFourButton.className = 'irs-sprite-slicer__mode-option';
  stepFourButton.textContent = '4 tiles';
  stepToggleControls.appendChild(stepOneButton);
  stepToggleControls.appendChild(stepFourButton);
  stepGroup.appendChild(stepLabel);
  stepGroup.appendChild(stepToggleControls);

  selectionTop.appendChild(modeGroup);
  selectionTop.appendChild(stepGroup);

  const dpad = document.createElement('div');
  dpad.className = 'irs-sprite-slicer__dpad';
  const upButton = document.createElement('button');
  upButton.type = 'button';
  upButton.className = 'irs-btn irs-btn--secondary irs-sprite-slicer__button';
  upButton.textContent = '▲';
  const leftButton = document.createElement('button');
  leftButton.type = 'button';
  leftButton.className = 'irs-btn irs-btn--secondary irs-sprite-slicer__button';
  leftButton.textContent = '◀';
  const rightButton = document.createElement('button');
  rightButton.type = 'button';
  rightButton.className = 'irs-btn irs-btn--secondary irs-sprite-slicer__button';
  rightButton.textContent = '▶';
  const downButton = document.createElement('button');
  downButton.type = 'button';
  downButton.className = 'irs-btn irs-btn--secondary irs-sprite-slicer__button';
  downButton.textContent = '▼';
  dpad.appendChild(upButton);
  dpad.appendChild(leftButton);
  dpad.appendChild(rightButton);
  dpad.appendChild(downButton);

  const selectionActions = document.createElement('div');
  selectionActions.className = 'irs-sprite-slicer__selection-actions';
  const doneSelectionButton = document.createElement('button');
  doneSelectionButton.type = 'button';
  doneSelectionButton.className = 'irs-btn irs-btn--secondary irs-sprite-slicer__button';
  doneSelectionButton.textContent = 'Done';
  const cancelSelectionButton = document.createElement('button');
  cancelSelectionButton.type = 'button';
  cancelSelectionButton.className = 'irs-btn irs-btn--secondary irs-sprite-slicer__button';
  cancelSelectionButton.textContent = 'Cancel';
  selectionActions.appendChild(doneSelectionButton);
  selectionActions.appendChild(cancelSelectionButton);

  selectionControls.appendChild(selectionTop);
  selectionControls.appendChild(dpad);
  selectionControls.appendChild(selectionActions);

  const regionsList = document.createElement('div');
  regionsList.className = 'irs-sprite-slicer__regions';

  preview.appendChild(previewControls);
  preview.appendChild(previewCanvas);
  preview.appendChild(previewMeta);
  preview.appendChild(selectionControls);
  preview.appendChild(regionsList);

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'irs-btn irs-btn--primary irs-sprite-slicer__button irs-sprite-slicer__button--primary';
  confirmButton.textContent = 'Confirm Atlas Import';
  confirmButton.disabled = true;

  const sliceGrid = document.createElement('div');
  sliceGrid.className = 'irs-sprite-slicer__slice-grid';

  previewSection.appendChild(previewTitle);
  previewSection.appendChild(preview);
  previewSection.appendChild(confirmButton);
  previewSection.appendChild(sliceGrid);

  root.appendChild(importSection);
  root.appendChild(modeSection);
  root.appendChild(sliceSection);
  root.appendChild(previewSection);
  root.appendChild(fileInput);

  container.appendChild(root);

  function clearSlices(): void {
    state.slices = [];
    sliceGrid.innerHTML = '';
  }

  function resetMaskCache(): void {
    state.cachedMaskKey = null;
    state.cachedNonEmptyMask = null;
  }

  async function getNonEmptyMask(): Promise<boolean[][] | null> {
    if (!state.skipEmptyTiles || !state.imageBlob) {
      return null;
    }
    const key = `${state.imageName ?? 'image'}:${state.sliceWidth}x${state.sliceHeight}`;
    if (state.cachedMaskKey === key && state.cachedNonEmptyMask) {
      return state.cachedNonEmptyMask;
    }
    const mask = await computeNonEmptyTileMask(state.imageBlob, state.sliceWidth, state.sliceHeight);
    state.cachedMaskKey = key;
    state.cachedNonEmptyMask = mask;
    return mask;
  }

  function getGridSize(): { columns: number; rows: number } {
    return {
      columns: Math.floor(state.imageWidth / state.sliceWidth),
      rows: Math.floor(state.imageHeight / state.sliceHeight),
    };
  }

  function buildOccupiedTilesGrid(): boolean[][] {
    const { columns, rows } = getGridSize();
    const occupied = Array.from({ length: rows }, () => Array.from({ length: columns }, () => false));
    for (const region of state.customRegions) {
      const startCol = Math.floor(region.rect.x / state.sliceWidth);
      const startRow = Math.floor(region.rect.y / state.sliceHeight);
      const colCount = Math.floor(region.rect.w / state.sliceWidth);
      const rowCount = Math.floor(region.rect.h / state.sliceHeight);
      for (let row = startRow; row < startRow + rowCount; row += 1) {
        for (let col = startCol; col < startCol + colCount; col += 1) {
          if (occupied[row]?.[col] !== undefined) {
            occupied[row][col] = true;
          }
        }
      }
    }
    return occupied;
  }

  function getRegionById(regionId: string | null): CustomRegion | null {
    if (!regionId) {
      return null;
    }
    return state.customRegions.find((region) => region.id === regionId) ?? null;
  }

  function setActiveRegion(regionId: string | null): void {
    state.activeRegionId = regionId;
    const activeRegion = getRegionById(regionId);
    state.activeRegionOriginal = activeRegion ? { ...activeRegion.rect, name: activeRegion.name } : null;
    state.interaction = {
      kind: 'none',
      pointerId: null,
      startPointerPx: null,
      startTile: null,
      startRegion: null,
      active: false,
      handle: null,
    };
    updateRegionsList();
    updateSelectionControls();
    schedulePreviewRender();
  }

  function updateSelectionControls(): void {
    const hasActive = Boolean(getRegionById(state.activeRegionId));
    selectionControls.classList.toggle('irs-sprite-slicer__selection-controls--visible', hasActive);
    moveModeButton.classList.toggle('irs-sprite-slicer__mode-option--active', state.activeMode === 'move');
    resizeModeButton.classList.toggle('irs-sprite-slicer__mode-option--active', state.activeMode === 'resize');
    stepOneButton.classList.toggle('irs-sprite-slicer__mode-option--active', state.activeStep === 1);
    stepFourButton.classList.toggle('irs-sprite-slicer__mode-option--active', state.activeStep === 4);
    doneSelectionButton.disabled = !hasActive;
    cancelSelectionButton.disabled = !hasActive;
    upButton.disabled = !hasActive;
    downButton.disabled = !hasActive;
    leftButton.disabled = !hasActive;
    rightButton.disabled = !hasActive;
  }

  function clampRegionRect(rect: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
    const { columns, rows } = getGridSize();
    const atlasTilesW = Math.max(1, columns);
    const atlasTilesH = Math.max(1, rows);
    const xTiles = Math.max(0, Math.round(rect.x / state.sliceWidth));
    const yTiles = Math.max(0, Math.round(rect.y / state.sliceHeight));
    let wTiles = Math.max(1, Math.round(rect.w / state.sliceWidth));
    let hTiles = Math.max(1, Math.round(rect.h / state.sliceHeight));
    const clampedXTiles = Math.min(xTiles, atlasTilesW - 1);
    const clampedYTiles = Math.min(yTiles, atlasTilesH - 1);
    wTiles = Math.min(wTiles, atlasTilesW - clampedXTiles);
    hTiles = Math.min(hTiles, atlasTilesH - clampedYTiles);
    return {
      x: clampedXTiles * state.sliceWidth,
      y: clampedYTiles * state.sliceHeight,
      w: Math.max(1, wTiles) * state.sliceWidth,
      h: Math.max(1, hTiles) * state.sliceHeight,
    };
  }

  function updateRegionsList(): void {
    regionsList.innerHTML = '';
    if (state.customRegions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'irs-sprite-slicer__hint';
      empty.textContent = 'No custom regions yet.';
      regionsList.appendChild(empty);
      return;
    }

    state.customRegions.forEach((region) => {
      const item = document.createElement('div');
      item.className = 'irs-sprite-slicer__region-item';
      item.classList.toggle('irs-sprite-slicer__region-item--active', region.id === state.activeRegionId);
      const widthTiles = Math.floor(region.rect.w / state.sliceWidth);
      const heightTiles = Math.floor(region.rect.h / state.sliceHeight);

      const main = document.createElement('div');
      main.className = 'irs-sprite-slicer__region-main';

      const nameButton = document.createElement('button');
      nameButton.type = 'button';
      nameButton.className = 'irs-sprite-slicer__region-name';
      nameButton.textContent = region.name;
      nameButton.title = 'Tap to rename';

      const startRename = (): void => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'irs-input irs-sprite-slicer__region-name-input';
        input.value = region.name;
        main.replaceChild(input, nameButton);
        input.focus();
        input.select();

        const commitRename = (): void => {
          const previousName = region.name;
          let nextName = input.value.trim();
          if (!nextName) {
            nextName = previousName;
          }

          const takenNames = new Set(
            state.customRegions
              .filter((entry) => entry.id !== region.id)
              .map((entry) => entry.name.toLowerCase())
          );
          const candidateBase = nextName;
          let suffix = 2;
          while (takenNames.has(nextName.toLowerCase())) {
            nextName = `${candidateBase}_${suffix}`;
            suffix += 1;
          }

          if (region.name !== nextName) {
            region.name = nextName;
          }

          updateRegionsList();
          schedulePreviewRender();
          void updateSliceResults();
        };

        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitRename();
          } else if (event.key === 'Escape') {
            updateRegionsList();
          }
        });

        input.addEventListener('blur', commitRename, { once: true });
      };

      nameButton.addEventListener('click', (event) => {
        if (event.detail === 1) {
          setActiveRegion(region.id);
          updateSelectionControls();
        }
        startRename();
      });

      const size = document.createElement('span');
      size.className = 'irs-sprite-slicer__region-size';
      size.textContent = `(${widthTiles}x${heightTiles})`;

      main.appendChild(nameButton);
      main.appendChild(size);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'irs-sprite-slicer__region-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        state.customRegions = state.customRegions.filter((entry) => entry.id !== region.id);
        if (state.activeRegionId === region.id) {
          state.activeRegionId = null;
          state.activeRegionOriginal = null;
        }
        updateRegionsList();
        updateSelectionControls();
        schedulePreviewRender();
        void updateSliceResults();
      });
      item.appendChild(main);
      item.appendChild(remove);
      item.addEventListener('click', () => {
        setActiveRegion(region.id);
        updateSelectionControls();
      });
      regionsList.appendChild(item);
    });
  }

  function schedulePreviewRender(): void {
    if (state.previewRafPending) {
      return;
    }
    state.previewRafPending = true;
    window.requestAnimationFrame(() => {
      state.previewRafPending = false;
      void updatePreviewCanvas();
    });
  }

  async function ensurePreviewImageLoaded(): Promise<void> {
    if (!state.imageUrl) {
      state.previewImage = null;
      state.previewImageReady = false;
      state.previewImageUrlLoaded = null;
      return;
    }

    if (state.previewImageUrlLoaded === state.imageUrl && state.previewImage && state.previewImageReady) {
      return;
    }

    const imageUrl = state.imageUrl;
    const image = new Image();
    state.previewImageReady = false;
    await new Promise<void>((resolve) => {
      image.onload = () => {
        if (state.imageUrl === imageUrl) {
          state.previewImage = image;
          state.previewImageReady = true;
          state.previewImageUrlLoaded = imageUrl;
        }
        resolve();
      };
      image.onerror = () => {
        if (state.imageUrl === imageUrl) {
          state.previewImage = null;
          state.previewImageReady = false;
          state.previewImageUrlLoaded = null;
        }
        resolve();
      };
      image.src = imageUrl;
    });
  }

  function drawPreviewBase(ctx: CanvasRenderingContext2D, displayWidth: number, displayHeight: number, scale: number): void {
    if (state.previewImage) {
      ctx.drawImage(state.previewImage, 0, 0, displayWidth, displayHeight);
    }

    const tileWidth = state.sliceWidth * scale;
    const tileHeight = state.sliceHeight * scale;
    const { columns, rows } = getGridSize();

    ctx.strokeStyle = 'rgba(74, 158, 255, 0.6)';
    ctx.lineWidth = 1;
    for (let col = 0; col <= columns; col += 1) {
      const x = Math.floor(col * tileWidth) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rows * tileHeight);
      ctx.stroke();
    }

    for (let row = 0; row <= rows; row += 1) {
      const y = Math.floor(row * tileHeight) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(columns * tileWidth, y);
      ctx.stroke();
    }

    state.handleRects = [];
    const activeRegion = getRegionById(state.activeRegionId);
    ctx.lineWidth = 2;
    state.customRegions.forEach((region) => {
      const isActive = activeRegion?.id === region.id;
      ctx.strokeStyle = isActive ? 'rgba(120, 250, 156, 0.98)' : 'rgba(255, 184, 46, 0.95)';
      ctx.lineWidth = isActive ? 3 : 2;
      const rx = region.rect.x * scale + 1;
      const ry = region.rect.y * scale + 1;
      const rw = Math.max(1, region.rect.w * scale - 2);
      const rh = Math.max(1, region.rect.h * scale - 2);
      ctx.strokeRect(rx, ry, rw, rh);

      if (!isActive) {
        return;
      }

      const hitSize = 32;
      const drawSize = 10;
      const halfHit = hitSize / 2;
      const halfDraw = drawSize / 2;
      const left = region.rect.x * scale;
      const top = region.rect.y * scale;
      const right = (region.rect.x + region.rect.w) * scale;
      const bottom = (region.rect.y + region.rect.h) * scale;
      const midX = (left + right) / 2;
      const midY = (top + bottom) / 2;
      const handles: Array<{ id: HandleId; x: number; y: number }> = [
        { id: 'nw', x: left, y: top },
        { id: 'n', x: midX, y: top },
        { id: 'ne', x: right, y: top },
        { id: 'e', x: right, y: midY },
        { id: 'se', x: right, y: bottom },
        { id: 's', x: midX, y: bottom },
        { id: 'sw', x: left, y: bottom },
        { id: 'w', x: left, y: midY },
      ];
      ctx.fillStyle = 'rgba(120, 250, 156, 0.95)';
      handles.forEach((handle) => {
        ctx.fillRect(handle.x - halfDraw, handle.y - halfDraw, drawSize, drawSize);
        state.handleRects.push({
          id: handle.id,
          rect: { x: handle.x - halfHit, y: handle.y - halfHit, w: hitSize, h: hitSize },
        });
      });
    });

    if (state.pendingRegion) {
      const minCol = Math.min(state.pendingRegion.startCol, state.pendingRegion.endCol);
      const maxCol = Math.max(state.pendingRegion.startCol, state.pendingRegion.endCol);
      const minRow = Math.min(state.pendingRegion.startRow, state.pendingRegion.endRow);
      const maxRow = Math.max(state.pendingRegion.startRow, state.pendingRegion.endRow);
      ctx.strokeStyle = 'rgba(125, 232, 126, 0.95)';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        minCol * tileWidth + 1,
        minRow * tileHeight + 1,
        Math.max(1, (maxCol - minCol + 1) * tileWidth - 2),
        Math.max(1, (maxRow - minRow + 1) * tileHeight - 2)
      );
    }
  }

  function drawPreviewMask(mask: boolean[][], ctx: CanvasRenderingContext2D, scale: number): void {
    const tileWidth = state.sliceWidth * scale;
    const tileHeight = state.sliceHeight * scale;
    const { columns, rows } = getGridSize();
    ctx.fillStyle = 'rgba(6, 10, 22, 0.4)';
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if (!mask[row]?.[col]) {
          ctx.fillRect(col * tileWidth, row * tileHeight, tileWidth, tileHeight);
        }
      }
    }
  }


  async function buildSeparateSlices(): Promise<SliceResult[]> {
    if (!state.imageBlob) {
      return [];
    }
    const occupied = buildOccupiedTilesGrid();
    const mask = state.skipEmptyTiles ? await getNonEmptyMask() : null;
    const regionSlices = await sliceImageRegions(
      state.imageBlob,
      state.customRegions.map((region) => region.rect)
    );
    const tileSlices = await sliceImage(state.imageBlob, state.sliceWidth, state.sliceHeight, {
      skipEmpty: state.skipEmptyTiles,
      nonEmptyMask: mask ?? undefined,
    });
    const filteredTileSlices = tileSlices.filter((slice) => {
      const col = Math.floor(slice.x / state.sliceWidth);
      const row = Math.floor(slice.y / state.sliceHeight);
      return !occupied[row]?.[col];
    });
    return [...regionSlices, ...filteredTileSlices];
  }

  async function buildAtlasSlices(): Promise<AtlasSliceEntry[]> {
    const { columns, rows } = getGridSize();
    const baseName = state.imageName?.replace(/\.[^/.]+$/, '') ?? 'slice';
    const occupied = buildOccupiedTilesGrid();
    const mask = state.skipEmptyTiles ? await getNonEmptyMask() : null;
    const entries: AtlasSliceEntry[] = [];
    let index = 0;

    state.customRegions.forEach((region) => {
      entries.push({
        name: region.name,
        rect: { ...region.rect },
      });
    });

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if (occupied[row]?.[col]) {
          continue;
        }
        if (state.skipEmptyTiles && !mask?.[row]?.[col]) {
          continue;
        }
        entries.push({
          name: `${baseName}_${index}`,
          rect: {
            x: col * state.sliceWidth,
            y: row * state.sliceHeight,
            w: state.sliceWidth,
            h: state.sliceHeight,
          },
        });
        index += 1;
      }
    }

    return entries;
  }

  function updateSliceInputs(): void {
    if (state.slicePreset === 'custom') {
      widthInput.style.display = '';
      heightInput.style.display = '';
      widthInput.value = `${state.sliceWidth}`;
      heightInput.value = `${state.sliceHeight}`;
    } else {
      widthInput.style.display = 'none';
      heightInput.style.display = 'none';
    }
  }

  async function updatePreviewCanvas(): Promise<void> {
    const ctx = previewCanvas.getContext('2d');
    if (!ctx || !state.imageUrl || state.imageWidth === 0 || state.imageHeight === 0) {
      previewCanvas.width = 1;
      previewCanvas.height = 1;
      state.lastPreviewLayout = null;
      previewMeta.textContent = 'Import an image to preview slices.';
      return;
    }

    const renderId = state.previewRenderId + 1;
    state.previewRenderId = renderId;

    const maxWidth = Math.max(1, container.clientWidth - 24);
    const maxHeight = Math.min(480, Math.floor(window.innerHeight * 0.45));
    const scale = Math.min(maxWidth / state.imageWidth, maxHeight / state.imageHeight, 1);
    const displayWidth = Math.max(1, Math.floor(state.imageWidth * scale));
    const displayHeight = Math.max(1, Math.floor(state.imageHeight * scale));
    const dpr = window.devicePixelRatio || 1;

    const needsResize =
      !state.lastPreviewLayout ||
      state.lastPreviewLayout.w !== displayWidth ||
      state.lastPreviewLayout.h !== displayHeight ||
      state.lastPreviewLayout.dpr !== dpr;

    if (needsResize) {
      previewCanvas.width = displayWidth * dpr;
      previewCanvas.height = displayHeight * dpr;
      state.lastPreviewLayout = { w: displayWidth, h: displayHeight, scale, dpr };
    } else if (state.lastPreviewLayout) {
      state.lastPreviewLayout.scale = scale;
    }

    previewCanvas.style.width = `${displayWidth}px`;
    previewCanvas.style.height = `${displayHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    await ensurePreviewImageLoaded();
    if (state.previewRenderId !== renderId) {
      return;
    }

    if (!state.previewImage || !state.previewImageReady) {
      previewMeta.textContent = 'Loading preview image…';
      return;
    }

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    drawPreviewBase(ctx, displayWidth, displayHeight, scale);

    const isDraggingRegion = state.pendingRegion !== null || state.interaction.kind === 'move' || state.interaction.kind === 'handle';
    if (state.skipEmptyTiles && !isDraggingRegion) {
      const mask = await getNonEmptyMask();
      if (state.previewRenderId !== renderId) {
        return;
      }
      if (mask) {
        drawPreviewMask(mask, ctx, scale);
      }
    }

    const { columns, rows } = getGridSize();
    const remainderX = state.imageWidth % state.sliceWidth;
    const remainderY = state.imageHeight % state.sliceHeight;
    const remainderNote = remainderX !== 0 || remainderY !== 0 ? ' (extra pixels will be ignored)' : '';
    previewMeta.textContent = `${state.imageWidth}×${state.imageHeight}px — ${columns}×${rows} tiles${remainderNote}`;
  }


  async function updateSliceResults(): Promise<void> {
    clearSlices();
    if (!state.imageBlob) {
      confirmButton.disabled = true;
      return;
    }

    confirmButton.disabled = false;
    const slices = await buildSeparateSlices();
    state.slices = slices;
    slices.slice(0, 24).forEach((slice) => {
      const img = document.createElement('img');
      img.className = 'irs-sprite-slicer__slice';
      img.src = slice.dataUrl;
      img.alt = 'Slice preview';
      sliceGrid.appendChild(img);
    });
    if (slices.length > 24) {
      const more = document.createElement('div');
      more.className = 'irs-sprite-slicer__hint';
      more.textContent = `+${slices.length - 24} more slices`;
      sliceGrid.appendChild(more);
    }
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(blob);
    });
  }

  function updateModeToggle(): void {
    atlasOption.classList.toggle('irs-sprite-slicer__mode-option--active', state.sliceMode === 'atlas');
    separateOption.classList.toggle('irs-sprite-slicer__mode-option--active', state.sliceMode === 'separate');
    modeHint.textContent =
      state.sliceMode === 'atlas'
        ? 'Atlas mode keeps the spritesheet intact and registers slice regions as assets.'
        : 'Separate mode cuts the sheet into individual image files.';
    confirmButton.textContent = state.sliceMode === 'atlas' ? 'Confirm Atlas Import' : 'Confirm Slice';
  }

  function clearRegions(): void {
    state.customRegions = [];
    state.pendingRegion = null;
    state.activeRegionId = null;
    state.activeRegionOriginal = null;
    state.nextRegionIndex = 1;
    updateRegionsList();
    updateSelectionControls();
  }

  function pointerToCanvasPoint(event: PointerEvent): { x: number; y: number } | null {
    const rect = previewCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    return {
      x: Math.min(Math.max(event.clientX - rect.left, 0), rect.width - 1),
      y: Math.min(Math.max(event.clientY - rect.top, 0), rect.height - 1),
    };
  }

  function pointerToTile(event: PointerEvent): { col: number; row: number } | null {
    if (!state.imageWidth || !state.imageHeight || !state.sliceWidth || !state.sliceHeight) {
      return null;
    }
    const point = pointerToCanvasPoint(event);
    const rect = previewCanvas.getBoundingClientRect();
    if (!point || rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    const imageX = (point.x / rect.width) * state.imageWidth;
    const imageY = (point.y / rect.height) * state.imageHeight;
    const { columns, rows } = getGridSize();
    const col = Math.min(columns - 1, Math.max(0, Math.floor(imageX / state.sliceWidth)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(imageY / state.sliceHeight)));
    return { col, row };
  }

  function hitTestRegion(point: { x: number; y: number }): CustomRegion | null {
    const layout = state.lastPreviewLayout;
    if (!layout) {
      return null;
    }
    for (let index = state.customRegions.length - 1; index >= 0; index -= 1) {
      const region = state.customRegions[index];
      const x = region.rect.x * layout.scale;
      const y = region.rect.y * layout.scale;
      const w = region.rect.w * layout.scale;
      const h = region.rect.h * layout.scale;
      if (point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h) {
        return region;
      }
    }
    return null;
  }

  function hitTestHandle(point: { x: number; y: number }): HandleId | null {
    for (const handle of state.handleRects) {
      const { x, y, w, h } = handle.rect;
      if (point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h) {
        return handle.id;
      }
    }
    return null;
  }

  function applyResizeFromHandle(region: CustomRegion, handle: HandleId, deltaCol: number, deltaRow: number): void {
    const start = state.interaction.startRegion;
    if (!start) {
      return;
    }
    let left = Math.floor(start.x / state.sliceWidth);
    let top = Math.floor(start.y / state.sliceHeight);
    let right = left + Math.floor(start.w / state.sliceWidth);
    let bottom = top + Math.floor(start.h / state.sliceHeight);

    if (handle.includes('w')) {
      left += deltaCol;
    }
    if (handle.includes('e')) {
      right += deltaCol;
    }
    if (handle.includes('n')) {
      top += deltaRow;
    }
    if (handle.includes('s')) {
      bottom += deltaRow;
    }

    if (right <= left) {
      right = left + 1;
    }
    if (bottom <= top) {
      bottom = top + 1;
    }

    region.rect = clampRegionRect({
      x: left * state.sliceWidth,
      y: top * state.sliceHeight,
      w: (right - left) * state.sliceWidth,
      h: (bottom - top) * state.sliceHeight,
    });
  }

  async function handleFileChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    if (state.imageUrl) {
      URL.revokeObjectURL(state.imageUrl);
    }

    state.imageBlob = file;
    state.imageName = file.name;
    state.imageUrl = URL.createObjectURL(file);
    state.previewImage = null;
    state.previewImageReady = false;
    state.previewImageUrlLoaded = null;
    state.lastPreviewLayout = null;
    state.groupName = file.name.replace(/\.[^/.]+$/, '');
    groupInput.value = state.groupName;
    clearRegions();
    resetMaskCache();

    const img = new Image();
    img.onload = () => {
      state.imageWidth = img.naturalWidth;
      state.imageHeight = img.naturalHeight;
      schedulePreviewRender();
    };
    img.onerror = () => {
      previewMeta.textContent = 'Failed to load image.';
    };
    img.src = state.imageUrl;

    schedulePreviewRender();
    await updateSliceResults();
  }

  function handlePresetChange(): void {
    const value = sizeSelect.value as SlicePreset;
    state.slicePreset = value;
    if (value === '16') {
      state.sliceWidth = 16;
      state.sliceHeight = 16;
    } else if (value === '32') {
      state.sliceWidth = 32;
      state.sliceHeight = 32;
    } else {
      state.sliceWidth = Number(widthInput.value) || 16;
      state.sliceHeight = Number(heightInput.value) || 16;
    }
    resetMaskCache();
    clearRegions();
    updateSliceInputs();
    schedulePreviewRender();
    void updateSliceResults();
  }

  function handleCustomSizeChange(): void {
    state.sliceWidth = Math.max(1, Number(widthInput.value) || 1);
    state.sliceHeight = Math.max(1, Number(heightInput.value) || 1);
    resetMaskCache();
    clearRegions();
    schedulePreviewRender();
    void updateSliceResults();
  }

  fileInput.addEventListener('change', (event) => {
    void handleFileChange(event);
  });

  sizeSelect.addEventListener('change', handlePresetChange);
  widthInput.addEventListener('input', handleCustomSizeChange);
  heightInput.addEventListener('input', handleCustomSizeChange);
  groupInput.addEventListener('input', () => {
    state.groupName = groupInput.value;
  });
  groupSelect.addEventListener('change', () => {
    state.groupType = groupSelect.value as AssetGroupType;
  });
  skipEmptyInput.addEventListener('change', () => {
    state.skipEmptyTiles = skipEmptyInput.checked;
    schedulePreviewRender();
    void updateSliceResults();
  });

  atlasOption.addEventListener('click', () => {
    state.sliceMode = 'atlas';
    updateModeToggle();
  });
  separateOption.addEventListener('click', () => {
    state.sliceMode = 'separate';
    updateModeToggle();
  });

  function commitPendingRegion(): void {
    if (!state.pendingRegion) {
      return;
    }
    const minCol = Math.min(state.pendingRegion.startCol, state.pendingRegion.endCol);
    const maxCol = Math.max(state.pendingRegion.startCol, state.pendingRegion.endCol);
    const minRow = Math.min(state.pendingRegion.startRow, state.pendingRegion.endRow);
    const maxRow = Math.max(state.pendingRegion.startRow, state.pendingRegion.endRow);

    const rect = {
      x: minCol * state.sliceWidth,
      y: minRow * state.sliceHeight,
      w: (maxCol - minCol + 1) * state.sliceWidth,
      h: (maxRow - minRow + 1) * state.sliceHeight,
    };

    const baseName = state.imageName?.replace(/\.[^/.]+$/, '') ?? 'sprite';
    const region: CustomRegion = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: `${baseName}_region_${state.nextRegionIndex}`,
      rect: clampRegionRect(rect),
    };
    state.nextRegionIndex += 1;
    state.customRegions.push(region);
    state.pendingRegion = null;
    setActiveRegion(region.id);
    state.activeRegionOriginal = { ...region.rect, name: region.name };

    updateRegionsList();
    updateSelectionControls();
    schedulePreviewRender();
    void updateSliceResults();
  }

  function beginInteraction(kind: InteractionState['kind'], pointerId: number, point: { x: number; y: number }, tile: { col: number; row: number } | null, region: CustomRegion | null, handle: HandleId | null = null): void {
    state.interaction = {
      kind,
      pointerId,
      startPointerPx: point,
      startTile: tile,
      startRegion: region ? { ...region.rect, name: region.name } : null,
      active: false,
      handle,
    };
  }

  function endInteraction(): void {
    state.interaction = {
      kind: 'none',
      pointerId: null,
      startPointerPx: null,
      startTile: null,
      startRegion: null,
      active: false,
      handle: null,
    };
  }

  regionSelectButton.addEventListener('click', () => {
    state.selectionMode = state.selectionMode === 'region' ? 'tile' : 'region';
    regionSelectButton.classList.toggle('irs-sprite-slicer__button--active', state.selectionMode === 'region');
    if (state.selectionMode !== 'region') {
      state.pendingRegion = null;
      endInteraction();
      schedulePreviewRender();
    }
  });

  previewCanvas.addEventListener('pointerdown', (event) => {
    if (state.selectionMode !== 'region' || !state.imageBlob) {
      return;
    }
    const point = pointerToCanvasPoint(event);
    const tile = pointerToTile(event);
    if (!point || !tile) {
      return;
    }

    const activeRegion = getRegionById(state.activeRegionId);
    const handle = activeRegion ? hitTestHandle(point) : null;

    if (handle && activeRegion) {
      beginInteraction('handle', event.pointerId, point, tile, activeRegion, handle);
      previewCanvas.setPointerCapture(event.pointerId);
      return;
    }

    const hitRegion = hitTestRegion(point);
    if (activeRegion && hitRegion?.id === activeRegion.id) {
      beginInteraction('move', event.pointerId, point, tile, activeRegion);
      previewCanvas.setPointerCapture(event.pointerId);
      return;
    }

    if (hitRegion) {
      setActiveRegion(hitRegion.id);
      state.activeRegionOriginal = { ...hitRegion.rect, name: hitRegion.name };
      updateSelectionControls();
      return;
    }

    state.pendingRegion = {
      startCol: tile.col,
      startRow: tile.row,
      endCol: tile.col,
      endRow: tile.row,
    };
    beginInteraction('dragNew', event.pointerId, point, tile, null);
    previewCanvas.setPointerCapture(event.pointerId);
    schedulePreviewRender();
  });

  previewCanvas.addEventListener('pointermove', (event) => {
    if (state.interaction.kind === 'none') {
      return;
    }
    if (state.interaction.pointerId !== event.pointerId) {
      return;
    }
    const point = pointerToCanvasPoint(event);
    const tile = pointerToTile(event);
    if (!point || !tile) {
      return;
    }

    const startPoint = state.interaction.startPointerPx;
    const moveDistance = startPoint ? Math.hypot(point.x - startPoint.x, point.y - startPoint.y) : 0;
    if (!state.interaction.active && moveDistance < 8) {
      return;
    }
    state.interaction.active = true;

    if (state.interaction.kind === 'dragNew' && state.pendingRegion) {
      state.pendingRegion.endCol = tile.col;
      state.pendingRegion.endRow = tile.row;
      schedulePreviewRender();
      return;
    }

    const activeRegion = getRegionById(state.activeRegionId);
    const startTile = state.interaction.startTile;
    if (!activeRegion || !startTile) {
      return;
    }
    const deltaCol = tile.col - startTile.col;
    const deltaRow = tile.row - startTile.row;

    if (state.interaction.kind === 'move' && state.interaction.startRegion) {
      activeRegion.rect = clampRegionRect({
        x: state.interaction.startRegion.x + deltaCol * state.sliceWidth,
        y: state.interaction.startRegion.y + deltaRow * state.sliceHeight,
        w: state.interaction.startRegion.w,
        h: state.interaction.startRegion.h,
      });
      schedulePreviewRender();
      updateRegionsList();
      return;
    }

    if (state.interaction.kind === 'handle' && state.interaction.handle) {
      applyResizeFromHandle(activeRegion, state.interaction.handle, deltaCol, deltaRow);
      schedulePreviewRender();
      updateRegionsList();
    }
  });

  previewCanvas.addEventListener('pointerup', (event) => {
    if (state.interaction.pointerId !== event.pointerId) {
      return;
    }
    if (state.interaction.kind === 'dragNew' && state.pendingRegion) {
      if (state.interaction.active) {
        commitPendingRegion();
      } else {
        state.pendingRegion = null;
        setActiveRegion(null);
      }
    } else if (state.interaction.kind !== 'none' && state.interaction.active) {
      void updateSliceResults();
    } else if (state.interaction.kind !== 'none' && !state.interaction.active) {
      const point = pointerToCanvasPoint(event);
      if (point && !hitTestRegion(point)) {
        setActiveRegion(null);
        updateSelectionControls();
      }
    }
    endInteraction();
  });

  previewCanvas.addEventListener('pointercancel', () => {
    state.pendingRegion = null;
    endInteraction();
    schedulePreviewRender();
  });

  moveModeButton.addEventListener('click', () => {
    state.activeMode = 'move';
    updateSelectionControls();
  });

  resizeModeButton.addEventListener('click', () => {
    state.activeMode = 'resize';
    updateSelectionControls();
  });

  stepOneButton.addEventListener('click', () => {
    state.activeStep = 1;
    updateSelectionControls();
  });

  stepFourButton.addEventListener('click', () => {
    state.activeStep = 4;
    updateSelectionControls();
  });

  function applyNudge(dx: number, dy: number): void {
    const region = getRegionById(state.activeRegionId);
    if (!region) {
      return;
    }
    if (!state.activeRegionOriginal) {
      state.activeRegionOriginal = { ...region.rect, name: region.name };
    }
    const step = state.activeStep;
    if (state.activeMode === 'move') {
      region.rect = clampRegionRect({
        x: region.rect.x + dx * step * state.sliceWidth,
        y: region.rect.y + dy * step * state.sliceHeight,
        w: region.rect.w,
        h: region.rect.h,
      });
    } else {
      region.rect = clampRegionRect({
        x: region.rect.x,
        y: region.rect.y,
        w: Math.max(state.sliceWidth, region.rect.w + dx * step * state.sliceWidth),
        h: Math.max(state.sliceHeight, region.rect.h + dy * step * state.sliceHeight),
      });
    }
    updateRegionsList();
    schedulePreviewRender();
    void updateSliceResults();
  }

  function bindRepeat(button: HTMLButtonElement, onStep: () => void): void {
    let timeoutId = 0;
    let intervalId = 0;
    const stop = (): void => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      timeoutId = 0;
      intervalId = 0;
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      onStep();
      stop();
      timeoutId = window.setTimeout(() => {
        intervalId = window.setInterval(onStep, 90);
      }, 250);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((eventName) => {
      button.addEventListener(eventName, stop);
    });
  }

  bindRepeat(leftButton, () => applyNudge(state.activeMode === 'move' ? -1 : -1, 0));
  bindRepeat(rightButton, () => applyNudge(1, 0));
  bindRepeat(upButton, () => applyNudge(0, -1));
  bindRepeat(downButton, () => applyNudge(0, 1));

  doneSelectionButton.addEventListener('click', () => {
    setActiveRegion(null);
    updateSelectionControls();
  });

  cancelSelectionButton.addEventListener('click', () => {
    const region = getRegionById(state.activeRegionId);
    if (region && state.activeRegionOriginal) {
      region.rect = clampRegionRect({
        x: state.activeRegionOriginal.x,
        y: state.activeRegionOriginal.y,
        w: state.activeRegionOriginal.w,
        h: state.activeRegionOriginal.h,
      });
      updateRegionsList();
      schedulePreviewRender();
      void updateSliceResults();
    }
    setActiveRegion(null);
    updateSelectionControls();
  });

  confirmButton.addEventListener('click', async () => {
    if (!state.imageBlob) return;

    uxFeedback.motion.pulse(confirmButton);

    if (state.sliceMode === 'atlas') {
      const imageDataUrl = await blobToDataUrl(state.imageBlob);
      const atlasSlices = await buildAtlasSlices();
      onAtlasConfirmed?.({
        imageDataUrl,
        imageWidth: state.imageWidth,
        imageHeight: state.imageHeight,
        slices: atlasSlices,
        groupName: state.groupName,
        groupType: state.groupType,
        imageName: state.imageName,
        sliceSize: { width: state.sliceWidth, height: state.sliceHeight },
      });
      uxFeedback.toast.success(`Sprite sliced into ${atlasSlices.length} frames.`);
    } else {
      const slices = await buildSeparateSlices();
      state.slices = slices;
      onSlicesConfirmed?.({
        slices,
        groupName: state.groupName,
        groupType: state.groupType,
        imageName: state.imageName,
        sliceSize: { width: state.sliceWidth, height: state.sliceHeight },
      });
      uxFeedback.toast.success(`Sprite sliced into ${slices.length} frames.`);
    }
  });

  updateModeToggle();
  updateRegionsList();
  updateSelectionControls();
  updateSliceInputs();
  schedulePreviewRender();

  return {
    destroy: () => {
      if (state.imageUrl) {
        URL.revokeObjectURL(state.imageUrl);
      }
      container.removeChild(root);
    },
  };
}


export const SpriteSlicerPlugin = {
  id: 'sprites',
  label: 'Sprites',
  icon: 'S',
  mount: (container: HTMLElement, context: import('@/editor/core/tabRegistry').EditorPluginContext) => createSpriteSlicerTab({
    container,
    onSlicesConfirmed: (payload) => {
      const registry = context.assetRegistry;
      if (!registry) {
        return;
      }
      const { slices, groupName, groupType, imageName, sliceSize } = payload;
      const baseName = groupName || imageName || 'Asset Group';
      const assetType = groupType === 'entities' ? 'entity' as const : groupType === 'props' ? 'sprite' as const : 'tile' as const;
      const assetsToAdd = slices.map((slice, index) => ({
        name: `${baseName} ${index + 1}`,
        type: assetType,
        dataUrl: slice.dataUrl,
        width: sliceSize.width,
        height: sliceSize.height,
        source: 'local' as const,
      }));
      registry.addAssets({ groupType, groupName: baseName, assets: assetsToAdd });
      context.openTab('assets');
    },
    onAtlasConfirmed: (payload) => {
      const registry = context.assetRegistry;
      if (!registry) {
        return;
      }
      const { imageDataUrl, imageWidth, imageHeight, slices, groupName, groupType, imageName } = payload;
      const baseName = groupName || imageName || 'Asset Group';
      const assetType = groupType === 'entities' ? 'entity' as const : groupType === 'props' ? 'sprite' as const : 'tile' as const;
      const sourceAssets = registry.addAssets({
        groupType,
        groupName: baseName,
        assets: [{
          name: `${baseName} (sheet)`,
          type: assetType,
          dataUrl: imageDataUrl,
          width: imageWidth,
          height: imageHeight,
          source: 'local',
        }],
      });
      const sourceAsset = sourceAssets[0];
      if (!sourceAsset) return;
      registry.addAssets({
        groupType,
        groupName: baseName,
        assets: slices.map((slice) => ({
          name: slice.name,
          type: assetType,
          dataUrl: imageDataUrl,
          width: slice.rect.w,
          height: slice.rect.h,
          source: 'local',
          sourceAssetId: sourceAsset.id,
          rect: { ...slice.rect },
        })),
      });
      context.openTab('assets');
    },
  }),
} satisfies import('@/editor/core/tabRegistry').BerryTabPlugin;
