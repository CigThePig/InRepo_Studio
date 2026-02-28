/**
 * Asset Capsule Component
 *
 * Unified asset tile used across all four tab contexts:
 * Assets (asset library), Ground (tile picker), Props (asset palette), Entities.
 *
 * Replaces per-tab bespoke card construction with one consistent component.
 */

const STYLE_ID = 'irs-asset-capsule-styles';

const STYLES = `
  .irs-asset-capsule {
    border-radius: var(--irs-radius-md);
    border: 2px solid transparent;
    background: var(--irs-surface-modal);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
    min-height: var(--irs-touch-target);
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .irs-asset-capsule--selected {
    border-color: var(--irs-accent-primary);
    background: var(--irs-color-blue-alpha-22);
  }

  .irs-asset-capsule__thumb {
    width: 48px;
    height: 48px;
    align-self: center;
    border-radius: var(--irs-radius-sm);
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .irs-asset-capsule__thumb img,
  .irs-asset-capsule__thumb canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .irs-asset-capsule__label {
    font-size: 11px;
    color: var(--irs-text-primary);
    word-break: break-word;
    white-space: normal;
    overflow: hidden;
    text-align: center;
    line-height: 1.3;
  }

  .irs-asset-capsule__badge {
    font-size: 10px;
    color: var(--irs-text-secondary);
    text-align: center;
  }
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export interface AssetCapsuleOptions {
  assetId: string;
  name: string;
  thumbnailUrl?: string;
  thumbnailCanvas?: HTMLCanvasElement;
  selected?: boolean;
  badge?: string;
  onClick?: (assetId: string) => void;
  onPointerDown?: (assetId: string, event: PointerEvent) => void;
}

export interface AssetCapsuleController {
  el: HTMLElement;
  setSelected(selected: boolean): void;
  setBadge(text: string | null): void;
  /** Replace the thumbnail image src (only applies to img-based thumbnails). */
  setThumbnailUrl(url: string): void;
  destroy(): void;
}

export function createAssetCapsule(opts: AssetCapsuleOptions): AssetCapsuleController {
  ensureStyles();

  const { assetId, name, thumbnailUrl, thumbnailCanvas, selected = false, badge, onClick, onPointerDown } = opts;

  const el = document.createElement('div');
  el.className = 'irs-asset-capsule';
  if (selected) el.classList.add('irs-asset-capsule--selected');

  // Thumbnail
  const thumb = document.createElement('div');
  thumb.className = 'irs-asset-capsule__thumb';

  let thumbImg: HTMLImageElement | null = null;

  if (thumbnailCanvas) {
    thumb.appendChild(thumbnailCanvas);
  } else if (thumbnailUrl) {
    thumbImg = document.createElement('img');
    thumbImg.src = thumbnailUrl;
    thumbImg.alt = name;
    thumb.appendChild(thumbImg);
  }

  el.appendChild(thumb);

  // Label
  const label = document.createElement('div');
  label.className = 'irs-asset-capsule__label';
  label.textContent = name;
  el.appendChild(label);

  // Optional badge
  let badgeEl: HTMLElement | null = null;
  if (badge) {
    badgeEl = document.createElement('div');
    badgeEl.className = 'irs-asset-capsule__badge';
    badgeEl.textContent = badge;
    el.appendChild(badgeEl);
  }

  // Events
  if (onPointerDown) {
    el.addEventListener('pointerdown', (event) => onPointerDown(assetId, event));
  }

  if (onClick) {
    el.addEventListener('click', () => onClick(assetId));
  }

  return {
    el,
    setSelected(s: boolean) {
      el.classList.toggle('irs-asset-capsule--selected', s);
    },
    setBadge(text: string | null) {
      if (text === null) {
        badgeEl?.remove();
        badgeEl = null;
      } else if (badgeEl) {
        badgeEl.textContent = text;
      } else {
        badgeEl = document.createElement('div');
        badgeEl.className = 'irs-asset-capsule__badge';
        badgeEl.textContent = text;
        el.appendChild(badgeEl);
      }
    },
    setThumbnailUrl(url: string) {
      if (thumbImg) {
        thumbImg.src = url;
      } else {
        thumbImg = document.createElement('img');
        thumbImg.src = url;
        thumbImg.alt = name;
        thumb.innerHTML = '';
        thumb.appendChild(thumbImg);
      }
    },
    destroy() {
      el.remove();
    },
  };
}
