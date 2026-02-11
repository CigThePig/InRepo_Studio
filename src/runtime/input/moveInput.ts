/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Shared movement intent vector for mobile/virtual input.
 *
 * Defines:
 * - MoveVectorState — current normalized input vector (x/y)
 *
 * Canonical key set:
 * - Keys: x, y
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live mutable state (updated by playtest overlay pointer events)
 */

export interface MoveVector {
  x: number;
  y: number;
}

const ZERO_VECTOR: MoveVector = { x: 0, y: 0 };
let currentMoveVector: MoveVector = { ...ZERO_VECTOR };

export function setMoveVector(v: MoveVector): void {
  currentMoveVector = {
    x: Number.isFinite(v.x) ? v.x : 0,
    y: Number.isFinite(v.y) ? v.y : 0,
  };
}

export function getMoveVector(): MoveVector {
  return { ...currentMoveVector };
}

export function clearMoveVector(): void {
  currentMoveVector = { ...ZERO_VECTOR };
}
