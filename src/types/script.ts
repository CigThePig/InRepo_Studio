/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Logic script envelope types for Blockly workspace persistence.
 *
 * Defines:
 * - ScriptFile — envelope wrapping Blockly workspace JSON
 * - LogicTarget — script scope metadata (game | map)
 * - ScriptId — stable script identity
 *
 * Canonical key set:
 * - logicTarget.type: 'game' | 'map' (future: 'entity', 'trigger')
 * - scriptId: 'main' for game logic, 'map:<mapId>' for map logic
 *
 * Apply/Rebuild semantics:
 * - Apply mode: loaded on demand per Logic Target selection
 *
 * File mapping:
 * - Game Logic → /game/logic/main.json
 * - Map Logic → /game/logic/maps/<mapId>.json
 *
 * Verification:
 * - [ ] Envelope round-trips cleanly (save → load)
 * - [ ] logicTarget metadata matches file path
 * - [ ] formatVersion enables future migrations
 */

import type { LogicTargetType } from './gameApi';

// --- Logic Target (within script envelope) ---

export interface ScriptLogicTarget {
  readonly type: LogicTargetType;
  readonly mapId?: string;
  /** Generic target identifier — mapId for maps, categoryId for presets, entityId for entities, etc. */
  readonly targetId?: string;
  readonly label: string;
}

// --- Generated JS metadata (optional cache) ---

export interface ScriptGeneratedMeta {
  readonly language: 'js';
  readonly hash?: string;
  readonly lastGeneratedAt?: string;
}

// --- Script File Envelope ---

export interface ScriptFile {
  readonly formatVersion: number;
  readonly scriptId: string;
  readonly logicTarget: ScriptLogicTarget;
  readonly blockly: {
    readonly workspace: Record<string, unknown>;
  };
  readonly generated?: ScriptGeneratedMeta;
}

// --- Script file path resolution ---

/**
 * Resolve the file path for a Logic Target.
 * @param targetId — mapId for 'map', categoryId for 'preset', entityId for 'entity', triggerId for 'trigger'.
 *                   Also accepts legacy `mapId` parameter for backwards compatibility.
 */
export function resolveScriptPath(type: LogicTargetType, targetId?: string): string {
  if (type === 'game') return 'game/logic/main.json';
  if (type === 'map' && targetId) return `game/logic/maps/${targetId}.json`;
  if (type === 'preset' && targetId) return `game/logic/presets/${targetId}.json`;
  if (type === 'entity' && targetId) return `game/logic/entities/${targetId}.json`;
  if (type === 'trigger' && targetId) return `game/logic/triggers/${targetId}.json`;
  throw new Error(`Invalid logic target: type=${type}, targetId=${targetId}`);
}

/**
 * Generate a stable scriptId for a Logic Target.
 * @param targetId — mapId for 'map', categoryId for 'preset', etc.
 */
export function resolveScriptId(type: LogicTargetType, targetId?: string): string {
  if (type === 'game') return 'main';
  if (type === 'map' && targetId) return `map:${targetId}`;
  if (type === 'preset' && targetId) return `preset:${targetId}`;
  if (type === 'entity' && targetId) return `entity:${targetId}`;
  if (type === 'trigger' && targetId) return `trigger:${targetId}`;
  throw new Error(`Invalid logic target: type=${type}, targetId=${targetId}`);
}
