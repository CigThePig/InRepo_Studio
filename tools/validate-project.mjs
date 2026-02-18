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
