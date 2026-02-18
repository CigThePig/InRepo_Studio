import type { Project, SpriteAtlas, SpriteAtlasSlice } from '@/types';

function isValidTileId(value: unknown): value is number {
  return Number.isFinite(value) && Number.isInteger(value) && (value as number) >= 0;
}

export function ensureAtlasSliceTileIds(project: Project): { project: Project; changed: boolean } {
  let changed = false;

  const nextAtlases = (project.spriteAtlases ?? []).map((atlas) => {
    const slices = atlas.slices ?? [];
    if (slices.length === 0) return atlas;

    const allMissing = slices.every((slice) => !isValidTileId(slice.tileId));
    const seen = new Set<number>();
    let hasMissingOrInvalid = false;
    let hasDuplicates = false;
    let maxId = -1;

    for (const slice of slices) {
      if (!isValidTileId(slice.tileId)) {
        hasMissingOrInvalid = true;
        continue;
      }

      if (seen.has(slice.tileId)) {
        hasDuplicates = true;
        continue;
      }

      seen.add(slice.tileId);
      if (slice.tileId > maxId) maxId = slice.tileId;
    }

    if (!hasMissingOrInvalid && !hasDuplicates) {
      return atlas;
    }

    const reserved = new Set<number>();
    const nextSlices: SpriteAtlasSlice[] = [];
    let nextId = maxId + 1;

    for (let index = 0; index < slices.length; index += 1) {
      const slice = slices[index];
      let tileId: number;

      if (allMissing) {
        tileId = index;
      } else if (isValidTileId(slice.tileId) && !reserved.has(slice.tileId)) {
        tileId = slice.tileId;
      } else {
        while (reserved.has(nextId)) nextId += 1;
        tileId = nextId;
        nextId += 1;
      }

      reserved.add(tileId);
      nextSlices.push({ ...slice, tileId });
    }

    changed = true;
    return { ...atlas, slices: nextSlices };
  });

  if (!changed) return { project, changed: false };
  return {
    project: {
      ...project,
      spriteAtlases: nextAtlases,
    },
    changed: true,
  };
}

export function resolveAtlasSliceByLocalId(atlas: SpriteAtlas | null | undefined, localId: number): SpriteAtlasSlice | null {
  if (!atlas || !Number.isFinite(localId) || localId < 0) return null;
  const slices = atlas.slices ?? [];
  const byId = slices.find((slice) => slice.tileId === localId);
  if (byId) return byId;
  return slices[localId] ?? null;
}

export function getAtlasTileCount(atlas: SpriteAtlas): number {
  const slices = atlas.slices ?? [];
  let max = -1;

  for (const slice of slices) {
    if (isValidTileId(slice.tileId) && slice.tileId > max) {
      max = slice.tileId;
    }
  }

  return max >= 0 ? max + 1 : slices.length;
}
