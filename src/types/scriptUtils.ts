/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Script envelope validation and factory utilities.
 *
 * Defines:
 * - SCRIPT_FORMAT_VERSION — current envelope format version (type: constant)
 * - createEmptyScriptFile — factory for new script envelopes
 * - validateScriptFile — structural validation for script envelopes
 *
 * Canonical key set:
 * - Keys come from: src/types/script.ts (ScriptFile interface)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: used at load boundaries (cold fetch, import)
 *
 * Verification:
 * - [ ] Empty script factory produces valid ScriptFile
 * - [ ] Validation rejects malformed envelopes
 * - [ ] formatVersion matches SCRIPT_FORMAT_VERSION
 */

import type { ScriptFile, ScriptLogicTarget } from './script';
import type { LogicTargetType } from './gameApi';
import { resolveScriptId } from './script';

/** Current script envelope format version. */
export const SCRIPT_FORMAT_VERSION = 1;

/**
 * Create an empty ScriptFile envelope for a Logic Target.
 * Used when a user creates a new script (on-demand, not pre-populated).
 */
export function createEmptyScriptFile(
  type: LogicTargetType,
  mapId?: string,
  label?: string,
): ScriptFile {
  const scriptId = resolveScriptId(type, mapId);

  const logicTarget: ScriptLogicTarget = type === 'game'
    ? { type: 'game', label: label ?? 'Game Logic (main)' }
    : { type: 'map', mapId: mapId!, label: label ?? `Map: ${mapId}` };

  return {
    formatVersion: SCRIPT_FORMAT_VERSION,
    scriptId,
    logicTarget,
    blockly: {
      workspace: {},
    },
  };
}

/** Validation result for script envelope checks. */
export interface ScriptValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

/**
 * Validate a script file envelope structure.
 * Used at load boundaries (cold fetch) where data is untrusted.
 */
export function validateScriptFile(data: unknown): ScriptValidationResult {
  const errors: string[] = [];

  if (data === null || data === undefined || typeof data !== 'object') {
    return { valid: false, errors: ['Script file must be a non-null object'] };
  }

  const obj = data as Record<string, unknown>;

  // formatVersion
  if (typeof obj.formatVersion !== 'number' || obj.formatVersion < 1) {
    errors.push('formatVersion must be a positive number');
  }

  // scriptId
  if (typeof obj.scriptId !== 'string' || obj.scriptId.length === 0) {
    errors.push('scriptId must be a non-empty string');
  }

  // logicTarget
  if (obj.logicTarget === null || obj.logicTarget === undefined || typeof obj.logicTarget !== 'object') {
    errors.push('logicTarget must be an object');
  } else {
    const lt = obj.logicTarget as Record<string, unknown>;
    const validTypes = ['game', 'map', 'preset', 'entity', 'trigger'];
    if (!validTypes.includes(lt.type as string)) {
      errors.push(`logicTarget.type must be one of: ${validTypes.join(', ')}`);
    }
    if (lt.type === 'map' && (typeof lt.mapId !== 'string' || lt.mapId.length === 0)) {
      errors.push('logicTarget.mapId must be a non-empty string for map targets');
    }
    if ((lt.type === 'preset' || lt.type === 'entity' || lt.type === 'trigger') &&
        (typeof lt.targetId !== 'string' || (lt.targetId as string).length === 0)) {
      errors.push(`logicTarget.targetId must be a non-empty string for ${lt.type} targets`);
    }
    if (typeof lt.label !== 'string' || lt.label.length === 0) {
      errors.push('logicTarget.label must be a non-empty string');
    }
  }

  // blockly
  if (obj.blockly === null || obj.blockly === undefined || typeof obj.blockly !== 'object') {
    errors.push('blockly must be an object');
  } else {
    const blockly = obj.blockly as Record<string, unknown>;
    if (blockly.workspace === null || blockly.workspace === undefined || typeof blockly.workspace !== 'object') {
      errors.push('blockly.workspace must be an object');
    }
  }

  return { valid: errors.length === 0, errors };
}
