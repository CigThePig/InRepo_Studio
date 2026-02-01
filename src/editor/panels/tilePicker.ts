/**
 * Tile Picker Component
 *
 * Displays tile categories as tabs and a grid of tiles for selection.
 * Used by the bottom panel when Paint or Erase tool is selected.
 */

import type { TileCategory } from '@/types';
import type { TileImageCache } from '@/editor/canvas/tileCache';

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
  /** Optional cache-bust token (used when tileCache is not provided). */
  cacheBust?: string | null;
}

// --- Styles ---

const STYLES = `
  .tile-picker {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .tile-picker--hidden {
    display: none;
  }

  .tile-picker__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #666;
    font-size: 13px;
    text-align: center;
    padding: 12px;
  }

  .category-tabs {
    display: flex;
    gap: 4px;
    padding: 4px 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    flex-shrink: 0;
  }

  .category-tabs::-webkit-scrollbar {
    display: none;
  }

  .category-tab {
    padding: 8px 16px;
    min-height: 44px;
    min-width: 44px;
    border-radius: 6px;
    border: 2px solid transparent;
    background: #2a2a4e;
    color: #ccc;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .category-tab:active {
    background: #3a3a6e;
  }

  .category-tab--active {
    border-color: #4a9eff;
    background: #3a3a6e;
    color: #fff;
  }

  .tile-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
    gap: 4px;
    padding: 8px 0;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    -webkit-overflow-scrolling: touch;
  }

  .tile-cell {
    aspect-ratio: 1;
    min-width: 48px;
    min-height: 48px;
    border: 2px solid transparent;
    border-radius: 4px;
    background: #1a1a3a;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .tile-cell:active {
    background: #2a2a5e;
  }

  .tile-cell--selected {
    border-color: #4a9eff;
    background: #2a2a5e;
  }

  .tile-cell__img {
    max-width: 32px;
    max-height: 32px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .tile-cell__placeholder {
    width: 24px;
    height: 24px;
    background: #333;
    border-radius: 2px;
  }

  .tile-cell__error {
    color: #f66;
    font-size: 16px;
  }
`;

// --- Image Cache ---

const imageCache = new Map<string, HTMLImageElement>();

function appendCacheBust(url: string, cacheBust?: string | null): string {
  if (!cacheBust) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(cacheBust)}`;
}

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
  assetBasePath: string,
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
  const cacheBust = options.cacheBust ?? null;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // Create DOM
  const picker = document.createElement('div');
  picker.className = 'tile-picker';

  // Handle empty categories
  if (categories.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tile-picker__empty';
    empty.textContent = 'No tile categories defined';
    picker.appendChild(empty);
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
        picker.classList.toggle('tile-picker--hidden', !visible);
      },
      destroy() {
        container.removeChild(picker);
        document.head.removeChild(styleEl);
      },
    };
  }

  // Create category tabs
  const categoryTabs = document.createElement('div');
  categoryTabs.className = 'category-tabs';

  const tabButtons = new Map<string, HTMLButtonElement>();

  for (const category of categories) {
    const tab = document.createElement('button');
    tab.className = `category-tab ${state.selectedCategory === category.name ? 'category-tab--active' : ''}`;
    tab.textContent = category.name;
    tab.setAttribute('data-category', category.name);

    tab.addEventListener('click', () => {
      if (state.selectedCategory === category.name) return;

      state.selectedCategory = category.name;
      state.selectedTileIndex = -1; // Reset selection on category change

      // Update tab UI
      tabButtons.forEach((btn, name) => {
        btn.classList.toggle('category-tab--active', name === category.name);
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
  tileGrid.className = 'tile-grid';

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
    imgEl.className = 'tile-cell__img';
    imgEl.alt = filename;

    if (sharedTileCache) {
      const cachedImg = sharedTileCache.getTileImage(categoryName, index);
      if (!cachedImg) {
        // Not ready yet; keep placeholder.
        const placeholder = document.createElement('div');
        placeholder.className = 'tile-cell__placeholder';
        cell.appendChild(placeholder);
        pendingCells.set(index, { filename });
        return;
      }
      imgEl.src = cachedImg.src;
      cell.appendChild(imgEl);
      return;
    }

    const url = appendCacheBust(`${assetBasePath}/${categoryPath}/${filename}`, cacheBust);
    loadImage(url)
      .then((img) => {
        imgEl.src = img.src;
        cell.appendChild(imgEl);
      })
      .catch(() => {
        cell.innerHTML = '';
        const errorEl = document.createElement('span');
        errorEl.className = 'tile-cell__error';
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
        imgEl.className = 'tile-cell__img';
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
    tileGrid.innerHTML = '';
    tileCells.clear();
    pendingCells.clear();

    const category = categories.find(c => c.name === state.selectedCategory);
    if (!category) {
      const empty = document.createElement('div');
      empty.className = 'tile-picker__empty';
      empty.textContent = 'Category not found';
      tileGrid.appendChild(empty);
      return;
    }

    if (category.files.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tile-picker__empty';
      empty.textContent = 'No tiles in this category';
      tileGrid.appendChild(empty);
      return;
    }

    category.files.forEach((filename, index) => {
      const cell = document.createElement('div');
      cell.className = `tile-cell ${state.selectedTileIndex === index ? 'tile-cell--selected' : ''}`;
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
          c.classList.toggle('tile-cell--selected', i === index);
        });

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
        btn.classList.toggle('category-tab--active', name === categoryName);
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
        tileCells.forEach(c => c.classList.remove('tile-cell--selected'));
        return;
      }

      state.selectedTileIndex = index;
      tileCells.forEach((c, i) => {
        c.classList.toggle('tile-cell--selected', i === index);
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
      picker.classList.toggle('tile-picker--hidden', !visible);
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
