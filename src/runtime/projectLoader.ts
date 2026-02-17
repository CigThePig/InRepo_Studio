import Phaser from 'phaser';
import type { Project, EntityType, ProjectAnimation } from '@/types';
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
  /** Animation id -> ProjectAnimation */
  animationsById: Map<string, ProjectAnimation>;
  /** Animation id -> Phaser runtime key (`anim:${id}`) */
  animationKeyById: Map<string, string>;
  /** Lowercase animation name -> Phaser runtime key */
  animationKeyByName: Map<string, string>;
  getTileTextureKey(category: string, index: number): string | null;
  getAtlasTextureKey(category: string): string | null;
  getEntitySpriteKey(typeName: string): string | null;
  /** Resolve an animation id or name to its Phaser runtime key. */
  resolveAnimationKey(value: string): string | null;
  /** Get the pivot for an animation by its runtime key. */
  getAnimationPivotByKey(key: string): { x: number; y: number } | null;
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


function registerProjectAnimations(
  phaserScene: Phaser.Scene,
  project: Project,
  animationsById: Map<string, ProjectAnimation>,
  animationKeyById: Map<string, string>,
  animationKeyByName: Map<string, string>,
  pivotByKey: Map<string, { x: number; y: number }>,
): void {
  const animations = project.animations ?? [];
  const namesSeen = new Map<string, string>(); // lowercaseName -> first id

  for (const anim of animations) {
    const key = `anim:${anim.id}`;

    animationsById.set(anim.id, anim);
    animationKeyById.set(anim.id, key);

    if (anim.pivot) {
      pivotByKey.set(key, { x: anim.pivot.x, y: anim.pivot.y });
    }

    // Name -> key mapping (case-insensitive, first wins)
    const lowerName = anim.name.toLowerCase();
    if (namesSeen.has(lowerName)) {
      console.warn(
        `${LOG_PREFIX} Duplicate animation name "${anim.name}" (id: ${anim.id}), ` +
        `already registered for id: ${namesSeen.get(lowerName)}`
      );
    } else {
      namesSeen.set(lowerName, anim.id);
      animationKeyByName.set(lowerName, key);
    }

    // Skip if Phaser already has this animation registered
    if (phaserScene.anims.exists(key)) continue;

    const hasDurationOverrides = anim.frames.some((frame) =>
      typeof frame.durationMs === 'number' && Number.isFinite(frame.durationMs)
    );
    const frames = anim.frames.map((f) => {
      const frame: { key: string; frame: string; duration?: number } = {
        key: f.textureKey,
        frame: f.frame,
      };
      if (hasDurationOverrides && typeof f.durationMs === 'number' && Number.isFinite(f.durationMs)) {
        frame.duration = Math.max(1, f.durationMs);
      }
      return frame;
    });

    phaserScene.anims.create({
      key,
      frames,
      frameRate: hasDurationOverrides ? undefined : anim.fps,
      repeat: anim.loopMode === 'loop' ? -1 : 0,
      yoyo: anim.loopMode === 'pingpong',
    });
  }

  console.log(`${LOG_PREFIX} Registered ${animations.length} animation(s)`);
}

function registerAtlasFrames(phaserScene: Phaser.Scene, project: Project): void {
  for (const atlas of project.spriteAtlases ?? []) {
    const textureKey = getAtlasCategoryName(atlas.path);
    if (!phaserScene.textures.exists(textureKey)) continue;

    const texture = phaserScene.textures.get(textureKey);
    for (const slice of atlas.slices ?? []) {
      // Frame names only need to be unique within this texture.
      // If already registered, skip.
      const hasFrame = texture.has(slice.name);
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
    const texture = phaserScene.textures.get(req.key);
    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
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

  // Register project animations AFTER atlas frames are available
  const animationsById = new Map<string, ProjectAnimation>();
  const animationKeyById = new Map<string, string>();
  const animationKeyByName = new Map<string, string>();
  const pivotByKey = new Map<string, { x: number; y: number }>();

  registerProjectAnimations(
    phaserScene, project,
    animationsById, animationKeyById, animationKeyByName, pivotByKey,
  );

  return {
    project,
    tileTextureKeys,
    atlasTextureKeys,
    entityTypes,
    entitySpriteKeys,
    animationsById,
    animationKeyById,
    animationKeyByName,
    getTileTextureKey(category, index) {
      return tileTextureKeys.get(`${category}:${index}`) ?? null;
    },
    getAtlasTextureKey(category) {
      return atlasTextureKeys.get(category) ?? null;
    },
    getEntitySpriteKey(typeName) {
      return entitySpriteKeys.get(typeName) ?? null;
    },
    resolveAnimationKey(value: string): string | null {
      // Try by id first
      const byId = animationKeyById.get(value);
      if (byId) return byId;
      // Try by name (case-insensitive)
      const byName = animationKeyByName.get(value.toLowerCase());
      if (byName) return byName;
      // Try as raw Phaser key (already prefixed)
      if (value.startsWith('anim:')) return value;
      return null;
    },
    getAnimationPivotByKey(key: string): { x: number; y: number } | null {
      return pivotByKey.get(key) ?? null;
    },
  };
}
