/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Shared tile image cache for renderer and tile picker
 *
 * Defines:
 * - TileImageCache — interface for tile image loading and caching (type: interface)
 *
 * Canonical key set:
 * - Cache key format: `${category}:${index}`
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (images available immediately when loaded)
 *
 * Verification (minimum):
 * - [ ] Images load correctly from asset paths
 * - [ ] Cache returns same image on repeated calls
 * - [ ] onImageLoad fires when images complete loading
 */

import type { TileCategory } from '@/types';
import { resolveAssetUrl } from '@/shared/paths';

const LOG_PREFIX = '[TileCache]';

// --- Types ---

export interface TileImageCache {
  /** Get image for a tile by category and index. Returns null if not loaded. */
  getTileImage(category: string, index: number): HTMLImageElement | null;

  /** Preload all tiles for a category */
  preloadCategory(category: TileCategory): Promise<void>;

  /** Check if an image is loaded */
  isLoaded(category: string, index: number): boolean;

  /** Register callback for when any image loads (for re-render triggers) */
  onImageLoad(callback: () => void): void;

  /** Remove image load callback */
  offImageLoad(callback: () => void): void;

  /** Get the image path for a tile (for debugging/display) */
  getImagePath(category: string, index: number): string | null;

  /** Clear all cached images */
  clear(): void;
}

// --- Cache Key Helpers ---

function makeCacheKey(category: string, index: number): string {
  return `${category}:${index}`;
}


// --- Factory ---

export function createTileCache(): TileImageCache {
  const imageCache = new Map<string, HTMLImageElement>();
  const pendingLoads = new Map<string, Promise<HTMLImageElement | null>>();
  const pathCache = new Map<string, string>(); // Cache key -> full path
  const loadCallbacks = new Set<() => void>();

  function notifyImageLoaded(): void {
    for (const callback of loadCallbacks) {
      try {
        callback();
      } catch (e) {
        console.error(`${LOG_PREFIX} Error in load callback:`, e);
      }
    }
  }

  function loadImage(key: string, src: string): Promise<HTMLImageElement | null> {
    // Check if already loaded
    const cached = imageCache.get(key);
    if (cached) {
      return Promise.resolve(cached);
    }

    // Check if load is in progress
    const pending = pendingLoads.get(key);
    if (pending) {
      return pending;
    }

    // Start new load
    const promise = new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        imageCache.set(key, img);
        pendingLoads.delete(key);
        notifyImageLoaded();
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`${LOG_PREFIX} Failed to load: ${src}`);
        pendingLoads.delete(key);
        resolve(null);
      };
      img.src = src;
    });

    pendingLoads.set(key, promise);
    return promise;
  }

  const cache: TileImageCache = {
    getTileImage(category: string, index: number): HTMLImageElement | null {
      const key = makeCacheKey(category, index);
      return imageCache.get(key) ?? null;
    },

    async preloadCategory(category: TileCategory): Promise<void> {
      const promises: Promise<HTMLImageElement | null>[] = [];

      for (let i = 0; i < category.files.length; i++) {
        const filename = category.files[i];
        const key = makeCacheKey(category.name, i);
        const src = resolveAssetUrl(`${category.path}/${filename}`);

        // Store path for debugging
        pathCache.set(key, src);

        // Start loading
        promises.push(loadImage(key, src));
      }

      await Promise.all(promises);
      console.log(`${LOG_PREFIX} Preloaded category "${category.name}" (${category.files.length} tiles)`);
    },

    isLoaded(category: string, index: number): boolean {
      const key = makeCacheKey(category, index);
      return imageCache.has(key);
    },

    onImageLoad(callback: () => void): void {
      loadCallbacks.add(callback);
    },

    offImageLoad(callback: () => void): void {
      loadCallbacks.delete(callback);
    },

    getImagePath(category: string, index: number): string | null {
      const key = makeCacheKey(category, index);
      return pathCache.get(key) ?? null;
    },

    clear(): void {
      imageCache.clear();
      pendingLoads.clear();
      pathCache.clear();
      console.log(`${LOG_PREFIX} Cache cleared`);
    },
  };

  return cache;
}
