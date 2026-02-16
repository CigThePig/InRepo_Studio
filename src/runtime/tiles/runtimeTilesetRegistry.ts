import Phaser from 'phaser';
import type { ProjectRuntime } from '@/runtime/projectLoader';
import type { SceneRuntime } from '@/runtime/sceneLoader';
import type { ResolvedTileRef } from '@/types/scene';
import { resolveTileGid } from '@/types/scene';
import { getAtlasCategoryName } from '@/shared/atlasNaming';
import { getPixelWidthFromImageLike } from './texturePixelSize';

const LOG_PREFIX = '[Runtime/TilesetRegistry]';
const RUNTIME_CUT_TILESET_TEXTURE_KEY = '__runtime:cut-tileset';

interface TilePlacement {
  gid: number;
  x: number;
  y: number;
}

interface AtlasTilesetBinding {
  kind: 'atlas';
  key: string;
  textureKey: string;
  firstGid: number;
  maxTileIndex: number;
}

interface CutTilesetBinding {
  kind: 'cut';
  key: string;
  textureKey: string;
  firstGid: number;
  tileCount: number;
}

export type RuntimeTilesetBinding = AtlasTilesetBinding | CutTilesetBinding;

export interface NonTilemapTileUsage {
  key: string;
  reason: string;
  placements: TilePlacement[];
}

export interface RuntimeTilesetRegistry {
  tilesets: RuntimeTilesetBinding[];
  resolveGid(tileRef: ResolvedTileRef | null): number;
  nonTilemapTileUsages: NonTilemapTileUsage[];
  debugInfo: {
    usedSceneTileRefs: number;
    atlasTileRefs: number;
    cutTileRefs: number;
    nonTilemapTileRefs: number;
  };
  destroy(): void;
}

function tileRefKey(tileRef: ResolvedTileRef): string {
  return `${tileRef.category}:${tileRef.index}`;
}

function collectUsedTileRefs(sceneRuntime: SceneRuntime): Map<string, { tileRef: ResolvedTileRef; placements: TilePlacement[] }> {
  const refs = new Map<string, { tileRef: ResolvedTileRef; placements: TilePlacement[] }>();
  const scan = (layer: number[][]) => {
    for (let y = 0; y < layer.length; y += 1) {
      for (let x = 0; x < layer[y].length; x += 1) {
        const gid = layer[y][x];
        if (gid <= 0) continue;
        const resolved = resolveTileGid(sceneRuntime.scene, gid);
        if (!resolved) continue;
        const key = tileRefKey(resolved);
        const existing = refs.get(key);
        if (existing) {
          existing.placements.push({ gid, x, y });
        } else {
          refs.set(key, {
            tileRef: resolved,
            placements: [{ gid, x, y }],
          });
        }
      }
    }
  };

  scan(sceneRuntime.scene.layers.ground);
  scan(sceneRuntime.scene.layers.props);

  return refs;
}

function isCanvasImageSource(value: unknown): value is CanvasImageSource {
  if (!value) return false;
  if (typeof HTMLImageElement !== 'undefined' && value instanceof HTMLImageElement) return true;
  if (typeof HTMLCanvasElement !== 'undefined' && value instanceof HTMLCanvasElement) return true;
  if (typeof HTMLVideoElement !== 'undefined' && value instanceof HTMLVideoElement) return true;
  if (typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap) return true;
  return false;
}

function isAtlasTilemapEligible(
  rect: { x: number; y: number; w: number; h: number },
  sheetWidth: number,
  tileSize: number,
): boolean {
  return (
    rect.w === tileSize &&
    rect.h === tileSize &&
    rect.x % tileSize === 0 &&
    rect.y % tileSize === 0 &&
    sheetWidth >= tileSize &&
    sheetWidth % tileSize === 0
  );
}

function getAtlasSheetPixelWidth(phaserScene: Phaser.Scene, textureKey: string): number {
  const frame = phaserScene.textures.getFrame(textureKey);
  const texture = phaserScene.textures.get(textureKey);
  const sourceIndex = frame?.sourceIndex ?? 0;

  const candidates = [
    getPixelWidthFromImageLike(frame?.source?.image),
    getPixelWidthFromImageLike(texture?.getSourceImage?.()),
    getPixelWidthFromImageLike(texture?.source?.[sourceIndex]?.image),
    texture?.source?.[sourceIndex]?.width ?? 0,
    frame?.source?.width ?? 0,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  return 0;
}

function ensureCutTilesetTexture(
  phaserScene: Phaser.Scene,
  projectRuntime: ProjectRuntime,
  tileSize: number,
  usedCutTileRefs: ResolvedTileRef[],
): { textureKey: string; slotByTileRefKey: Map<string, number> } | null {
  if (usedCutTileRefs.length === 0) {
    return null;
  }

  const ordered = [...usedCutTileRefs].sort((a, b) => {
    const catA = projectRuntime.project.tileCategories.find((cat) => cat.name === a.category);
    const catB = projectRuntime.project.tileCategories.find((cat) => cat.name === b.category);
    const pathA = `${catA?.path ?? a.category}/${catA?.files?.[a.index] ?? a.index}`;
    const pathB = `${catB?.path ?? b.category}/${catB?.files?.[b.index] ?? b.index}`;
    return pathA.localeCompare(pathB) || a.index - b.index || a.category.localeCompare(b.category);
  });

  const slotByTileRefKey = new Map<string, number>();
  ordered.forEach((ref, index) => slotByTileRefKey.set(tileRefKey(ref), index));

  const total = ordered.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
  const rows = Math.ceil(total / cols);
  const width = cols * tileSize;
  const height = rows * tileSize;

  if (phaserScene.textures.exists(RUNTIME_CUT_TILESET_TEXTURE_KEY)) {
    phaserScene.textures.remove(RUNTIME_CUT_TILESET_TEXTURE_KEY);
  }

  const canvasTexture = phaserScene.textures.createCanvas(RUNTIME_CUT_TILESET_TEXTURE_KEY, width, height);
  if (!canvasTexture) {
    console.warn(`${LOG_PREFIX} Failed to create runtime cut tileset texture.`);
    return null;
  }

  const ctx = canvasTexture.context;
  ctx.clearRect(0, 0, width, height);

  for (let slotIndex = 0; slotIndex < ordered.length; slotIndex += 1) {
    const ref = ordered[slotIndex];
    const textureKey = projectRuntime.getTileTextureKey(ref.category, ref.index);
    if (!textureKey || !phaserScene.textures.exists(textureKey)) continue;

    const frame = phaserScene.textures.getFrame(textureKey);
    const source = frame?.source?.image;
    if (!frame || !isCanvasImageSource(source)) continue;

    const dx = (slotIndex % cols) * tileSize;
    const dy = Math.floor(slotIndex / cols) * tileSize;
    ctx.drawImage(
      source,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      dx,
      dy,
      tileSize,
      tileSize,
    );
  }

  canvasTexture.refresh();
  if ('setFilter' in canvasTexture && typeof canvasTexture.setFilter === 'function') {
    canvasTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  return {
    textureKey: RUNTIME_CUT_TILESET_TEXTURE_KEY,
    slotByTileRefKey,
  };
}

export function buildRuntimeTilesetRegistry(
  phaserScene: Phaser.Scene,
  projectRuntime: ProjectRuntime,
  sceneRuntime: SceneRuntime,
): RuntimeTilesetRegistry {
  const tileSize = sceneRuntime.scene.tileSize;
  const usedTileRefs = collectUsedTileRefs(sceneRuntime);

  const usedAtlasRefsByCategory = new Map<string, Array<{ tileRef: ResolvedTileRef; placements: TilePlacement[] }>>();
  const usedCutRefs: ResolvedTileRef[] = [];

  for (const usage of usedTileRefs.values()) {
    if (usage.tileRef.category.startsWith('atlas:')) {
      const group = usedAtlasRefsByCategory.get(usage.tileRef.category) ?? [];
      group.push(usage);
      usedAtlasRefsByCategory.set(usage.tileRef.category, group);
    } else {
      usedCutRefs.push(usage.tileRef);
    }
  }

  const tilesets: RuntimeTilesetBinding[] = [];
  const gidByTileRefKey = new Map<string, number>();
  const nonTilemapUsageByKey = new Map<string, NonTilemapTileUsage>();
  let nextFirstGid = 1;

  const atlasCategories = [...usedAtlasRefsByCategory.keys()].sort((a, b) => a.localeCompare(b));
  let hasLoggedMissingAtlasPixelWidth = false;

  for (const atlasCategory of atlasCategories) {
    const atlas = (projectRuntime.project.spriteAtlases ?? []).find(
      (entry) => getAtlasCategoryName(entry.path) === atlasCategory,
    );
    const textureKey = projectRuntime.getAtlasTextureKey(atlasCategory);
    if (!atlas || !textureKey || !phaserScene.textures.exists(textureKey)) {
      continue;
    }

    const frame = phaserScene.textures.getFrame(textureKey);
    const sheetPixelWidth = getAtlasSheetPixelWidth(phaserScene, textureKey);
    const cols = Math.max(1, Math.floor(sheetPixelWidth / tileSize));

    if (sheetPixelWidth === 0 && !hasLoggedMissingAtlasPixelWidth) {
      console.warn(
        `${LOG_PREFIX} Unable to determine atlas sheet pixel width for ${textureKey}. Falling back may cause tile mismatch.`,
      );
      hasLoggedMissingAtlasPixelWidth = true;
    }

    if (frame?.source?.width && frame.source.width !== sheetPixelWidth && sheetPixelWidth > 0) {
      console.debug(
        `${LOG_PREFIX} Atlas pixel width differs from frame source width for ${textureKey}.`,
        { frameSourceWidth: frame.source.width, sheetPixelWidth },
      );
    }

    let maxTileIndex = -1;
    const usages = usedAtlasRefsByCategory.get(atlasCategory) ?? [];
    for (const usage of usages) {
      const slice = atlas.slices?.[usage.tileRef.index];
      if (!slice) continue;

      if (!isAtlasTilemapEligible(slice.rect, sheetPixelWidth, tileSize)) {
        nonTilemapUsageByKey.set(tileRefKey(usage.tileRef), {
          key: tileRefKey(usage.tileRef),
          reason: `Atlas slice "${slice.name}" in ${atlas.path} is not ${tileSize}x${tileSize} grid-aligned.`,
          placements: usage.placements,
        });
        continue;
      }

      const tileIndex = Math.floor(slice.rect.x / tileSize) + Math.floor(slice.rect.y / tileSize) * cols;
      gidByTileRefKey.set(tileRefKey(usage.tileRef), nextFirstGid + tileIndex);
      maxTileIndex = Math.max(maxTileIndex, tileIndex);
    }

    if (maxTileIndex >= 0) {
      tilesets.push({
        kind: 'atlas',
        key: atlasCategory,
        textureKey,
        firstGid: nextFirstGid,
        maxTileIndex,
      });
      nextFirstGid += maxTileIndex + 1;
    }
  }

  const cutTexture = ensureCutTilesetTexture(phaserScene, projectRuntime, tileSize, usedCutRefs);
  if (cutTexture && cutTexture.slotByTileRefKey.size > 0) {
    for (const [key, slot] of cutTexture.slotByTileRefKey.entries()) {
      gidByTileRefKey.set(key, nextFirstGid + slot);
    }

    tilesets.push({
      kind: 'cut',
      key: 'cut-tiles-runtime-packed',
      textureKey: cutTexture.textureKey,
      firstGid: nextFirstGid,
      tileCount: cutTexture.slotByTileRefKey.size,
    });
    nextFirstGid += cutTexture.slotByTileRefKey.size;
  }

  const nonTilemapTileUsages = [...nonTilemapUsageByKey.values()];
  if (nonTilemapTileUsages.length > 0) {
    for (const usage of nonTilemapTileUsages) {
      console.warn(`${LOG_PREFIX} ${usage.reason}`, { tileRef: usage.key, placements: usage.placements.length });
    }
  }

  return {
    tilesets,
    resolveGid(tileRef) {
      if (!tileRef) return 0;
      return gidByTileRefKey.get(tileRefKey(tileRef)) ?? 0;
    },
    nonTilemapTileUsages,
    debugInfo: {
      usedSceneTileRefs: usedTileRefs.size,
      atlasTileRefs: [...usedTileRefs.values()].filter((usage) => usage.tileRef.category.startsWith('atlas:')).length,
      cutTileRefs: [...usedTileRefs.values()].filter((usage) => !usage.tileRef.category.startsWith('atlas:')).length,
      nonTilemapTileRefs: nonTilemapTileUsages.length,
    },
    destroy() {
      if (phaserScene.textures.exists(RUNTIME_CUT_TILESET_TEXTURE_KEY)) {
        phaserScene.textures.remove(RUNTIME_CUT_TILESET_TEXTURE_KEY);
      }
    },
  };
}
