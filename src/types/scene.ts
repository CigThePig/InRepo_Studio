/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Define scene data schemas for InRepo Studio
 *
 * Defines:
 * - SceneSchema — JSON shape for scene files (type: json-shape)
 * - LayerDataSchema — tilemap layer structure (type: schema)
 * - EntityInstanceSchema — placed entity in scene (type: schema)
 * - TilesetReference — tileset reference (type: schema)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: same key set, no excluded keys
 *
 * Apply/Rebuild semantics:
 * - Layer data changes: live-applying (re-render affected region)
 * - Scene dimensions: requires rebuild (regenerates layer arrays)
 * - Tileset references: requires apply (reload tileset images)
 *
 * Verification (minimum):
 * - [ ] Layer data arrays match width x height
 * - [ ] Entity type references valid project entityTypes
 * - [ ] Entity instance IDs are unique within scene
 */

import type { Project } from './project';


// --- Layer Types ---

export type LayerType = 'ground' | 'props' | 'collision' | 'triggers';

export const LAYER_ORDER: LayerType[] = ['ground', 'props', 'collision', 'triggers'];

// --- Tileset Reference ---

export interface TilesetReference {
  /** Tile category name (references project.tileCategories) */
  category: string;
  /** First GID for this tileset */
  firstGid: number;
}

// --- Tileset GID Helpers ---

/** Default per-category GID block size for new/normalized scenes. */
export const DEFAULT_TILESET_BLOCK_SIZE = 1000;


/**
 * A resolved tile reference derived from a global tile GID.
 * `index` is 0-based within the resolved category.
 */
export interface ResolvedTileRef {
  category: string;
  index: number;
}

/**
 * Resolve a global tile GID to a {category, index} pair using scene.tilesets.
 *
 * Rules:
 * - gid <= 0 => null (empty)
 * - Picks the tileset with the greatest firstGid that is <= gid (Tiled-style)
 * - index is 0-based: index = gid - firstGid
 *
 * Note: This does NOT validate that the index is within the category's file list.
 * Callers should treat out-of-range indices as "not renderable".
 */
export function resolveTileGid(scene: Scene, gid: number): ResolvedTileRef | null {
  if (!Number.isFinite(gid) || gid <= 0) return null;
  const tilesets = scene.tilesets ?? [];
  if (tilesets.length === 0) return null;

  // Find the tileset with the greatest firstGid <= gid.
  // (We sort a shallow copy to make selection deterministic even if scene.tilesets is unsorted.)
  const sorted = [...tilesets].sort((a, b) => a.firstGid - b.firstGid);

  let chosen: TilesetReference | null = null;
  for (const ts of sorted) {
    if (gid >= ts.firstGid) {
      chosen = ts;
    } else {
      break;
    }
  }

  if (!chosen) return null;

  const index = gid - chosen.firstGid;
  if (!Number.isFinite(index) || index < 0) return null;

  return { category: chosen.category, index };
}

/**
 * Convert a tile selection (category + 0-based index) into a global GID using scene.tilesets.
 * Returns null if the scene has no tileset reference for the selected category.
 */
export function getGidForTile(scene: Scene, category: string, index: number): number | null {
  if (!Number.isFinite(index) || index < 0) return null;
  const tilesets = scene.tilesets ?? [];
  const ts = tilesets.find(t => t.category === category);
  if (!ts) return null;
  return ts.firstGid + index;
}

/**
 * Compute a deterministic default tileset table for a project:
 * - Uses project.tileCategories order
 * - Packs categories contiguously starting at firstGid=1
 */
export function computeDefaultTilesets(project: Project): TilesetReference[] {
  const refs: TilesetReference[] = [];

  for (let i = 0; i < project.tileCategories.length; i++) {
    const cat = project.tileCategories[i];
    const firstGid = 1 + i * DEFAULT_TILESET_BLOCK_SIZE;

    if ((cat.files?.length ?? 0) > DEFAULT_TILESET_BLOCK_SIZE) {
      console.warn(
        `[SceneSchema] Tile category "${cat.name}" has ${(cat.files?.length ?? 0)} tiles, which exceeds DEFAULT_TILESET_BLOCK_SIZE=${DEFAULT_TILESET_BLOCK_SIZE}. ` +
          `Consider manually increasing firstGid spacing in scene.tilesets to avoid overlap.`
      );
    }

    refs.push({ category: cat.name, firstGid });
  }

  return refs;
}

function getCategoryTileCount(project: Project, categoryName: string): number | null {
  const cat = project.tileCategories.find(c => c.name === categoryName);
  if (!cat) return null;
  return cat.files?.length ?? 0;
}

function computeTilesetEndExclusive(project: Project, ts: TilesetReference): number {
  const count = getCategoryTileCount(project, ts.category);
  // If unknown, assume at least 1 so we don't "collapse" ranges.
  const safeCount = Math.max(1, count ?? 0);
  return ts.firstGid + safeCount;
}

function hasAnyPaintedTiles(scene: Scene): boolean {
  for (const layerType of LAYER_ORDER) {
    const layer = scene.layers[layerType];
    for (const row of layer) {
      for (const cell of row) {
        if (cell !== 0) return true;
      }
    }
  }
  return false;
}

function layerMaxValue(layer: TileLayer): number {
  let max = 0;
  for (const row of layer) {
    for (const cell of row) {
      if (cell > max) max = cell;
    }
  }
  return max;
}

/**
 * Ensure a scene has a tileset table that is compatible with the current project categories.
 *
 * What it does:
 * - If scene.tilesets is empty:
 *   - Creates a default packed mapping (computeDefaultTilesets)
 *   - Optionally migrates legacy tile values that were stored as local 1-based indices
 *     (ground -> terrain, props -> props) into real GIDs.
 * - If scene.tilesets exists:
 *   - Appends any missing project categories at the end (does NOT change existing firstGid values)
 *   - Emits warnings (returned) for duplicates, unknown categories, or overlaps.
 *
 * This function is designed to be conservative: it never rewrites existing firstGid values.
 */
export interface EnsureTilesetsResult {
  scene: Scene;
  changed: boolean;
  migratedLegacyTileValues: boolean;
  warnings: string[];
}

export function ensureSceneTilesets(scene: Scene, project: Project): EnsureTilesetsResult {
  const warnings: string[] = [];
  let changed = false;
  let migratedLegacyTileValues = false;

  const originalTilesets = scene.tilesets ?? [];

  // De-dupe tilesets by category (keep the first)
  const seen = new Set<string>();
  const cleanedTilesets: TilesetReference[] = [];
  for (const ts of originalTilesets) {
    if (seen.has(ts.category)) {
      warnings.push(`Duplicate tileset category "${ts.category}" found; keeping the first.`);
      continue;
    }
    seen.add(ts.category);
    cleanedTilesets.push(ts);
  }

  if (cleanedTilesets.length !== originalTilesets.length) {
    changed = true;
  }

  let tilesets: TilesetReference[] = cleanedTilesets;

  const projectCategories = project.tileCategories.map(c => c.name);

  // Warn on tilesets that reference unknown categories
  for (const ts of tilesets) {
    if (!projectCategories.includes(ts.category)) {
      warnings.push(`Scene tileset references unknown category "${ts.category}" (not in project.tileCategories).`);
    }
  }

  // If no tilesets, build a deterministic default table
  if (tilesets.length === 0) {
    tilesets = computeDefaultTilesets(project);
    changed = true;

    // Legacy migration: if a scene existed before tilesets were written, the editor stored
    // local 1-based indices (index+1) regardless of category. The safest, least-surprising
    // assumption is:
    // - ground layer uses "terrain" if it exists, else the first category
    // - props layer uses "props" if it exists, else the second category (or first)
    //
    // We only migrate if there are any painted tiles AND the max values look like local indices.
    if (hasAnyPaintedTiles(scene) && project.tileCategories.length > 0) {
      const terrainName = projectCategories.includes('terrain') ? 'terrain' : projectCategories[0];
      const propsName =
        projectCategories.includes('props')
          ? 'props'
          : projectCategories[1] ?? projectCategories[0];

      const terrainCount = getCategoryTileCount(project, terrainName) ?? 0;
      const propsCount = getCategoryTileCount(project, propsName) ?? 0;

      const groundMax = layerMaxValue(scene.layers.ground);
      const propsMax = layerMaxValue(scene.layers.props);

      const looksLikeLocal =
        (groundMax <= Math.max(terrainCount, 1)) &&
        (propsMax <= Math.max(propsCount, 1));

      if (looksLikeLocal) {
        const terrainFirst = tilesets.find(t => t.category === terrainName)?.firstGid ?? 1;
        const propsFirst = tilesets.find(t => t.category === propsName)?.firstGid ?? 1;

        const remapLayer = (layer: TileLayer, firstGid: number): TileLayer =>
          layer.map(row =>
            row.map(v => (v > 0 ? firstGid + (v - 1) : 0))
          );

        const newLayers = {
          ...scene.layers,
          ground: remapLayer(scene.layers.ground, terrainFirst),
          props: remapLayer(scene.layers.props, propsFirst),
          // collision/triggers are already binary
        };

        scene = { ...scene, layers: newLayers };
        migratedLegacyTileValues = true;
        changed = true;
        warnings.push('Migrated legacy local tile indices into GIDs (ground/props).');
      } else {
        warnings.push(
          'Scene had no tilesets; created default tilesets but did not migrate tile values because they did not look like local indices.'
        );
      }
    }

    return { scene: { ...scene, tilesets }, changed, migratedLegacyTileValues, warnings };
  }

  // Append missing categories without changing existing firstGids
  const existing = new Set(tilesets.map(t => t.category));
  const missing = project.tileCategories.filter(c => !existing.has(c.name));

  if (missing.length > 0) {
    // Choose the next block boundary at or after the current max end.
    let maxEndExclusive = 1;
    for (const ts of tilesets) {
      maxEndExclusive = Math.max(maxEndExclusive, computeTilesetEndExclusive(project, ts));
    }

    // Align to our default block scheme: firstGid = 1 + k * BLOCK_SIZE
    const k = Math.ceil((maxEndExclusive - 1) / DEFAULT_TILESET_BLOCK_SIZE);
    let next = 1 + k * DEFAULT_TILESET_BLOCK_SIZE;

    for (const cat of missing) {
      tilesets = [...tilesets, { category: cat.name, firstGid: next }];
      next += DEFAULT_TILESET_BLOCK_SIZE;
    }

    warnings.push(`Appended ${missing.length} missing category tileset(s) to scene.tilesets.`);
    changed = true;
  }

  // Optional overlap warnings (does not modify data)
  const sorted = [...tilesets].sort((a, b) => a.firstGid - b.firstGid);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const aEnd = computeTilesetEndExclusive(project, a);
    if (b.firstGid < aEnd) {
      warnings.push(
        `Tileset GID ranges overlap or are ambiguous: "${a.category}" [${a.firstGid}..${aEnd - 1}] overlaps "${b.category}" starting at ${b.firstGid}.`
      );
    }
  }

  const finalScene = changed ? { ...scene, tilesets } : scene;
  return { scene: finalScene, changed, migratedLegacyTileValues, warnings };
}


// --- Layer Data ---

/**
 * Layer data is a 2D array of tile indices.
 * 0 means empty, positive integers reference tileset GIDs.
 */
export type TileLayer = number[][];

export interface LayerData {
  ground: TileLayer;
  props: TileLayer;
  collision: TileLayer;
  triggers: TileLayer;
}

// --- Entity Instance ---

export interface EntityInstance {
  /** Unique ID within the scene */
  id: string;
  /** Entity type name (references project.entityTypes) */
  type: string;
  /** X position in pixels */
  x: number;
  /** Y position in pixels */
  y: number;
  /** Instance-specific property values */
  properties: Record<string, string | number | boolean>;
}

// --- Scene Schema ---

export interface Scene {
  /** Unique scene ID */
  id: string;
  /** Display name */
  name: string;
  /** Scene width in tiles */
  width: number;
  /** Scene height in tiles */
  height: number;
  /** Tile size in pixels (square) */
  tileSize: number;
  /** Tileset references */
  tilesets: TilesetReference[];
  /** Layer data */
  layers: LayerData;
  /** Entity instances */
  entities: EntityInstance[];
}

// --- Factory Functions ---

/**
 * Create empty layer data for a scene of given dimensions
 */
export function createEmptyLayerData(width: number, height: number): LayerData {
  const createEmptyLayer = (): TileLayer => {
    const layer: TileLayer = [];
    for (let y = 0; y < height; y++) {
      layer.push(new Array(width).fill(0));
    }
    return layer;
  };

  return {
    ground: createEmptyLayer(),
    props: createEmptyLayer(),
    collision: createEmptyLayer(),
    triggers: createEmptyLayer(),
  };
}

/**
 * Create a new scene with default values
 */
export function createScene(
  id: string,
  name: string,
  width: number,
  height: number,
  tileSize: number
): Scene;
export function createScene(
  id: string,
  name: string,
  width: number,
  height: number,
  tileSize: number,
  project: Project
): Scene;
export function createScene(
  id: string,
  name: string,
  width: number,
  height: number,
  tileSize: number,
  project?: Project
): Scene {
  const tilesets = project ? computeDefaultTilesets(project) : [];

  return {
    id,
    name,
    width,
    height,
    tileSize,
    tilesets,
    layers: createEmptyLayerData(width, height),
    entities: [],
  };
}

/**
 * Generate a unique entity instance ID
 */
export function generateEntityId(): string {
  return `e_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// --- Validation ---

export function validateScene(scene: unknown): scene is Scene {
  if (!scene || typeof scene !== 'object') return false;
  const s = scene as Record<string, unknown>;

  if (typeof s.id !== 'string') return false;
  if (typeof s.name !== 'string') return false;
  if (typeof s.width !== 'number' || s.width <= 0) return false;
  if (typeof s.height !== 'number' || s.height <= 0) return false;
  if (typeof s.tileSize !== 'number' || s.tileSize <= 0) return false;

  if (!Array.isArray(s.tilesets)) return false;
  for (const ts of s.tilesets) {
    if (!validateTilesetReference(ts)) return false;
  }

  if (!s.layers || typeof s.layers !== 'object') return false;
  if (!validateLayerData(s.layers, s.width, s.height)) return false;

  if (!Array.isArray(s.entities)) return false;
  const entityIds = new Set<string>();
  for (const ent of s.entities) {
    if (!validateEntityInstance(ent)) return false;
    if (entityIds.has(ent.id)) return false; // Duplicate ID
    entityIds.add(ent.id);
  }

  return true;
}

export function validateTilesetReference(ref: unknown): ref is TilesetReference {
  if (!ref || typeof ref !== 'object') return false;
  const r = ref as Record<string, unknown>;
  return typeof r.category === 'string' && typeof r.firstGid === 'number';
}

export function validateLayerData(
  layers: unknown,
  width: number,
  height: number
): layers is LayerData {
  if (!layers || typeof layers !== 'object') return false;
  const l = layers as Record<string, unknown>;

  for (const layerType of LAYER_ORDER) {
    if (!validateTileLayer(l[layerType], width, height)) return false;
  }

  return true;
}

export function validateTileLayer(
  layer: unknown,
  width: number,
  height: number
): layer is TileLayer {
  if (!Array.isArray(layer)) return false;
  if (layer.length !== height) return false;

  for (const row of layer) {
    if (!Array.isArray(row)) return false;
    if (row.length !== width) return false;
    for (const cell of row) {
      if (typeof cell !== 'number') return false;
    }
  }

  return true;
}

export function validateEntityInstance(entity: unknown): entity is EntityInstance {
  if (!entity || typeof entity !== 'object') return false;
  const e = entity as Record<string, unknown>;

  if (typeof e.id !== 'string') return false;
  if (typeof e.type !== 'string') return false;
  if (typeof e.x !== 'number') return false;
  if (typeof e.y !== 'number') return false;
  if (!e.properties || typeof e.properties !== 'object') return false;

  return true;
}

// --- Utility Functions ---

/**
 * Get tile at position in a layer
 */
export function getTile(layer: TileLayer, x: number, y: number): number {
  if (y < 0 || y >= layer.length) return 0;
  if (x < 0 || x >= layer[y].length) return 0;
  return layer[y][x];
}

/**
 * Set tile at position in a layer (mutates layer)
 */
export function setTile(layer: TileLayer, x: number, y: number, value: number): boolean {
  if (y < 0 || y >= layer.length) return false;
  if (x < 0 || x >= layer[y].length) return false;
  layer[y][x] = value;
  return true;
}

/**
 * Resize a layer to new dimensions (preserves existing data where possible)
 */
export function resizeLayer(
  layer: TileLayer,
  newWidth: number,
  newHeight: number
): TileLayer {
  const newLayer: TileLayer = [];
  for (let y = 0; y < newHeight; y++) {
    const row: number[] = [];
    for (let x = 0; x < newWidth; x++) {
      row.push(getTile(layer, x, y));
    }
    newLayer.push(row);
  }
  return newLayer;
}

/**
 * Resize all layers in a scene
 */
export function resizeScene(scene: Scene, newWidth: number, newHeight: number): Scene {
  return {
    ...scene,
    width: newWidth,
    height: newHeight,
    layers: {
      ground: resizeLayer(scene.layers.ground, newWidth, newHeight),
      props: resizeLayer(scene.layers.props, newWidth, newHeight),
      collision: resizeLayer(scene.layers.collision, newWidth, newHeight),
      triggers: resizeLayer(scene.layers.triggers, newWidth, newHeight),
    },
  };
}
