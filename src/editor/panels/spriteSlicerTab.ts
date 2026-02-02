import { sliceImage, type SliceResult } from '@/editor/assets';

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
`;

export interface SpriteSlicerTabConfig {
  container: HTMLElement;
  onSlicesConfirmed?: (slices: SliceResult[]) => void;
}

type SlicePreset = '16' | '32' | 'custom';

interface SpriteSlicerState {
  imageBlob: Blob | null;
  imageUrl: string | null;
  imageName: string | null;
  imageWidth: number;
  imageHeight: number;
  slicePreset: SlicePreset;
  sliceWidth: number;
  sliceHeight: number;
  slices: SliceResult[];
}

export function createSpriteSlicerTab(config: SpriteSlicerTabConfig): { destroy: () => void } {
  const { container, onSlicesConfirmed } = config;

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
    slicePreset: '16',
    sliceWidth: 16,
    sliceHeight: 16,
    slices: [],
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

  sliceRow.appendChild(sizeSelect);
  sliceRow.appendChild(widthInput);
  sliceRow.appendChild(heightInput);
  sliceRow.appendChild(sizeHint);

  sliceSection.appendChild(sliceTitle);
  sliceSection.appendChild(sliceRow);

  const previewSection = document.createElement('section');
  previewSection.className = 'sprite-slicer__section';

  const previewTitle = document.createElement('div');
  previewTitle.className = 'sprite-slicer__title';
  previewTitle.textContent = 'Preview';

  const preview = document.createElement('div');
  preview.className = 'sprite-slicer__preview';

  const previewCanvas = document.createElement('canvas');
  previewCanvas.className = 'sprite-slicer__canvas';

  const previewMeta = document.createElement('div');
  previewMeta.className = 'sprite-slicer__meta';
  previewMeta.textContent = 'Import an image to preview slices.';

  preview.appendChild(previewCanvas);
  preview.appendChild(previewMeta);

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'sprite-slicer__button sprite-slicer__button--primary';
  confirmButton.textContent = 'Confirm Slice';
  confirmButton.disabled = true;

  const sliceGrid = document.createElement('div');
  sliceGrid.className = 'sprite-slicer__slice-grid';

  previewSection.appendChild(previewTitle);
  previewSection.appendChild(preview);
  previewSection.appendChild(confirmButton);
  previewSection.appendChild(sliceGrid);

  root.appendChild(importSection);
  root.appendChild(sliceSection);
  root.appendChild(previewSection);
  root.appendChild(fileInput);

  container.appendChild(root);

  function clearSlices(): void {
    state.slices = [];
    sliceGrid.innerHTML = '';
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

  function updatePreviewCanvas(): void {
    const ctx = previewCanvas.getContext('2d');
    if (!ctx || !state.imageUrl || state.imageWidth === 0 || state.imageHeight === 0) {
      previewCanvas.width = 1;
      previewCanvas.height = 1;
      previewMeta.textContent = 'Import an image to preview slices.';
      return;
    }

    const maxWidth = Math.min(container.clientWidth - 24, 280);
    const maxHeight = 240;
    const scale = Math.min(
      maxWidth / state.imageWidth,
      maxHeight / state.imageHeight,
      1
    );
    const displayWidth = Math.max(1, Math.floor(state.imageWidth * scale));
    const displayHeight = Math.max(1, Math.floor(state.imageHeight * scale));
    const dpr = window.devicePixelRatio || 1;

    previewCanvas.width = displayWidth * dpr;
    previewCanvas.height = displayHeight * dpr;
    previewCanvas.style.width = `${displayWidth}px`;
    previewCanvas.style.height = `${displayHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.6)';
      ctx.lineWidth = 1;

      const tileWidth = state.sliceWidth * scale;
      const tileHeight = state.sliceHeight * scale;
      const columns = Math.floor(state.imageWidth / state.sliceWidth);
      const rows = Math.floor(state.imageHeight / state.sliceHeight);

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
    };
    img.src = state.imageUrl;

    const remainderX = state.imageWidth % state.sliceWidth;
    const remainderY = state.imageHeight % state.sliceHeight;
    const remainderNote =
      remainderX !== 0 || remainderY !== 0
        ? ' (extra pixels will be ignored)'
        : '';
    previewMeta.textContent = `${state.imageWidth}×${state.imageHeight}px — ${
      Math.floor(state.imageWidth / state.sliceWidth)
    }×${Math.floor(state.imageHeight / state.sliceHeight)} tiles${remainderNote}`;
  }

  async function updateSliceResults(): Promise<void> {
    clearSlices();
    if (!state.imageBlob) {
      confirmButton.disabled = true;
      return;
    }

    confirmButton.disabled = false;
    const slices = await sliceImage(state.imageBlob, state.sliceWidth, state.sliceHeight);
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

    const img = new Image();
    img.onload = () => {
      state.imageWidth = img.naturalWidth;
      state.imageHeight = img.naturalHeight;
      updatePreviewCanvas();
    };
    img.onerror = () => {
      previewMeta.textContent = 'Failed to load image.';
    };
    img.src = state.imageUrl;

    updatePreviewCanvas();
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
    updateSliceInputs();
    updatePreviewCanvas();
    void updateSliceResults();
  }

  function handleCustomSizeChange(): void {
    state.sliceWidth = Math.max(1, Number(widthInput.value) || 1);
    state.sliceHeight = Math.max(1, Number(heightInput.value) || 1);
    updatePreviewCanvas();
    void updateSliceResults();
  }

  fileInput.addEventListener('change', (event) => {
    void handleFileChange(event);
  });

  sizeSelect.addEventListener('change', handlePresetChange);
  widthInput.addEventListener('input', handleCustomSizeChange);
  heightInput.addEventListener('input', handleCustomSizeChange);

  confirmButton.addEventListener('click', async () => {
    if (!state.imageBlob) return;
    const slices = await sliceImage(state.imageBlob, state.sliceWidth, state.sliceHeight);
    state.slices = slices;
    onSlicesConfirmed?.(slices);
  });

  updateSliceInputs();
  updatePreviewCanvas();

  return {
    destroy: () => {
      if (state.imageUrl) {
        URL.revokeObjectURL(state.imageUrl);
      }
      container.removeChild(root);
    },
  };
}
