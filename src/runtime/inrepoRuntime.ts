/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Top-level InRepo runtime entry point for attaching to Phaser scenes.
 *
 * Defines:
 * - InRepoRuntime — static attach/detach helper
 * - Scene eligibility check
 *
 * Usage:
 * ```ts
 * // In Scene.create():
 * const host = new SceneHost({ registry, presetConfig, sceneId });
 * InRepoRuntime.attach(scene, host);
 * ```
 *
 * Apply/Rebuild semantics:
 * - Apply mode: called once per scene create
 *
 * Verification:
 * - [ ] attach() creates SceneHost and stores it on the scene
 * - [ ] detach() disposes and removes SceneHost
 * - [ ] Ineligible scenes are rejected
 * - [ ] Double-attach is prevented
 */

import { SceneHost } from './sceneHost';

/** Key used to store SceneHost on scene data. */
const SCENE_HOST_KEY = '__inrepoSceneHost';

/**
 * Check if a Phaser scene is eligible for InRepo runtime attachment.
 *
 * v1 eligibility rule:
 * - Scene has data key 'inrepoRole' set to 'play', OR
 * - Caller explicitly opts in (no check needed — attach is explicit in v1)
 *
 * In v1 with explicit attach, this is mainly a guard against double-attach
 * and attaching to destroyed scenes.
 */
function isEligible(scene: { sys?: { settings?: { key?: string }; isActive?: () => boolean } }): boolean {
  // Guard: scene must have sys
  if (!scene.sys) return false;
  // Guard: scene must be active
  if (scene.sys.isActive && !scene.sys.isActive()) return false;
  return true;
}

/**
 * InRepoRuntime — static entry point for runtime attachment.
 *
 * v1 uses explicit attach in Scene.create().
 * Future versions may use a Phaser plugin for auto-attach.
 */
export const InRepoRuntime = {
  /**
   * Attach InRepo runtime to a Phaser scene.
   *
   * Creates a SceneHost that owns PresetManager + ApiContext.
   * Call in Scene.create() after world objects are created.
   *
   * Returns the SceneHost for direct access if needed.
   */
  attach(
    scene: {
      sys?: {
        settings?: { key?: string };
        isActive?: () => boolean;
      };
      data?: { get(key: string): unknown; set(key: string, value: unknown): void };
      events?: {
        on(event: string, fn: () => void): void;
      };
    },
    host: SceneHost,
  ): SceneHost | null {
    if (!isEligible(scene)) {
      console.warn('[InRepoRuntime] Scene is not eligible for attachment');
      return null;
    }

    // Prevent double-attach
    if (scene.data?.get(SCENE_HOST_KEY)) {
      console.warn('[InRepoRuntime] Scene already has a SceneHost attached');
      return null;
    }

    // Store on scene data for retrieval
    scene.data?.set(SCENE_HOST_KEY, host);

    // Auto-dispose on scene shutdown and destroy
    if (scene.events) {
      scene.events.on('shutdown', () => {
        host.dispose();
        scene.data?.set(SCENE_HOST_KEY, undefined);
      });
      scene.events.on('destroy', () => {
        if (!host.isDisposed()) {
          host.dispose();
        }
        scene.data?.set(SCENE_HOST_KEY, undefined);
      });
    }

    return host;
  },

  /**
   * Get the SceneHost attached to a scene, if any.
   */
  getHost(scene: {
    data?: { get(key: string): unknown };
  }): SceneHost | null {
    const host = scene.data?.get(SCENE_HOST_KEY);
    if (host instanceof SceneHost) return host;
    return null;
  },

  /**
   * Detach and dispose the SceneHost from a scene.
   */
  detach(scene: {
    data?: { get(key: string): unknown; set(key: string, value: unknown): void };
  }): void {
    const host = scene.data?.get(SCENE_HOST_KEY);
    if (host instanceof SceneHost) {
      host.dispose();
      scene.data?.set(SCENE_HOST_KEY, undefined);
    }
  },
};
