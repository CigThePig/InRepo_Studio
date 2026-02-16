import Phaser from 'phaser';
import type { Project, EntityType } from '@/types';
import { resolveAssetUrl } from '@/shared/paths';
import { getAtlasCategoryName } from '@/shared/atlasNaming';
import type { UnifiedLoader } from '@/runtime/loader';

const LOG_PREFIX = '[Runtime/ProjectLoader]';

type TextureKeyMap = Map<string, string>;

type SpriteKeyMap = Map<string, string | null>;

export interface ProjectRuntime {
  project: Project;
  tileTextureKeys: TextureKeyMap;
  atlasTextureKeys: TextureKeyMap;
  entityTypes: Map<string, EntityType>;
  entitySpriteKeys: SpriteKeyMap;
  getTileTextureKey(category: string, index: number): string | null;
  getAtlasTextureKey(category: string): string | null;
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

function buildTileRequests(project: Project): AssetRequest[] {
  const requests: AssetRequest[] = [];

  for (const category of project.tileCategories) {
    for (const [index, file] of category.files.entries()) {
      const key = `tile:${category.name}:${index}`;
      const url = resolveAssetUrl(`${category.path}/${file}`);
      requests.push({ key, url });
    }
  }

  for (const atlas of project.spriteAtlases ?? []) {
    const category = getAtlasCategoryName(atlas.path);
    requests.push({
      key: category,
      url: resolveAssetUrl(atlas.path),
    });
  }

  return requests;
}

function buildEntitySpriteRequests(project: Project): AssetRequest[] {
  const requests: AssetRequest[] = [];

  for (const entityType of project.entityTypes) {
    if (!entityType.sprite) continue;
    const key = `entity:${entityType.name}`;
    const url = resolveAssetUrl(entityType.sprite);
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

function buildAtlasTextureKeys(project: Project): TextureKeyMap {
  const keys: TextureKeyMap = new Map();

  for (const atlas of project.spriteAtlases ?? []) {
    const category = getAtlasCategoryName(atlas.path);
    keys.set(category, category);
  }

  return keys;
}


function registerAtlasFrames(phaserScene: Phaser.Scene, project: Project): void {
  for (const atlas of project.spriteAtlases ?? []) {
    const textureKey = getAtlasCategoryName(atlas.path);
    if (!phaserScene.textures.exists(textureKey)) continue;

    const texture = phaserScene.textures.get(textureKey);
    for (const slice of atlas.slices ?? []) {
      // Frame names only need to be unique within this texture.
      // If already registered, skip.
      const hasFrame = (texture as any).has
        ? (texture as any).has(slice.name)
        : Boolean((texture as any).frames?.[slice.name]);
      if (hasFrame) continue;

      texture.add(slice.name, 0, slice.rect.x, slice.rect.y, slice.rect.w, slice.rect.h);
    }
  }
}

export async function initProject(config: ProjectLoaderConfig): Promise<ProjectRuntime> {
  const { loader, phaserScene } = config;

  const project = await loader.loadProject();
  console.log(`${LOG_PREFIX} Loaded project: ${project.name}`);

  const tileRequests = buildTileRequests(project);
  const entityRequests = buildEntitySpriteRequests(project);
  await loadAssets(phaserScene, [...tileRequests, ...entityRequests]);

  // Force nearest filtering for pixel-art textures (prevents blur and edge seams when scaled).
  for (const req of [...tileRequests, ...entityRequests]) {
    if (!phaserScene.textures.exists(req.key)) continue;
    const tex: any = phaserScene.textures.get(req.key);
    tex?.setFilter?.(Phaser.Textures.FilterMode.NEAREST);
  }


  // Sprite atlases are loaded as a single sheet image. Register per-slice frames so
  // runtime rendering can reference slices by frame name (avoids crop+scale bugs).
  registerAtlasFrames(phaserScene, project);

  const entityTypes = new Map<string, EntityType>();
  for (const entityType of project.entityTypes) {
    entityTypes.set(entityType.name, entityType);
  }

  const tileTextureKeys = buildTileTextureKeys(project);
  const atlasTextureKeys = buildAtlasTextureKeys(project);
  const entitySpriteKeys = buildEntitySpriteKeys(project);
  console.log(`${LOG_PREFIX} Loaded atlas sheets count: ${(project.spriteAtlases ?? []).length}`);

  return {
    project,
    tileTextureKeys,
    atlasTextureKeys,
    entityTypes,
    entitySpriteKeys,
    getTileTextureKey(category, index) {
      return tileTextureKeys.get(`${category}:${index}`) ?? null;
    },
    getAtlasTextureKey(category) {
      return atlasTextureKeys.get(category) ?? null;
    },
    getEntitySpriteKey(typeName) {
      return entitySpriteKeys.get(typeName) ?? null;
    },
  };
}
