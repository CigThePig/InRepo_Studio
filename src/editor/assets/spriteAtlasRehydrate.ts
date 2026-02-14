import type { Project } from '@/types';
import type { AssetEntry, AssetEntryType, AssetRegistry } from './assetRegistry';
import type { AssetGroupType } from './assetGroup';

const LOG_PREFIX = '[Atlas/Rehydrate]';

interface ParsedAtlasPath {
  groupType: AssetGroupType;
  groupSlug: string;
  fileName: string;
  normalizedPath: string;
}

function normalizeAtlasPath(path: string): string {
  return path.replace(/^\/+/, '').replace(/^game\//, '').replace(/\/{2,}/g, '/');
}

function parseAtlasPath(path: string): ParsedAtlasPath | null {
  const normalizedPath = normalizeAtlasPath(path);
  const segments = normalizedPath.split('/').filter(Boolean);
  const assetsIndex = segments.indexOf('assets');
  if (assetsIndex === -1) return null;

  const groupType = segments[assetsIndex + 1] as AssetGroupType | undefined;
  const groupSlug = segments[assetsIndex + 2];
  const fileName = segments[segments.length - 1];

  if (!groupType || !groupSlug || !fileName) return null;
  if (!['tilesets', 'props', 'entities'].includes(groupType)) return null;

  return {
    groupType,
    groupSlug,
    fileName,
    normalizedPath,
  };
}

function resolveAssetType(groupType: AssetGroupType): AssetEntryType {
  if (groupType === 'entities') return 'entity';
  if (groupType === 'props') return 'sprite';
  return 'tile';
}

function hasRectMatch(asset: AssetEntry, rect: { x: number; y: number; w: number; h: number }): boolean {
  if (!asset.rect) return false;
  return (
    asset.rect.x === rect.x
    && asset.rect.y === rect.y
    && asset.rect.w === rect.w
    && asset.rect.h === rect.h
  );
}

function findParentAsset(assetRegistry: AssetRegistry, normalizedPath: string): AssetEntry | null {
  const groups = assetRegistry.getGroups();
  for (const group of groups) {
    const found = group.assets.find(
      (asset) => !asset.sourceAssetId && normalizeAtlasPath(asset.dataUrl) === normalizedPath
    );
    if (found) return found;
  }
  return null;
}

export function rehydrateSpriteAtlasesIntoAssetRegistry(options: {
  project: Project;
  assetRegistry: AssetRegistry;
}): { addedParents: number; addedSlices: number; warnings: string[] } {
  const { project, assetRegistry } = options;
  const atlases = project.spriteAtlases ?? [];
  const warnings: string[] = [];

  if (atlases.length === 0) {
    console.log(`${LOG_PREFIX} Added parents=0, slices=0, warnings=0`);
    return { addedParents: 0, addedSlices: 0, warnings };
  }

  const previousSelectedAssetId = assetRegistry.getState().selectedAssetId;
  let addedParents = 0;
  let addedSlices = 0;

  for (const atlas of atlases) {
    const parsed = parseAtlasPath(atlas.path);
    if (!parsed) {
      warnings.push(`Could not parse atlas path "${atlas.path}" for atlas "${atlas.name}".`);
      continue;
    }

    let parent = findParentAsset(assetRegistry, parsed.normalizedPath);
    const assetType = resolveAssetType(parsed.groupType);

    if (!parent) {
      const created = assetRegistry.addAssets({
        groupType: parsed.groupType,
        groupName: parsed.groupSlug,
        assets: [{
          name: atlas.name || parsed.fileName.replace(/\.[^/.]+$/, ''),
          type: assetType,
          source: 'repo',
          dataUrl: parsed.normalizedPath,
          width: 0,
          height: 0,
        }],
      });
      parent = created[0] ?? null;
      if (!parent) {
        warnings.push(`Failed to create parent asset for atlas "${atlas.name}".`);
        continue;
      }
      addedParents += 1;
    }

    const groups = assetRegistry.getGroups();
    const existingSlices = groups
      .flatMap((group) => group.assets)
      .filter((asset) => asset.sourceAssetId === parent?.id);

    const missingSlices = atlas.slices.filter((slice) => {
      const byNameAndRect = existingSlices.some(
        (asset) => asset.name === slice.name && hasRectMatch(asset, slice.rect)
      );
      if (byNameAndRect) return false;
      const byRect = existingSlices.some((asset) => hasRectMatch(asset, slice.rect));
      return !byRect;
    });

    if (missingSlices.length === 0) {
      continue;
    }

    const createdSlices = assetRegistry.addAssets({
      groupType: parsed.groupType,
      groupName: parsed.groupSlug,
      assets: missingSlices.map((slice) => ({
        name: slice.name,
        type: assetType,
        source: 'repo',
        dataUrl: parent.dataUrl,
        sourceAssetId: parent.id,
        rect: { ...slice.rect },
        width: parent.width ?? 0,
        height: parent.height ?? 0,
      })),
    });

    addedSlices += createdSlices.length;
  }

  const selectedStillExists = previousSelectedAssetId
    ? assetRegistry.getAsset(previousSelectedAssetId)
    : null;
  assetRegistry.setSelectedAsset(selectedStillExists ? previousSelectedAssetId : null);

  console.log(
    `${LOG_PREFIX} Added parents=${addedParents}, slices=${addedSlices}, warnings=${warnings.length}`
  );

  warnings.forEach((warning) => {
    console.warn(`${LOG_PREFIX} ${warning}`);
  });

  return { addedParents, addedSlices, warnings };
}
