/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: SceneHost — the single attach/detach point for InRepo runtime systems.
 *
 * Defines:
 * - SceneHost — owns PresetManager, ApiContext, disposables per scene
 * - SceneHostConfig — configuration for attaching to a scene
 *
 * Ownership:
 * - PresetManager (applies preset systems to the scene)
 * - ApiContext (shared Game API instance bound to the scene)
 * - Disposables (all subscriptions/timers/listeners for clean teardown)
 *
 * SceneHost does NOT own:
 * - Asset loading (Phaser's loader)
 * - Rendering (Phaser)
 * - Scene switching logic
 * - Editor UI
 *
 * Lifecycle:
 * - Attach in Scene.create(), after world objects exist
 * - Shutdown: stop timers, unsubscribe, disable systems (scene can restart)
 * - Destroy: hard dispose everything, free references
 *
 * Apply/Rebuild semantics:
 * - Apply mode: scene-scoped (one per playable scene)
 *
 * Verification:
 * - [ ] Single attach point, single cleanup point
 * - [ ] No shared mutable state between SceneHost instances
 * - [ ] Presets and Blockly share one ApiContext
 * - [ ] dispose() cleans up everything (no leaks)
 */

import type { Disposer, PresetCategorySurface, PresetSurface } from '../types/gameApi';
import type { PresetSavedConfig, PresetCategoryId } from '../types/preset';
import type { PresetApiRegistrar } from './presets/presetInstance';
import { PresetManager } from './presets/presetManager';
import type { PresetRegistry } from './presets/presetRegistry';
import { createApiContext } from './apiContext/createApiContext';
import type { DisposableApiContext } from './apiContext/createApiContext';

/** API version for the current runtime. */
const API_VERSION = '0.1.0';
const SCHEMA_VERSION = 1;

/** Configuration for attaching a SceneHost to a scene. */
export interface SceneHostConfig {
  /** Preset registry (built once at startup). */
  readonly registry: PresetRegistry;
  /** Saved preset configuration (from /game/presets.json). */
  readonly presetConfig: PresetSavedConfig;
  /** Scene identifier (for logging/debugging). */
  readonly sceneId: string;
}

/**
 * SceneHost — the runtime integration point for a playable Phaser scene.
 *
 * Owns PresetManager + ApiContext + disposables.
 * Provides the single attach and cleanup point per scene.
 *
 * Usage:
 * ```ts
 * const host = new SceneHost(config);
 * host.attach();
 * // ... game loop ...
 * host.dispose(); // on scene shutdown/destroy
 * ```
 */
export class SceneHost {
  private readonly presetManager: PresetManager;
  private readonly apiContext: DisposableApiContext;
  private readonly disposables: Disposer[] = [];
  private readonly sceneId: string;
  private disposed = false;

  constructor(config: SceneHostConfig) {
    this.sceneId = config.sceneId;
    this.presetManager = new PresetManager(config.registry);

    // Build PresetSurface that delegates to PresetManager
    const presetSurface = this.buildPresetSurface();

    // Create the shared ApiContext
    this.apiContext = createApiContext({
      meta: {
        apiVersion: API_VERSION,
        schemaVersion: SCHEMA_VERSION,
        logicTarget: { type: 'game', id: 'main', label: 'Game Logic' },
        categories: ['controls', 'movement', 'camera', 'animation'],
        capabilities: {},
      },
      onCall: (commandId, args) => this.presetManager.handleCall(commandId, args),
      onRead: (stateId) => this.presetManager.handleRead(stateId),
      presetSurface,
    });

    // Initialize presets with saved config
    this.presetManager.initialize(config.presetConfig);

    // Register preset APIs into the event bus via a registrar
    const registrar = this.buildRegistrar();
    this.presetManager.registerApi(registrar);
  }

  /** Get the shared ApiContext (for ScriptHost and other consumers). */
  getApiContext(): DisposableApiContext {
    return this.apiContext;
  }

  /** Get the PresetManager (for config changes at runtime). */
  getPresetManager(): PresetManager {
    return this.presetManager;
  }

  /** Get the scene identifier. */
  getSceneId(): string {
    return this.sceneId;
  }

  /** Add a disposer to be called on shutdown. */
  addDisposable(disposer: Disposer): void {
    if (this.disposed) {
      disposer();
      return;
    }
    this.disposables.push(disposer);
  }

  /**
   * Per-frame update. Call from Phaser scene update().
   * Routes to PresetManager for presets that need per-frame updates.
   */
  update(delta: number): void {
    if (this.disposed) return;
    this.presetManager.update(delta);
  }

  /** Whether this SceneHost has been disposed. */
  isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Dispose all resources. Call on scene shutdown or destroy.
   *
   * Disposes in reverse order:
   * 1. External disposables (reverse order)
   * 2. PresetManager
   * 3. ApiContext (timers, event bus)
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Dispose external disposables in reverse order
    for (let i = this.disposables.length - 1; i >= 0; i--) {
      try {
        this.disposables[i]();
      } catch (err) {
        console.error(`[SceneHost:${this.sceneId}] Error disposing resource:`, err);
      }
    }
    this.disposables.length = 0;

    // Dispose preset manager
    this.presetManager.dispose();

    // Dispose ApiContext subsystems (timers, events)
    this.apiContext.dispose();
  }

  // --- Private helpers ---

  private buildPresetSurface(): PresetSurface {
    return {
      getCategory: (categoryId: string): PresetCategorySurface | null => {
        const presetId = this.presetManager.getActivePresetId(
          categoryId as PresetCategoryId,
        );
        if (!presetId) return null;
        return {
          categoryId,
          presetId,
          enabled: true,
        };
      },
      isEnabled: (categoryId: string): boolean => {
        return this.presetManager.isCategoryActive(
          categoryId as PresetCategoryId,
        );
      },
      activePresetId: (categoryId: string): string | null => {
        return this.presetManager.getActivePresetId(
          categoryId as PresetCategoryId,
        );
      },
    };
  }

  private buildRegistrar(): PresetApiRegistrar {
    return {
      registerCommand: (_id: string, _handler: (args: Record<string, unknown>) => unknown) => {
        // Commands are already stored in PresetManager.
        // No additional routing needed at SceneHost level.
      },
      registerState: (_id: string, _getter: () => unknown) => {
        // State getters are already stored in PresetManager.
        // No additional routing needed at SceneHost level.
      },
      emitEvent: (id: string, payload?: Record<string, unknown>) => {
        // Route preset events into the shared EventBus
        this.apiContext.events.emit(id, payload);
      },
    };
  }
}
