import {
  computeNonEmptyTileMask,
  sliceImage,
  sliceImageRegions,
  type AssetGroupType,
  type SliceResult,
} from '@/editor/assets';

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

const STYLES = `
  .sprite-slicer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: #e6ecff;
  }

  .sprite-slicer__section {
    background: rgba(20, 30, 60, 0.85);
    border: 1px solid #253461;
    border-radius: 14px;
    padding: 12px;
  }

  .sprite-slicer__title {
    font-size: 13px;
    font-weight: 700;
    color: #dbe4ff;
    margin-bottom: 8px;
  }

  .sprite-slicer__button {
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 2px solid transparent;
    background: #1b2a52;
    color: #dbe4ff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .sprite-slicer__button:active {
    background: #26386a;
  }

  .sprite-slicer__button--primary {
    background: #2f3b66;
    color: #ffffff;
  }

  .sprite-slicer__button--primary:active {
    background: #3a4a80;
  }

  .sprite-slicer__button--active {
    background: #3a4a80;
    border-color: #6ba5ff;
  }

  .sprite-slicer__row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .sprite-slicer__select,
  .sprite-slicer__input {
    min-height: 44px;
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(22, 30, 60, 0.85);
    color: #f2f5ff;
    font-size: 13px;
  }

  .sprite-slicer__hint {
    font-size: 12px;
    color: #9aa7d6;
  }

  .sprite-slicer__preview {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sprite-slicer__canvas {
    width: 100%;
    border-radius: 12px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: #0d142a;
    touch-action: none;
  }

  .sprite-slicer__meta {
    font-size: 12px;
    color: #a8b4e6;
  }

  .sprite-slicer__slice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 8px;
  }

  .sprite-slicer__slice {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 10px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(22, 30, 60, 0.85);
    object-fit: cover;
  }

  .sprite-slicer__mode-toggle {
    display: flex;
    gap: 0;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid rgba(83, 101, 164, 0.6);
  }

  .sprite-slicer__mode-option {
    flex: 1;
    min-height: 40px;
    padding: 6px 10px;
    border: none;
    background: rgba(22, 30, 60, 0.85);
    color: #9aa7d6;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .sprite-slicer__mode-option--active {
    background: #2f3b66;
    color: #ffffff;
  }

  .sprite-slicer__mode-option:not(:last-child) {
    border-right: 1px solid rgba(83, 101, 164, 0.6);
  }

  .sprite-slicer__regions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .sprite-slicer__region-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #dbe4ff;
  }

  .sprite-slicer__region-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sprite-slicer__region-name {
    min-height: 44px;
    border: none;
    background: transparent;
    color: #dbe4ff;
    font-size: 12px;
    font-weight: 600;
    text-align: left;
    padding: 4px 0;
    cursor: pointer;
  }

  .sprite-slicer__region-name-input {
    min-height: 44px;
    max-width: 180px;
    padding: 4px 8px;
    border-radius: 8px;
    border: 1px solid rgba(83, 101, 164, 0.8);
    background: rgba(22, 30, 60, 0.95);
    color: #f2f5ff;
    font-size: 12px;
  }

  .sprite-slicer__region-size {
    color: #9aa7d6;
    font-size: 11px;
    white-space: nowrap;
  }

  .sprite-slicer__region-remove {
    min-height: 30px;
    padding: 4px 8px;
    border-radius: 8px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(22, 30, 60, 0.85);
    color: #e6ecff;
    cursor: pointer;
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

export function createSpriteSlicerTab(config: SpriteSlicerTabConfig): { destroy: () => void } {
  const { container, onSlicesConfirmed, onAtlasConfirmed } = config;

  if (!document.getElementById('sprite-slicer-tab-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'sprite-slicer-tab-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

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
  root.className = 'sprite-slicer';

  const importSection = document.createElement('section');
  importSection.className = 'sprite-slicer__section';

  const importTitle = document.createElement('div');
  importTitle.className = 'sprite-slicer__title';
  importTitle.textContent = 'Import Sprite Sheet';

  const importRow = document.createElement('div');
  importRow.className = 'sprite-slicer__row';

  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.className = 'sprite-slicer__button';
  importButton.textContent = 'Import Image';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';

  importButton.addEventListener('click', () => fileInput.click());

  const importHint = document.createElement('div');
  importHint.className = 'sprite-slicer__hint';
  importHint.textContent = 'PNG or GIF sprite sheets work best.';

  importRow.appendChild(importButton);
  importRow.appendChild(importHint);
  importSection.appendChild(importTitle);
  importSection.appendChild(importRow);

  const modeSection = document.createElement('section');
  modeSection.className = 'sprite-slicer__section';

  const modeTitle = document.createElement('div');
  modeTitle.className = 'sprite-slicer__title';
  modeTitle.textContent = 'Import Mode';

  const modeToggle = document.createElement('div');
  modeToggle.className = 'sprite-slicer__mode-toggle';

  const atlasOption = document.createElement('button');
  atlasOption.type = 'button';
  atlasOption.className = 'sprite-slicer__mode-option sprite-slicer__mode-option--active';
  atlasOption.textContent = 'Keep sheet + register slices';

  const separateOption = document.createElement('button');
  separateOption.type = 'button';
  separateOption.className = 'sprite-slicer__mode-option';
  separateOption.textContent = 'Export as separate images';

  modeToggle.appendChild(atlasOption);
  modeToggle.appendChild(separateOption);

  const modeHint = document.createElement('div');
  modeHint.className = 'sprite-slicer__hint';
  modeHint.textContent = 'Atlas mode keeps the spritesheet intact and registers slice regions as assets.';

  const sliceSection = document.createElement('section');
  sliceSection.className = 'sprite-slicer__section';

  const sliceTitle = document.createElement('div');
  sliceTitle.className = 'sprite-slicer__title';
  sliceTitle.textContent = 'Slice Settings';

  const sliceRow = document.createElement('div');
  sliceRow.className = 'sprite-slicer__row';

  const sizeSelect = document.createElement('select');
  sizeSelect.className = 'sprite-slicer__select';
  sizeSelect.innerHTML = `
    <option value="16">16 × 16</option>
    <option value="32">32 × 32</option>
    <option value="custom">Custom</option>
  `;

  const widthInput = document.createElement('input');
  widthInput.type = 'number';
  widthInput.min = '1';
  widthInput.value = '16';
  widthInput.className = 'sprite-slicer__input';
  widthInput.style.display = 'none';

  const heightInput = document.createElement('input');
  heightInput.type = 'number';
  heightInput.min = '1';
  heightInput.value = '16';
  heightInput.className = 'sprite-slicer__input';
  heightInput.style.display = 'none';

  const sizeHint = document.createElement('div');
  sizeHint.className = 'sprite-slicer__hint';
  sizeHint.textContent = 'Choose tile size to match your grid.';

  const skipEmptyWrap = document.createElement('label');
  skipEmptyWrap.className = 'sprite-slicer__row';
  const skipEmptyInput = document.createElement('input');
  skipEmptyInput.type = 'checkbox';
  skipEmptyInput.checked = true;
  const skipEmptyText = document.createElement('span');
  skipEmptyText.className = 'sprite-slicer__hint';
  skipEmptyText.textContent = 'Skip empty tiles';
  skipEmptyWrap.appendChild(skipEmptyInput);
  skipEmptyWrap.appendChild(skipEmptyText);

  const groupRow = document.createElement('div');
  groupRow.className = 'sprite-slicer__row';

  const groupInput = document.createElement('input');
  groupInput.type = 'text';
  groupInput.className = 'sprite-slicer__input';
  groupInput.placeholder = 'Group name (e.g., Trees)';

  const groupSelect = document.createElement('select');
  groupSelect.className = 'sprite-slicer__select';
  groupSelect.innerHTML = `
    <option value="tilesets">Tilesets</option>
    <option value="props">Props</option>
    <option value="entities">Entities</option>
  `;

  const groupHint = document.createElement('div');
  groupHint.className = 'sprite-slicer__hint';
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
  previewSection.className = 'sprite-slicer__section';

  const previewTitle = document.createElement('div');
  previewTitle.className = 'sprite-slicer__title';
  previewTitle.textContent = 'Preview';

  const preview = document.createElement('div');
  preview.className = 'sprite-slicer__preview';

  const previewControls = document.createElement('div');
  previewControls.className = 'sprite-slicer__row';
  const regionSelectButton = document.createElement('button');
  regionSelectButton.type = 'button';
  regionSelectButton.className = 'sprite-slicer__button';
  regionSelectButton.textContent = 'Region Select';
  const regionHint = document.createElement('div');
  regionHint.className = 'sprite-slicer__hint';
  regionHint.textContent = 'Drag on the preview to create a larger sprite region aligned to the grid.';
  previewControls.appendChild(regionSelectButton);
  previewControls.appendChild(regionHint);

  const previewCanvas = document.createElement('canvas');
  previewCanvas.className = 'sprite-slicer__canvas';

  const previewMeta = document.createElement('div');
  previewMeta.className = 'sprite-slicer__meta';
  previewMeta.textContent = 'Import an image to preview slices.';

  const regionsList = document.createElement('div');
  regionsList.className = 'sprite-slicer__regions';

  preview.appendChild(previewControls);
  preview.appendChild(previewCanvas);
  preview.appendChild(previewMeta);
  preview.appendChild(regionsList);

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'sprite-slicer__button sprite-slicer__button--primary';
  confirmButton.textContent = 'Confirm Atlas Import';
  confirmButton.disabled = true;

  const sliceGrid = document.createElement('div');
  sliceGrid.className = 'sprite-slicer__slice-grid';

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

  function updateRegionsList(): void {
    regionsList.innerHTML = '';
    if (state.customRegions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sprite-slicer__hint';
      empty.textContent = 'No custom regions yet.';
      regionsList.appendChild(empty);
      return;
    }

    state.customRegions.forEach((region) => {
      const item = document.createElement('div');
      item.className = 'sprite-slicer__region-item';
      const widthTiles = Math.floor(region.rect.w / state.sliceWidth);
      const heightTiles = Math.floor(region.rect.h / state.sliceHeight);

      const main = document.createElement('div');
      main.className = 'sprite-slicer__region-main';

      const nameButton = document.createElement('button');
      nameButton.type = 'button';
      nameButton.className = 'sprite-slicer__region-name';
      nameButton.textContent = region.name;
      nameButton.title = 'Tap to rename';

      const startRename = (): void => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'sprite-slicer__region-name-input';
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

      nameButton.addEventListener('click', startRename);

      const size = document.createElement('span');
      size.className = 'sprite-slicer__region-size';
      size.textContent = `(${widthTiles}x${heightTiles})`;

      main.appendChild(nameButton);
      main.appendChild(size);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'sprite-slicer__region-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        state.customRegions = state.customRegions.filter((entry) => entry.id !== region.id);
        updateRegionsList();
        schedulePreviewRender();
        void updateSliceResults();
      });
      item.appendChild(main);
      item.appendChild(remove);
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

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 184, 46, 0.95)';
    state.customRegions.forEach((region) => {
      ctx.strokeRect(
        region.rect.x * scale + 1,
        region.rect.y * scale + 1,
        Math.max(1, region.rect.w * scale - 2),
        Math.max(1, region.rect.h * scale - 2)
      );
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

    const isDraggingRegion = state.pendingRegion !== null;
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
      img.className = 'sprite-slicer__slice';
      img.src = slice.dataUrl;
      img.alt = 'Slice preview';
      sliceGrid.appendChild(img);
    });
    if (slices.length > 24) {
      const more = document.createElement('div');
      more.className = 'sprite-slicer__hint';
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
    atlasOption.classList.toggle('sprite-slicer__mode-option--active', state.sliceMode === 'atlas');
    separateOption.classList.toggle('sprite-slicer__mode-option--active', state.sliceMode === 'separate');
    modeHint.textContent =
      state.sliceMode === 'atlas'
        ? 'Atlas mode keeps the spritesheet intact and registers slice regions as assets.'
        : 'Separate mode cuts the sheet into individual image files.';
    confirmButton.textContent = state.sliceMode === 'atlas' ? 'Confirm Atlas Import' : 'Confirm Slice';
  }

  function clearRegions(): void {
    state.customRegions = [];
    state.pendingRegion = null;
    state.nextRegionIndex = 1;
    updateRegionsList();
  }

  function pointerToTile(event: PointerEvent): { col: number; row: number } | null {
    if (!state.imageWidth || !state.imageHeight || !state.sliceWidth || !state.sliceHeight) {
      return null;
    }
    const rect = previewCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width - 1);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height - 1);
    const imageX = (x / rect.width) * state.imageWidth;
    const imageY = (y / rect.height) * state.imageHeight;
    const { columns, rows } = getGridSize();
    const col = Math.min(columns - 1, Math.max(0, Math.floor(imageX / state.sliceWidth)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(imageY / state.sliceHeight)));
    return { col, row };
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

  regionSelectButton.addEventListener('click', () => {
    state.selectionMode = state.selectionMode === 'region' ? 'tile' : 'region';
    regionSelectButton.classList.toggle('sprite-slicer__button--active', state.selectionMode === 'region');
    if (state.selectionMode !== 'region') {
      state.pendingRegion = null;
      schedulePreviewRender();
    }
  });

  previewCanvas.addEventListener('pointerdown', (event) => {
    if (state.selectionMode !== 'region' || !state.imageBlob) {
      return;
    }
    const tile = pointerToTile(event);
    if (!tile) {
      return;
    }
    state.pendingRegion = {
      startCol: tile.col,
      startRow: tile.row,
      endCol: tile.col,
      endRow: tile.row,
    };
    previewCanvas.setPointerCapture(event.pointerId);
    schedulePreviewRender();
  });

  previewCanvas.addEventListener('pointermove', (event) => {
    if (!state.pendingRegion) {
      return;
    }
    const tile = pointerToTile(event);
    if (!tile) {
      return;
    }
    state.pendingRegion.endCol = tile.col;
    state.pendingRegion.endRow = tile.row;
    schedulePreviewRender();
  });

  previewCanvas.addEventListener('pointerup', () => {
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
      rect,
    };
    state.nextRegionIndex += 1;
    state.customRegions.push(region);
    state.pendingRegion = null;

    updateRegionsList();
    schedulePreviewRender();
    void updateSliceResults();
  });

  confirmButton.addEventListener('click', async () => {
    if (!state.imageBlob) return;

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
    }
  });

  updateModeToggle();
  updateRegionsList();
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
