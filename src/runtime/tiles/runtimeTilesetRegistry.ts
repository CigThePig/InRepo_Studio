import Phaser from 'phaser';
import type { ProjectRuntime } from '@/runtime/projectLoader';
import type { SceneRuntime } from '@/runtime/sceneLoader';
import type { ResolvedTileRef } from '@/types/scene';
import { resolveTileGid } from '@/types/scene';
import { getAtlasCategoryName } from '@/shared/atlasNaming';
import { resolveAtlasSliceByLocalId } from '@/shared/atlasTileIds';

const LOG_PREFIX = '[Runtime/TilesetRegistry]';
const RUNTIME_PACKED_TILESET_TEXTURE_KEY = '__runtime:packed-tileset';

interface TilePlacement {
  gid: number;
  x: number;
  y: number;
}

export interface RuntimeTilesetBinding {
  kind: 'packed';
  key: string;
  textureKey: string;
  tileCount: number;
}

export interface NonTilemapTileUsage {
  key: string;
  reason: string;
  placements: TilePlacement[];
}

export interface RuntimeTilesetRegistry {
  tilesets: RuntimeTilesetBinding[];
  resolveTileIndex(tileRef: ResolvedTileRef | null): number;
  nonTilemapTileUsages: NonTilemapTileUsage[];
  debugInfo: {
    packedTileCount: number;
    packedAtlasTileCount: number;
    packedCutTileCount: number;
    nonTilemapTileCount: number;
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
  tileSize: number,
): boolean {
  return (
    rect.w === tileSize &&
    rect.h === tileSize &&
    rect.x % tileSize === 0 &&
    rect.y % tileSize === 0
  );
}

interface PackableAtlasTile {
  kind: 'atlas';
  tileRef: ResolvedTileRef;
  atlasCategory: string;
  sliceName: string;
  rect: { x: number; y: number; w: number; h: number };
  sortKey: string;
}

interface PackableCutTile {
  kind: 'cut';
  tileRef: ResolvedTileRef;
  sortKey: string;
}

type PackableTile = PackableAtlasTile | PackableCutTile;

function ensureRuntimePackedTilesetTexture(
  phaserScene: Phaser.Scene,
  projectRuntime: ProjectRuntime,
  tileSize: number,
  usedAtlas: Array<{ atlasCategory: string; tileRef: ResolvedTileRef; placements: TilePlacement[] }>,
  usedCut: ResolvedTileRef[],
): { textureKey: string; slotByTileRefKey: Map<string, number>; tileCount: number } | null {
  const packableTiles: PackableTile[] = [];

  // Collect eligible atlas tiles
  for (const usage of usedAtlas) {
    const atlas = (projectRuntime.project.spriteAtlases ?? []).find(
      (entry) => getAtlasCategoryName(entry.path) === usage.atlasCategory,
    );
    if (!atlas) continue;
    const slice = resolveAtlasSliceByLocalId(atlas, usage.tileRef.index);
    if (!slice) continue;
    if (!isAtlasTilemapEligible(slice.rect, tileSize)) continue;

    const atlasTextureKey = projectRuntime.getAtlasTextureKey(usage.atlasCategory);
    if (!atlasTextureKey || !phaserScene.textures.exists(atlasTextureKey)) continue;

    packableTiles.push({
      kind: 'atlas',
      tileRef: usage.tileRef,
      atlasCategory: usage.atlasCategory,
      sliceName: slice.name,
      rect: slice.rect,
      sortKey: `${atlas.path}:${slice.rect.y}:${slice.rect.x}:${slice.name}`,
    });
  }

  // Collect cut tiles (always eligible)
  for (const ref of usedCut) {
    const cat = projectRuntime.project.tileCategories.find((c) => c.name === ref.category);
    const path = `${cat?.path ?? ref.category}/${cat?.files?.[ref.index] ?? ref.index}`;
    packableTiles.push({
      kind: 'cut',
      tileRef: ref,
      sortKey: path,
    });
  }

  if (packableTiles.length === 0) return null;

  // Deterministic sort
  packableTiles.sort((a, b) => a.sortKey.localeCompare(b.sortKey) || tileRefKey(a.tileRef).localeCompare(tileRefKey(b.tileRef)));

  const slotByTileRefKey = new Map<string, number>();
  packableTiles.forEach((entry, index) => slotByTileRefKey.set(tileRefKey(entry.tileRef), index));

  const total = packableTiles.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
  const rows = Math.ceil(total / cols);
  const width = cols * tileSize;
  const height = rows * tileSize;

  if (phaserScene.textures.exists(RUNTIME_PACKED_TILESET_TEXTURE_KEY)) {
    phaserScene.textures.remove(RUNTIME_PACKED_TILESET_TEXTURE_KEY);
  }

  const canvasTexture = phaserScene.textures.createCanvas(RUNTIME_PACKED_TILESET_TEXTURE_KEY, width, height);
  if (!canvasTexture) {
    console.warn(`${LOG_PREFIX} Failed to create runtime packed tileset texture.`);
    return null;
  }

  const ctx = canvasTexture.context;
  ctx.clearRect(0, 0, width, height);

  for (let slotIndex = 0; slotIndex < packableTiles.length; slotIndex += 1) {
    const entry = packableTiles[slotIndex];
    const dx = (slotIndex % cols) * tileSize;
    const dy = Math.floor(slotIndex / cols) * tileSize;

    if (entry.kind === 'cut') {
      const textureKey = projectRuntime.getTileTextureKey(entry.tileRef.category, entry.tileRef.index);
      if (!textureKey || !phaserScene.textures.exists(textureKey)) continue;
      const frame = phaserScene.textures.getFrame(textureKey);
      const source = frame?.source?.image;
      if (!frame || !isCanvasImageSource(source)) continue;
      ctx.drawImage(source, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, dx, dy, tileSize, tileSize);
    } else {
      const atlasTextureKey = projectRuntime.getAtlasTextureKey(entry.atlasCategory);
      if (!atlasTextureKey) continue;
      const texture = phaserScene.textures.get(atlasTextureKey);
      const sourceImage = texture?.source?.[0]?.image;
      if (!isCanvasImageSource(sourceImage)) continue;
      ctx.drawImage(sourceImage, entry.rect.x, entry.rect.y, entry.rect.w, entry.rect.h, dx, dy, tileSize, tileSize);
    }
  }

  canvasTexture.refresh();
  if ('setFilter' in canvasTexture && typeof canvasTexture.setFilter === 'function') {
    canvasTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  return {
    textureKey: RUNTIME_PACKED_TILESET_TEXTURE_KEY,
    slotByTileRefKey,
    tileCount: total,
  };
}

export function buildRuntimeTilesetRegistry(
  phaserScene: Phaser.Scene,
  projectRuntime: ProjectRuntime,
  sceneRuntime: SceneRuntime,
): RuntimeTilesetRegistry {
  const tileSize = sceneRuntime.scene.tileSize;
  const usedTileRefs = collectUsedTileRefs(sceneRuntime);

  const usedAtlasUsages: Array<{ atlasCategory: string; tileRef: ResolvedTileRef; placements: TilePlacement[] }> = [];
  const usedCutRefs: ResolvedTileRef[] = [];

  for (const usage of usedTileRefs.values()) {
    if (usage.tileRef.category.startsWith('atlas:')) {
      usedAtlasUsages.push({
        atlasCategory: usage.tileRef.category,
        tileRef: usage.tileRef,
        placements: usage.placements,
      });
    } else {
      usedCutRefs.push(usage.tileRef);
    }
  }

  // Determine non-tilemap atlas usages (ineligible for packing)
  const nonTilemapUsageByKey = new Map<string, NonTilemapTileUsage>();

  for (const usage of usedAtlasUsages) {
    const atlas = (projectRuntime.project.spriteAtlases ?? []).find(
      (entry) => getAtlasCategoryName(entry.path) === usage.atlasCategory,
    );
    if (!atlas) continue;
    const slice = resolveAtlasSliceByLocalId(atlas, usage.tileRef.index);
    if (!slice) continue;

    if (!isAtlasTilemapEligible(slice.rect, tileSize)) {
      nonTilemapUsageByKey.set(tileRefKey(usage.tileRef), {
        key: tileRefKey(usage.tileRef),
        reason: `Slice "${slice.name}" is not tilemap-eligible (expected ${tileSize}x${tileSize} aligned rect).`,
        placements: usage.placements,
      });
    }
  }

  // Filter to only eligible atlas usages for packing
  const eligibleAtlasUsages = usedAtlasUsages.filter(
    (usage) => !nonTilemapUsageByKey.has(tileRefKey(usage.tileRef)),
  );

  const packed = ensureRuntimePackedTilesetTexture(
    phaserScene,
    projectRuntime,
    tileSize,
    eligibleAtlasUsages,
    usedCutRefs,
  );

  const nonTilemapTileUsages = [...nonTilemapUsageByKey.values()];
  if (nonTilemapTileUsages.length > 0) {
    for (const usage of nonTilemapTileUsages) {
      console.warn(`${LOG_PREFIX} ${usage.reason}`, { tileRef: usage.key, placements: usage.placements.length });
    }
  }

  let tilesets: RuntimeTilesetBinding[] = [];
  let slotByTileRefKey = new Map<string, number>();
  let packedAtlasTileCount = 0;
  let packedCutTileCount = 0;

  if (packed && packed.tileCount > 0) {
    tilesets = [{
      kind: 'packed',
      key: 'runtime-packed',
      textureKey: packed.textureKey,
      tileCount: packed.tileCount,
    }];
    slotByTileRefKey = packed.slotByTileRefKey;
    packedCutTileCount = usedCutRefs.length;
    packedAtlasTileCount = packed.tileCount - packedCutTileCount;
  } else if (usedCutRefs.length > 0 || eligibleAtlasUsages.length > 0) {
    console.warn(`${LOG_PREFIX} Packed tileset creation failed; tiles will render via fallback sprites.`);
  }

  return {
    tilesets,
    resolveTileIndex(tileRef) {
      if (!tileRef) return -1;
      return slotByTileRefKey.get(tileRefKey(tileRef)) ?? -1;
    },
    nonTilemapTileUsages,
    debugInfo: {
      packedTileCount: packed?.tileCount ?? 0,
      packedAtlasTileCount,
      packedCutTileCount,
      nonTilemapTileCount: nonTilemapTileUsages.length,
    },
    destroy() {
      if (phaserScene.textures.exists(RUNTIME_PACKED_TILESET_TEXTURE_KEY)) {
        phaserScene.textures.remove(RUNTIME_PACKED_TILESET_TEXTURE_KEY);
      }
    },
  };
}
