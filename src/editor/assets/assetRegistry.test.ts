import { describe, expect, it } from 'vitest';
import { createAssetRegistry } from './assetRegistry';

function buildRegistry() {
  const registry = createAssetRegistry();
  const created = registry.addAssets({
    groupType: 'tilesets',
    groupName: 'Ground',
    assets: [
      {
        name: 'Grass A',
        type: 'tile',
        dataUrl: 'data:image/png;base64,a',
        width: 16,
        height: 16,
      },
      {
        name: 'Grass B',
        type: 'tile',
        dataUrl: 'data:image/png;base64,b',
        width: 16,
        height: 16,
      },
      {
        name: 'Grass C',
        type: 'tile',
        dataUrl: 'data:image/png;base64,c',
        width: 16,
        height: 16,
      },
    ],
  });

  return { registry, created };
}

describe('assetRegistry renameAsset', () => {
  it('renames a matching asset', () => {
    const { registry, created } = buildRegistry();

    registry.renameAsset(created[0].id, 'Grass 01');

    expect(registry.getAsset(created[0].id)?.name).toBe('Grass 01');
  });

  it('ignores empty or whitespace names', () => {
    const { registry, created } = buildRegistry();

    registry.renameAsset(created[0].id, '   ');

    expect(registry.getAsset(created[0].id)?.name).toBe('Grass A');
  });
});

describe('assetRegistry reorderAsset', () => {
  it('moves the requested asset index and keeps all assets', () => {
    const { registry, created } = buildRegistry();

    registry.reorderAsset({
      groupType: 'tilesets',
      groupSlug: 'ground',
      fromIndex: 0,
      toIndex: 2,
    });

    const group = registry.getGroupsByType('tilesets').find((entry) => entry.slug === 'ground');
    const ids = group?.assets.map((asset) => asset.id) ?? [];

    expect(ids).toEqual([created[1].id, created[2].id, created[0].id]);
    expect(new Set(ids).size).toBe(3);
  });

  it('ignores out-of-range indices', () => {
    const { registry, created } = buildRegistry();

    registry.reorderAsset({
      groupType: 'tilesets',
      groupSlug: 'ground',
      fromIndex: 0,
      toIndex: 9,
    });

    const group = registry.getGroupsByType('tilesets').find((entry) => entry.slug === 'ground');
    const ids = group?.assets.map((asset) => asset.id) ?? [];

    expect(ids).toEqual(created.map((asset) => asset.id));
  });
});
