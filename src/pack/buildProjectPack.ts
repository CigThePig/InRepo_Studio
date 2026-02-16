import type { WorkspaceContent } from '@/types/workspace';
import type { SpriteAtlas, SpriteAtlasSlice } from '@/types/project';

export interface BuildProjectPackOptions {
  resolveAssetPathForDeploy?: (assetId: string) => string | null;
}

export interface ProjectPack {
  project: WorkspaceContent['project'];
  scenes: WorkspaceContent['scenes'];
  diagnostics: string[];
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
  const spriteAtlases: SpriteAtlas[] = [];
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
    atlasEntry.slices.sort((a, b) => {
      const g = a._groupKey.localeCompare(b._groupKey);
      return g !== 0 ? g : a.name.localeCompare(b.name);
    });

    const slices = atlasEntry.slices.map(({ _groupKey, ...slice }) => slice);
    spriteAtlases.push({
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

  spriteAtlases.sort((a, b) => a.path.localeCompare(b.path));

  return {
    project: {
      ...workspace.project,
      spriteAtlases,
    },
    scenes: workspace.scenes,
    diagnostics,
  };
}

