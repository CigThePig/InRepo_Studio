import type { Project, SpriteAtlas, SpriteAtlasSlice } from '@/types';
import { resolveAssetUrl } from '@/shared/paths';
import { getAtlasCategoryName } from '@/shared/atlasNaming';

const LOG_PREFIX = '[AtlasCache]';

interface AtlasCategoryEntry {
  atlasPath: string;
  slices: SpriteAtlasSlice[];
}

export interface AtlasSliceImage {
  img: HTMLImageElement;
  rect: { x: number; y: number; w: number; h: number };
}

export interface AtlasCache {
  setProject(project: Project | null): void;
  getAtlasSlice(category: string, index: number): AtlasSliceImage | null;
  preloadProjectAtlases(project: Project): Promise<void>;
  clear(): void;
}

function createImageLoader(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load atlas image: ${url}`));
    img.src = url;
  });
}

export function createAtlasCache(): AtlasCache {
  let project: Project | null = null;
  const categories = new Map<string, AtlasCategoryEntry>();
  const atlasImages = new Map<string, HTMLImageElement>();
  const loadPromises = new Map<string, Promise<HTMLImageElement>>();

  function rebuildCategoryIndex(): void {
    categories.clear();
    for (const atlas of project?.spriteAtlases ?? []) {
      categories.set(getAtlasCategoryName(atlas.path), {
        atlasPath: atlas.path,
        slices: atlas.slices ?? [],
      });
    }
  }

  async function ensureAtlasImage(atlasPath: string): Promise<HTMLImageElement | null> {
    const existing = atlasImages.get(atlasPath);
    if (existing) return existing;

    const inFlight = loadPromises.get(atlasPath);
    if (inFlight) {
      try {
        return await inFlight;
      } catch {
        return null;
      }
    }

    const request = createImageLoader(resolveAssetUrl(atlasPath));
    loadPromises.set(atlasPath, request);

    try {
      const img = await request;
      atlasImages.set(atlasPath, img);
      console.log(`${LOG_PREFIX} Loaded sheet`, { atlasPath });
      return img;
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed to load atlas sheet`, { atlasPath, error });
      return null;
    } finally {
      loadPromises.delete(atlasPath);
    }
  }

  function findAtlas(category: string): AtlasCategoryEntry | null {
    if (!category.startsWith('atlas:')) return null;
    return categories.get(category) ?? null;
  }

  return {
    setProject(nextProject: Project | null): void {
      atlasImages.clear();
      loadPromises.clear();
      project = nextProject;
      rebuildCategoryIndex();
    },

    getAtlasSlice(category: string, index: number): AtlasSliceImage | null {
      if (!Number.isFinite(index) || index < 0) return null;
      const entry = findAtlas(category);
      if (!entry) return null;

      const slice = entry.slices[index];
      if (!slice) return null;

      const cachedImage = atlasImages.get(entry.atlasPath);
      if (!cachedImage) {
        ensureAtlasImage(entry.atlasPath).catch(() => undefined);
        return null;
      }

      return {
        img: cachedImage,
        rect: { ...slice.rect },
      };
    },

    async preloadProjectAtlases(projectToLoad: Project): Promise<void> {
      const atlases: SpriteAtlas[] = projectToLoad.spriteAtlases ?? [];
      await Promise.all(atlases.map((atlas) => ensureAtlasImage(atlas.path)));
    },

    clear(): void {
      atlasImages.clear();
      loadPromises.clear();
    },
  };
}
