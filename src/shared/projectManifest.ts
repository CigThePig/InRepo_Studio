import type { Project, TileCategory, EntityType } from '@/types';

export function ensureTileCategoryConfigured(
  project: Project,
  categoryName: string,
  pathValue: string
): TileCategory {
  let category = project.tileCategories.find((entry) => entry.name === categoryName);
  if (!category) {
    category = {
      name: categoryName,
      path: pathValue,
      files: [],
    };
    project.tileCategories.push(category);
    return category;
  }

  if (category.path !== pathValue) {
    category.path = pathValue;
  }

  if (!Array.isArray(category.files)) {
    category.files = [];
  }

  return category;
}

export function appendTileFileIfMissing(
  project: Project,
  categoryName: string,
  relFile: string
): boolean {
  const category = project.tileCategories.find((entry) => entry.name === categoryName);
  if (!category) {
    throw new Error(`Tile category "${categoryName}" is missing`);
  }

  if (category.files.includes(relFile)) {
    return false;
  }

  category.files.push(relFile);
  return true;
}

export function ensureEntityType(
  project: Project,
  typeId: string,
  spritePath: string
): EntityType {
  const existing = project.entityTypes.find((entry) => entry.name === typeId);
  if (existing) {
    if (existing.sprite !== spritePath) {
      existing.sprite = spritePath;
    }
    if (!Array.isArray(existing.properties)) {
      existing.properties = [];
    }
    return existing;
  }

  const next: EntityType = {
    name: typeId,
    sprite: spritePath,
    properties: [],
  };
  project.entityTypes.push(next);
  return next;
}
