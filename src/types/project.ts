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

import type { PropertyDefinition } from './entity';

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

  return validateProjectSettings(p.settings);
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
  return (
    typeof e.name === 'string' &&
    Array.isArray(e.properties)
  );
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
