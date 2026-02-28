/**
 * Tile Strip — bottom-bar horizontal scroll strip
 *
 * Shows the assets from the currently selected group in the paint registry.
 * Tapping an asset emits `paint:select-tile` on the editorEventBus so the
 * paint tool can switch its active tile without leaving paint mode.
 *
 * Mount into the context strip container exposed by bottomPanel:
 *   const strip = createTileStrip({ container: bottomPanel.getContextStripContainer(), assetRegistry });
 *
 * Call strip.setVisible(true) when paint mode is active, strip.setVisible(false) otherwise.
 * Call strip.destroy() to clean up subscriptions.
 */

import { editorEventBus } from '@/editor/core/eventBus';
import type { AssetRegistry } from '@/editor/assets/assetRegistry';
import { resolveAssetUrl } from '@/shared/paths';
import type { AssetEntry } from '@/editor/assets';

const STYLE_ID = 'irs-tile-strip-styles';

const STYLES = `
  .irs-tile-strip {
    display: flex;
    flex-direction: row;
    align-items: center;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    gap: 6px;
    padding: 6px 8px;
    min-height: 72px;
    background: var(--irs-surface-panel);
    border-top: 1px solid var(--irs-border-heavy);
  }
  .irs-tile-strip::-webkit-scrollbar {
    display: none;
  }
  .irs-tile-strip__tile {
    flex-shrink: 0;
    width: 60px;
    height: 60px;
    border-radius: var(--irs-radius-md);
    border: 2px solid transparent;
    background: var(--irs-surface-overlay);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }
  .irs-tile-strip__tile:active {
    border-color: var(--irs-accent-primary);
  }
  .irs-tile-strip__tile--active {
    border-color: var(--irs-accent-primary);
    background: var(--irs-color-blue-alpha-22);
  }
  .irs-tile-strip__tile img,
  .irs-tile-strip__tile canvas {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .irs-tile-strip__empty {
    font-size: 12px;
    color: var(--irs-text-secondary);
    padding: 0 8px;
  }
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = STYLES;
  document.head.appendChild(el);
}

export interface TileStripController {
  setVisible(visible: boolean): void;
  destroy(): void;
}

export function createTileStrip(options: {
  container: HTMLElement;
  assetRegistry: AssetRegistry;
}): TileStripController {
  const { container, assetRegistry } = options;
  ensureStyles();

  const strip = document.createElement('div');
  strip.className = 'irs-tile-strip';
  strip.style.display = 'none';
  container.appendChild(strip);

  let currentActiveAssetId: string | null = null;

  function renderStrip(): void {
    strip.innerHTML = '';

    const state = assetRegistry.getState();
    const activeAssetId = state.selectedAssetId;
    currentActiveAssetId = activeAssetId;

    if (!activeAssetId) {
      const msg = document.createElement('div');
      msg.className = 'irs-tile-strip__empty';
      msg.textContent = 'Select a tile to paint.';
      strip.appendChild(msg);
      return;
    }

    // Find the group that contains the active asset
    let activeGroup = null;
    for (const group of state.groups) {
      if (group.assets.some((a) => a.id === activeAssetId)) {
        activeGroup = group;
        break;
      }
    }

    if (!activeGroup) {
      const msg = document.createElement('div');
      msg.className = 'irs-tile-strip__empty';
      msg.textContent = 'No group found.';
      strip.appendChild(msg);
      return;
    }

    const paintableAssets = activeGroup.assets.filter((a) => !a.isSource);
    if (paintableAssets.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'irs-tile-strip__empty';
      msg.textContent = 'No tiles in this group.';
      strip.appendChild(msg);
      return;
    }

    paintableAssets.forEach((asset) => {
      const tile = document.createElement('div');
      tile.className = 'irs-tile-strip__tile';
      if (asset.id === activeAssetId) {
        tile.classList.add('irs-tile-strip__tile--active');
      }

      appendTileThumbnail(tile, asset);

      tile.addEventListener('click', () => {
        assetRegistry.setSelectedAsset(asset.id);
        editorEventBus.dispatch('paint:select-tile', { assetId: asset.id });
      });

      strip.appendChild(tile);
    });

    // Scroll active tile into view
    queueMicrotask(() => {
      const activeTile = strip.querySelector<HTMLElement>('.irs-tile-strip__tile--active');
      activeTile?.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }

  function appendTileThumbnail(tile: HTMLElement, asset: AssetEntry): void {
    if (asset.sourceAssetId && asset.rect) {
      // Slice — draw onto canvas
      const canvas = document.createElement('canvas');
      const size = 56;
      canvas.width = size;
      canvas.height = size;
      canvas.style.imageRendering = 'pixelated';

      const { x, y, w, h } = asset.rect;
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;
        const scale = Math.min(size / w, size / h);
        const dw = w * scale;
        const dh = h * scale;
        const dx = (size - dw) / 2;
        const dy = (size - dh) / 2;
        ctx.drawImage(img, x, y, w, h, dx, dy, dw, dh);
      };
      img.src = resolveAssetUrl(asset.dataUrl);
      tile.appendChild(canvas);
    } else {
      const img = document.createElement('img');
      img.src = resolveAssetUrl(asset.dataUrl);
      img.alt = asset.name;
      tile.appendChild(img);
    }
  }

  // Subscribe to registry changes
  const unsubscribeRegistry = assetRegistry.onChange(() => {
    if (strip.style.display !== 'none') {
      renderStrip();
    }
  });

  // Listen for external tile selection (e.g., from paint tool)
  const unsubscribeEvent = editorEventBus.on('paint:active-tile-changed', ({ assetId }) => {
    if (assetId !== currentActiveAssetId) {
      renderStrip();
    }
  });

  return {
    setVisible(visible: boolean): void {
      strip.style.display = visible ? '' : 'none';
      if (visible) {
        renderStrip();
      }
    },
    destroy(): void {
      unsubscribeRegistry();
      unsubscribeEvent();
      strip.remove();
    },
  };
}
