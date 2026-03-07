import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const gameRoot = path.join(repoRoot, 'game');
const assetsRoot = path.join(gameRoot, 'assets');
const scenesRoot = path.join(gameRoot, 'scenes');

const requiredFiles = [
  path.join(gameRoot, 'project.json'),
  path.join(scenesRoot, 'index.json'),
];

const canonicalDirs = [
  path.join(assetsRoot, 'tilesets'),
  path.join(assetsRoot, 'props'),
  path.join(assetsRoot, 'entities'),
];

const legacyDirs = [
  path.join(assetsRoot, 'tiles'),
  path.join(assetsRoot, 'sprites'),
];

const errors = [];

// --- Canonical tileset helpers (mirrors src/types/scene.ts logic) ---

const DEFAULT_TILESET_BLOCK_SIZE = 1000;

function getAtlasSlug(atlasPath) {
  const normalized = atlasPath.replace(/^\/+/, '').replace(/^game\//, '').replace(/\\/g, '/').replace(/\/+/g, '/');
  const match = normalized.match(/^assets\/tilesets\/([^/]+)\//i);
  const slug = match ? match[1]?.trim() : null;
  if (slug) return slug;
  const parts = normalized.split('/').filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : normalized;
}

function getAtlasCategoryName(atlasPath) {
  return `atlas:${getAtlasSlug(atlasPath)}`;
}

/**
 * Compute canonical tileset layout for a project.
 * Mirrors computeDefaultTilesets() from src/types/scene.ts.
 */
function computeCanonicalTilesets(project) {
  const categories = [];
  for (const cat of project.tileCategories ?? []) {
    categories.push({ name: cat.name, count: cat.files?.length ?? 0 });
  }
  for (const atlas of project.spriteAtlases ?? []) {
    const name = getAtlasCategoryName(atlas.path);
    const slices = atlas.slices ?? [];
    let maxId = -1;
    for (const s of slices) {
      if (typeof s.tileId === 'number' && Number.isFinite(s.tileId) && Number.isInteger(s.tileId) && s.tileId >= 0 && s.tileId > maxId) {
        maxId = s.tileId;
      }
    }
    const count = maxId >= 0 ? maxId + 1 : slices.length;
    categories.push({ name, count });
  }
  return categories.map((cat, i) => ({ category: cat.name, firstGid: 1 + i * DEFAULT_TILESET_BLOCK_SIZE }));
}

/**
 * Validate that every atlas slice has a valid non-negative integer tileId.
 */
function validateAtlasSliceTileIds(project) {
  for (const atlas of project.spriteAtlases ?? []) {
    const catName = getAtlasCategoryName(atlas.path);
    for (let i = 0; i < (atlas.slices ?? []).length; i++) {
      const slice = atlas.slices[i];
      const tid = slice.tileId;
      if (tid === undefined || tid === null || typeof tid !== 'number' || !Number.isInteger(tid) || tid < 0) {
        errors.push(`Atlas "${catName}" slice [${i}] "${slice.name ?? '?'}": missing or invalid tileId (got ${JSON.stringify(tid)})`);
      }
    }
  }
}

/**
 * Validate a single scene file for project/scene consistency:
 * - All scene tileset categories exist in the project
 * - All canonical project categories are present in scene tilesets
 * - firstGid values match canonical values
 * - No GID range overlaps
 */
async function validateSceneConsistency(sceneId, project) {
  const sceneFile = path.join(scenesRoot, `${sceneId}.json`);
  if (!(await pathExists(sceneFile))) {
    // File existence is already checked in the main scene index loop; skip here.
    return;
  }

  let scene;
  try {
    const raw = await fs.readFile(sceneFile, 'utf8');
    scene = JSON.parse(raw);
  } catch (e) {
    errors.push(`Scene "${sceneId}": failed to parse JSON — ${e.message}`);
    return;
  }

  const canonical = computeCanonicalTilesets(project);
  const canonicalMap = new Map(canonical.map(ts => [ts.category, ts.firstGid]));
  const sceneTilesets = scene.tilesets ?? [];

  // Check each scene tileset category is a known project category
  for (const ts of sceneTilesets) {
    if (!canonicalMap.has(ts.category)) {
      errors.push(`Scene "${sceneId}": tileset references unknown project category "${ts.category}"`);
    }
  }

  // Check each canonical category is present in scene tilesets with the correct firstGid
  const sceneMap = new Map(sceneTilesets.map(ts => [ts.category, ts.firstGid]));
  for (const { category, firstGid } of canonical) {
    if (!sceneMap.has(category)) {
      errors.push(`Scene "${sceneId}": missing tileset for project category "${category}" (expected firstGid ${firstGid})`);
    } else if (sceneMap.get(category) !== firstGid) {
      errors.push(
        `Scene "${sceneId}": non-canonical firstGid for category "${category}": expected ${firstGid}, got ${sceneMap.get(category)}`
      );
    }
  }

  // Warn about GID range overlaps (informational; does not fail)
  const sorted = [...sceneTilesets].sort((a, b) => a.firstGid - b.firstGid);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const catA = project.tileCategories?.find(c => c.name === a.category);
    const countA = catA ? (catA.files?.length ?? 0) : 0;
    const aEnd = a.firstGid + Math.max(countA, 1);
    if (b.firstGid < aEnd) {
      errors.push(
        `Scene "${sceneId}": GID range overlap — "${a.category}" [${a.firstGid}..${aEnd - 1}] overlaps "${b.category}" at ${b.firstGid}`
      );
    }
  }
}

async function pathExists(target) {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  if (await pathExists(dirPath)) return;
  await fs.mkdir(dirPath, { recursive: true });
  errors.push(`Canonical asset root missing: ${path.relative(repoRoot, dirPath)} (created)`);
}

function assertWithinGameRoot(targetPath, label) {
  const resolved = path.resolve(gameRoot, targetPath);
  if (!resolved.startsWith(gameRoot)) {
    errors.push(`Path escapes game root: ${label} -> ${targetPath}`);
    return false;
  }
  return true;
}

function assertNoTraversal(targetPath, label) {
  if (targetPath.split(/[\\/]+/).includes('..')) {
    errors.push(`Path traversal detected: ${label} -> ${targetPath}`);
    return false;
  }
  return true;
}

async function assertFileExists(targetPath, label) {
  if (!(await pathExists(targetPath))) {
    errors.push(`Missing file: ${label} -> ${path.relative(repoRoot, targetPath)}`);
  }
}

async function validateProject() {
  for (const filePath of requiredFiles) {
    if (!(await pathExists(filePath))) {
      errors.push(`Missing required file: ${path.relative(repoRoot, filePath)}`);
    }
  }

  for (const dirPath of canonicalDirs) {
    await ensureDir(dirPath);
  }

  for (const dirPath of legacyDirs) {
    if (await pathExists(dirPath)) {
      errors.push(`Legacy asset directory detected: ${path.relative(repoRoot, dirPath)}`);
    }
  }

  const projectPath = requiredFiles[0];
  if (!(await pathExists(projectPath))) return;

  const projectRaw = await fs.readFile(projectPath, 'utf8');
  const project = JSON.parse(projectRaw);

  for (const category of project.tileCategories ?? []) {
    if (!category?.path || !Array.isArray(category.files)) {
      errors.push(`Invalid tile category entry: ${category?.name ?? 'unknown'}`);
      continue;
    }

    if (!assertNoTraversal(category.path, `tileCategories.${category.name}.path`)) continue;
    if (!assertWithinGameRoot(category.path, `tileCategories.${category.name}.path`)) continue;

    for (const file of category.files) {
      if (!assertNoTraversal(file, `tileCategories.${category.name}.files`)) continue;
      const assetPath = path.join(gameRoot, category.path, file);
      if (!assertWithinGameRoot(assetPath, `tileCategories.${category.name}.files`)) continue;
      await assertFileExists(assetPath, `tileCategories.${category.name}.files`);
    }
  }

  for (const entityType of project.entityTypes ?? []) {
    if (!entityType?.sprite) continue;
    if (!assertNoTraversal(entityType.sprite, `entityTypes.${entityType.name}.sprite`)) continue;
    const spritePath = path.join(gameRoot, entityType.sprite);
    if (!assertWithinGameRoot(spritePath, `entityTypes.${entityType.name}.sprite`)) continue;
    await assertFileExists(spritePath, `entityTypes.${entityType.name}.sprite`);
  }

  // Validate atlas slice tileIds before scene checks (scene canonical check depends on correct count)
  validateAtlasSliceTileIds(project);

  const indexPath = requiredFiles[1];
  if (await pathExists(indexPath)) {
    const indexRaw = await fs.readFile(indexPath, 'utf8');
    const indexData = JSON.parse(indexRaw);
    if (!Array.isArray(indexData)) {
      errors.push('Scene index must be a string array');
    } else {
      for (const entry of indexData) {
        if (typeof entry !== 'string') {
          errors.push('Scene index contains non-string entries');
          continue;
        }
        const id = entry.trim();
        if (!id) {
          errors.push('Scene index contains empty IDs');
          continue;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
          errors.push(`Scene index contains invalid ID: ${id}`);
          continue;
        }
        const sceneFile = path.join(scenesRoot, `${id}.json`);
        await assertFileExists(sceneFile, `scenes.index ${id}`);
        // Semantic consistency: scene tilesets must align with canonical project layout
        await validateSceneConsistency(id, project);
      }
    }
  }
}

await validateProject();

if (errors.length > 0) {
  console.error('Project validation failed:');
  errors.forEach((err) => console.error(`- ${err}`));
  process.exit(1);
}

console.log('Project validation passed.');
