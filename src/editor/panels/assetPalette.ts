import type { AssetRegistry, AssetGroupType, AssetEntry, AssetGroup } from '@/editor/assets';
import { resolveAssetUrl } from '@/shared/paths';

const STYLE_ID = 'irs-asset-palette-styles';

const STYLES = `
  .irs-asset-palette {
    display: flex;
    flex-direction: column;
    gap: 10px;
    color: var(--irs-text-primary);
  }

  .irs-asset-palette__section {
    background: var(--irs-surface-panel);
    border: 1px solid var(--irs-border-heavy);
    border-radius: var(--irs-radius-xl);
    padding: 12px;
  }

  .irs-asset-palette__title {
    font-size: 13px;
    font-weight: 700;
    color: var(--irs-text-primary);
    margin-bottom: 8px;
  }

  .irs-asset-palette__group {
    margin-bottom: 10px;
  }

  .irs-asset-palette__group:last-child {
    margin-bottom: 0;
  }

  .irs-asset-palette__group-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--irs-text-secondary);
    margin-bottom: 6px;
  }

  .irs-asset-palette__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 8px;
  }

  .irs-asset-palette__card {
    border-radius: var(--irs-radius-md);
    border: 2px solid transparent;
    background: var(--irs-surface-modal);
    padding: 6px;
    color: var(--irs-text-primary);
    font-size: 11px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
  }

  .irs-asset-palette__card--selected {
    border-color: var(--irs-accent-primary);
    background: var(--irs-color-blue-alpha-22);
  }

  .irs-asset-palette__card img,
  .irs-asset-palette__card canvas {
    width: 100%;
    border-radius: var(--irs-radius-sm);
    object-fit: cover;
  }

  .irs-asset-palette__meta {
    font-size: 10px;
    color: var(--irs-text-secondary);
  }

  .irs-asset-palette__empty {
    font-size: 12px;
    color: var(--irs-text-secondary);
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

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export function createAssetPalette(config: AssetPaletteConfig): AssetPaletteController {
  const { container, assetRegistry, groupType, title } = config;

  ensureStyles();

  const root = document.createElement('div');
  root.className = 'irs-asset-palette';

  const section = document.createElement('section');
  section.className = 'irs-asset-palette__section';

  const heading = document.createElement('div');
  heading.className = 'irs-asset-palette__title';
  heading.textContent = title;

  section.appendChild(heading);
  root.appendChild(section);
  container.appendChild(root);

  function renderSliceThumbnail(asset: AssetEntry): HTMLElement {
    const rect = asset.rect!;
    const canvas = document.createElement('canvas');
    const thumbSize = 64;
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

  function renderAssetCard(asset: AssetEntry, selectedAssetId: string | null): HTMLElement {
    const card = document.createElement('div');
    card.className = 'irs-asset-palette__card';
    card.classList.toggle('irs-asset-palette__card--selected', asset.id === selectedAssetId);

    if (asset.sourceAssetId && asset.rect) {
      card.appendChild(renderSliceThumbnail(asset));
    } else {
      const img = document.createElement('img');
      img.src = resolveAssetUrl(asset.dataUrl);
      img.alt = asset.name;
      card.appendChild(img);
    }

    const name = document.createElement('div');
    name.textContent = asset.name;

    const meta = document.createElement('div');
    meta.className = 'irs-asset-palette__meta';
    const sizeLabel = asset.width > 0 && asset.height > 0 ? `${asset.width}×${asset.height}` : 'Size unknown';
    const sourceLabel = asset.source === 'repo' ? 'Repo' : 'Local';
    meta.textContent = `${sizeLabel} · ${sourceLabel}`;

    card.appendChild(name);
    card.appendChild(meta);

    card.addEventListener('click', () => {
      assetRegistry.setSelectedAsset(asset.id);
    });

    return card;
  }

  function renderGroups(groups: AssetGroup[], selectedAssetId: string | null): void {
    section.querySelectorAll('.irs-asset-palette__group, .irs-asset-palette__empty').forEach((node) =>
      node.remove()
    );

    if (groups.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'irs-asset-palette__empty';
      empty.textContent = 'No assets yet. Use the left berry to import and slice sprites.';
      section.appendChild(empty);
      return;
    }

    groups.forEach((group) => {
      const groupWrapper = document.createElement('div');
      groupWrapper.className = 'irs-asset-palette__group';

      const groupTitle = document.createElement('div');
      groupTitle.className = 'irs-asset-palette__group-title';
      groupTitle.textContent = group.name;

      const grid = document.createElement('div');
      grid.className = 'irs-asset-palette__grid';

      if (group.assets.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'irs-asset-palette__empty';
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
