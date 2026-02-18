/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Define animation types for the project manifest (project.json)
 *
 * Defines:
 * - ProjectAnimationLoopMode — loop mode union (type: lookup)
 * - ProjectAnimationFrame — single frame reference within an animation (type: schema)
 * - ProjectAnimation — compiled animation definition for runtime (type: schema)
 * - Facing4 — cardinal direction union for animation sets (type: lookup) [reserved]
 * - ProjectAnimationSet — directional animation grouping (type: schema) [reserved]
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 *
 * Apply/Rebuild semantics:
 * - Rebuild: animations are compiled at build time via buildProjectPack
 */

// --- Loop Mode ---

export type ProjectAnimationLoopMode = 'loop' | 'once' | 'pingpong';

// --- Animation Frame ---

export interface ProjectAnimationFrame {
  /** Phaser texture key (e.g. "atlas:characters") */
  textureKey: string;
  /** Frame name within the texture (atlas slice name) */
  frame: string;
  /** Per-frame duration override in ms (optional; fps is the default) */
  durationMs?: number;
  /** Per-frame offset from origin (optional) */
  offset?: { x: number; y: number };
}

// --- Compiled Animation ---

export interface ProjectAnimation {
  /** Unique animation id (matches editor AnimationAsset.id) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Playback speed in frames per second */
  fps: number;
  /** Loop behaviour */
  loopMode: ProjectAnimationLoopMode;
  /** Sprite origin override when this animation plays (0..1 range) */
  pivot?: { x: number; y: number };
  /** Ordered list of frames */
  frames: ProjectAnimationFrame[];
  /** Diagnostic: uniform frame size if all frames share the same dimensions */
  frameSize?: { width: number; height: number };
}

// --- Reserved: Directional Animation Sets ---

export type Facing4 = 'down' | 'up' | 'left' | 'right';

export interface ProjectAnimationSet {
  /** Unique set id */
  id: string;
  /** Human-readable name */
  name: string;
  /** Map from facing direction to animation id */
  directions: Partial<Record<Facing4, string>>;
}
