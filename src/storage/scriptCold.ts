/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Cold storage (fetch from repo) operations for Blockly script files.
 *
 * Defines:
 * - fetchScriptFromRepo — fetch published script via URL helper
 *
 * Canonical key set:
 * - Keys come from: resolveScriptUrl() in src/shared/paths.ts
 *
 * Apply/Rebuild semantics:
 * - Apply mode: read-only (cold storage is never written)
 *
 * Verification:
 * - [ ] Fetch uses BASE_URL for GitHub Pages compatibility
 * - [ ] Returns null on 404 (missing script is safe)
 * - [ ] Validates fetched data before returning
 */

import type { LogicTargetType } from '@/types/gameApi';
import type { ScriptFile } from '@/types/script';
import { resolveScriptUrl } from '@/shared/paths';
import { validateScriptFile } from '@/types/scriptUtils';

const LOG_PREFIX = '[Storage/ScriptCold]';

/**
 * Fetch a published script file from the repository.
 * Returns null if the script doesn't exist (404) or is invalid.
 * Uses BASE_URL for GitHub Pages compatibility.
 */
export async function fetchScriptFromRepo(
  type: LogicTargetType,
  mapId?: string,
): Promise<ScriptFile | null> {
  const url = resolveScriptUrl(type, mapId);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`${LOG_PREFIX} No published script at ${url} (404)`);
        return null;
      }
      console.warn(`${LOG_PREFIX} Failed to fetch script at ${url}: ${response.status}`);
      return null;
    }

    const data: unknown = await response.json();

    const validation = validateScriptFile(data);
    if (!validation.valid) {
      console.warn(`${LOG_PREFIX} Invalid script at ${url}:`, validation.errors);
      return null;
    }

    console.log(`${LOG_PREFIX} Script loaded from ${url}`);
    return data as ScriptFile;
  } catch (err) {
    console.warn(`${LOG_PREFIX} Error fetching script at ${url}:`, err);
    return null;
  }
}
