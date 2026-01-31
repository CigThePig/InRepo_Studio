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
): Scene {
  return {
    id,
    name,
    width,
    height,
    tileSize,
    tilesets: [],
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
