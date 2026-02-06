import type {
  AssetEntry,
  AssetRegistry,
  AnimationAsset,
  AnimationFrameRef,
  AnimationLoopMode,
} from '@/editor/assets';
import type { EditorState } from '@/storage/hot';
import type { EntityManager } from '@/editor/entities/entityManager';
import type { HistoryManager, Operation } from '@/editor/history';
import { generateOperationId } from '@/editor/history';
import { resolveAssetUrl } from '@/shared/paths';

const STYLES = `
  .animation-tab {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: #e6ecff;
  }

  .animation-tab__preview {
    background: rgba(20, 30, 60, 0.85);
    border: 1px solid #253461;
    border-radius: 18px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .animation-tab__preview-stage {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 14px;
    background: #0f172f;
    border: 1px solid rgba(83, 101, 164, 0.6);
    overflow: hidden;
    touch-action: none;
  }

  .animation-tab__canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  .animation-tab__preview-overlay {
    position: absolute;
    inset: 8px;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
    pointer-events: none;
  }

  .animation-tab__chip {
    min-height: 32px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(83, 101, 164, 0.7);
    background: rgba(18, 26, 52, 0.85);
    color: #dbe4ff;
    font-size: 12px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    pointer-events: auto;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .animation-tab__chip:active {
    background: rgba(40, 54, 92, 0.9);
  }

  .animation-tab__chip--active {
    border-color: #4a9eff;
    background: rgba(74, 158, 255, 0.2);
    color: #ffffff;
  }

  .animation-tab__preview-hint {
    font-size: 12px;
    color: #9aa7d6;
  }

  .animation-tab__frames {
    background: rgba(20, 30, 60, 0.85);
    border: 1px solid #253461;
    border-radius: 18px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .animation-tab__frames-title {
    font-size: 13px;
    font-weight: 700;
    color: #dbe4ff;
  }

  .animation-tab__frames-strip {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
  }

  .animation-tab__frame {
    flex: 0 0 auto;
    width: 56px;
    height: 56px;
    border-radius: 12px;
    border: 2px solid transparent;
    background: rgba(22, 30, 60, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .animation-tab__frame img {
    width: 100%;
    height: 100%;
    border-radius: 10px;
    object-fit: cover;
  }

  .animation-tab__frame--selected {
    border-color: #4a9eff;
  }

  .animation-tab__frame--dragging {
    opacity: 0.6;
    border-color: rgba(255, 255, 255, 0.4);
  }

  .animation-tab__frame-index {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 10px;
    color: #dbe4ff;
    background: rgba(10, 15, 30, 0.7);
    padding: 2px 4px;
    border-radius: 6px;
  }

  .animation-tab__frame-add {
    border-style: dashed;
    color: #9aa7d6;
    font-size: 20px;
    font-weight: 700;
    cursor: pointer;
  }

  .animation-tab__context {
    background: rgba(20, 30, 60, 0.85);
    border: 1px solid #253461;
    border-radius: 18px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .animation-tab__row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .animation-tab__button {
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

  .animation-tab__button:active {
    background: #26386a;
  }

  .animation-tab__button--primary {
    background: #2f3b66;
    color: #ffffff;
  }

  .animation-tab__button--primary:active {
    background: #3a4a80;
  }

  .animation-tab__button--ghost {
    background: transparent;
    border-color: rgba(83, 101, 164, 0.6);
  }

  .animation-tab__button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .animation-tab__hint {
    font-size: 12px;
    color: #9aa7d6;
  }

  .animation-tab__sheet {
    position: fixed;
    inset: 0;
    background: rgba(5, 8, 20, 0.6);
    display: none;
    align-items: flex-end;
    justify-content: center;
    z-index: 40;
  }

  .animation-tab__sheet--open {
    display: flex;
  }

  .animation-tab__sheet-panel {
    width: min(420px, 92vw);
    background: #0f162c;
    border-radius: 20px 20px 0 0;
    border: 1px solid rgba(83, 101, 164, 0.6);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 70vh;
    overflow-y: auto;
  }

  .animation-tab__sheet-title {
    font-size: 14px;
    font-weight: 700;
    color: #e6ecff;
  }

  .animation-tab__sheet-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .animation-tab__input {
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(22, 30, 60, 0.85);
    color: #f2f5ff;
    font-size: 13px;
  }

  .animation-tab__asset-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .animation-tab__asset-card {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 8px;
    border-radius: 12px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(22, 30, 60, 0.85);
    cursor: pointer;
  }

  .animation-tab__asset-card img {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    object-fit: cover;
  }

  .animation-tab__asset-name {
    font-size: 13px;
    font-weight: 600;
    color: #e6ecff;
  }

  .animation-tab__asset-meta {
    font-size: 11px;
    color: #93a1d8;
  }

  .animation-tab__pivot {
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 2px solid #4a9eff;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .animation-tab__pivot-line {
    position: absolute;
    background: rgba(74, 158, 255, 0.5);
    pointer-events: none;
  }
`;

const DEFAULT_FPS = 8;
const DEFAULT_LOOP_MODE: AnimationLoopMode = 'loop';
const DEFAULT_PIVOT = { x: 0.5, y: 0.5 };
const SOURCE_GROUP_NAME = 'Animation Sources';
const ENTITY_ANIMATION_KEY = 'animationId';
const ENTITY_ANIMATION_STATE_KEY = 'animationState';

interface AnimationFrameState {
  ref: AnimationFrameRef;
  thumbnailDataUrl: string;
}

interface AnimationTabState {
  sourceAssetId: string | null;
  sourceName: string | null;
  sourceImage: HTMLImageElement | null;
  frames: AnimationFrameState[];
  currentFrame: number;
  fps: number;
  loopMode: AnimationLoopMode;
  pivot: { x: number; y: number };
  showPivot: boolean;
  isPlaying: boolean;
  animationId: string | null;
  animationName: string;
  dirty: boolean;
  sheetOpen: boolean;
}

export interface AnimationTabConfig {
  container: HTMLElement;
  assetRegistry: AssetRegistry;
  getEditorState: () => EditorState | null;
  entityManager?: EntityManager;
  history?: HistoryManager;
}

export interface AnimationTabController {
  refresh(): void;
  destroy(): void;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image.'));
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function createFrameThumbnail(image: HTMLImageElement, rect: AnimationFrameRef['rect']): string {
  const canvas = document.createElement('canvas');
  canvas.width = rect.w;
  canvas.height = rect.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }
  ctx.drawImage(
    image,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    0,
    0,
    rect.w,
    rect.h
  );
  return canvas.toDataURL('image/png');
}

function buildGridFrames(options: {
  imageWidth: number;
  imageHeight: number;
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
}): AnimationFrameRef['rect'][] {
  const { imageWidth, imageHeight, tileWidth, tileHeight, margin, spacing } = options;
  const rects: AnimationFrameRef['rect'][] = [];

  for (
    let y = margin;
    y + tileHeight <= imageHeight;
    y += tileHeight + spacing
  ) {
    for (
      let x = margin;
      x + tileWidth <= imageWidth;
      x += tileWidth + spacing
    ) {
      rects.push({ x, y, w: tileWidth, h: tileHeight });
    }
  }

  return rects;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createAnimationTab(config: AnimationTabConfig): AnimationTabController {
  const { container, assetRegistry, getEditorState, entityManager, history } = config;

  if (!document.getElementById('animation-tab-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'animation-tab-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  const state: AnimationTabState = {
    sourceAssetId: null,
    sourceName: null,
    sourceImage: null,
    frames: [],
    currentFrame: 0,
    fps: DEFAULT_FPS,
    loopMode: DEFAULT_LOOP_MODE,
    pivot: { ...DEFAULT_PIVOT },
    showPivot: false,
    isPlaying: false,
    animationId: null,
    animationName: '',
    dirty: false,
    sheetOpen: false,
  };

  const root = document.createElement('div');
  root.className = 'animation-tab';

  const previewSection = document.createElement('section');
  previewSection.className = 'animation-tab__preview';

  const previewStage = document.createElement('div');
  previewStage.className = 'animation-tab__preview-stage';

  const previewCanvas = document.createElement('canvas');
  previewCanvas.className = 'animation-tab__canvas';
  previewStage.appendChild(previewCanvas);

  const pivotMarker = document.createElement('div');
  pivotMarker.className = 'animation-tab__pivot';
  previewStage.appendChild(pivotMarker);

  const pivotLineX = document.createElement('div');
  pivotLineX.className = 'animation-tab__pivot-line';
  previewStage.appendChild(pivotLineX);

  const pivotLineY = document.createElement('div');
  pivotLineY.className = 'animation-tab__pivot-line';
  previewStage.appendChild(pivotLineY);

  const overlay = document.createElement('div');
  overlay.className = 'animation-tab__preview-overlay';

  const playChip = document.createElement('button');
  playChip.type = 'button';
  playChip.className = 'animation-tab__chip';
  playChip.textContent = 'Play';

  const fpsChip = document.createElement('button');
  fpsChip.type = 'button';
  fpsChip.className = 'animation-tab__chip';

  const loopChip = document.createElement('button');
  loopChip.type = 'button';
  loopChip.className = 'animation-tab__chip';

  const pivotChip = document.createElement('button');
  pivotChip.type = 'button';
  pivotChip.className = 'animation-tab__chip';
  pivotChip.textContent = 'Pivot';

  overlay.appendChild(playChip);
  overlay.appendChild(fpsChip);
  overlay.appendChild(loopChip);
  overlay.appendChild(pivotChip);
  previewStage.appendChild(overlay);

  const previewHint = document.createElement('div');
  previewHint.className = 'animation-tab__preview-hint';
  previewHint.textContent = 'Import a spritesheet to start animating.';

  previewSection.appendChild(previewStage);
  previewSection.appendChild(previewHint);

  const framesSection = document.createElement('section');
  framesSection.className = 'animation-tab__frames';

  const framesTitle = document.createElement('div');
  framesTitle.className = 'animation-tab__frames-title';
  framesTitle.textContent = 'Frames';

  const framesStrip = document.createElement('div');
  framesStrip.className = 'animation-tab__frames-strip';

  framesSection.appendChild(framesTitle);
  framesSection.appendChild(framesStrip);

  const contextSection = document.createElement('section');
  contextSection.className = 'animation-tab__context';

  root.appendChild(previewSection);
  root.appendChild(framesSection);
  root.appendChild(contextSection);

  const sheetOverlay = document.createElement('div');
  sheetOverlay.className = 'animation-tab__sheet';

  const sheetPanel = document.createElement('div');
  sheetPanel.className = 'animation-tab__sheet-panel';

  const sheetTitle = document.createElement('div');
  sheetTitle.className = 'animation-tab__sheet-title';

  const sheetBody = document.createElement('div');
  const sheetActions = document.createElement('div');
  sheetActions.className = 'animation-tab__sheet-actions';

  sheetPanel.appendChild(sheetTitle);
  sheetPanel.appendChild(sheetBody);
  sheetPanel.appendChild(sheetActions);
  sheetOverlay.appendChild(sheetPanel);
  container.appendChild(root);
  container.appendChild(sheetOverlay);

  let animationFrameId: number | null = null;
  let lastTick = 0;
  let previewPointerDown = false;
  let previewMoved = false;
  let previewDragStartX = 0;
  let previewDragStartFrame = 0;
  let draggingPivot = false;
  let dragFrameIndex: number | null = null;
  let dragStartTimeout: number | null = null;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  container.appendChild(fileInput);

  function setSheetOpen(open: boolean): void {
    state.sheetOpen = open;
    sheetOverlay.classList.toggle('animation-tab__sheet--open', open);
  }

  function closeSheet(): void {
    setSheetOpen(false);
    sheetTitle.textContent = '';
    sheetBody.innerHTML = '';
    sheetActions.innerHTML = '';
  }

  function openSheet(options: {
    title: string;
    content: HTMLElement;
    confirmLabel?: string;
    onConfirm?: () => void;
  }): void {
    sheetTitle.textContent = options.title;
    sheetBody.innerHTML = '';
    sheetBody.appendChild(options.content);
    sheetActions.innerHTML = '';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'animation-tab__button animation-tab__button--ghost';
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', closeSheet);

    sheetActions.appendChild(cancelButton);

    if (options.onConfirm) {
      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = 'animation-tab__button animation-tab__button--primary';
      confirmButton.textContent = options.confirmLabel ?? 'Save';
      confirmButton.addEventListener('click', () => {
        options.onConfirm?.();
      });
      sheetActions.appendChild(confirmButton);
    }

    setSheetOpen(true);
  }

  function getSelectedEntity(): { id: string; animationId?: string } | null {
    if (!entityManager) return null;
    const editorState = getEditorState();
    const ids = editorState?.selectedEntityIds ?? [];
    if (ids.length !== 1) return null;
    const entity = entityManager.getEntity(ids[0]);
    if (!entity) return null;
    const animationId = entity.properties?.[ENTITY_ANIMATION_KEY];
    return { id: entity.id, animationId: typeof animationId === 'string' ? animationId : undefined };
  }

  function getSourceAssets(): AssetEntry[] {
    const groups = assetRegistry.getGroups();
    const assets: AssetEntry[] = [];
    groups.forEach((group) => {
      group.assets.forEach((asset) => {
        assets.push(asset);
      });
    });
    return assets.filter(
      (asset) => asset.type === 'tile' || asset.type === 'sprite' || asset.type === 'entity'
    );
  }

  async function loadSourceFromAsset(
    asset: AssetEntry,
    options?: { preserveAnimation?: boolean }
  ): Promise<void> {
    const url = resolveAssetUrl(asset.dataUrl);
    const image = await loadImage(url);
    state.sourceImage = image;
    state.sourceAssetId = asset.id;
    state.sourceName = asset.name;
    if (!options?.preserveAnimation) {
      state.frames = [];
      state.currentFrame = 0;
      state.animationId = null;
      state.animationName = asset.name;
      state.dirty = false;
    }
    stopPlayback();
    render();
  }

  async function handleImportFile(file: File): Promise<void> {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const created = assetRegistry.addAssets({
      groupType: 'props',
      groupName: SOURCE_GROUP_NAME,
      assets: [
        {
          name: baseName,
          type: 'sprite',
          dataUrl,
          width: image.naturalWidth,
          height: image.naturalHeight,
          source: 'local',
        },
      ],
    });
    await loadSourceFromAsset(created[0]);
  }

  function openAssetPicker(): void {
    const assets = getSourceAssets();
    const content = document.createElement('div');
    content.className = 'animation-tab__asset-list';

    if (assets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'animation-tab__hint';
      empty.textContent = 'No image assets yet. Import a spritesheet first.';
      content.appendChild(empty);
    } else {
      assets.forEach((asset) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'animation-tab__asset-card';
        const img = document.createElement('img');
        img.src = resolveAssetUrl(asset.dataUrl);
        img.alt = asset.name;
        const meta = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'animation-tab__asset-name';
        name.textContent = asset.name;
        const details = document.createElement('div');
        details.className = 'animation-tab__asset-meta';
        details.textContent = asset.source === 'repo' ? 'Repo asset' : 'Local asset';
        meta.appendChild(name);
        meta.appendChild(details);
        card.appendChild(img);
        card.appendChild(meta);
        card.addEventListener('click', async () => {
          closeSheet();
          await loadSourceFromAsset(asset);
        });
        content.appendChild(card);
      });
    }

    openSheet({
      title: 'Choose Existing Asset',
      content,
    });
  }

  function buildFramesFromGrid(options: {
    tileWidth: number;
    tileHeight: number;
    margin: number;
    spacing: number;
    append?: boolean;
  }): void {
    if (!state.sourceImage || !state.sourceAssetId) return;
    const rects = buildGridFrames({
      imageWidth: state.sourceImage.naturalWidth,
      imageHeight: state.sourceImage.naturalHeight,
      tileWidth: options.tileWidth,
      tileHeight: options.tileHeight,
      margin: options.margin,
      spacing: options.spacing,
    });

    const nextFrames = rects.map((rect) => ({
      ref: {
        sourceAssetId: state.sourceAssetId ?? '',
        rect,
      },
      thumbnailDataUrl: createFrameThumbnail(state.sourceImage!, rect),
    }));
    state.frames = options.append ? [...state.frames, ...nextFrames] : nextFrames;
    if (!options.append || state.frames.length === nextFrames.length) {
      state.currentFrame = 0;
    }
    state.dirty = true;
    render();
  }

  function openSliceSettings(options?: { append?: boolean }): void {
    const content = document.createElement('div');
    content.className = 'animation-tab__row';

    const widthInput = document.createElement('input');
    widthInput.className = 'animation-tab__input';
    widthInput.type = 'number';
    widthInput.min = '1';
    widthInput.value = '32';
    widthInput.placeholder = 'Tile W';

    const heightInput = document.createElement('input');
    heightInput.className = 'animation-tab__input';
    heightInput.type = 'number';
    heightInput.min = '1';
    heightInput.value = '32';
    heightInput.placeholder = 'Tile H';

    const marginInput = document.createElement('input');
    marginInput.className = 'animation-tab__input';
    marginInput.type = 'number';
    marginInput.min = '0';
    marginInput.value = '0';
    marginInput.placeholder = 'Margin';

    const spacingInput = document.createElement('input');
    spacingInput.className = 'animation-tab__input';
    spacingInput.type = 'number';
    spacingInput.min = '0';
    spacingInput.value = '0';
    spacingInput.placeholder = 'Spacing';

    content.appendChild(widthInput);
    content.appendChild(heightInput);
    content.appendChild(marginInput);
    content.appendChild(spacingInput);

    openSheet({
      title: 'Grid Slice Settings',
      content,
      confirmLabel: 'Generate Frames',
      onConfirm: () => {
        const tileWidth = Math.max(1, Number(widthInput.value) || 1);
        const tileHeight = Math.max(1, Number(heightInput.value) || 1);
        const margin = Math.max(0, Number(marginInput.value) || 0);
        const spacing = Math.max(0, Number(spacingInput.value) || 0);
        buildFramesFromGrid({ tileWidth, tileHeight, margin, spacing, append: options?.append });
        closeSheet();
      },
    });
  }

  function buildPosterDataUrl(): string | undefined {
    const frame = state.frames[0];
    if (!frame || !state.sourceImage) return undefined;
    return createFrameThumbnail(state.sourceImage, frame.ref.rect);
  }

  function saveAnimation(): void {
    if (state.frames.length === 0) return;
    const name = state.animationName.trim() || 'New Animation';
    const payload = {
      name,
      frames: state.frames.map((frame) => frame.ref),
      fps: state.fps,
      loopMode: state.loopMode,
      pivot: { ...state.pivot },
      posterDataUrl: buildPosterDataUrl(),
    };

    if (state.animationId) {
      const updated = assetRegistry.updateAnimation(state.animationId, payload);
      if (!updated) {
        state.animationId = null;
      }
    }

    if (!state.animationId) {
      const created = assetRegistry.addAnimation(payload);
      state.animationId = created.id;
    }

    state.animationName = name;
    state.dirty = false;
    render();
  }

  function openSaveSheet(): void {
    let loopValue: AnimationLoopMode = state.loopMode;
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '10px';

    const nameInput = document.createElement('input');
    nameInput.className = 'animation-tab__input';
    nameInput.type = 'text';
    nameInput.placeholder = 'Animation name';
    nameInput.value = state.animationName || '';

    const fpsInput = document.createElement('input');
    fpsInput.className = 'animation-tab__input';
    fpsInput.type = 'number';
    fpsInput.min = '1';
    fpsInput.max = '60';
    fpsInput.value = `${state.fps}`;

    const loopToggle = document.createElement('button');
    loopToggle.type = 'button';
    loopToggle.className = 'animation-tab__button animation-tab__button--ghost';
    loopToggle.textContent = `Loop: ${loopValue === 'loop' ? 'On' : 'Once'}`;

    loopToggle.addEventListener('click', () => {
      loopValue = loopValue === 'loop' ? 'once' : 'loop';
      loopToggle.textContent = `Loop: ${loopValue === 'loop' ? 'On' : 'Once'}`;
    });

    content.appendChild(nameInput);
    content.appendChild(fpsInput);
    content.appendChild(loopToggle);

    openSheet({
      title: 'Save Animation',
      content,
      confirmLabel: 'Save',
      onConfirm: () => {
        state.animationName = nameInput.value;
        state.fps = clamp(Number(fpsInput.value) || DEFAULT_FPS, 1, 60);
        state.loopMode = loopValue;
        state.dirty = true;
        saveAnimation();
        closeSheet();
      },
    });
  }

  function attachToSelectedEntity(): void {
    if (!entityManager || !state.animationId) return;
    const selected = getSelectedEntity();
    if (!selected) return;

    const previous = entityManager.getEntity(selected.id)?.properties?.[ENTITY_ANIMATION_KEY];
    const previousState =
      entityManager.getEntity(selected.id)?.properties?.[ENTITY_ANIMATION_STATE_KEY];
    const nextUpdates = [
      {
        id: selected.id,
        properties: {
          [ENTITY_ANIMATION_KEY]: state.animationId,
          [ENTITY_ANIMATION_STATE_KEY]: 'idle',
        },
      },
    ];
    const previousUpdates = [
      {
        id: selected.id,
        properties: {
          [ENTITY_ANIMATION_KEY]: previous as string | number | boolean | undefined,
          [ENTITY_ANIMATION_STATE_KEY]: previousState as string | number | boolean | undefined,
        },
      },
    ];

    entityManager.updateEntityProperties(nextUpdates);

    if (history) {
      const operation: Operation = {
        id: generateOperationId(),
        type: 'entity_property_change',
        description: 'Attach animation',
        execute: () => entityManager.updateEntityProperties(nextUpdates),
        undo: () => entityManager.updateEntityProperties(previousUpdates),
      };
      history.push(operation);
    }
  }

  function loadAnimation(animation: AnimationAsset): void {
    state.animationId = animation.id;
    state.animationName = animation.name;
    state.fps = animation.fps;
    state.loopMode = animation.loopMode;
    state.pivot = { ...animation.pivot };
    state.dirty = false;

    const firstFrame = animation.frames[0];
    if (firstFrame) {
      const asset = assetRegistry.getAsset(firstFrame.sourceAssetId);
      if (asset) {
        void loadSourceFromAsset(asset, { preserveAnimation: true }).then(() => {
          state.frames = animation.frames.map((frame) => ({
            ref: frame,
            thumbnailDataUrl: state.sourceImage
              ? createFrameThumbnail(state.sourceImage, frame.rect)
              : '',
          }));
          state.currentFrame = 0;
          render();
        });
        return;
      }
    }

    state.frames = animation.frames.map((frame) => ({
      ref: frame,
      thumbnailDataUrl: '',
    }));
    render();
  }

  function openEntityAnimation(): void {
    const selected = getSelectedEntity();
    if (!selected?.animationId) return;
    const animation = assetRegistry.getAnimation(selected.animationId);
    if (animation) {
      loadAnimation(animation);
    }
  }

  function updatePivotOverlay(): void {
    const rect = previewStage.getBoundingClientRect();
    const x = rect.width * state.pivot.x;
    const y = rect.height * state.pivot.y;
    pivotMarker.style.left = `${x}px`;
    pivotMarker.style.top = `${y}px`;
    pivotMarker.style.display = state.showPivot ? 'block' : 'none';

    pivotLineX.style.display = state.showPivot ? 'block' : 'none';
    pivotLineY.style.display = state.showPivot ? 'block' : 'none';
    pivotLineX.style.left = '0';
    pivotLineX.style.top = `${y}px`;
    pivotLineX.style.width = '100%';
    pivotLineX.style.height = '1px';

    pivotLineY.style.top = '0';
    pivotLineY.style.left = `${x}px`;
    pivotLineY.style.width = '1px';
    pivotLineY.style.height = '100%';
  }

  function drawPreview(): void {
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;
    const rect = previewStage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    previewCanvas.width = rect.width * dpr;
    previewCanvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!state.sourceImage || state.frames.length === 0) {
      ctx.fillStyle = '#9aa7d6';
      ctx.font = '12px sans-serif';
      ctx.fillText('No frames yet', 12, rect.height / 2);
      updatePivotOverlay();
      return;
    }

    const frame = state.frames[state.currentFrame];
    if (!frame) return;
    const { rect: frameRect } = frame.ref;
    const scale = Math.min(
      rect.width / frameRect.w,
      rect.height / frameRect.h
    );
    const drawWidth = frameRect.w * scale;
    const drawHeight = frameRect.h * scale;
    const dx = (rect.width - drawWidth) / 2;
    const dy = (rect.height - drawHeight) / 2;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      state.sourceImage,
      frameRect.x,
      frameRect.y,
      frameRect.w,
      frameRect.h,
      dx,
      dy,
      drawWidth,
      drawHeight
    );
    updatePivotOverlay();
  }

  function tick(time: number): void {
    if (!state.isPlaying || state.frames.length === 0) return;
    const interval = 1000 / state.fps;
    if (time - lastTick >= interval) {
      lastTick = time;
      if (state.currentFrame < state.frames.length - 1) {
        state.currentFrame += 1;
      } else if (state.loopMode === 'loop') {
        state.currentFrame = 0;
      } else {
        state.isPlaying = false;
      }
      render();
    }
    animationFrameId = requestAnimationFrame(tick);
  }

  function startPlayback(): void {
    if (state.frames.length === 0) return;
    if (state.isPlaying) return;
    state.isPlaying = true;
    lastTick = performance.now();
    animationFrameId = requestAnimationFrame(tick);
    render();
  }

  function stopPlayback(): void {
    state.isPlaying = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function togglePlayback(): void {
    if (state.isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function renderFrames(): void {
    framesStrip.innerHTML = '';
    state.frames.forEach((frame, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'animation-tab__frame';
      button.dataset.index = `${index}`;
      if (state.currentFrame === index) {
        button.classList.add('animation-tab__frame--selected');
      }
      if (dragFrameIndex === index) {
        button.classList.add('animation-tab__frame--dragging');
      }

      const img = document.createElement('img');
      img.src = frame.thumbnailDataUrl;
      img.alt = `Frame ${index + 1}`;
      button.appendChild(img);

      const label = document.createElement('div');
      label.className = 'animation-tab__frame-index';
      label.textContent = `${index + 1}`;
      button.appendChild(label);

      button.addEventListener('click', () => {
        state.currentFrame = index;
        render();
      });

      button.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse') return;
        dragStartTimeout = window.setTimeout(() => {
          dragFrameIndex = index;
          button.setPointerCapture(event.pointerId);
        }, 300);
      });

      button.addEventListener('pointerup', () => {
        if (dragStartTimeout) {
          clearTimeout(dragStartTimeout);
        }
        dragStartTimeout = null;
        dragFrameIndex = null;
        renderFrames();
      });

      button.addEventListener('pointermove', (event) => {
        if (dragFrameIndex === null) return;
        const target = document.elementFromPoint(event.clientX, event.clientY);
        if (!target) return;
        const frameElement = (target as HTMLElement).closest<HTMLElement>('.animation-tab__frame');
        if (!frameElement) return;
        const targetIndex = Number(frameElement.dataset.index);
        if (Number.isNaN(targetIndex) || targetIndex === dragFrameIndex) return;
        const nextFrames = [...state.frames];
        const [moved] = nextFrames.splice(dragFrameIndex, 1);
        nextFrames.splice(targetIndex, 0, moved);
        state.frames = nextFrames;
        state.currentFrame = targetIndex;
        dragFrameIndex = targetIndex;
        state.dirty = true;
        renderFrames();
      });

      framesStrip.appendChild(button);
    });

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'animation-tab__frame animation-tab__frame-add';
    addButton.textContent = '+';
    addButton.addEventListener('click', () => {
      if (state.sourceImage) {
        openSliceSettings({ append: true });
      } else {
        fileInput.click();
      }
    });
    framesStrip.appendChild(addButton);
  }

  function renderContext(): void {
    contextSection.innerHTML = '';

    if (!state.sourceImage) {
      const hint = document.createElement('div');
      hint.className = 'animation-tab__hint';
      hint.textContent = 'Start by importing a spritesheet or using an existing asset.';

      const row = document.createElement('div');
      row.className = 'animation-tab__row';

      const importButton = document.createElement('button');
      importButton.type = 'button';
      importButton.className = 'animation-tab__button animation-tab__button--primary';
      importButton.textContent = 'Import Spritesheet';
      importButton.addEventListener('click', () => fileInput.click());

      const existingButton = document.createElement('button');
      existingButton.type = 'button';
      existingButton.className = 'animation-tab__button';
      existingButton.textContent = 'Use Existing Asset';
      existingButton.addEventListener('click', openAssetPicker);

      const entityButton = document.createElement('button');
      entityButton.type = 'button';
      entityButton.className = 'animation-tab__button';
      entityButton.textContent = 'Edit Selected Entity';

      const selectedEntity = getSelectedEntity();
      const canEditEntity = Boolean(selectedEntity?.animationId);
      entityButton.disabled = !canEditEntity;
      entityButton.addEventListener('click', () => {
        if (!canEditEntity) return;
        openEntityAnimation();
      });

      row.appendChild(importButton);
      row.appendChild(existingButton);
      row.appendChild(entityButton);
      contextSection.appendChild(hint);
      contextSection.appendChild(row);

      if (!selectedEntity) {
        const entityHint = document.createElement('div');
        entityHint.className = 'animation-tab__hint';
        entityHint.textContent = 'Select a single entity to edit its animation.';
        contextSection.appendChild(entityHint);
      } else if (!canEditEntity) {
        const entityHint = document.createElement('div');
        entityHint.className = 'animation-tab__hint';
        entityHint.textContent = 'Selected entity has no animation yet.';
        contextSection.appendChild(entityHint);
      }
      return;
    }

    if (state.frames.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'animation-tab__hint';
      hint.textContent = 'Slice the spritesheet to generate frames.';

      const row = document.createElement('div');
      row.className = 'animation-tab__row';

      const sliceButton = document.createElement('button');
      sliceButton.type = 'button';
      sliceButton.className = 'animation-tab__button animation-tab__button--primary';
      sliceButton.textContent = 'Slice Frames';
      sliceButton.addEventListener('click', () => openSliceSettings());

      const sourceButton = document.createElement('button');
      sourceButton.type = 'button';
      sourceButton.className = 'animation-tab__button';
      sourceButton.textContent = 'Change Source';
      sourceButton.addEventListener('click', openAssetPicker);

      row.appendChild(sliceButton);
      row.appendChild(sourceButton);

      contextSection.appendChild(hint);
      contextSection.appendChild(row);
      return;
    }

    const row = document.createElement('div');
    row.className = 'animation-tab__row';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'animation-tab__button animation-tab__button--primary';
    saveButton.textContent = state.animationId ? 'Update Animation' : 'Save Animation';
    saveButton.addEventListener('click', openSaveSheet);

    const attachButton = document.createElement('button');
    attachButton.type = 'button';
    attachButton.className = 'animation-tab__button';
    attachButton.textContent = 'Attach to Selected Entity';
    const canAttach = Boolean(getSelectedEntity()) && Boolean(state.animationId);
    attachButton.disabled = !canAttach;
    attachButton.addEventListener('click', () => {
      if (!canAttach) return;
      attachToSelectedEntity();
    });

    const sliceButton = document.createElement('button');
    sliceButton.type = 'button';
    sliceButton.className = 'animation-tab__button animation-tab__button--ghost';
    sliceButton.textContent = 'Reslice';
    sliceButton.addEventListener('click', () => openSliceSettings());

    row.appendChild(saveButton);
    row.appendChild(attachButton);
    row.appendChild(sliceButton);

    const status = document.createElement('div');
    status.className = 'animation-tab__hint';
    status.textContent = state.dirty
      ? 'Unsaved changes.'
      : state.animationId
        ? 'Animation saved.'
        : 'Ready to save.';

    contextSection.appendChild(row);
    contextSection.appendChild(status);
  }

  function render(): void {
    if (state.frames.length === 0 && state.isPlaying) {
      stopPlayback();
    }
    fpsChip.textContent = `FPS ${state.fps}`;
    loopChip.textContent = state.loopMode === 'loop' ? 'Loop' : 'Once';
    playChip.textContent = state.isPlaying ? 'Pause' : 'Play';
    pivotChip.classList.toggle('animation-tab__chip--active', state.showPivot);
    previewHint.textContent = state.sourceName
      ? `Source: ${state.sourceName}`
      : 'Import a spritesheet to start animating.';
    renderFrames();
    renderContext();
    drawPreview();
  }

  playChip.addEventListener('click', togglePlayback);
  fpsChip.addEventListener('click', openSaveSheet);
  loopChip.addEventListener('click', () => {
    state.loopMode = state.loopMode === 'loop' ? 'once' : 'loop';
    state.dirty = true;
    render();
  });
  pivotChip.addEventListener('click', () => {
    state.showPivot = !state.showPivot;
    render();
  });

  previewStage.addEventListener('pointerdown', (event) => {
    if (state.showPivot) {
      draggingPivot = true;
    } else {
      previewPointerDown = true;
      previewMoved = false;
      previewDragStartX = event.clientX;
      previewDragStartFrame = state.currentFrame;
    }
  });

  previewStage.addEventListener('pointermove', (event) => {
    const rect = previewStage.getBoundingClientRect();
    if (draggingPivot) {
      const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      state.pivot = { x, y };
      state.dirty = true;
      updatePivotOverlay();
      return;
    }
    if (!previewPointerDown || state.frames.length === 0) return;
    const dx = event.clientX - previewDragStartX;
    if (Math.abs(dx) > 6) {
      previewMoved = true;
    }
    const deltaFrames = Math.round((dx / rect.width) * state.frames.length);
    const nextIndex = clamp(previewDragStartFrame + deltaFrames, 0, state.frames.length - 1);
    state.currentFrame = nextIndex;
    render();
  });

  previewStage.addEventListener('pointerup', () => {
    if (previewPointerDown && previewMoved) {
      previewPointerDown = false;
      return;
    }
    if (draggingPivot) {
      draggingPivot = false;
      return;
    }
    previewPointerDown = false;
    togglePlayback();
  });

  previewStage.addEventListener('pointerleave', () => {
    previewPointerDown = false;
    previewMoved = false;
    draggingPivot = false;
  });

  fileInput.addEventListener('change', async (event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    await handleImportFile(file);
    target.value = '';
  });

  sheetOverlay.addEventListener('click', (event) => {
    if (event.target === sheetOverlay) {
      closeSheet();
    }
  });

  render();

  return {
    refresh(): void {
      renderContext();
      renderFrames();
      drawPreview();
    },
    destroy(): void {
      stopPlayback();
      root.remove();
      sheetOverlay.remove();
      fileInput.remove();
    },
  };
}
