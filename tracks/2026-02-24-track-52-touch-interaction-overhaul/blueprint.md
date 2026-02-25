# Track 52 — Touch Interaction Overhaul — Blueprint

## Technical Design

### Long-press gesture implementation

Each asset capsule's `onPointerDown` handler initiates a long-press timer. If the pointer moves > 8px before the timer fires, the timer is cancelled and drag begins instead. If the pointer is released before the timer fires, no action. If the timer fires and the pointer is still down, the capsule enters "selection-lit" state.

```ts
const LONG_PRESS_MS = 400;
const DRAG_THRESHOLD_PX = 8;

function attachLongPress(el: HTMLElement, opts: LongPressOpts): void {
  let timerId: number | null = null;
  let startX = 0, startY = 0;
  let didLongPress = false;

  el.addEventListener('pointerdown', (e) => {
    startX = e.clientX; startY = e.clientY;
    didLongPress = false;
    timerId = window.setTimeout(() => {
      didLongPress = true;
      opts.onSelectionLit();       // Highlight capsule
    }, LONG_PRESS_MS);
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', (e) => {
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      if (timerId) { clearTimeout(timerId); timerId = null; }
      if (didLongPress) opts.onDragStart(e);   // Long-press drag
    }
  });

  el.addEventListener('pointerup', (e) => {
    if (timerId) { clearTimeout(timerId); timerId = null; }
    if (didLongPress) opts.onPopupOpen(e);      // Long-press release → popup
    else opts.onTap(e);                         // Short tap → select/paint
  });

  el.addEventListener('pointercancel', () => {
    if (timerId) { clearTimeout(timerId); timerId = null; }
  });
}
```

This replaces the existing `pointerdown` → `openAssetSheet` flow in `assetLibraryTab.ts`.

### Settings popup (`createAssetSettingsPopup`)

New file: `src/editor/panels/assetSettingsPopup.ts`

```ts
interface AssetSettingsPopupOptions {
  assetId: string;
  assetType: AssetGroupType;
  anchorRect: DOMRect;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveTo: (id: string, targetType: AssetGroupType) => void;
  onDuplicate: (id: string) => void;
  onDismiss: () => void;
}

function createAssetSettingsPopup(opts: AssetSettingsPopupOptions): { destroy(): void }
```

Popup is appended to `document.body`. Position: above the anchor if `anchorRect.top > window.innerHeight / 2`, else below. Uses `position: fixed` to escape scroll containers.

### Multi-select state

Module-level in `assetLibraryTab.ts`:
```ts
let selectedAssetIds: Set<string> = new Set();
```

Selecting an asset: if already selected, deselect. Otherwise add. If the set is non-empty, subsequent taps (non-long-press) on unselected assets also add to selection (because we are in "selection mode").

Reset `selectedAssetIds` on: subtab change, popup dismiss after action, navigate away.

### Organize mode — full tile drag

Remove the `dragHandle` div (line ~1046). The entire capsule receives the `pointerdown` for drag in organize mode. The existing `dragState` mechanism in `assetLibraryTab.ts` is retained but triggered from the capsule body instead of the handle.

For multi-select drag: if `selectedAssetIds.size > 1` when drag begins, the drag ghost shows a badge with `×N`. On drop, all selected assets are inserted at the drop target in their original relative order.

### Files touched

#### New files
- `src/editor/panels/assetSettingsPopup.ts`

#### Modified files
- `src/editor/panels/assetLibraryTab.ts`
  - Remove `moreButton` (line ~1105)
  - Remove `dragHandle` div in organize mode (line ~1046)
  - Replace `pointerdown → openAssetSheet` with `attachLongPress` from `assetCapsule.ts` or inline
  - Add `selectedAssetIds` multi-select state
  - Wire multi-asset drag
- `src/editor/panels/assetCapsule.ts` (Track 51) — expose `onPointerDown` and `setLit(bool)` on the controller
- `INDEX.md` — add `assetSettingsPopup.ts`
