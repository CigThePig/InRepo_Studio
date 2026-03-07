import { describe, expect, it } from 'vitest';
import type { Project } from './project';
import type { Scene } from './scene';
import {
  computeDefaultTilesets,
  ensureSceneTilesets,
  canonicalizeSceneTilesets,
  createEmptyLayerData,
  DEFAULT_TILESET_BLOCK_SIZE,
} from './scene';

// ---------------------------------------------------------------------------
// Minimal project factory helpers
// ---------------------------------------------------------------------------

function makeProject(overrides?: Partial<Project>): Project {
  return {
    name: 'Test Project',
    defaultScene: 'main',
    tileCategories: [],
    entityTypes: [],
    spriteAtlases: [],
    settings: { defaultTileSize: 32, defaultGridWidth: 20, defaultGridHeight: 15 },
    ...overrides,
  };
}

function makeScene(overrides?: Partial<Scene>): Scene {
  return {
    id: 'test',
    name: 'Test Scene',
    width: 3,
    height: 2,
    tileSize: 32,
    tilesets: [],
    layers: createEmptyLayerData(3, 2),
    entities: [],
    propSprites: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeDefaultTilesets
// ---------------------------------------------------------------------------

describe('computeDefaultTilesets', () => {
  it('assigns firstGid=1 to first category and 1+BLOCK_SIZE to second', () => {
    const project = makeProject({
      tileCategories: [
        { name: 'terrain', path: 'assets/tilesets', files: ['a.png', 'b.png', 'c.png', 'd.png'] },
        { name: 'props', path: 'assets/props', files: ['t.png', 'r.png', 'b.png'] },
      ],
    });

    const tilesets = computeDefaultTilesets(project);
    expect(tilesets).toEqual([
      { category: 'terrain', firstGid: 1 },
      { category: 'props', firstGid: 1 + DEFAULT_TILESET_BLOCK_SIZE },
    ]);
  });

  it('includes atlas-backed categories after regular tile categories', () => {
    const project = makeProject({
      tileCategories: [
        { name: 'terrain', path: 'assets/tilesets', files: ['a.png', 'b.png', 'c.png', 'd.png'] },
        { name: 'props', path: 'assets/props', files: ['t.png', 'r.png', 'b.png'] },
      ],
      spriteAtlases: [
        {
          name: 'forest_tiles (sheet)',
          path: 'assets/tilesets/foresttiles/foresttiles-sheet.png',
          sliceSize: { width: 64, height: 64 },
          slices: Array.from({ length: 143 }, (_, i) => ({
            tileId: i,
            name: `slice_${i}`,
            rect: { x: i * 64, y: 0, w: 64, h: 64 },
          })),
        },
      ],
    });

    const tilesets = computeDefaultTilesets(project);
    expect(tilesets).toEqual([
      { category: 'terrain',          firstGid: 1 },
      { category: 'props',            firstGid: 1001 },
      { category: 'atlas:foresttiles', firstGid: 2001 },
    ]);
  });

  it('returns empty array for a project with no categories', () => {
    const project = makeProject();
    expect(computeDefaultTilesets(project)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ensureSceneTilesets
// ---------------------------------------------------------------------------

describe('ensureSceneTilesets', () => {
  it('creates canonical tilesets for a scene with no tilesets', () => {
    const project = makeProject({
      tileCategories: [
        { name: 'terrain', path: 'assets/tilesets', files: ['a.png', 'b.png', 'c.png', 'd.png'] },
        { name: 'props', path: 'assets/props', files: ['t.png', 'r.png', 'b.png'] },
      ],
    });
    const scene = makeScene({ tilesets: [] });

    const { scene: out, changed } = ensureSceneTilesets(scene, project);
    expect(changed).toBe(true);
    expect(out.tilesets).toEqual([
      { category: 'terrain', firstGid: 1 },
      { category: 'props',   firstGid: 1001 },
    ]);
  });

  it('appends missing atlas category when scene already has existing (hybrid) tilesets', () => {
    const project = makeProject({
      tileCategories: [
        { name: 'terrain', path: 'assets/tilesets', files: ['a.png', 'b.png', 'c.png', 'd.png'] },
        { name: 'props', path: 'assets/props', files: ['t.png', 'r.png', 'b.png'] },
      ],
      spriteAtlases: [
        {
          name: 'forest_tiles (sheet)',
          path: 'assets/tilesets/foresttiles/foresttiles-sheet.png',
          sliceSize: { width: 64, height: 64 },
          slices: Array.from({ length: 143 }, (_, i) => ({
            tileId: i,
            name: `slice_${i}`,
            rect: { x: i * 64, y: 0, w: 64, h: 64 },
          })),
        },
      ],
    });

    // Scene with old compact layout (terrain=1, props=100) and no atlas entry
    const scene = makeScene({
      tilesets: [
        { category: 'terrain', firstGid: 1 },
        { category: 'props',   firstGid: 100 },
      ],
    });

    const { scene: out, changed, warnings } = ensureSceneTilesets(scene, project);
    expect(changed).toBe(true);
    // Existing tilesets are preserved (conservative)
    expect(out.tilesets[0]).toEqual({ category: 'terrain', firstGid: 1 });
    expect(out.tilesets[1]).toEqual({ category: 'props', firstGid: 100 });
    // Atlas is appended at next block boundary after end of props range (100+3=103 → k=1 → 1001)
    expect(out.tilesets[2]).toEqual({ category: 'atlas:foresttiles', firstGid: 1001 });
    expect(warnings.some(w => w.includes('missing category'))).toBe(true);
  });

  it('returns changed=false when tilesets already include all project categories', () => {
    const project = makeProject({
      tileCategories: [
        { name: 'terrain', path: 'assets/tilesets', files: ['a.png', 'b.png', 'c.png', 'd.png'] },
      ],
    });
    const scene = makeScene({
      tilesets: [{ category: 'terrain', firstGid: 1 }],
    });

    const { changed } = ensureSceneTilesets(scene, project);
    expect(changed).toBe(false);
  });

  it('warns about unknown tileset categories without removing them', () => {
    const project = makeProject({
      tileCategories: [
        { name: 'terrain', path: 'assets/tilesets', files: ['a.png'] },
      ],
    });
    const scene = makeScene({
      tilesets: [
        { category: 'terrain', firstGid: 1 },
        { category: 'nonexistent', firstGid: 500 },
      ],
    });

    const { scene: out, warnings } = ensureSceneTilesets(scene, project);
    expect(warnings.some(w => w.includes('unknown category'))).toBe(true);
    // The unknown entry is preserved (conservative)
    expect(out.tilesets.find(t => t.category === 'nonexistent')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// canonicalizeSceneTilesets
// ---------------------------------------------------------------------------

describe('canonicalizeSceneTilesets', () => {
  const project = makeProject({
    tileCategories: [
      { name: 'terrain', path: 'assets/tilesets', files: ['a.png', 'b.png', 'c.png', 'd.png'] },
      { name: 'props', path: 'assets/props', files: ['t.png', 'r.png', 'b.png'] },
    ],
    spriteAtlases: [
      {
        name: 'forest_tiles (sheet)',
        path: 'assets/tilesets/foresttiles/foresttiles-sheet.png',
        sliceSize: { width: 64, height: 64 },
        slices: Array.from({ length: 143 }, (_, i) => ({
          tileId: i,
          name: `slice_${i}`,
          rect: { x: i * 64, y: 0, w: 64, h: 64 },
        })),
      },
    ],
  });

  it('returns changed=false when scene is already canonical', () => {
    const scene = makeScene({
      tilesets: [
        { category: 'terrain',          firstGid: 1 },
        { category: 'props',            firstGid: 1001 },
        { category: 'atlas:foresttiles', firstGid: 2001 },
      ],
    });
    const { changed } = canonicalizeSceneTilesets(scene, project);
    expect(changed).toBe(false);
  });

  it('remaps props layer GIDs from compact to canonical layout', () => {
    // Old compact layout: terrain=1, props=100, atlas=1001 (from ensureSceneTilesets)
    // Props GIDs in layer: 100 (index 0) and 101 (index 1)
    // After canonicalize: terrain=1, props=1001, atlas=2001
    // Expected remapped GIDs: 1001 and 1002
    const layers = createEmptyLayerData(3, 2);
    layers.props[0][0] = 100;  // props tile index 0
    layers.props[0][1] = 101;  // props tile index 1

    const scene = makeScene({
      tilesets: [
        { category: 'terrain',          firstGid: 1 },
        { category: 'props',            firstGid: 100 },
        { category: 'atlas:foresttiles', firstGid: 1001 },
      ],
      layers,
    });

    const { scene: out, changed } = canonicalizeSceneTilesets(scene, project);
    expect(changed).toBe(true);
    expect(out.tilesets).toEqual([
      { category: 'terrain',          firstGid: 1 },
      { category: 'props',            firstGid: 1001 },
      { category: 'atlas:foresttiles', firstGid: 2001 },
    ]);
    expect(out.layers.props[0][0]).toBe(1001);
    expect(out.layers.props[0][1]).toBe(1002);
  });

  it('remaps ground layer GIDs correctly', () => {
    const layers = createEmptyLayerData(3, 2);
    layers.ground[0][0] = 1;   // terrain tile index 0
    layers.ground[0][1] = 2;   // terrain tile index 1

    // Non-canonical: terrain at firstGid=10 instead of 1
    const scene = makeScene({
      tilesets: [
        { category: 'terrain', firstGid: 10 },
        { category: 'props',   firstGid: 1010 },
      ],
      layers,
    });

    const projectSimple = makeProject({
      tileCategories: [
        { name: 'terrain', path: 'assets/tilesets', files: ['a.png', 'b.png', 'c.png', 'd.png'] },
        { name: 'props', path: 'assets/props', files: ['t.png', 'r.png', 'b.png'] },
      ],
    });

    const { scene: out, changed } = canonicalizeSceneTilesets(scene, projectSimple);
    expect(changed).toBe(true);
    // terrain at firstGid=10, index 0 → GID=10. Canonical terrain firstGid=1, so new GID=1+0=1
    expect(out.layers.ground[0][0]).toBe(1);
    // terrain at firstGid=10, index 1 → GID=11. Canonical: 1+1=2
    expect(out.layers.ground[0][1]).toBe(2);
  });

  it('does not remap collision or triggers layers (binary markers)', () => {
    const layers = createEmptyLayerData(3, 2);
    layers.collision[0][0] = 1;
    layers.triggers[1][2] = 1;

    const scene = makeScene({
      tilesets: [
        { category: 'terrain', firstGid: 10 },
      ],
      layers,
    });

    const projectSimple = makeProject({
      tileCategories: [
        { name: 'terrain', path: 'assets/tilesets', files: ['a.png', 'b.png', 'c.png', 'd.png'] },
      ],
    });

    const { scene: out } = canonicalizeSceneTilesets(scene, projectSimple);
    // Binary markers must be preserved exactly
    expect(out.layers.collision[0][0]).toBe(1);
    expect(out.layers.triggers[1][2]).toBe(1);
  });

  it('emits a warning and leaves GIDs unchanged when a category is not in canonical layout', () => {
    const layers = createEmptyLayerData(3, 2);
    // GID 500 resolves to "unknown" category (firstGid=500)
    layers.props[0][0] = 500;

    const scene = makeScene({
      tilesets: [
        { category: 'terrain', firstGid: 1 },
        { category: 'unknown', firstGid: 500 },
      ],
      layers,
    });

    const projectSimple = makeProject({
      tileCategories: [
        { name: 'terrain', path: 'assets/tilesets', files: ['a.png', 'b.png', 'c.png', 'd.png'] },
        // "unknown" is NOT in the project
      ],
    });

    const { scene: out, changed, warnings } = canonicalizeSceneTilesets(scene, projectSimple);
    expect(changed).toBe(true);
    // GID 500 can't remap → left unchanged
    expect(out.layers.props[0][0]).toBe(500);
    expect(warnings.some(w => w.includes('left unchanged'))).toBe(true);
  });

  it('handles scenes with no painted tiles (all zero layers) gracefully', () => {
    const scene = makeScene({
      tilesets: [
        { category: 'terrain', firstGid: 10 },
      ],
    });

    const projectSimple = makeProject({
      tileCategories: [
        { name: 'terrain', path: 'assets/tilesets', files: ['a.png', 'b.png', 'c.png', 'd.png'] },
      ],
    });

    const { scene: out, changed } = canonicalizeSceneTilesets(scene, projectSimple);
    expect(changed).toBe(true); // tilesets changed even if no GIDs remapped
    expect(out.tilesets).toEqual([{ category: 'terrain', firstGid: 1 }]);
  });
});
