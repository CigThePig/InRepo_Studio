/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Structured logging implementation for the Game API.
 *
 * Implements:
 * - LogApi (from src/types/gameApi.ts)
 *
 * Details must be JSON-serializable.
 * Logs include source info (Logic Target) when available.
 *
 * Apply/Rebuild semantics:
 * - Apply mode: scene-scoped (one per SceneHost)
 *
 * Verification:
 * - [ ] info/warn/error/event produce structured output
 * - [ ] Details are JSON-safe
 */

import type { LogApi } from '../../types/gameApi';
import type { LogicTargetMeta } from '../../types/gameApi';

export interface LogApiOptions {
  /** Logic Target metadata for log source attribution. */
  readonly logicTarget?: LogicTargetMeta;
  /** Optional prefix for log messages. */
  readonly prefix?: string;
}

/**
 * Create a structured LogApi instance.
 *
 * All log output goes through console with structured formatting.
 * Source attribution via logicTarget when available.
 */
export function createLogApi(options?: LogApiOptions): LogApi {
  const prefix = options?.prefix ?? '[InRepo]';
  const target = options?.logicTarget;
  const source = target ? ` [${target.type}:${target.id}]` : '';

  return {
    info(msg: string, details?: Record<string, unknown>): void {
      if (details) {
        console.log(`${prefix}${source} ${msg}`, details);
      } else {
        console.log(`${prefix}${source} ${msg}`);
      }
    },

    warn(msg: string, details?: Record<string, unknown>): void {
      if (details) {
        console.warn(`${prefix}${source} ${msg}`, details);
      } else {
        console.warn(`${prefix}${source} ${msg}`);
      }
    },

    error(msg: string, details?: Record<string, unknown>): void {
      if (details) {
        console.error(`${prefix}${source} ${msg}`, details);
      } else {
        console.error(`${prefix}${source} ${msg}`);
      }
    },

    event(eventId: string, payload?: Record<string, unknown>): void {
      if (payload) {
        console.log(`${prefix}${source} [event] ${eventId}`, payload);
      } else {
        console.log(`${prefix}${source} [event] ${eventId}`);
      }
    },
  };
}
