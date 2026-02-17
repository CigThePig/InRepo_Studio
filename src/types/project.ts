/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Define the project manifest schema for InRepo Studio
 *
 * Defines:
 * - ProjectSchema — JSON shape for project.json (type: json-shape)
 * - TileCategorySchema — tile category definition (type: schema)
 * - EntityTypeSchema — entity type definition (type: schema)
 * - ProjectSettingsSchema — global project settings (type: schema)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 * - Export/Import policy: same key set, no excluded keys
 *
 * Apply/Rebuild semantics:
 * - Project name: live-applying (display only)
 * - Default tile size / grid dimensions: requires rebuild (new scenes only)
 *
 * Verification (minimum):
 * - [ ] No orphan keys (schema <-> defaults consistent)
 * - [ ] Export->Import round-trip works
 * - [ ] tileCategories have unique names
 * - [ ] entityTypes have unique names
 */

import { validatePropertyDefinition, type PropertyDefinition } from './entity';
import type { Facing4, ProjectAnimation, ProjectAnimationSet } from './animation';

// --- Tile Category ---

export interface TileCategory {
  /** Unique name for this category (e.g., "terrain", "props") */
  name: string;
  /** Relative path to the tile images folder */
  path: string;
  /** List of tile image filenames in this category */
  files: string[];
}

// --- Entity Type ---

export interface EntityType {
  /** Unique name for this entity type (e.g., "player", "enemy", "door") */
  name: string;
  /** Optional display name for UI */
  displayName?: string;
  /** Optional sprite/image path for preview */
  sprite?: string;
  /** Property definitions for this entity type */
  properties: PropertyDefinition[];
}

// --- Sprite Atlas ---

export interface SpriteAtlasSlice {
  /** Stable local tile id for atlas references (legacy atlases may omit this). */
  tileId?: number;
  /** Unique name for this slice within the atlas */
  name: string;
  /** Region within the spritesheet image */
  rect: { x: number; y: number; w: number; h: number };
  /**
   * Override group assignment for this slice (format: "type:slug", e.g. "props:base").
   * When set, this slice appears in a different Asset Library category than the
   * atlas default. Omitted when the slice belongs to the atlas's defaultGroup.
   */
  group?: string;
}

export interface SpriteAtlas {
  /** Unique name for this atlas (e.g., "terrain-sheet") */
  name: string;
  /** Relative path to the spritesheet image */
  path: string;
  /** Slice size used to generate the atlas grid */
  sliceSize: { width: number; height: number };
  /** Individual slice definitions */
  slices: SpriteAtlasSlice[];
  /**
   * Default group for all slices in this atlas (format: "type:slug", e.g. "tilesets:base").
   * Slices without an explicit `group` override inherit this. Falls back to the group
   * inferred from atlas.path when omitted (backwards compatibility).
   */
  defaultGroup?: string;
}

// --- Project Settings ---

export interface ProjectSettings {
  /** Default tile size in pixels (square tiles) */
  defaultTileSize: number;
  /** Default grid width for new scenes (in tiles) */
  defaultGridWidth: number;
  /** Default grid height for new scenes (in tiles) */
  defaultGridHeight: number;
}

// --- Project Schema ---

export interface Project {
  /** Project name for display */
  name: string;
  /** ID of the default/starting scene */
  defaultScene: string;
  /** Available tile categories */
  tileCategories: TileCategory[];
  /** Available entity types */
  entityTypes: EntityType[];
  /** Sprite atlas definitions for non-destructive spritesheet imports */
  spriteAtlases?: SpriteAtlas[];
  /** Compiled animation definitions for runtime playback */
  animations?: ProjectAnimation[];
  /** Directional animation groupings (reserved for future use) */
  animationSets?: ProjectAnimationSet[];
  /** Project-wide settings */
  settings: ProjectSettings;
}

// --- Default Values ---

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  defaultTileSize: 32,
  defaultGridWidth: 20,
  defaultGridHeight: 15,
};

export function createDefaultProject(name: string = 'Untitled Project'): Project {
  return {
    name,
    defaultScene: 'main',
    tileCategories: [],
    entityTypes: [],
    spriteAtlases: [],
    animations: [],
    animationSets: [],
    settings: { ...DEFAULT_PROJECT_SETTINGS },
  };
}

// --- Validation ---

export function validateProject(project: unknown): project is Project {
  if (!project || typeof project !== 'object') return false;

  const p = project as Record<string, unknown>;

  if (typeof p.name !== 'string') return false;
  if (typeof p.defaultScene !== 'string') return false;
  if (!Array.isArray(p.tileCategories)) return false;
  if (!Array.isArray(p.entityTypes)) return false;
  if (!p.settings || typeof p.settings !== 'object') return false;

  // Check for unique tile category names
  const categoryNames = new Set<string>();
  for (const cat of p.tileCategories) {
    if (!validateTileCategory(cat)) return false;
    if (categoryNames.has(cat.name)) return false;
    categoryNames.add(cat.name);
  }

  // Check for unique entity type names
  const entityNames = new Set<string>();
  for (const ent of p.entityTypes) {
    if (!validateEntityType(ent)) return false;
    if (entityNames.has(ent.name)) return false;
    entityNames.add(ent.name);
  }

  // Validate optional sprite atlases
  if (p.spriteAtlases !== undefined) {
    if (!Array.isArray(p.spriteAtlases)) return false;
    const atlasNames = new Set<string>();
    for (const atlas of p.spriteAtlases) {
      if (!validateSpriteAtlas(atlas)) return false;
      if (atlasNames.has(atlas.name)) return false;
      atlasNames.add(atlas.name);
    }
  }

  // Validate optional animation sets
  if (p.animationSets !== undefined) {
    if (!Array.isArray(p.animationSets)) return false;
    const setIds = new Set<string>();
    for (const animationSet of p.animationSets) {
      if (!validateProjectAnimationSet(animationSet)) return false;
      if (setIds.has(animationSet.id)) return false;
      setIds.add(animationSet.id);
    }
  }

  // Validate optional animations
  if (p.animations !== undefined) {
    if (!Array.isArray(p.animations)) return false;
    const animIds = new Set<string>();
    for (const anim of p.animations) {
      if (!validateProjectAnimation(anim)) return false;
      if (animIds.has(anim.id)) return false;
      animIds.add(anim.id);
    }
  }

  return validateProjectSettings(p.settings);
}

const VALID_LOOP_MODES = new Set(['loop', 'once', 'pingpong']);

export function validateProjectAnimation(anim: unknown): anim is ProjectAnimation {
  if (!anim || typeof anim !== 'object') return false;
  const a = anim as Record<string, unknown>;

  if (typeof a.id !== 'string' || a.id.length === 0) return false;
  if (typeof a.name !== 'string') return false;
  if (typeof a.fps !== 'number' || a.fps < 1 || a.fps > 60) return false;
  if (typeof a.loopMode !== 'string' || !VALID_LOOP_MODES.has(a.loopMode)) return false;
  if (!Array.isArray(a.frames) || a.frames.length === 0) return false;

  for (const frame of a.frames) {
    if (!validateProjectAnimationFrame(frame)) return false;
  }

  if (a.pivot !== undefined) {
    if (!a.pivot || typeof a.pivot !== 'object') return false;
    const pv = a.pivot as Record<string, unknown>;
    if (typeof pv.x !== 'number' || typeof pv.y !== 'number') return false;
    if (pv.x < 0 || pv.x > 1 || pv.y < 0 || pv.y > 1) return false;
  }

  return true;
}

export function validateProjectAnimationFrame(frame: unknown): frame is import('./animation').ProjectAnimationFrame {
  if (!frame || typeof frame !== 'object') return false;
  const f = frame as Record<string, unknown>;
  if (typeof f.textureKey !== 'string') return false;
  if (typeof f.frame !== 'string') return false;
  return true;
}

const VALID_FACING4 = new Set<Facing4>(['down', 'up', 'left', 'right']);

export function validateProjectAnimationSet(animationSet: unknown): animationSet is ProjectAnimationSet {
  if (!animationSet || typeof animationSet !== 'object') return false;
  const value = animationSet as Record<string, unknown>;

  if (typeof value.id !== 'string' || value.id.length === 0) return false;
  if (typeof value.name !== 'string') return false;
  if (!value.directions || typeof value.directions !== 'object') return false;

  const directions = value.directions as Record<string, unknown>;
  for (const [facing, animationId] of Object.entries(directions)) {
    if (!VALID_FACING4.has(facing as Facing4)) return false;
    if (typeof animationId !== 'string') return false;
  }

  return true;
}

export function validateTileCategory(cat: unknown): cat is TileCategory {
  if (!cat || typeof cat !== 'object') return false;
  const c = cat as Record<string, unknown>;
  return (
    typeof c.name === 'string' &&
    typeof c.path === 'string' &&
    Array.isArray(c.files) &&
    c.files.every((f) => typeof f === 'string')
  );
}

export function validateEntityType(ent: unknown): ent is EntityType {
  if (!ent || typeof ent !== 'object') return false;
  const e = ent as Record<string, unknown>;

  if (typeof e.name !== 'string' || e.name.length === 0) return false;
  if (e.displayName !== undefined && typeof e.displayName !== 'string') return false;
  if (e.sprite !== undefined && typeof e.sprite !== 'string') return false;
  if (!Array.isArray(e.properties)) return false;

  for (const prop of e.properties) {
    if (!validatePropertyDefinition(prop)) return false;
  }

  return true;
}

export function validateSpriteAtlasSlice(slice: unknown): slice is SpriteAtlasSlice {
  if (!slice || typeof slice !== 'object') return false;
  const s = slice as Record<string, unknown>;
  if (s.tileId !== undefined && (typeof s.tileId !== 'number' || !Number.isFinite(s.tileId) || !Number.isInteger(s.tileId) || s.tileId < 0)) return false;
  if (typeof s.name !== 'string') return false;
  if (s.group !== undefined && typeof s.group !== 'string') return false;
  if (!s.rect || typeof s.rect !== 'object') return false;
  const r = s.rect as Record<string, unknown>;
  return (
    typeof r.x === 'number' &&
    typeof r.y === 'number' &&
    typeof r.w === 'number' &&
    typeof r.h === 'number'
  );
}

export function validateSpriteAtlas(atlas: unknown): atlas is SpriteAtlas {
  if (!atlas || typeof atlas !== 'object') return false;
  const a = atlas as Record<string, unknown>;
  if (typeof a.name !== 'string') return false;
  if (typeof a.path !== 'string') return false;
  if (a.defaultGroup !== undefined && typeof a.defaultGroup !== 'string') return false;
  if (!a.sliceSize || typeof a.sliceSize !== 'object') return false;
  const sz = a.sliceSize as Record<string, unknown>;
  if (typeof sz.width !== 'number' || typeof sz.height !== 'number') return false;
  if (!Array.isArray(a.slices)) return false;
  return a.slices.every((s) => validateSpriteAtlasSlice(s));
}

export function validateProjectSettings(settings: unknown): settings is ProjectSettings {
  if (!settings || typeof settings !== 'object') return false;
  const s = settings as Record<string, unknown>;
  return (
    typeof s.defaultTileSize === 'number' &&
    typeof s.defaultGridWidth === 'number' &&
    typeof s.defaultGridHeight === 'number'
  );
}
