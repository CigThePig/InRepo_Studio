import type { WorkspaceContent } from '@/types/workspace';
import type { SpriteAtlas, SpriteAtlasSlice } from '@/types/project';
import type { ProjectAnimation, ProjectAnimationFrame } from '@/types/animation';
import { getAtlasCategoryName } from '@/shared/atlasNaming';

// NOTE: Indices used by scenes are stable local tile ids (`slice.tileId`).
// Slice ordering is now free to change without breaking scenes.

export interface BuildProjectPackOptions {
  resolveAssetPathForDeploy?: (assetId: string) => string | null;
}

export interface ProjectPack {
  project: WorkspaceContent['project'];
  scenes: WorkspaceContent['scenes'];
  diagnostics: string[];
}

function normalizeAtlasPath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^game\//, '')
    .replace(/\/+/g, '/');
}

function rectKey(rect: SpriteAtlasSlice['rect']): string {
  return `${rect.x},${rect.y},${rect.w},${rect.h}`;
}

function stableMergeAtlasSlices(
  existingSlices: SpriteAtlasSlice[],
  generatedSlices: SpriteAtlasSlice[],
  stats?: { replaced: number; appended: number }
): SpriteAtlasSlice[] {
  const out = existingSlices.map((slice) => ({
    ...slice,
    rect: { ...slice.rect },
  }));

  const byRect = new Map<string, number>();
  const byNameAndRect = new Map<string, number>();

  out.forEach((slice, index) => {
    const key = rectKey(slice.rect);
    if (!byRect.has(key)) {
      byRect.set(key, index);
    }
    byNameAndRect.set(`${slice.name}::${key}`, index);
  });

  let maxTileId = -1;
  for (const slice of out) {
    if (Number.isFinite(slice.tileId) && Number.isInteger(slice.tileId) && (slice.tileId as number) >= 0) {
      maxTileId = Math.max(maxTileId, slice.tileId as number);
    }
  }

  const nextTileId = (): number => {
    maxTileId += 1;
    return maxTileId;
  };

  for (const generated of generatedSlices) {
    const key = rectKey(generated.rect);
    const rectIndex = byRect.get(key);
    const nameAndRectIndex = byNameAndRect.get(`${generated.name}::${key}`);
    const index = rectIndex ?? nameAndRectIndex;

    if (index !== undefined) {
      const existingSlice = out[index];
      out[index] = {
        ...generated,
        tileId: Number.isFinite(existingSlice.tileId) ? existingSlice.tileId : index,
        rect: { ...generated.rect },
      };
      if (stats) stats.replaced += 1;
      continue;
    }

    out.push({
      ...generated,
      tileId: nextTileId(),
      rect: { ...generated.rect },
    });
    const nextIndex = out.length - 1;
    byRect.set(key, nextIndex);
    byNameAndRect.set(`${generated.name}::${key}`, nextIndex);
    if (stats) stats.appended += 1;
  }

  return out;
}

function findParentInGroups(
  groups: WorkspaceContent['assetRegistry']['groups'],
  parentId: string
): { asset: WorkspaceContent['assetRegistry']['groups'][number]['assets'][number]; groupIndex: number } | null {
  for (let gi = 0; gi < groups.length; gi++) {
    const asset = groups[gi].assets.find((a) => a.id === parentId);
    if (asset) return { asset, groupIndex: gi };
  }
  return null;
}

export function buildProjectPack(
  workspace: WorkspaceContent,
  options: BuildProjectPackOptions = {}
): ProjectPack {
  const diagnostics: string[] = [];
  const registryState = workspace.assetRegistry;
  const generatedSpriteAtlases: SpriteAtlas[] = [];
  const atlasMap = new Map<string, {
    name: string;
    parentPath: string;
    parentGroupKey: string;
    slices: Array<SpriteAtlasSlice & { _groupKey: string }>;
    firstSliceSize: { width: number; height: number };
  }>();

  const assetGroupLookup = new Map<string, { type: string; slug: string }>();
  for (const group of registryState.groups) {
    for (const asset of group.assets) {
      assetGroupLookup.set(asset.id, { type: group.type, slug: group.slug });
    }
  }

  for (const group of registryState.groups) {
    for (const asset of group.assets) {
      if (!asset.sourceAssetId) continue;

      const parent = findParentInGroups(registryState.groups, asset.sourceAssetId);
      if (!parent) {
        diagnostics.push(`Missing parent asset for slice ${asset.id}`);
        continue;
      }

      const deployPath = options.resolveAssetPathForDeploy?.(parent.asset.id)
        ?? parent.asset.dataUrl;
      if (!deployPath) {
        diagnostics.push(`Unable to resolve path for parent asset ${parent.asset.id}`);
        continue;
      }

      const parentGroup = assetGroupLookup.get(parent.asset.id);
      const parentGroupKey = parentGroup ? `${parentGroup.type}:${parentGroup.slug}` : 'unknown:unknown';
      const sliceGroup = assetGroupLookup.get(asset.id);
      const sliceGroupKey = sliceGroup ? `${sliceGroup.type}:${sliceGroup.slug}` : parentGroupKey;

      const key = `${parent.asset.id}::${deployPath}`;
      if (!atlasMap.has(key)) {
        atlasMap.set(key, {
          name: parent.asset.name,
          parentPath: deployPath,
          parentGroupKey,
          firstSliceSize: { width: asset.width, height: asset.height },
          slices: [],
        });
      }

      const entry = atlasMap.get(key);
      if (!entry || !asset.rect) continue;
      entry.slices.push({
        name: asset.name,
        group: sliceGroupKey,
        rect: { ...asset.rect },
        _groupKey: sliceGroupKey,
      });
    }
  }

  for (const atlasEntry of atlasMap.values()) {
    const slices = atlasEntry.slices.map(({ _groupKey, ...slice }) => slice);
    generatedSpriteAtlases.push({
      name: atlasEntry.name,
      path: atlasEntry.parentPath,
      defaultGroup: atlasEntry.parentGroupKey,
      sliceSize: {
        width: atlasEntry.firstSliceSize.width,
        height: atlasEntry.firstSliceSize.height,
      },
      slices,
    });
  }

  const existingAtlases = workspace.project.spriteAtlases ?? [];
  const generatedByPath = new Map<string, SpriteAtlas>();
  const existingByPath = new Map<string, SpriteAtlas>();

  for (const existing of existingAtlases) {
    existingByPath.set(normalizeAtlasPath(existing.path), existing);
  }

  for (const generated of generatedSpriteAtlases) {
    const normalizedPath = normalizeAtlasPath(generated.path);
    const existing = existingByPath.get(normalizedPath);
    if (!existing) {
      generatedByPath.set(normalizedPath, {
        ...generated,
        slices: (generated.slices ?? []).map((slice, index) => ({ ...slice, tileId: index })),
      });
      continue;
    }

    const mergeStats = { replaced: 0, appended: 0 };
    const stabilizedSlices = stableMergeAtlasSlices(existing.slices, generated.slices, mergeStats);
    if (
      existing.slices.length !== generated.slices.length
      && (mergeStats.replaced > 0 || mergeStats.appended > 0)
    ) {
      diagnostics.push(
        `[BuildPack] Atlas slice merge adjusted "${generated.path}" (existing=${existing.slices.length}, generated=${generated.slices.length}, replaced=${mergeStats.replaced}, appended=${mergeStats.appended}).`
      );
    }

    generatedByPath.set(normalizedPath, {
      ...generated,
      defaultGroup: existing.defaultGroup ?? generated.defaultGroup,
      sliceSize: existing.sliceSize ?? generated.sliceSize,
      slices: stabilizedSlices,
    });
  }

  const spriteAtlases: SpriteAtlas[] = [];
  const consumedPaths = new Set<string>();

  for (const existing of existingAtlases) {
    const normalizedPath = normalizeAtlasPath(existing.path);
    const generated = generatedByPath.get(normalizedPath);
    if (generated) {
      spriteAtlases.push(generated);
      consumedPaths.add(normalizedPath);
      continue;
    }
    spriteAtlases.push(existing);
  }

  for (const generated of generatedSpriteAtlases) {
    const normalizedPath = normalizeAtlasPath(generated.path);
    if (consumedPaths.has(normalizedPath) || existingByPath.has(normalizedPath)) {
      continue;
    }
    spriteAtlases.push(generated);
    consumedPaths.add(normalizedPath);
  }

  // --- Compile animations ---
  const compiledAnimations = compileAnimations(registryState, atlasMap, diagnostics);

  return {
    project: {
      ...workspace.project,
      spriteAtlases,
      animations: compiledAnimations,
    },
    scenes: workspace.scenes,
    diagnostics,
  };
}

/**
 * Build a lookup from (sourceAssetId + rect) -> { sliceName, parentAssetId }
 * and a map from parentAssetId -> deployPath (textureKey).
 */
function compileAnimations(
  registryState: WorkspaceContent['assetRegistry'],
  atlasMap: Map<string, {
    name: string;
    parentPath: string;
    parentGroupKey: string;
    slices: Array<SpriteAtlasSlice & { _groupKey: string }>;
    firstSliceSize: { width: number; height: number };
  }>,
  diagnostics: string[],
): ProjectAnimation[] {
  const animations = registryState.animations ?? [];
  if (animations.length === 0) return [];

  // A) Build slice lookup: `${sourceAssetId}:${x},${y},${w},${h}` -> { sliceName, parentAssetId, w, h }
  const sliceLookup = new Map<string, { sliceName: string; parentAssetId: string; w: number; h: number }>();
  for (const group of registryState.groups) {
    for (const asset of group.assets) {
      if (!asset.sourceAssetId || !asset.rect) continue;
      const key = `${asset.sourceAssetId}:${asset.rect.x},${asset.rect.y},${asset.rect.w},${asset.rect.h}`;
      sliceLookup.set(key, {
        sliceName: asset.name,
        parentAssetId: asset.sourceAssetId,
        w: asset.rect.w,
        h: asset.rect.h,
      });
    }
  }

  // B) Build parentAssetId -> textureKey (via atlasMap deploy paths)
  const parentIdToTextureKey = new Map<string, string>();
  for (const [mapKey, entry] of atlasMap.entries()) {
    // mapKey format: `${parentAssetId}::${deployPath}`
    const parentAssetId = mapKey.split('::')[0];
    const textureKey = getAtlasCategoryName(entry.parentPath);
    parentIdToTextureKey.set(parentAssetId, textureKey);
  }

  // C) Compile each animation
  const compiled: ProjectAnimation[] = [];

  for (const anim of animations) {
    let allResolved = true;
    const frames: ProjectAnimationFrame[] = [];
    const frameSizes = new Set<string>();

    for (let fi = 0; fi < anim.frames.length; fi++) {
      const frameRef = anim.frames[fi];
      const lookupKey = `${frameRef.sourceAssetId}:${frameRef.rect.x},${frameRef.rect.y},${frameRef.rect.w},${frameRef.rect.h}`;
      const sliceInfo = sliceLookup.get(lookupKey);

      if (!sliceInfo) {
        diagnostics.push(
          `[Animation] Unresolved frame ${fi} in animation "${anim.name}" (id: ${anim.id}) – sourceAssetId: ${frameRef.sourceAssetId}, rect: ${frameRef.rect.x},${frameRef.rect.y},${frameRef.rect.w},${frameRef.rect.h}`
        );
        console.warn(
          `[BuildPack] Unresolved animation frame: animation="${anim.name}" (${anim.id}), frame index ${fi}`
        );
        allResolved = false;
        break;
      }

      const textureKey = parentIdToTextureKey.get(sliceInfo.parentAssetId);
      if (!textureKey) {
        diagnostics.push(
          `[Animation] Cannot resolve texture key for parent asset ${sliceInfo.parentAssetId} in animation "${anim.name}" frame ${fi}`
        );
        console.warn(
          `[BuildPack] Cannot resolve texture key for animation "${anim.name}" (${anim.id}), frame ${fi}`
        );
        allResolved = false;
        break;
      }

      frames.push({
        textureKey,
        frame: sliceInfo.sliceName,
        offset: frameRef.offset ? { ...frameRef.offset } : undefined,
      });
      frameSizes.add(`${sliceInfo.w}x${sliceInfo.h}`);
    }

    if (!allResolved) continue;

    const projectAnim: ProjectAnimation = {
      id: anim.id,
      name: anim.name,
      fps: anim.fps,
      loopMode: anim.loopMode,
      pivot: { x: anim.pivot.x, y: anim.pivot.y },
      frames,
    };

    // Set frameSize if all frames share the same dimensions
    if (frameSizes.size === 1) {
      const [sizeStr] = frameSizes;
      const [w, h] = sizeStr.split('x').map(Number);
      projectAnim.frameSize = { width: w, height: h };
    }

    compiled.push(projectAnim);
  }

  // E) Deterministic sort by name then id
  compiled.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name);
    return nameCompare !== 0 ? nameCompare : a.id.localeCompare(b.id);
  });

  return compiled;
}
