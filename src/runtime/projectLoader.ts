import Phaser from 'phaser';
import type { Project, EntityType } from '@/types';
import { checkFreshness, resolveAssetPath } from '@/storage/cold';
import type { UnifiedLoader } from '@/runtime/loader';

const LOG_PREFIX = '[Runtime/ProjectLoader]';

type TextureKeyMap = Map<string, string>;

type SpriteKeyMap = Map<string, string | null>;

export interface ProjectRuntime {
  project: Project;
  tileTextureKeys: TextureKeyMap;
  entityTypes: Map<string, EntityType>;
  entitySpriteKeys: SpriteKeyMap;
  getTileTextureKey(category: string, index: number): string | null;
  getEntitySpriteKey(typeName: string): string | null;
}

export interface ProjectLoaderConfig {
  loader: UnifiedLoader;
  phaserScene: Phaser.Scene;
}

interface AssetRequest {
  key: string;
  url: string;
}

function appendCacheBust(url: string, cacheBust?: string | null): string {
  if (!cacheBust) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(cacheBust)}`;
}

async function loadAssets(scene: Phaser.Scene, requests: AssetRequest[]): Promise<void> {
  const loader = scene.load;
  const queued = requests.filter(({ key }) => !scene.textures.exists(key));

  if (queued.length === 0) {
    return;
  }

  for (const asset of queued) {
    loader.image(asset.key, asset.url);
  }

  await new Promise<void>((resolve) => {
    loader.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    loader.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`${LOG_PREFIX} Failed to load asset: ${file?.key ?? 'unknown'}`);
    });
    loader.start();
  });
}

function buildTileRequests(project: Project, cacheBust?: string | null): AssetRequest[] {
  const requests: AssetRequest[] = [];

  for (const category of project.tileCategories) {
    for (const [index, file] of category.files.entries()) {
      const key = `tile:${category.name}:${index}`;
      const url = appendCacheBust(resolveAssetPath(`${category.path}/${file}`), cacheBust);
      requests.push({ key, url });
    }
  }

  return requests;
}

function buildEntitySpriteRequests(project: Project, cacheBust?: string | null): AssetRequest[] {
  const requests: AssetRequest[] = [];

  for (const entityType of project.entityTypes) {
    if (!entityType.sprite) continue;
    const key = `entity:${entityType.name}`;
    const url = appendCacheBust(resolveAssetPath(entityType.sprite), cacheBust);
    requests.push({ key, url });
  }

  return requests;
}

function buildTileTextureKeys(project: Project): TextureKeyMap {
  const keys: TextureKeyMap = new Map();

  for (const category of project.tileCategories) {
    for (const [index] of category.files.entries()) {
      const key = `tile:${category.name}:${index}`;
      keys.set(`${category.name}:${index}`, key);
    }
  }

  return keys;
}

function buildEntitySpriteKeys(project: Project): SpriteKeyMap {
  const keys: SpriteKeyMap = new Map();

  for (const entityType of project.entityTypes) {
    const key = entityType.sprite ? `entity:${entityType.name}` : null;
    keys.set(entityType.name, key);
  }

  return keys;
}

export async function initProject(config: ProjectLoaderConfig): Promise<ProjectRuntime> {
  const { loader, phaserScene } = config;

  const project = await loader.loadProject();
  console.log(`${LOG_PREFIX} Loaded project: ${project.name}`);

  // Cache-bust token (best-effort). This reduces "stale 404" issues on CDNs like GitHub Pages
  // when assets are added/updated but cached responses linger.
  let cacheBust: string | null = null;
  try {
    const freshness = await checkFreshness('project.json');
    cacheBust = freshness.etag ?? freshness.lastModified ?? null;
  } catch (e) {
    console.warn(`${LOG_PREFIX} Unable to compute cacheBust token:`, e);
  }

  const tileRequests = buildTileRequests(project, cacheBust);
  const entityRequests = buildEntitySpriteRequests(project, cacheBust);
  await loadAssets(phaserScene, [...tileRequests, ...entityRequests]);

  const entityTypes = new Map<string, EntityType>();
  for (const entityType of project.entityTypes) {
    entityTypes.set(entityType.name, entityType);
  }

  const tileTextureKeys = buildTileTextureKeys(project);
  const entitySpriteKeys = buildEntitySpriteKeys(project);

  return {
    project,
    tileTextureKeys,
    entityTypes,
    entitySpriteKeys,
    getTileTextureKey(category, index) {
      return tileTextureKeys.get(`${category}:${index}`) ?? null;
    },
    getEntitySpriteKey(typeName) {
      return entitySpriteKeys.get(typeName) ?? null;
    },
  };
}
