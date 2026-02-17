import { describe, expect, it } from 'vitest';
import { createAssetRegistry, makeUniqueAnimationName } from './assetRegistry';
import { makeGroupKey, parseGroupKey } from './groupKey';

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

describe('assetRegistry ensureGroup', () => {
  it('creates a group with the given slug if it does not exist', () => {
    const registry = createAssetRegistry();
    const group = registry.ensureGroup('props', 'decor', 'Decorations');

    expect(group.type).toBe('props');
    expect(group.slug).toBe('decor');
    expect(group.name).toBe('Decorations');
  });

  it('returns existing group if slug already exists', () => {
    const registry = createAssetRegistry();
    registry.ensureGroup('props', 'decor', 'Decorations');
    const second = registry.ensureGroup('props', 'decor', 'Different Name');

    // Should not create a duplicate, should return existing
    expect(second.slug).toBe('decor');
    expect(second.name).toBe('Decorations');
    const propsGroups = registry.getGroupsByType('props');
    const decorGroups = propsGroups.filter((g) => g.slug === 'decor');
    expect(decorGroups.length).toBe(1);
  });
});

describe('assetRegistry moveAsset', () => {
  it('moves an asset from one group to another', () => {
    const { registry, created } = buildRegistry();

    registry.moveAsset({
      assetId: created[0].id,
      toGroupType: 'props',
      toGroupSlug: 'ungrouped',
    });

    // Asset should no longer be in tilesets/ground
    const tilesetsGroup = registry.getGroupsByType('tilesets').find((g) => g.slug === 'ground');
    expect(tilesetsGroup?.assets.map((a) => a.id)).not.toContain(created[0].id);

    // Asset should be in props/ungrouped
    const propsGroup = registry.getGroupsByType('props').find((g) => g.slug === 'ungrouped');
    expect(propsGroup?.assets.map((a) => a.id)).toContain(created[0].id);
  });

  it('updates asset type to match destination group', () => {
    const { registry, created } = buildRegistry();

    registry.moveAsset({
      assetId: created[0].id,
      toGroupType: 'props',
      toGroupSlug: 'ungrouped',
    });

    const movedAsset = registry.getAsset(created[0].id);
    expect(movedAsset?.type).toBe('sprite');
  });

  it('creates destination group if it does not exist', () => {
    const { registry, created } = buildRegistry();

    registry.moveAsset({
      assetId: created[0].id,
      toGroupType: 'entities',
      toGroupSlug: 'npcs',
    });

    const entitiesGroups = registry.getGroupsByType('entities');
    const npcsGroup = entitiesGroups.find((g) => g.slug === 'npcs');
    expect(npcsGroup).toBeDefined();
    expect(npcsGroup?.assets.map((a) => a.id)).toContain(created[0].id);
  });

  it('inserts at the specified index', () => {
    const registry = createAssetRegistry();
    const propsAssets = registry.addAssets({
      groupType: 'props',
      groupName: 'Ungrouped',
      assets: [
        { name: 'Existing A', type: 'sprite', dataUrl: 'data:image/png;base64,x', width: 32, height: 32 },
        { name: 'Existing B', type: 'sprite', dataUrl: 'data:image/png;base64,y', width: 32, height: 32 },
      ],
    });
    const tileAssets = registry.addAssets({
      groupType: 'tilesets',
      groupName: 'Ground',
      assets: [
        { name: 'Tile', type: 'tile', dataUrl: 'data:image/png;base64,z', width: 16, height: 16 },
      ],
    });

    registry.moveAsset({
      assetId: tileAssets[0].id,
      toGroupType: 'props',
      toGroupSlug: 'ungrouped',
      toIndex: 1,
    });

    const propsGroup = registry.getGroupsByType('props').find((g) => g.slug === 'ungrouped');
    const ids = propsGroup?.assets.map((a) => a.id) ?? [];
    expect(ids).toEqual([propsAssets[0].id, tileAssets[0].id, propsAssets[1].id]);
  });

  it('preserves selectedAssetId when moving the selected asset', () => {
    const { registry, created } = buildRegistry();
    registry.setSelectedAsset(created[0].id);

    registry.moveAsset({
      assetId: created[0].id,
      toGroupType: 'props',
      toGroupSlug: 'ungrouped',
    });

    expect(registry.getState().selectedAssetId).toBe(created[0].id);
  });

  it('ignores move for non-existent asset', () => {
    const { registry } = buildRegistry();
    const groupsBefore = registry.getGroups();

    registry.moveAsset({
      assetId: 'non-existent-id',
      toGroupType: 'props',
      toGroupSlug: 'ungrouped',
    });

    const groupsAfter = registry.getGroups();
    // Groups structure should be unchanged (same asset counts)
    expect(groupsAfter.map((g) => g.assets.length)).toEqual(groupsBefore.map((g) => g.assets.length));
  });
});

describe('groupKey helpers', () => {
  it('makeGroupKey produces correct format', () => {
    expect(makeGroupKey('tilesets', 'base')).toBe('tilesets:base');
    expect(makeGroupKey('props', 'decor')).toBe('props:decor');
  });

  it('parseGroupKey parses valid keys', () => {
    expect(parseGroupKey('tilesets:base')).toEqual({ type: 'tilesets', slug: 'base' });
    expect(parseGroupKey('props:decor')).toEqual({ type: 'props', slug: 'decor' });
    expect(parseGroupKey('entities:npcs')).toEqual({ type: 'entities', slug: 'npcs' });
  });

  it('parseGroupKey returns null for invalid keys', () => {
    expect(parseGroupKey('')).toBeNull();
    expect(parseGroupKey('invalid')).toBeNull();
    expect(parseGroupKey(':slug')).toBeNull();
    expect(parseGroupKey('unknown:slug')).toBeNull();
    expect(parseGroupKey('tilesets:')).toBeNull();
  });

  it('roundtrips correctly', () => {
    const key = makeGroupKey('entities', 'enemies');
    const parsed = parseGroupKey(key);
    expect(parsed).toEqual({ type: 'entities', slug: 'enemies' });
  });
});


describe('assetRegistry animations', () => {
  it('duplicates an animation with a unique copy name', () => {
    const registry = createAssetRegistry();
    const created = registry.addAnimation({
      name: 'Run',
      fps: 12,
      loopMode: 'loop',
      pivot: { x: 0.5, y: 1 },
      frames: [{ sourceAssetId: 'asset-a', rect: { x: 0, y: 0, w: 16, h: 16 } }],
    });

    const duplicate = registry.duplicateAnimation(created.id);

    expect(duplicate).not.toBeNull();
    expect(duplicate?.id).not.toBe(created.id);
    expect(duplicate?.name).toBe('Run (copy)');
    expect(duplicate?.frames).toEqual(created.frames);
  });

  it('notifies animation listeners on add/update/remove', () => {
    const registry = createAssetRegistry();
    let called = 0;
    const unsub = registry.onAnimationsChanged(() => {
      called += 1;
    });

    const created = registry.addAnimation({
      name: 'Idle',
      fps: 8,
      loopMode: 'loop',
      pivot: { x: 0.5, y: 1 },
      frames: [{ sourceAssetId: 'asset-a', rect: { x: 0, y: 0, w: 16, h: 16 } }],
    });
    registry.updateAnimation(created.id, { name: 'Idle Updated' });
    registry.removeAnimation(created.id);
    unsub();

    expect(called).toBe(3);
  });
});

describe('makeUniqueAnimationName', () => {
  it('creates incrementing copy names', () => {
    const existing = ['Run', 'Run (copy)', 'Run (copy 2)'];
    expect(makeUniqueAnimationName('Run', existing)).toBe('Run (copy 3)');
  });
});
