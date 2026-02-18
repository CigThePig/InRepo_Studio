/**
 * Shared deploy utilities
 *
 * Canonical implementations of functions previously duplicated across
 * commit.ts, changeDetector.ts, assetUpload.ts, and shaManager.ts.
 */

/**
 * Hash content using SHA-256 (with fallback for environments without crypto.subtle).
 */
export async function hashContent(content: string): Promise<string> {
  if (crypto?.subtle) {
    const data = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 0;
  for (let i = 0; i < content.length; i += 1) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return `fallback-${hash}`;
}

/**
 * Check if a GitHub API response indicates a rate limit error.
 * Returns an error message string if rate-limited, null otherwise.
 */
export function parseRateLimitError(response: Response): string | null {
  if (response.status !== 403) {
    return null;
  }
  const remaining = response.headers.get('X-RateLimit-Remaining');
  if (remaining === '0') {
    return 'GitHub API rate limit exceeded. Please try again later.';
  }
  return null;
}

/**
 * Normalize a file path by stripping a leading slash.
 */
export function normalizePath(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path;
}
