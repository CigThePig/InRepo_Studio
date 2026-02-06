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
  }

  .asset-library__asset--selected {
    border-color: #4a9eff;
    background: rgba(47, 59, 102, 0.9);
  }

  .asset-library__asset img {
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

  .asset-library__asset-delete {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 28px;
    min-height: 28px;
    border-radius: 999px;
    border: none;
    background: rgba(22, 30, 60, 0.9);
    color: #ffb6c1;
    font-size: 12px;
    cursor: pointer;
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
  const { container, assetRegistry, uploadEnabled = false } = config;

  if (!document.getElementById('asset-library-tab-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'asset-library-tab-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  const expandedGroups = new Set<string>();
  const uploadStatus = new Map<
    string,
    { state: 'idle' | 'uploading' | 'success' | 'error'; message: string }
  >();

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

  container.appendChild(root);

  function groupKey(group: AssetGroup): string {
    return `${group.type}:${group.slug}`;
  }

  function renderAssets(group: AssetGroup, selectedAssetId: string | null): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'asset-library__assets';

    if (group.assets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'asset-library__empty';
      empty.textContent = 'No assets in this group yet.';
      wrapper.appendChild(empty);
      return wrapper;
    }

    group.assets.forEach((asset) => {
      wrapper.appendChild(renderAssetCard(asset, selectedAssetId));
    });
    return wrapper;
  }

  function renderAssetCard(asset: AssetEntry, selectedAssetId: string | null): HTMLElement {
    const card = document.createElement('div');
    card.className = 'asset-library__asset';
    card.classList.toggle('asset-library__asset--selected', asset.id === selectedAssetId);

    const img = document.createElement('img');
    img.src = resolveAssetUrl(asset.dataUrl);
    img.alt = asset.name;

    const name = document.createElement('div');
    name.className = 'asset-library__asset-name';
    name.textContent = asset.name;

    const meta = document.createElement('div');
    meta.className = 'asset-library__asset-meta';
    const sizeLabel = asset.width > 0 && asset.height > 0 ? `${asset.width}×${asset.height}` : 'Size unknown';
    const sourceLabel = asset.source === 'repo' ? 'Repo' : 'Local';
    meta.textContent = `${sizeLabel} · ${sourceLabel}`;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'asset-library__asset-delete';
    deleteButton.textContent = '×';
    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      assetRegistry.removeAsset(asset.id);
    });

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(meta);
    card.appendChild(deleteButton);

    card.addEventListener('click', () => {
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

        const assetsContainer = renderAssets(group, selectedAssetId);
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
      card.appendChild(deleteButton);

      grid.appendChild(card);
    });
    librarySection.appendChild(grid);
  }

  function refresh(): void {
    const state = assetRegistry.getState();
    renderGroups(state.groups, state.selectedAssetId);
    renderAnimations();
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
      container.removeChild(root);
    },
  };
}
