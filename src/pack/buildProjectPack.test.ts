import { describe, expect, it } from 'vitest';
import { buildProjectPack } from './buildProjectPack';
import type { WorkspaceContent } from '@/types/workspace';
import type { SpriteAtlasSlice } from '@/types/project';
import { resolveAtlasSliceByLocalId } from '@/shared/atlasTileIds';

function createWorkspace(overrides?: {
  projectSpriteAtlases?: WorkspaceContent['project']['spriteAtlases'];
  groups?: WorkspaceContent['assetRegistry']['groups'];
}): WorkspaceContent {
  return {
    version: 1,
    project: {
      name: 'Test Project',
      defaultScene: 'main',
      tileCategories: [],
      entityTypes: [],
      spriteAtlases: overrides?.projectSpriteAtlases ?? [],
      settings: {
        defaultTileSize: 32,
        defaultGridWidth: 20,
        defaultGridHeight: 15,
      },
    },
    scenes: {},
    assetRegistry: {
      groups: overrides?.groups ?? [],
      selectedAssetId: null,
      animations: [],
      animationSets: [],
      animStateMachines: [],
    },
    presetConfig: null,
    scripts: {},
    meta: {
      lastSnapshotAt: 0,
      dirtyActionCount: 0,
      lastSavedAt: 0,
      refactorVersion: 1,
    },
  };
}

function slice(name: string, x: number, tileId?: number): SpriteAtlasSlice {
  return {
    tileId,
    name,
    rect: { x, y: 0, w: 16, h: 16 },
  };
}

describe('buildProjectPack atlas ordering stability', () => {
  it('compiles animation frame duration overrides', () => {
    const workspace = createWorkspace({
      groups: [
        {
          type: 'props',
          name: 'Sources',
          slug: 'sources',
          assets: [
            {
              id: 'atlas-terrain',
              name: 'terrain',
              type: 'sprite',
              source: 'local',
              dataUrl: 'assets/terrain.png',
              width: 64,
              height: 16,
              createdAt: 1,
            },
            {
              id: 'slice-a',
              name: 'A',
              type: 'sprite',
              source: 'local',
              dataUrl: 'assets/terrain.png',
              width: 16,
              height: 16,
              createdAt: 2,
              sourceAssetId: 'atlas-terrain',
              rect: { x: 0, y: 0, w: 16, h: 16 },
            },
          ],
        },
      ],
    });
    workspace.assetRegistry.animations = [{
      id: 'anim-1',
      name: 'idle',
      fps: 8,
      loopMode: 'loop',
      pivot: { x: 0.5, y: 0.5 },
      createdAt: 1,
      frames: [{
        sourceAssetId: 'atlas-terrain',
        rect: { x: 0, y: 0, w: 16, h: 16 },
        durationMs: 140,
      }],
    }];

    const result = buildProjectPack(workspace);
    expect(result.project.animations?.[0]?.frames[0]?.durationMs).toBe(140);
  });



  it('compiles animation sets from asset registry state', () => {
    const workspace = createWorkspace();
    workspace.assetRegistry.animationSets = [{
      id: 'set-player-walk',
      name: 'Player Walk',
      createdAt: 1,
      directions: { down: 'anim-down', up: 'anim-up' },
    }];

    const result = buildProjectPack(workspace);
    expect(result.project.animationSets).toEqual([{
      id: 'set-player-walk',
      name: 'Player Walk',
      directions: { down: 'anim-down', up: 'anim-up' },
    }]);
  });

  it('preserves existing slice index order even when registry order differs', () => {
    const existingSlices = [slice('A', 0), slice('B', 16), slice('C', 32)];

    const workspace = createWorkspace({
      projectSpriteAtlases: [{
        name: 'terrain',
        path: 'game/assets/terrain.png',
        defaultGroup: 'tilesets:ground',
        sliceSize: { width: 16, height: 16 },
        slices: existingSlices,
      }],
      groups: [
        {
          type: 'tilesets',
          name: 'Ground',
          slug: 'ground',
          assets: [{
            id: 'atlas-terrain',
            name: 'terrain',
            type: 'tile',
            source: 'local',
            dataUrl: 'assets/terrain.png',
            width: 48,
            height: 16,
            createdAt: 1,
          }],
        },
        {
          type: 'props',
          name: 'Decor',
          slug: 'decor',
          assets: [
            {
              id: 'slice-c',
              name: 'C',
              type: 'sprite',
              source: 'local',
              dataUrl: 'data:image/png;base64,c',
              width: 16,
              height: 16,
              createdAt: 2,
              sourceAssetId: 'atlas-terrain',
              rect: { x: 32, y: 0, w: 16, h: 16 },
            },
            {
              id: 'slice-a',
              name: 'A',
              type: 'sprite',
              source: 'local',
              dataUrl: 'data:image/png;base64,a',
              width: 16,
              height: 16,
              createdAt: 3,
              sourceAssetId: 'atlas-terrain',
              rect: { x: 0, y: 0, w: 16, h: 16 },
            },
            {
              id: 'slice-b',
              name: 'B',
              type: 'sprite',
              source: 'local',
              dataUrl: 'data:image/png;base64,b',
              width: 16,
              height: 16,
              createdAt: 4,
              sourceAssetId: 'atlas-terrain',
              rect: { x: 16, y: 0, w: 16, h: 16 },
            },
          ],
        },
      ],
    });

    const result = buildProjectPack(workspace);
    const slices = result.project.spriteAtlases?.[0]?.slices ?? [];

    expect(slices.map((entry) => entry.name)).toEqual(['A', 'B', 'C']);
    expect(slices.map((entry) => entry.rect.x)).toEqual([0, 16, 32]);
  });

  it('appends new slices not present in existing project atlas order', () => {
    const workspace = createWorkspace({
      projectSpriteAtlases: [{
        name: 'terrain',
        path: 'assets/terrain.png',
        defaultGroup: 'tilesets:ground',
        sliceSize: { width: 16, height: 16 },
        slices: [slice('A', 0), slice('B', 16), slice('C', 32)],
      }],
      groups: [
        {
          type: 'tilesets',
          name: 'Ground',
          slug: 'ground',
          assets: [{
            id: 'atlas-terrain',
            name: 'terrain',
            type: 'tile',
            source: 'local',
            dataUrl: 'assets/terrain.png',
            width: 64,
            height: 16,
            createdAt: 1,
          }],
        },
        {
          type: 'tilesets',
          name: 'Ground Slices',
          slug: 'ground-slices',
          assets: [
            {
              id: 'slice-b',
              name: 'B',
              type: 'tile',
              source: 'local',
              dataUrl: 'data:image/png;base64,b',
              width: 16,
              height: 16,
              createdAt: 2,
              sourceAssetId: 'atlas-terrain',
              rect: { x: 16, y: 0, w: 16, h: 16 },
            },
            {
              id: 'slice-d',
              name: 'D',
              type: 'tile',
              source: 'local',
              dataUrl: 'data:image/png;base64,d',
              width: 16,
              height: 16,
              createdAt: 3,
              sourceAssetId: 'atlas-terrain',
              rect: { x: 48, y: 0, w: 16, h: 16 },
            },
          ],
        },
      ],
    });

    const result = buildProjectPack(workspace);
    const slices = result.project.spriteAtlases?.[0]?.slices ?? [];
    expect(slices.map((entry) => entry.name)).toEqual(['A', 'B', 'C', 'D']);
    expect(slices[3].rect.x).toBe(48);
  });


  it('preserves tileId for rect-matched replacements even when generated order changes', () => {
    const workspace = createWorkspace({
      projectSpriteAtlases: [{
        name: 'terrain',
        path: 'assets/terrain.png',
        defaultGroup: 'tilesets:ground',
        sliceSize: { width: 16, height: 16 },
        slices: [slice('A', 0, 10), slice('B', 16, 11), slice('C', 32, 12)],
      }],
      groups: [
        {
          type: 'tilesets',
          name: 'Ground',
          slug: 'ground',
          assets: [{
            id: 'atlas-terrain',
            name: 'terrain',
            type: 'tile',
            source: 'local',
            dataUrl: 'assets/terrain.png',
            width: 48,
            height: 16,
            createdAt: 1,
          }],
        },
        {
          type: 'tilesets',
          name: 'Ground Slices',
          slug: 'ground-slices',
          assets: [
            {
              id: 'slice-c',
              name: 'C',
              type: 'tile',
              source: 'local',
              dataUrl: 'data:image/png;base64,c',
              width: 16,
              height: 16,
              createdAt: 2,
              sourceAssetId: 'atlas-terrain',
              rect: { x: 32, y: 0, w: 16, h: 16 },
            },
            {
              id: 'slice-a',
              name: 'A',
              type: 'tile',
              source: 'local',
              dataUrl: 'data:image/png;base64,a',
              width: 16,
              height: 16,
              createdAt: 3,
              sourceAssetId: 'atlas-terrain',
              rect: { x: 0, y: 0, w: 16, h: 16 },
            },
            {
              id: 'slice-b',
              name: 'B',
              type: 'tile',
              source: 'local',
              dataUrl: 'data:image/png;base64,b',
              width: 16,
              height: 16,
              createdAt: 4,
              sourceAssetId: 'atlas-terrain',
              rect: { x: 16, y: 0, w: 16, h: 16 },
            },
          ],
        },
      ],
    });

    const slices = buildProjectPack(workspace).project.spriteAtlases?.[0]?.slices ?? [];
    expect(slices.map((entry) => entry.tileId)).toEqual([10, 11, 12]);
  });

  it('appends new slices using next max tileId without reusing holes', () => {
    const workspace = createWorkspace({
      projectSpriteAtlases: [{
        name: 'terrain',
        path: 'assets/terrain.png',
        defaultGroup: 'tilesets:ground',
        sliceSize: { width: 16, height: 16 },
        slices: [slice('A', 0, 10), slice('B', 16, 11), slice('C', 32, 12)],
      }],
      groups: [
        {
          type: 'tilesets',
          name: 'Ground',
          slug: 'ground',
          assets: [{
            id: 'atlas-terrain',
            name: 'terrain',
            type: 'tile',
            source: 'local',
            dataUrl: 'assets/terrain.png',
            width: 64,
            height: 16,
            createdAt: 1,
          }],
        },
        {
          type: 'tilesets',
          name: 'Ground Slices',
          slug: 'ground-slices',
          assets: [
            {
              id: 'slice-a',
              name: 'A',
              type: 'tile',
              source: 'local',
              dataUrl: 'data:image/png;base64,a',
              width: 16,
              height: 16,
              createdAt: 2,
              sourceAssetId: 'atlas-terrain',
              rect: { x: 0, y: 0, w: 16, h: 16 },
            },
            {
              id: 'slice-d',
              name: 'D',
              type: 'tile',
              source: 'local',
              dataUrl: 'data:image/png;base64,d',
              width: 16,
              height: 16,
              createdAt: 3,
              sourceAssetId: 'atlas-terrain',
              rect: { x: 48, y: 0, w: 16, h: 16 },
            },
          ],
        },
      ],
    });

    const slices = buildProjectPack(workspace).project.spriteAtlases?.[0]?.slices ?? [];
    expect(slices.map((entry) => entry.tileId)).toEqual([10, 11, 12, 13]);
  });

  it('resolveAtlasSliceByLocalId falls back to legacy slice index', () => {
    const atlas = {
      name: 'legacy',
      path: 'assets/legacy.png',
      sliceSize: { width: 16, height: 16 },
      slices: [slice('A', 0), slice('B', 16), slice('C', 32)],
    };

    expect(resolveAtlasSliceByLocalId(atlas, 1)?.name).toBe('B');
  });

  it('keeps atlas list ordered by project order, then appends new atlases', () => {
    const workspace = createWorkspace({
      projectSpriteAtlases: [
        {
          name: 'atlas-b',
          path: 'assets/b.png',
          sliceSize: { width: 16, height: 16 },
          slices: [slice('B0', 0)],
        },
        {
          name: 'atlas-a',
          path: 'assets/a.png',
          sliceSize: { width: 16, height: 16 },
          slices: [slice('A0', 0)],
        },
      ],
      groups: [
        {
          type: 'tilesets',
          name: 'Ground',
          slug: 'ground',
          assets: [
            {
              id: 'atlas-a',
              name: 'atlas-a',
              type: 'tile',
              source: 'local',
              dataUrl: 'assets/a.png',
              width: 16,
              height: 16,
              createdAt: 1,
            },
            {
              id: 'atlas-b',
              name: 'atlas-b',
              type: 'tile',
              source: 'local',
              dataUrl: 'assets/b.png',
              width: 16,
              height: 16,
              createdAt: 2,
            },
            {
              id: 'atlas-c',
              name: 'atlas-c',
              type: 'tile',
              source: 'local',
              dataUrl: 'assets/c.png',
              width: 16,
              height: 16,
              createdAt: 3,
            },
            {
              id: 'slice-a0',
              name: 'A0',
              type: 'tile',
              source: 'local',
              dataUrl: 'data:image/png;base64,a0',
              width: 16,
              height: 16,
              createdAt: 4,
              sourceAssetId: 'atlas-a',
              rect: { x: 0, y: 0, w: 16, h: 16 },
            },
            {
              id: 'slice-b0',
              name: 'B0',
              type: 'tile',
              source: 'local',
              dataUrl: 'data:image/png;base64,b0',
              width: 16,
              height: 16,
              createdAt: 5,
              sourceAssetId: 'atlas-b',
              rect: { x: 0, y: 0, w: 16, h: 16 },
            },
            {
              id: 'slice-c0',
              name: 'C0',
              type: 'tile',
              source: 'local',
              dataUrl: 'data:image/png;base64,c0',
              width: 16,
              height: 16,
              createdAt: 6,
              sourceAssetId: 'atlas-c',
              rect: { x: 0, y: 0, w: 16, h: 16 },
            },
          ],
        },
      ],
    });

    const result = buildProjectPack(workspace);

    expect(result.project.spriteAtlases?.map((atlas) => atlas.path)).toEqual([
      'assets/b.png',
      'assets/a.png',
      'assets/c.png',
    ]);
  });
});
