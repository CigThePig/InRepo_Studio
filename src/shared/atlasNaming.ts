function normalizeAtlasPath(atlasPath: string): string {
  return atlasPath
    .replace(/^\/+/, '')
    .replace(/^game\//, '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/');
}

export function parseAtlasGroupSlug(atlasPath: string): string | null {
  const normalized = normalizeAtlasPath(atlasPath);
  const match = normalized.match(/^assets\/tilesets\/([^/]+)\//i);
  if (!match) return null;
  const slug = match[1]?.trim();
  return slug ? slug : null;
}

export function getAtlasCategoryName(atlasPath: string): string {
  const slug = parseAtlasGroupSlug(atlasPath);
  if (slug) {
    return `atlas:${slug}`;
  }

  const normalized = normalizeAtlasPath(atlasPath);
  const fallback = normalized.split('/').filter(Boolean).at(-2) ?? normalized;
  return `atlas:${fallback}`;
}
