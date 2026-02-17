/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Scene-scoped runtime references used by preset implementations.
 *
 * Defines:
 * - RuntimeEnv — active scene access contract (scene, player sprite, main camera)
 *
 * Canonical key set:
 * - Keys: scene, getPlayerSprite, getMainCamera
 *
 * Apply/Rebuild semantics:
 * - Apply mode: scene attach/teardown lifecycle (set on load, clear on shutdown)
 */

import type Phaser from 'phaser';
import type { Facing4 } from '@/types';

export interface RuntimeEnv {
  scene: Phaser.Scene;
  getPlayerSprite(): Phaser.GameObjects.Sprite | null;
  getMainCamera(): Phaser.Cameras.Scene2D.Camera;
  /** Resolve an animation id or name to its Phaser runtime key. */
  resolveAnimationKey?(value: string): string | null;
  /** Resolve an animation set id/name + facing to a Phaser runtime key. */
  resolveAnimationSetKey?(setIdOrName: string, facing: Facing4): string | null;
  /** Get the pivot for an animation by its runtime key. */
  getAnimationPivotByKey?(key: string): { x: number; y: number } | null;
}

let currentEnv: RuntimeEnv | null = null;

export function setRuntimeEnv(env: RuntimeEnv): void {
  currentEnv = env;
}

export function clearRuntimeEnv(): void {
  currentEnv = null;
}

export function getRuntimeEnv(): RuntimeEnv | null {
  return currentEnv;
}
