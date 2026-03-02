import type { AssetRegistry, AssetGroupType, AssetEntry, AssetGroup } from '@/editor/assets';
import { resolveAssetUrl } from '@/shared/paths';
import { createAssetCapsule } from './assetCapsule';

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

  .irs-asset-palette__subgroup-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }

  .irs-asset-palette__subgroup-pill {
    padding: 2px 8px;
    border-radius: 99px;
    border: 1px solid var(--irs-border-heavy);
    background: var(--irs-surface-modal);
    color: var(--irs-text-secondary);
    font-size: 11px;
    cursor: pointer;
    user-select: none;
  }

  .irs-asset-palette__subgroup-pill--active {
    background: var(--irs-accent, #5b8ef4);
    border-color: var(--irs-accent, #5b8ef4);
    color: #fff;
  }

  .irs-asset-palette__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 8px;
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
    const thumbnailCanvas = (asset.sourceAssetId && asset.rect)
      ? renderSliceThumbnail(asset) as HTMLCanvasElement
      : undefined;
    const thumbnailUrl = thumbnailCanvas ? undefined : resolveAssetUrl(asset.dataUrl);

    const sizeLabel = asset.width > 0 && asset.height > 0 ? `${asset.width}×${asset.height}` : 'Size unknown';
    const sourceLabel = asset.source === 'repo' ? 'Repo' : 'Local';
    const badgeText = `${sizeLabel} · ${sourceLabel}`;

    const capsule = createAssetCapsule({
      assetId: asset.id,
      name: asset.name,
      thumbnailUrl,
      thumbnailCanvas,
      selected: asset.id === selectedAssetId,
      badge: badgeText,
      onClick: (id) => {
        assetRegistry.setSelectedAsset(id);
      },
    });

    return capsule.el;
  }

  /**
   * Determine which group context (parent group slug + optional subgroup slug) the
   * currently-selected asset lives in, so the palette can show the right asset set.
   *
   * Rules (bottom-bar palette behaviour):
   * - No selected asset → show all parent groups with their direct assets
   * - Selected asset is in a subgroup → show only that subgroup's assets
   * - Selected asset is in a top-level group → show that group's direct assets
   *   (i.e. assets that are NOT inside any of the group's subgroups)
   */
  function resolveContext(
    allGroups: AssetGroup[],
    selectedAssetId: string | null
  ): { parentSlug: string; subgroupSlug: string | null } | null {
    if (!selectedAssetId) return null;

    for (const group of allGroups) {
      if (group.type !== groupType) continue;
      const hit = group.assets.find((a) => a.id === selectedAssetId);
      if (!hit) continue;
      if (group.parentSlug) {
        return { parentSlug: group.parentSlug, subgroupSlug: group.slug };
      }
      return { parentSlug: group.slug, subgroupSlug: null };
    }
    return null;
  }

  function renderGroups(allGroups: AssetGroup[], selectedAssetId: string | null): void {
    section.querySelectorAll('.irs-asset-palette__group, .irs-asset-palette__empty').forEach((node) =>
      node.remove()
    );

    // Exclude source spritesheets from paint/placement contexts
    const groups = allGroups
      .filter((g) => g.type === groupType)
      .map((group) => ({
        ...group,
        assets: group.assets.filter((asset) => !asset.isSource),
      }));

    // Separate parent groups from subgroups
    const parentGroups = groups.filter((g) => !g.parentSlug);
    const subgroupsByParent = new Map<string, AssetGroup[]>();
    groups.forEach((g) => {
      if (g.parentSlug) {
        const list = subgroupsByParent.get(g.parentSlug) ?? [];
        list.push(g);
        subgroupsByParent.set(g.parentSlug, list);
      }
    });

    if (parentGroups.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'irs-asset-palette__empty';
      empty.textContent = 'No assets yet. Use the left panel to import and slice sprites.';
      section.appendChild(empty);
      return;
    }

    const ctx = resolveContext(groups, selectedAssetId);

    parentGroups.forEach((group) => {
      const subgroups = subgroupsByParent.get(group.slug) ?? [];
      const subgroupAssetIds = new Set(subgroups.flatMap((sg) => sg.assets.map((a) => a.id)));

      // Determine which assets to display for this section
      let displayAssets: AssetEntry[];
      let activeSubgroupSlug: string | null = null;

      if (ctx && ctx.parentSlug === group.slug) {
        if (ctx.subgroupSlug) {
          // Show only the active subgroup's assets
          activeSubgroupSlug = ctx.subgroupSlug;
          const sg = subgroups.find((s) => s.slug === ctx.subgroupSlug);
          displayAssets = sg ? sg.assets : [];
        } else {
          // Show direct (non-subgroup) assets of the parent
          displayAssets = group.assets.filter((a) => !subgroupAssetIds.has(a.id));
        }
      } else {
        // Default: show direct assets only (minus subgroup assets)
        displayAssets = group.assets.filter((a) => !subgroupAssetIds.has(a.id));
      }

      const groupWrapper = document.createElement('div');
      groupWrapper.className = 'irs-asset-palette__group';

      const groupTitle = document.createElement('div');
      groupTitle.className = 'irs-asset-palette__group-title';
      groupTitle.textContent = activeSubgroupSlug
        ? `${group.name} › ${subgroups.find((s) => s.slug === activeSubgroupSlug)?.name ?? ''}`
        : group.name;

      groupWrapper.appendChild(groupTitle);

      // Subgroup navigation pills (only shown when there are subgroups)
      if (subgroups.length > 0) {
        const nav = document.createElement('div');
        nav.className = 'irs-asset-palette__subgroup-nav';

        // "All" pill — selects an asset outside any subgroup to show parent view
        // We just render informational pills; clicking a subgroup pill selects a
        // representative asset from that subgroup so the context switches.
        subgroups.forEach((sg) => {
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = 'irs-asset-palette__subgroup-pill' +
            (activeSubgroupSlug === sg.slug ? ' irs-asset-palette__subgroup-pill--active' : '');
          pill.textContent = sg.name;
          pill.addEventListener('click', () => {
            // Select the first asset in this subgroup to switch context
            const first = sg.assets[0];
            if (first) {
              assetRegistry.setSelectedAsset(first.id);
            }
          });
          nav.appendChild(pill);
        });

        groupWrapper.appendChild(nav);
      }

      const grid = document.createElement('div');
      grid.className = 'irs-asset-palette__grid';

      const sourceGroup = activeSubgroupSlug
        ? subgroups.find((s) => s.slug === activeSubgroupSlug)
        : group;
      if (sourceGroup?.gridHint?.cols) {
        grid.style.gridTemplateColumns = `repeat(${sourceGroup.gridHint.cols}, minmax(0, 1fr))`;
      } else if (group.gridHint?.cols && !activeSubgroupSlug) {
        grid.style.gridTemplateColumns = `repeat(${group.gridHint.cols}, minmax(0, 1fr))`;
      }

      if (displayAssets.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'irs-asset-palette__empty';
        empty.textContent = 'No assets in this group.';
        grid.appendChild(empty);
      } else {
        displayAssets.forEach((asset) => {
          grid.appendChild(renderAssetCard(asset, selectedAssetId));
        });
      }

      groupWrapper.appendChild(grid);
      section.appendChild(groupWrapper);
    });
  }

  function refresh(): void {
    const state = assetRegistry.getState();
    renderGroups(state.groups, state.selectedAssetId);
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
