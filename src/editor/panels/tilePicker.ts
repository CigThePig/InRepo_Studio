/**
 * Tile Picker Component
 *
 * Displays tile categories as tabs and a grid of tiles for selection.
 * Used by the bottom panel when Paint or Erase tool is selected.
 */

import type { TileCategory } from '@/types';
import type { TileImageCache } from '@/editor/canvas/tileCache';
import { resolveAssetUrl } from '@/shared/paths';
import { uxFeedback } from '@/editor/uxFeedback';

const LOG_PREFIX = '[TilePicker]';

// --- Types ---

export interface TileSelection {
  category: string;
  index: number;
  path: string;
}

export interface TilePickerState {
  categories: TileCategory[];
  selectedCategory: string;
  selectedTileIndex: number;
}

export interface TilePickerController {
  /** Set the selected category */
  setSelectedCategory(categoryName: string): void;

  /** Get the selected category */
  getSelectedCategory(): string;

  /** Set the selected tile index */
  setSelectedTile(index: number): void;

  /** Get the selected tile */
  getSelectedTile(): TileSelection | null;

  /** Register callback for tile selection */
  onTileSelect(callback: (selection: TileSelection) => void): void;

  /** Register callback for category change */
  onCategoryChange(callback: (categoryName: string) => void): void;

  /** Show/hide the tile picker */
  setVisible(visible: boolean): void;

  /** Clean up resources */
  destroy(): void;
}

export interface TilePickerOptions {
  /** Optional shared cache from the canvas renderer (avoids duplicate loads and keeps cache-bust consistent). */
  tileCache?: TileImageCache;
  /** Called when the user activates the "Open Asset Library" action on the empty state. */
  onOpenAssetLibrary?: () => void;
}

// --- Styles ---

const STYLES = `
  .irs-tile-picker {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .irs-tile-picker--hidden {
    display: none;
  }

  .irs-tile-picker__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--irs-text-muted);
    font-size: 13px;
    text-align: center;
    padding: 12px;
  }

  .irs-tile-picker__category-tabs {
    display: flex;
    gap: 4px;
    padding: 4px 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    flex-shrink: 0;
  }

  .irs-tile-picker__category-tabs::-webkit-scrollbar {
    display: none;
  }

  .irs-tile-picker__category-tab {
    padding: 8px 16px;
    min-height: 44px;
    min-width: 44px;
    border-radius: var(--irs-radius-sm);
    border: 2px solid transparent;
    background: var(--irs-surface-panel);
    color: var(--irs-text-secondary);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .irs-tile-picker__category-tab:active {
    background: var(--irs-border-heavy);
  }

  .irs-tile-picker__category-tab--active {
    border-color: var(--irs-accent-primary);
    background: var(--irs-border-heavy);
    color: var(--irs-text-primary);
  }

  .irs-tile-picker__tile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
    gap: 4px;
    padding: 8px 0;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    -webkit-overflow-scrolling: touch;
  }

  .irs-tile-picker__tile-cell {
    aspect-ratio: 1;
    min-width: 48px;
    min-height: 48px;
    border: 2px solid transparent;
    border-radius: var(--irs-radius-sm);
    background: var(--irs-surface-modal);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .irs-tile-picker__tile-cell:active {
    background: var(--irs-surface-panel);
  }

  .irs-tile-picker__tile-cell--selected {
    border-color: var(--irs-accent-primary);
    background: var(--irs-surface-panel);
  }

  .irs-tile-picker__tile-cell-img {
    max-width: 32px;
    max-height: 32px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .irs-tile-picker__tile-cell-placeholder {
    width: 24px;
    height: 24px;
    background: var(--irs-surface-base);
    border-radius: 2px;
  }

  .irs-tile-picker__tile-cell-error {
    color: var(--irs-color-red);
    font-size: 16px;
  }
`;

// --- Image Cache ---

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
}

// --- Factory ---

export function createTilePicker(
  container: HTMLElement,
  categories: TileCategory[],
  initialState?: { category?: string; tileIndex?: number },
  options: TilePickerOptions = {}
): TilePickerController {
  const state: TilePickerState = {
    categories,
    selectedCategory: initialState?.category ?? categories[0]?.name ?? '',
    selectedTileIndex: initialState?.tileIndex ?? -1,
  };

  let tileSelectCallback: ((selection: TileSelection) => void) | null = null;
  let categoryChangeCallback: ((categoryName: string) => void) | null = null;

  const sharedTileCache = options.tileCache;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // Create DOM
  const picker = document.createElement('div');
  picker.className = 'irs-tile-picker';

  // Handle empty categories
  if (categories.length === 0) {
    uxFeedback.emptyState.render(picker, {
      message: 'No tileset loaded.',
      actionLabel: 'Open Asset Library',
      onAction: () => options.onOpenAssetLibrary?.(),
    });
    container.appendChild(picker);

    console.log(`${LOG_PREFIX} Tile picker created (no categories)`);

    return {
      setSelectedCategory() {},
      getSelectedCategory() { return ''; },
      setSelectedTile() {},
      getSelectedTile() { return null; },
      onTileSelect() {},
      onCategoryChange() {},
      setVisible(visible) {
        picker.classList.toggle('irs-tile-picker--hidden', !visible);
      },
      destroy() {
        container.removeChild(picker);
        document.head.removeChild(styleEl);
      },
    };
  }

  // Create category tabs
  const categoryTabs = document.createElement('div');
  categoryTabs.className = 'irs-tile-picker__category-tabs';

  const tabButtons = new Map<string, HTMLButtonElement>();

  for (const category of categories) {
    const tab = document.createElement('button');
    tab.className = `irs-btn irs-btn--secondary irs-tile-picker__category-tab ${state.selectedCategory === category.name ? 'irs-tile-picker__category-tab--active' : ''}`;
    tab.textContent = category.name;
    tab.setAttribute('data-category', category.name);

    tab.addEventListener('click', () => {
      if (state.selectedCategory === category.name) return;

      state.selectedCategory = category.name;
      state.selectedTileIndex = -1; // Reset selection on category change

      // Update tab UI
      tabButtons.forEach((btn, name) => {
        btn.classList.toggle('irs-tile-picker__category-tab--active', name === category.name);
      });

      // Render new tile grid
      renderTileGrid();

      // Notify
      categoryChangeCallback?.(category.name);
      console.log(`${LOG_PREFIX} Category changed to "${category.name}"`);
    });

    tabButtons.set(category.name, tab);
    categoryTabs.appendChild(tab);
  }

  // Create tile grid container
  const tileGrid = document.createElement('div');
  tileGrid.className = 'irs-tile-picker__tile-grid';

  picker.appendChild(categoryTabs);
  picker.appendChild(tileGrid);
  container.appendChild(picker);

  // --- Tile Grid Rendering ---

  const tileCells = new Map<number, HTMLElement>();

  // When using the shared tile cache, keep track of visible cells that are still waiting on images.
  const pendingCells = new Map<number, { filename: string }>();

  function renderCellImage(
    cell: HTMLElement,
    categoryName: string,
    categoryPath: string,
    index: number,
    filename: string
  ): void {
    cell.innerHTML = '';
    const imgEl = document.createElement('img');
    imgEl.className = 'irs-tile-picker__tile-cell-img';
    imgEl.alt = filename;

    if (sharedTileCache) {
      const cachedImg = sharedTileCache.getTileImage(categoryName, index);
      if (!cachedImg) {
        // Not ready yet; keep placeholder.
        const placeholder = document.createElement('div');
        placeholder.className = 'irs-tile-picker__tile-cell-placeholder';
        cell.appendChild(placeholder);
        pendingCells.set(index, { filename });
        return;
      }
      imgEl.src = cachedImg.src;
      cell.appendChild(imgEl);
      return;
    }

    const url = resolveAssetUrl(`${categoryPath}/${filename}`);
    loadImage(url)
      .then((img) => {
        imgEl.src = img.src;
        cell.appendChild(imgEl);
      })
      .catch(() => {
        cell.innerHTML = '';
        const errorEl = document.createElement('span');
        errorEl.className = 'irs-tile-picker__tile-cell-error';
        errorEl.textContent = '?';
        errorEl.title = `Failed to load: ${filename}`;
        cell.appendChild(errorEl);
        console.warn(`${LOG_PREFIX} Failed to load tile: ${url}`);
      });
  }

  function tryResolvePendingCells(): void {
    if (!sharedTileCache) return;
    const category = categories.find(c => c.name === state.selectedCategory);
    if (!category) return;

    // Only update cells that are currently visible for the active category.
    for (const [index, meta] of pendingCells) {
      const cell = tileCells.get(index);
      if (!cell) {
        pendingCells.delete(index);
        continue;
      }
      const img = sharedTileCache.getTileImage(category.name, index);
      if (img) {
        cell.innerHTML = '';
        const imgEl = document.createElement('img');
        imgEl.className = 'irs-tile-picker__tile-cell-img';
        imgEl.src = img.src;
        imgEl.alt = meta.filename;
        cell.appendChild(imgEl);
        pendingCells.delete(index);
      }
    }
  }

  // If we're using the shared cache, refresh tile picker cells as images become available.
  const onSharedCacheLoad = () => {
    tryResolvePendingCells();
  };
  if (sharedTileCache) {
    sharedTileCache.onImageLoad(onSharedCacheLoad);
  }

  function renderTileGrid(): void {
    uxFeedback.selection.clear();
    tileGrid.innerHTML = '';
    tileCells.clear();
    pendingCells.clear();

    const category = categories.find(c => c.name === state.selectedCategory);
    if (!category) {
      uxFeedback.emptyState.render(tileGrid, {
        message: 'Category not found.',
        actionLabel: 'Open Asset Library',
        onAction: () => options.onOpenAssetLibrary?.(),
      });
      return;
    }

    if (category.files.length === 0) {
      uxFeedback.emptyState.render(tileGrid, {
        message: 'No tiles in this category.',
        actionLabel: 'Open Asset Library',
        onAction: () => options.onOpenAssetLibrary?.(),
      });
      return;
    }

    category.files.forEach((filename, index) => {
      const cell = document.createElement('div');
      cell.className = `irs-tile-picker__tile-cell ${state.selectedTileIndex === index ? 'irs-tile-picker__tile-cell--selected' : ''}`;
      cell.setAttribute('data-index', String(index));

      // Render tile image (shared cache preferred; falls back to direct image loading)
      renderCellImage(cell, category.name, category.path, index, filename);

      // Click handler
      cell.addEventListener('click', () => {
        if (state.selectedTileIndex === index) return;

        // Update state
        state.selectedTileIndex = index;

        // Update UI
        tileCells.forEach((c, i) => {
          c.classList.toggle('irs-tile-picker__tile-cell--selected', i === index);
        });
        uxFeedback.selection.mark(cell);

        // Notify
        const selection: TileSelection = {
          category: state.selectedCategory,
          index,
          path: `${category.path}/${filename}`,
        };
        tileSelectCallback?.(selection);
        console.log(`${LOG_PREFIX} Tile selected: ${category.name}[${index}]`);
      });

      tileCells.set(index, cell);
      tileGrid.appendChild(cell);
    });

    // If some images were already loaded in the shared cache, resolve them immediately.
    tryResolvePendingCells();
  }

  // Initial render
  renderTileGrid();

  console.log(`${LOG_PREFIX} Tile picker created (${categories.length} categories)`);

  // --- Controller ---

  const controller: TilePickerController = {
    setSelectedCategory(categoryName: string) {
      if (state.selectedCategory === categoryName) return;

      const category = categories.find(c => c.name === categoryName);
      if (!category) {
        console.warn(`${LOG_PREFIX} Category not found: ${categoryName}`);
        return;
      }

      state.selectedCategory = categoryName;
      state.selectedTileIndex = -1;

      // Update tab UI
      tabButtons.forEach((btn, name) => {
        btn.classList.toggle('irs-tile-picker__category-tab--active', name === categoryName);
      });

      // Re-render grid
      renderTileGrid();
    },

    getSelectedCategory() {
      return state.selectedCategory;
    },

    setSelectedTile(index: number) {
      const category = categories.find(c => c.name === state.selectedCategory);
      if (!category || index < 0 || index >= category.files.length) {
        state.selectedTileIndex = -1;
        tileCells.forEach(c => c.classList.remove('irs-tile-picker__tile-cell--selected'));
        return;
      }

      state.selectedTileIndex = index;
      tileCells.forEach((c, i) => {
        c.classList.toggle('irs-tile-picker__tile-cell--selected', i === index);
      });
    },

    getSelectedTile() {
      if (state.selectedTileIndex < 0) return null;

      const category = categories.find(c => c.name === state.selectedCategory);
      if (!category || state.selectedTileIndex >= category.files.length) return null;

      return {
        category: state.selectedCategory,
        index: state.selectedTileIndex,
        path: `${category.path}/${category.files[state.selectedTileIndex]}`,
      };
    },

    onTileSelect(callback) {
      tileSelectCallback = callback;
    },

    onCategoryChange(callback) {
      categoryChangeCallback = callback;
    },

    setVisible(visible) {
      picker.classList.toggle('irs-tile-picker--hidden', !visible);
    },

    destroy() {
      container.removeChild(picker);
      document.head.removeChild(styleEl);
      if (sharedTileCache) {
        sharedTileCache.offImageLoad(onSharedCacheLoad);
      }
      console.log(`${LOG_PREFIX} Tile picker destroyed`);
    },
  };

  return controller;
}
