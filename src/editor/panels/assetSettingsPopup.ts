/**
 * Asset Settings Popup
 *
 * A fixed-position context menu that appears adjacent to an asset capsule
 * after a long-press gesture. Provides Rename, Delete, and Move-to actions.
 *
 * Positioned above the anchor if the anchor is in the lower half of the
 * viewport; otherwise below it.
 */

import type { AssetGroupType } from '@/editor/assets';

const STYLE_ID = 'irs-asset-settings-popup-styles';

const STYLES = `
  .irs-asset-settings-popup {
    position: fixed;
    z-index: 200;
    min-width: 160px;
    background: var(--irs-surface-modal);
    border: 1.5px solid var(--irs-border-heavy);
    border-radius: var(--irs-radius-xl);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .irs-asset-settings-popup__btn {
    min-height: var(--irs-touch-target);
    padding: 0 14px;
    border-radius: var(--irs-radius-md);
    border: none;
    background: transparent;
    color: var(--irs-text-primary);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .irs-asset-settings-popup__btn:active {
    background: var(--irs-accent-primary-active);
  }

  .irs-asset-settings-popup__btn--danger {
    color: var(--irs-accent-danger);
  }

  .irs-asset-settings-popup__divider {
    height: 1px;
    background: var(--irs-border-heavy);
    margin: 2px 0;
  }
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);
}

export interface AssetSettingsPopupOptions {
  assetId: string;
  assetGroupType: AssetGroupType;
  anchorRect: DOMRect;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveTo: (id: string, targetType: AssetGroupType) => void;
  onDismiss: () => void;
}

export interface AssetSettingsPopupController {
  destroy(): void;
}

/**
 * Creates and mounts the settings popup. Returns a controller with a
 * `destroy()` method for programmatic dismissal.
 */
export function createAssetSettingsPopup(opts: AssetSettingsPopupOptions): AssetSettingsPopupController {
  ensureStyles();

  const { assetId, assetGroupType, anchorRect, onRename, onDelete, onMoveTo, onDismiss } = opts;

  let destroyed = false;

  function dismiss(): void {
    if (destroyed) return;
    destroyed = true;
    popup.remove();
    document.removeEventListener('pointerdown', onOutsidePointerDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
    onDismiss();
  }

  const popup = document.createElement('div');
  popup.className = 'irs-asset-settings-popup';

  function addBtn(label: string, onClick: () => void, danger = false): void {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'irs-asset-settings-popup__btn' + (danger ? ' irs-asset-settings-popup__btn--danger' : '');
    btn.textContent = label;
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', () => {
      dismiss();
      onClick();
    });
    popup.appendChild(btn);
  }

  function addDivider(): void {
    const div = document.createElement('div');
    div.className = 'irs-asset-settings-popup__divider';
    popup.appendChild(div);
  }

  addBtn('Rename', () => onRename(assetId));
  addDivider();

  // Move to options — exclude current type and 'sources'
  const moveTargets: AssetGroupType[] = (['tilesets', 'props', 'entities'] as AssetGroupType[]).filter(
    (t) => t !== assetGroupType
  );
  if (moveTargets.length > 0) {
    const typeLabels: Record<AssetGroupType, string> = {
      tilesets: 'Tiles',
      props: 'Props',
      entities: 'Entities',
      sources: 'Sources',
    };
    moveTargets.forEach((target) => {
      addBtn(`Move to ${typeLabels[target]}`, () => onMoveTo(assetId, target));
    });
    addDivider();
  }

  addBtn('Delete', () => onDelete(assetId), true);

  // Position: horizontally clamp to viewport; vertically above or below anchor
  document.body.appendChild(popup);

  const popupRect = popup.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const MARGIN = 8;

  // Vertical: prefer below if anchor is in upper half, above if lower half
  const spaceBelow = vh - anchorRect.bottom;
  const spaceAbove = anchorRect.top;
  let top: number;
  if (spaceBelow >= popupRect.height + MARGIN || spaceBelow >= spaceAbove) {
    top = anchorRect.bottom + MARGIN;
  } else {
    top = anchorRect.top - popupRect.height - MARGIN;
  }

  // Horizontal: align to left edge of anchor, clamped to viewport
  let left = anchorRect.left;
  left = Math.max(MARGIN, Math.min(left, vw - popupRect.width - MARGIN));
  top = Math.max(MARGIN, Math.min(top, vh - popupRect.height - MARGIN));

  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;

  // Dismiss on outside pointer
  const onOutsidePointerDown = (e: PointerEvent): void => {
    if (!popup.contains(e.target as Node)) {
      dismiss();
    }
  };

  // Dismiss on Escape
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      dismiss();
    }
  };

  // Attach after a microtask to avoid the triggering pointerup/click from dismissing immediately
  queueMicrotask(() => {
    if (!destroyed) {
      document.addEventListener('pointerdown', onOutsidePointerDown, true);
      document.addEventListener('keydown', onKeyDown, true);
    }
  });

  return { destroy: dismiss };
}
