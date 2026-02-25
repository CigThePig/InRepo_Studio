# Track 51 — Asset Capsule Component Unification — Blueprint

## Technical Design

### `createAssetCapsule` API

```ts
export interface AssetCapsuleOptions {
  assetId: string;
  name: string;
  thumbnailUrl?: string;
  thumbnailCanvas?: HTMLCanvasElement;   // Animated thumbnails
  selected?: boolean;
  badge?: string;                         // e.g. count label, type tag
  onClick?: (assetId: string) => void;
  onPointerDown?: (assetId: string, event: PointerEvent) => void;
}

export interface AssetCapsuleController {
  el: HTMLElement;
  setSelected(selected: boolean): void;
  setBadge(text: string | null): void;
  destroy(): void;
}

export function createAssetCapsule(opts: AssetCapsuleOptions): AssetCapsuleController;
```

### Capsule DOM structure

```
.irs-asset-capsule
  .irs-asset-capsule__thumb       ← 48×48 fixed thumbnail area
    img | canvas
  .irs-asset-capsule__label       ← word-break: break-word
  .irs-asset-capsule__badge?      ← optional badge slot
```

### CSS (injected once via style dedup)

```css
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
```

### Files touched

#### New files
- `src/editor/panels/assetCapsule.ts`

#### Modified files
- `src/editor/panels/assetLibraryTab.ts` — replace bespoke card HTML with `createAssetCapsule`; remove old card CSS
- `src/editor/panels/tilePicker.ts` — replace card HTML; remove ground-tab backing square CSS
- `src/editor/panels/assetPalette.ts` — replace `.irs-asset-palette__card` construction
- `src/editor/panels/entitiesTab.ts` — replace entity palette card construction; use `badge` slot for placement count
- `INDEX.md` — add `assetCapsule.ts` entry
