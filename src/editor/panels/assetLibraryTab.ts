import type { AssetRegistry, AssetEntry, AssetGroup, AssetGroupType } from '@/editor/assets';
import { resolveAssetUrl } from '@/shared/paths';

const STYLES = `
  .asset-library {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: #e6ecff;
  }

  .asset-library__section {
    background: rgba(20, 30, 60, 0.85);
    border: 1px solid #253461;
    border-radius: 14px;
    padding: 12px;
  }

  .asset-library__title {
    font-size: 13px;
    font-weight: 700;
    color: #dbe4ff;
    margin-bottom: 8px;
  }

  .asset-library__row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .asset-library__input,
  .asset-library__select {
    min-height: 44px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(83, 101, 164, 0.6);
    background: rgba(22, 30, 60, 0.85);
    color: #f2f5ff;
    font-size: 13px;
  }

  .asset-library__button {
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

  .asset-library__button:active {
    background: #26386a;
  }

  .asset-library__hint {
    font-size: 12px;
    color: #9aa7d6;
  }

  .asset-library__group {
    border-top: 1px solid rgba(37, 52, 97, 0.7);
    padding-top: 10px;
    margin-top: 10px;
  }

  .asset-library__group:first-of-type {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }

  .asset-library__group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .asset-library__group-toggle {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: #1b2a52;
    color: #dbe4ff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }

  .asset-library__group-toggle:active {
    background: #26386a;
  }

  .asset-library__group-count {
    font-size: 12px;
    color: #9aa7d6;
  }

  .asset-library__group-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .asset-library__upload-status {
    font-size: 11px;
    color: #9aa7d6;
    max-width: 160px;
    text-align: right;
  }

  .asset-library__upload-status--error {
    color: #ffb6c1;
  }

  .asset-library__upload-status--success {
    color: #9fe8b1;
  }

  .asset-library__assets {
    margin-top: 10px;
    display: none;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 10px;
  }

  .asset-library__assets--open {
    display: grid;
  }

  .asset-library__asset {
    position: relative;
    border-radius: 12px;
    border: 2px solid transparent;
    background: rgba(22, 30, 60, 0.85);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: #cfd8ff;
    font-size: 11px;
    cursor: pointer;
    min-height: 132px;
  }

  .asset-library__asset--selected {
    border-color: #4a9eff;
    background: rgba(47, 59, 102, 0.9);
  }

  .asset-library__asset img,
  .asset-library__asset canvas {
    width: 100%;
    border-radius: 8px;
    object-fit: cover;
  }

  .asset-library__asset-name {
    font-size: 11px;
    color: #e6ecff;
  }

  .asset-library__asset-meta {
    font-size: 10px;
    color: #93a1d8;
  }

  .asset-library__asset-more {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid rgba(83, 101, 164, 0.7);
    background: rgba(11, 18, 40, 0.78);
    color: #dbe4ff;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .asset-library__asset--organizing {
    border-color: rgba(98, 150, 255, 0.45);
    background: rgba(40, 52, 95, 0.95);
    box-shadow: 0 0 0 1px rgba(98, 150, 255, 0.25) inset;
  }

  .asset-library__drag-handle {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 1px solid rgba(98, 150, 255, 0.45);
    background: rgba(17, 26, 53, 0.88);
    color: #dbe4ff;
    font-size: 18px;
    font-weight: 700;
    display: grid;
    place-items: center;
    touch-action: none;
    cursor: grab;
  }

  .asset-library__ghost {
    position: fixed;
    width: 84px;
    pointer-events: none;
    z-index: 80;
    opacity: 0.9;
    transform: scale(1.03);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
  }

  .asset-library__placeholder {
    border-radius: 12px;
    border: 2px dashed rgba(116, 159, 255, 0.65);
    background: rgba(25, 39, 72, 0.4);
    min-height: 132px;
  }

  .asset-library__sheet-scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 140ms ease;
    z-index: 120;
  }

  .asset-library__sheet-scrim--open {
    opacity: 1;
    pointer-events: auto;
  }

  .asset-library__sheet {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: max(12px, env(safe-area-inset-bottom));
    border: 1px solid rgba(83, 101, 164, 0.65);
    border-radius: 16px;
    background: rgba(20, 30, 60, 0.95);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transform: translateY(12px);
    transition: transform 140ms ease;
  }

  .asset-library__sheet-scrim--open .asset-library__sheet {
    transform: translateY(0);
  }

  .asset-library__sheet-title {
    font-size: 15px;
    font-weight: 700;
    color: #e6ecff;
    margin-bottom: 4px;
  }

  .asset-library__sheet-button {
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(83, 101, 164, 0.65);
    background: rgba(27, 42, 82, 0.92);
    color: #e6ecff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .asset-library__sheet-button--danger {
    border-color: rgba(255, 128, 153, 0.8);
    color: #ffc5d2;
  }

  .asset-library__sheet-note {
    font-size: 12px;
    color: #b9c5ef;
  }

  .asset-library__empty {
    font-size: 12px;
    color: #9aa7d6;
    padding: 4px 0;
  }

  .asset-library__animations {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 10px;
  }

  .asset-library__animation-card {
    border-radius: 12px;
    border: 2px solid transparent;
    background: rgba(22, 30, 60, 0.85);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: #dbe4ff;
    font-size: 11px;
    position: relative;
  }

  .asset-library__animation-card img {
    width: 100%;
    border-radius: 10px;
    object-fit: cover;
  }

  .asset-library__animation-meta {
    font-size: 10px;
    color: #93a1d8;
  }

  .asset-library__animation-delete {
    position: absolute;
    top: 6px;
    right: 6px;
    min-width: 28px;
    min-height: 28px;
    border-radius: 999px;
    border: none;
    background: rgba(22, 30, 60, 0.9);
    color: #ffb6c1;
    font-size: 12px;
    cursor: pointer;
  }
`;

export interface AssetLibraryTabConfig {
  container: HTMLElement;
  assetRegistry: AssetRegistry;
  uploadEnabled?: boolean;
  onOpenAnimation?: (animationId: string) => void;
}

export interface AssetLibraryTabController {
  refresh(): void;
  destroy(): void;
}

const GROUP_TYPE_LABELS: Record<AssetGroupType, string> = {
  tilesets: 'Tilesets',
  props: 'Props',
  entities: 'Entities',
};

export function createAssetLibraryTab(config: AssetLibraryTabConfig): AssetLibraryTabController {
  const { container, assetRegistry, uploadEnabled = false, onOpenAnimation } = config;

  if (!document.getElementById('asset-library-tab-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'asset-library-tab-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  const expandedGroups = new Set<string>();
  let organizeGroupKey: string | null = null;
  const uploadStatus = new Map<
    string,
    { state: 'idle' | 'uploading' | 'success' | 'error'; message: string }
  >();
  let sheetAssetId: string | null = null;
  let sheetView: 'menu' | 'rename' | 'delete-confirm' = 'menu';

  type DragState = {
    groupType: AssetGroupType;
    groupSlug: string;
    fromIndex: number;
    pointerId: number;
    card: HTMLElement;
    grid: HTMLElement;
    ghost: HTMLElement;
    placeholder: HTMLElement;
    offsetX: number;
    offsetY: number;
    toIndex: number;
  };
  let dragState: DragState | null = null;

  const root = document.createElement('div');
  root.className = 'asset-library';

  const createSection = document.createElement('section');
  createSection.className = 'asset-library__section';

  const createTitle = document.createElement('div');
  createTitle.className = 'asset-library__title';
  createTitle.textContent = 'Create Group';

  const createRow = document.createElement('div');
  createRow.className = 'asset-library__row';

  const nameInput = document.createElement('input');
  nameInput.className = 'asset-library__input';
  nameInput.type = 'text';
  nameInput.placeholder = 'Group name (e.g., Trees)';
  nameInput.maxLength = 32;

  const typeSelect = document.createElement('select');
  typeSelect.className = 'asset-library__select';
  typeSelect.innerHTML = `
    <option value="tilesets">Tilesets</option>
    <option value="props">Props</option>
    <option value="entities">Entities</option>
  `;

  const createButton = document.createElement('button');
  createButton.type = 'button';
  createButton.className = 'asset-library__button';
  createButton.textContent = 'Add Group';

  const createHint = document.createElement('div');
  createHint.className = 'asset-library__hint';
  createHint.textContent = 'Groups organize assets for paint, props, and entity palettes.';

  createRow.appendChild(nameInput);
  createRow.appendChild(typeSelect);
  createRow.appendChild(createButton);
  createSection.appendChild(createTitle);
  createSection.appendChild(createRow);
  createSection.appendChild(createHint);

  root.appendChild(createSection);

  const librarySection = document.createElement('section');
  librarySection.className = 'asset-library__section';

  const libraryTitle = document.createElement('div');
  libraryTitle.className = 'asset-library__title';
  libraryTitle.textContent = 'Assets Library';

  librarySection.appendChild(libraryTitle);
  root.appendChild(librarySection);

  const sheetScrim = document.createElement('div');
  sheetScrim.className = 'asset-library__sheet-scrim';
  sheetScrim.addEventListener('click', () => {
    sheetAssetId = null;
    refresh();
  });
  root.appendChild(sheetScrim);

  container.appendChild(root);

  function groupKey(group: AssetGroup): string {
    return `${group.type}:${group.slug}`;
  }

  function openAssetSheet(assetId: string, view: 'menu' | 'rename' | 'delete-confirm' = 'menu'): void {
    sheetAssetId = assetId;
    sheetView = view;
    refresh();
  }

  function findClosestIndex(cards: HTMLElement[], pointerX: number, pointerY: number): number {
    if (cards.length === 0) return 0;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((entry, index) => {
      const rect = entry.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = pointerX - centerX;
      const dy = pointerY - centerY;
      const distance = Math.hypot(dx, dy);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    const closestRect = cards[closestIndex].getBoundingClientRect();
    const centerX = closestRect.left + closestRect.width / 2;
    const centerY = closestRect.top + closestRect.height / 2;
    const horizontalBias = Math.abs(pointerX - centerX) > Math.abs(pointerY - centerY);
    const after = horizontalBias ? pointerX > centerX : pointerY > centerY;
    return after ? closestIndex + 1 : closestIndex;
  }

  function beginDrag(options: {
    event: PointerEvent;
    card: HTMLElement;
    grid: HTMLElement;
    group: AssetGroup;
    fromIndex: number;
  }): void {
    if (dragState) return;
    const { event, card, grid, group, fromIndex } = options;
    const rect = card.getBoundingClientRect();
    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.classList.add('asset-library__ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.appendChild(ghost);

    const placeholder = document.createElement('div');
    placeholder.className = 'asset-library__placeholder';
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    grid.insertBefore(placeholder, card);
    card.style.display = 'none';

    dragState = {
      groupType: group.type,
      groupSlug: group.slug,
      fromIndex,
      pointerId: event.pointerId,
      card,
      grid,
      ghost,
      placeholder,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      toIndex: fromIndex,
    };

    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);
  }

  function handleDragMove(event: PointerEvent): void {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const active = dragState;
    active.ghost.style.left = `${event.clientX - active.offsetX}px`;
    active.ghost.style.top = `${event.clientY - active.offsetY}px`;

    const cardNodes = Array.from(active.grid.querySelectorAll<HTMLElement>('.asset-library__asset')).filter(
      (node) => node !== active.card
    );
    const targetIndex = findClosestIndex(cardNodes, event.clientX, event.clientY);
    active.toIndex = targetIndex;
    const nextTarget = cardNodes[targetIndex] ?? null;
    if (nextTarget) {
      active.grid.insertBefore(active.placeholder, nextTarget);
    } else {
      active.grid.appendChild(active.placeholder);
    }

    const edge = 72;
    const bounds = container.getBoundingClientRect();
    if (event.clientY < bounds.top + edge) {
      container.scrollTop -= 10;
    } else if (event.clientY > bounds.bottom - edge) {
      container.scrollTop += 10;
    }
  }

  function finishDrag(event: PointerEvent): void {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const next = dragState;
    dragState = null;
    window.removeEventListener('pointermove', handleDragMove);
    window.removeEventListener('pointerup', finishDrag);
    window.removeEventListener('pointercancel', finishDrag);

    next.ghost.remove();
    next.placeholder.remove();
    next.card.style.display = '';
    if (next.toIndex !== next.fromIndex) {
      assetRegistry.reorderAsset({
        groupType: next.groupType,
        groupSlug: next.groupSlug,
        fromIndex: next.fromIndex,
        toIndex: next.toIndex,
      });
    }
    refresh();
  }

  function renderAssets(group: AssetGroup, selectedAssetId: string | null, organizeMode: boolean): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'asset-library__assets';

    if (group.assets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'asset-library__empty';
      empty.textContent = 'No assets in this group yet.';
      wrapper.appendChild(empty);
      return wrapper;
    }

    group.assets.forEach((asset, index) => {
      wrapper.appendChild(renderAssetCard({
        group,
        asset,
        assetIndex: index,
        selectedAssetId,
        organizeMode,
        groupKey: groupKey(group),
        openAssetSheet,
      }));
    });
    return wrapper;
  }

  function renderSliceThumbnail(asset: AssetEntry): HTMLElement {
    const rect = asset.rect!;
    const canvas = document.createElement('canvas');
    const thumbSize = 72;
    canvas.width = thumbSize;
    canvas.height = thumbSize;
    canvas.style.imageRendering = 'pixelated';

    const sourceUrl = resolveAssetUrl(asset.dataUrl);
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const scale = Math.min(thumbSize / rect.w, thumbSize / rect.h);
      const dw = rect.w * scale;
      const dh = rect.h * scale;
      const dx = (thumbSize - dw) / 2;
      const dy = (thumbSize - dh) / 2;
      ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, dx, dy, dw, dh);
    };
    img.src = sourceUrl;
    return canvas;
  }

  function renderAssetCard(options: {
    group: AssetGroup;
    asset: AssetEntry;
    assetIndex: number;
    selectedAssetId: string | null;
    organizeMode: boolean;
    groupKey: string;
    openAssetSheet: (assetId: string, view?: 'menu' | 'rename' | 'delete-confirm') => void;
  }): HTMLElement {
    const { group, asset, assetIndex, selectedAssetId, organizeMode, groupKey: cardGroupKey, openAssetSheet } = options;
    const card = document.createElement('div');
    card.className = 'asset-library__asset';
    card.classList.toggle('asset-library__asset--selected', asset.id === selectedAssetId);

    if (asset.sourceAssetId && asset.rect) {
      card.appendChild(renderSliceThumbnail(asset));
    } else {
      const img = document.createElement('img');
      img.src = resolveAssetUrl(asset.dataUrl);
      img.alt = asset.name;
      card.appendChild(img);
    }

    const name = document.createElement('div');
    name.className = 'asset-library__asset-name';
    name.textContent = asset.name;
    card.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'asset-library__asset-meta';
    const sizeLabel = asset.width > 0 && asset.height > 0 ? `${asset.width}×${asset.height}` : 'Size unknown';
    const sourceLabel = asset.source === 'repo' ? 'Repo' : 'Local';
    const sliceLabel = asset.sourceAssetId ? ' · Slice' : '';
    meta.textContent = `${sizeLabel} · ${sourceLabel}${sliceLabel}`;

    card.appendChild(meta);

    if (organizeMode) {
      card.classList.add('asset-library__asset--organizing');
      const dragHandle = document.createElement('div');
      dragHandle.className = 'asset-library__drag-handle';
      dragHandle.textContent = '≡';
      dragHandle.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        event.preventDefault();
        beginDrag({ event, card, grid: card.parentElement as HTMLElement, group, fromIndex: assetIndex });
      });
      card.appendChild(dragHandle);

      let longPressTimer: number | null = null;
      let originX = 0;
      let originY = 0;
      card.addEventListener('pointerdown', (event) => {
        if (event.target === dragHandle) return;
        originX = event.clientX;
        originY = event.clientY;
        longPressTimer = window.setTimeout(() => {
          beginDrag({ event, card, grid: card.parentElement as HTMLElement, group, fromIndex: assetIndex });
          longPressTimer = null;
        }, 300);
      });
      card.addEventListener('pointermove', (event) => {
        if (longPressTimer === null) return;
        const moved = Math.hypot(event.clientX - originX, event.clientY - originY);
        if (moved > 8) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });
      const clearLongPress = () => {
        if (longPressTimer !== null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };
      card.addEventListener('pointerup', clearLongPress);
      card.addEventListener('pointercancel', clearLongPress);
    } else {
      const moreButton = document.createElement('button');
      moreButton.type = 'button';
      moreButton.className = 'asset-library__asset-more';
      moreButton.textContent = '⋯';
      moreButton.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });
      moreButton.addEventListener('click', (event) => {
        event.stopPropagation();
        openAssetSheet(asset.id);
      });
      card.appendChild(moreButton);
    }

    card.addEventListener('click', () => {
      if (organizeGroupKey === cardGroupKey) return;
      assetRegistry.setSelectedAsset(asset.id);
    });

    return card;
  }

  function renderGroups(groups: AssetGroup[], selectedAssetId: string | null): void {
    librarySection.querySelectorAll('.asset-library__group').forEach((node) => node.remove());

    if (groups.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'asset-library__empty';
      empty.textContent = 'No asset groups yet. Add one above or slice a sprite sheet.';
      librarySection.appendChild(empty);
      return;
    }

    const groupsByType = groups.reduce<Record<AssetGroupType, AssetGroup[]>>(
      (acc, group) => {
        acc[group.type].push(group);
        return acc;
      },
      { tilesets: [], props: [], entities: [] }
    );

    (Object.keys(GROUP_TYPE_LABELS) as AssetGroupType[]).forEach((type) => {
      const typeGroups = groupsByType[type];
      if (typeGroups.length === 0) return;

      typeGroups.forEach((group) => {
        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'asset-library__group';

        const header = document.createElement('div');
        header.className = 'asset-library__group-header';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'asset-library__group-toggle';
        const key = groupKey(group);
        const isOpen = expandedGroups.has(key) || group.assets.length > 0;
        if (isOpen) {
          expandedGroups.add(key);
        }

        toggle.innerHTML = `
          <span>${GROUP_TYPE_LABELS[group.type]} · ${group.name}</span>
          <span class="asset-library__group-count">${group.assets.length} assets</span>
        `;

        const organizeEnabled = organizeGroupKey === key;
        if (organizeEnabled) {
          expandedGroups.add(key);
        }

        const organizeToggle = document.createElement('button');
        organizeToggle.type = 'button';
        organizeToggle.className = 'asset-library__button';
        organizeToggle.textContent = organizeEnabled ? 'Done' : 'Organize';
        organizeToggle.addEventListener('click', (event) => {
          event.stopPropagation();
          organizeGroupKey = organizeEnabled ? null : key;
          if (!organizeEnabled) expandedGroups.add(key);
          refresh();
        });

        const assetsContainer = renderAssets(group, selectedAssetId, organizeEnabled);
        assetsContainer.classList.toggle('asset-library__assets--open', isOpen);

        toggle.addEventListener('click', () => {
          const open = !expandedGroups.has(key);
          if (open) {
            expandedGroups.add(key);
          } else {
            expandedGroups.delete(key);
          }
          assetsContainer.classList.toggle('asset-library__assets--open', open);
        });

        header.appendChild(toggle);

        if (uploadEnabled) {
          const actions = document.createElement('div');
          actions.className = 'asset-library__group-actions';

          const status = document.createElement('div');
          status.className = 'asset-library__upload-status';

          const statusKey = groupKey(group);
          const currentStatus = uploadStatus.get(statusKey);
          if (currentStatus) {
            status.textContent = currentStatus.message;
            status.classList.toggle(
              'asset-library__upload-status--error',
              currentStatus.state === 'error'
            );
            status.classList.toggle(
              'asset-library__upload-status--success',
              currentStatus.state === 'success'
            );
          }

          const uploadButton = document.createElement('button');
          uploadButton.type = 'button';
          uploadButton.className = 'asset-library__button';
          uploadButton.textContent = 'Upload';

          const hasLocalAssets = group.assets.some((asset) => asset.source === 'local');
          const isUploading = currentStatus?.state === 'uploading';
          if (!hasLocalAssets) {
            uploadButton.disabled = true;
            status.textContent = status.textContent || 'No local assets';
          }
          if (isUploading) {
            uploadButton.disabled = true;
          }

          uploadButton.addEventListener('click', async () => {
            uploadStatus.set(statusKey, {
              state: 'uploading',
              message: 'Preparing upload...',
            });
            refresh();

            try {
              const result = await assetRegistry.uploadGroup({
                groupType: group.type,
                groupSlug: group.slug,
                onProgress: (progress) => {
                  uploadStatus.set(statusKey, {
                    state: 'uploading',
                    message: `Uploading ${progress.current}/${progress.total}…`,
                  });
                  refresh();
                },
              });

              const successCount = result.results.filter((entry) => entry.success).length;
              const failCount = result.results.filter((entry) => !entry.success).length;
              const message = result.error
                ? result.error
                : failCount === 0
                  ? `Uploaded ${successCount} files`
                  : `Uploaded ${successCount}, ${failCount} failed`;

              uploadStatus.set(statusKey, {
                state: failCount === 0 && !result.error ? 'success' : 'error',
                message,
              });
            } catch (error) {
              uploadStatus.set(statusKey, {
                state: 'error',
                message: error instanceof Error ? error.message : 'Upload failed.',
              });
            }

            refresh();
          });

          actions.appendChild(status);
          actions.appendChild(uploadButton);
          actions.prepend(organizeToggle);
          header.appendChild(actions);
        } else {
          const actions = document.createElement('div');
          actions.className = 'asset-library__group-actions';
          actions.appendChild(organizeToggle);
          header.appendChild(actions);
        }

        groupWrapper.appendChild(header);
        groupWrapper.appendChild(assetsContainer);
        librarySection.appendChild(groupWrapper);
      });
    });
  }

  function renderAnimations(): void {
    librarySection.querySelectorAll(
      '.asset-library__animations, .asset-library__animations-empty, .asset-library__animations-title'
    )
      .forEach((node) => node.remove());

    const animations = assetRegistry.getAnimations();
    const title = document.createElement('div');
    title.className = 'asset-library__title asset-library__animations-title';
    title.textContent = 'Animations';
    librarySection.appendChild(title);

    if (animations.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'asset-library__empty asset-library__animations-empty';
      empty.textContent = 'No animations saved yet.';
      librarySection.appendChild(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'asset-library__animations';
    const fallbackPoster =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="%23121a30"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="%239aa7d6" font-size="12" font-family="sans-serif">Anim</text></svg>`
      );

    animations.forEach((animation) => {
      const card = document.createElement('div');
      card.className = 'asset-library__animation-card';
      card.addEventListener('click', () => {
        onOpenAnimation?.(animation.id);
      });

      const img = document.createElement('img');
      img.src = animation.posterDataUrl ?? fallbackPoster;
      img.alt = animation.name;
      card.appendChild(img);

      const name = document.createElement('div');
      name.className = 'asset-library__asset-name';
      name.textContent = animation.name;
      card.appendChild(name);

      const meta = document.createElement('div');
      meta.className = 'asset-library__animation-meta';
      meta.textContent = `${animation.frames.length} frames · ${animation.fps} fps`;
      card.appendChild(meta);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'asset-library__animation-delete';
      deleteButton.textContent = '×';
      deleteButton.addEventListener('click', () => {
        assetRegistry.removeAnimation(animation.id);
      });
      deleteButton.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });
      deleteButton.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      card.appendChild(deleteButton);

      grid.appendChild(card);
    });
    librarySection.appendChild(grid);
  }

  function renderSheet(): void {
    sheetScrim.innerHTML = '';
    if (!sheetAssetId) {
      sheetScrim.classList.remove('asset-library__sheet-scrim--open');
      return;
    }

    const state = assetRegistry.getState();
    const activeGroup = state.groups.find((group) => group.assets.some((asset) => asset.id === sheetAssetId));
    const activeAsset = activeGroup?.assets.find((asset) => asset.id === sheetAssetId);
    if (!activeAsset || !activeGroup) {
      sheetAssetId = null;
      sheetScrim.classList.remove('asset-library__sheet-scrim--open');
      return;
    }

    sheetScrim.classList.add('asset-library__sheet-scrim--open');
    const sheet = document.createElement('div');
    sheet.className = 'asset-library__sheet';
    sheet.addEventListener('click', (event) => event.stopPropagation());

    if (sheetView === 'menu') {
      const actions: Array<{ label: string; onClick: () => void; danger?: boolean }> = [
        { label: 'Rename', onClick: () => openAssetSheet(activeAsset.id, 'rename') },
        { label: 'Delete', onClick: () => openAssetSheet(activeAsset.id, 'delete-confirm'), danger: true },
        {
          label: 'Organize Group',
          onClick: () => {
            organizeGroupKey = groupKey(activeGroup);
            expandedGroups.add(organizeGroupKey);
            sheetAssetId = null;
            refresh();
          },
        },
        {
          label: 'Cancel',
          onClick: () => {
            sheetAssetId = null;
            refresh();
          },
        },
      ];

      actions.forEach((action) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `asset-library__sheet-button${action.danger ? ' asset-library__sheet-button--danger' : ''}`;
        button.textContent = action.label;
        button.addEventListener('click', action.onClick);
        sheet.appendChild(button);
      });
    }

    if (sheetView === 'rename') {
      const title = document.createElement('div');
      title.className = 'asset-library__sheet-title';
      title.textContent = 'Rename Asset';
      sheet.appendChild(title);

      const input = document.createElement('input');
      input.className = 'asset-library__input';
      input.type = 'text';
      input.value = activeAsset.name;
      input.maxLength = 64;
      sheet.appendChild(input);

      const saveButton = document.createElement('button');
      saveButton.type = 'button';
      saveButton.className = 'asset-library__sheet-button';
      saveButton.textContent = 'Save';
      saveButton.addEventListener('click', () => {
        assetRegistry.renameAsset(activeAsset.id, input.value);
        sheetAssetId = null;
        refresh();
      });
      sheet.appendChild(saveButton);

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'asset-library__sheet-button';
      cancelButton.textContent = 'Cancel';
      cancelButton.addEventListener('click', () => openAssetSheet(activeAsset.id, 'menu'));
      sheet.appendChild(cancelButton);
      queueMicrotask(() => input.focus());
    }

    if (sheetView === 'delete-confirm') {
      const title = document.createElement('div');
      title.className = 'asset-library__sheet-title';
      title.textContent = 'Delete this asset?';
      sheet.appendChild(title);

      const note = document.createElement('div');
      note.className = 'asset-library__sheet-note';
      note.textContent = activeAsset.name;
      sheet.appendChild(note);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'asset-library__sheet-button asset-library__sheet-button--danger';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        assetRegistry.removeAsset(activeAsset.id);
        sheetAssetId = null;
        refresh();
      });
      sheet.appendChild(deleteButton);

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'asset-library__sheet-button';
      cancelButton.textContent = 'Cancel';
      cancelButton.addEventListener('click', () => openAssetSheet(activeAsset.id, 'menu'));
      sheet.appendChild(cancelButton);
    }

    sheetScrim.appendChild(sheet);
  }

  function refresh(): void {
    const state = assetRegistry.getState();
    renderGroups(state.groups, state.selectedAssetId);
    renderAnimations();
    renderSheet();
  }

  function handleCreateGroup(): void {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    const type = typeSelect.value as AssetGroupType;
    assetRegistry.createGroup(type, name);
    nameInput.value = '';
  }

  createButton.addEventListener('click', handleCreateGroup);

  const unsubscribe = assetRegistry.onChange(() => refresh());

  refresh();

  return {
    refresh,
    destroy: () => {
      unsubscribe();
      sheetScrim.remove();
      container.removeChild(root);
    },
  };
}
