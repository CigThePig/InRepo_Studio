import type { AssetRegistry, AssetGroupType, AssetEntry, AssetGroup } from '@/editor/assets';

const STYLES = `
  .asset-palette {
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: #e6ecff;
  }

  .asset-palette__section {
    background: rgba(20, 30, 60, 0.85);
    border: 1px solid #253461;
    border-radius: 14px;
    padding: 12px;
  }

  .asset-palette__title {
    font-size: 13px;
    font-weight: 700;
    color: #dbe4ff;
    margin-bottom: 8px;
  }

  .asset-palette__group {
    margin-bottom: 10px;
  }

  .asset-palette__group:last-child {
    margin-bottom: 0;
  }

  .asset-palette__group-title {
    font-size: 12px;
    font-weight: 600;
    color: #b6c4f1;
    margin-bottom: 6px;
  }

  .asset-palette__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 8px;
  }

  .asset-palette__card {
    border-radius: 10px;
    border: 2px solid transparent;
    background: rgba(22, 30, 60, 0.85);
    padding: 6px;
    color: #dbe4ff;
    font-size: 11px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
  }

  .asset-palette__card--selected {
    border-color: #4a9eff;
    background: rgba(47, 59, 102, 0.9);
  }

  .asset-palette__card img {
    width: 100%;
    border-radius: 8px;
    object-fit: cover;
  }

  .asset-palette__meta {
    font-size: 10px;
    color: #93a1d8;
  }

  .asset-palette__empty {
    font-size: 12px;
    color: #9aa7d6;
  }
`;

export interface AssetPaletteConfig {
  container: HTMLElement;
  assetRegistry: AssetRegistry;
  groupType: AssetGroupType;
  title: string;
}

export interface AssetPaletteController {
  refresh(): void;
  destroy(): void;
}

export function createAssetPalette(config: AssetPaletteConfig): AssetPaletteController {
  const { container, assetRegistry, groupType, title } = config;

  if (!document.getElementById('asset-palette-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'asset-palette-styles';
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);
  }

  const root = document.createElement('div');
  root.className = 'asset-palette';

  const section = document.createElement('section');
  section.className = 'asset-palette__section';

  const heading = document.createElement('div');
  heading.className = 'asset-palette__title';
  heading.textContent = title;

  section.appendChild(heading);
  root.appendChild(section);
  container.appendChild(root);

  function renderAssetCard(asset: AssetEntry, selectedAssetId: string | null): HTMLElement {
    const card = document.createElement('div');
    card.className = 'asset-palette__card';
    card.classList.toggle('asset-palette__card--selected', asset.id === selectedAssetId);

    const img = document.createElement('img');
    img.src = asset.dataUrl;
    img.alt = asset.name;

    const name = document.createElement('div');
    name.textContent = asset.name;

    const meta = document.createElement('div');
    meta.className = 'asset-palette__meta';
    const sizeLabel = asset.width > 0 && asset.height > 0 ? `${asset.width}×${asset.height}` : 'Size unknown';
    const sourceLabel = asset.source === 'repo' ? 'Repo' : 'Local';
    meta.textContent = `${sizeLabel} · ${sourceLabel}`;

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(meta);

    card.addEventListener('click', () => {
      assetRegistry.setSelectedAsset(asset.id);
    });

    return card;
  }

  function renderGroups(groups: AssetGroup[], selectedAssetId: string | null): void {
    section.querySelectorAll('.asset-palette__group, .asset-palette__empty').forEach((node) =>
      node.remove()
    );

    if (groups.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'asset-palette__empty';
      empty.textContent = 'No assets yet. Use the left berry to import and slice sprites.';
      section.appendChild(empty);
      return;
    }

    groups.forEach((group) => {
      const groupWrapper = document.createElement('div');
      groupWrapper.className = 'asset-palette__group';

      const groupTitle = document.createElement('div');
      groupTitle.className = 'asset-palette__group-title';
      groupTitle.textContent = group.name;

      const grid = document.createElement('div');
      grid.className = 'asset-palette__grid';

      if (group.assets.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'asset-palette__empty';
        empty.textContent = 'No assets in this group.';
        grid.appendChild(empty);
      } else {
        group.assets.forEach((asset) => {
          grid.appendChild(renderAssetCard(asset, selectedAssetId));
        });
      }

      groupWrapper.appendChild(groupTitle);
      groupWrapper.appendChild(grid);
      section.appendChild(groupWrapper);
    });
  }

  function refresh(): void {
    const state = assetRegistry.getState();
    const groups = assetRegistry.getGroupsByType(groupType);
    renderGroups(groups, state.selectedAssetId);
  }

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
