/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: PresetManager — lifecycle engine for preset systems.
 *
 * Defines:
 * - PresetManager — orchestrates preset instantiation, config, API registration, disposal
 * - PresetConflict — detected conflict between active presets
 *
 * Canonical key set:
 * - Category IDs: controls, movement, camera, animation
 * - Lifecycle: initialize → registerApi → updateCategoryConfig → update → dispose
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (config changes auto-apply at runtime)
 *
 * Verification:
 * - [ ] Attaches and disposes without leaks
 * - [ ] Config merging handles missing/unknown keys safely
 * - [ ] Missing presets never crash
 * - [ ] Zero enabled presets is a valid state
 */

import type {
  PresetCategoryId,
  PresetDefinition,
  PresetSavedConfig,
  PresetCategoryConfig,
} from '../../types/preset';
import type { GameProfile } from '../../types/presetDefaults';
import {
  createDefaultPresetConfig,
  mergeCategoryConfig,
} from '../../types/presetDefaults';
import type {
  PresetInstance,
  PresetApiRegistrar,
} from './presetInstance';
import type { PresetRegistry } from './presetRegistry';

/** A detected conflict between two active presets. */
export interface PresetConflict {
  readonly categoryA: PresetCategoryId;
  readonly presetA: string;
  readonly categoryB: PresetCategoryId;
  readonly presetB: string;
  readonly suggestion?: string;
}

/**
 * Extract knob defaults from a PresetDefinition as a flat Record.
 */
function extractKnobDefaults(def: PresetDefinition): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const knob of def.knobs) {
    defaults[knob.id] = knob.default;
  }
  return defaults;
}

/**
 * PresetManager — the runtime engine for preset systems.
 *
 * Lifecycle:
 * 1. Construct with a PresetRegistry
 * 2. initialize(config) — load saved config, instantiate active presets
 * 3. registerApi(registrar) — register all commands/state/events
 * 4. update(delta) — per-frame call for presets that need it
 * 5. dispose() — clean up everything
 *
 * PresetManager is game-wide / global. Not Logic-Target-specific.
 * Both Game Logic and Map Logic scripts share the same PresetManager.
 */
export class PresetManager {
  private readonly registry: PresetRegistry;
  private config: PresetSavedConfig;
  private readonly activeInstances = new Map<PresetCategoryId, PresetInstance>();
  private readonly commandHandlers = new Map<
    string,
    (args: Record<string, unknown>) => unknown
  >();
  private readonly stateGetters = new Map<string, () => unknown>();
  private registrar: PresetApiRegistrar | null = null;
  private disposed = false;

  constructor(registry: PresetRegistry) {
    this.registry = registry;
    this.config = createDefaultPresetConfig();
  }

  /**
   * Initialize with saved config. Instantiates active presets.
   * Safe to call with partial/empty config.
   */
  initialize(config: PresetSavedConfig): void {
    this.config = config;
    this.disposeInstances();
    this.commandHandlers.clear();
    this.stateGetters.clear();

    for (const [categoryId, catConfig] of Object.entries(config.categories)) {
      if (!catConfig.enabled) continue;
      this.instantiateCategory(
        categoryId as PresetCategoryId,
        catConfig,
      );
    }
  }

  /**
   * Register all active preset commands/state/events via the registrar.
   * The registrar routes registrations into the ApiContext.
   */
  registerApi(registrar: PresetApiRegistrar): void {
    this.registrar = registrar;
    for (const instance of this.activeInstances.values()) {
      this.registerInstanceApi(instance, registrar);
    }
  }

  /**
   * Enable or disable a category. Optionally specify which preset to use.
   * If enabling and no presetId given, uses the first available for that category.
   */
  setCategoryEnabled(
    categoryId: PresetCategoryId,
    enabled: boolean,
    presetId?: string,
  ): void {
    if (enabled) {
      const resolvedPresetId =
        presetId ?? this.resolveDefaultPreset(categoryId);
      if (!resolvedPresetId) {
        console.warn(
          `[PresetManager] No preset available for category "${categoryId}"`,
        );
        return;
      }
      const catConfig: PresetCategoryConfig = {
        enabled: true,
        presetId: resolvedPresetId,
        config:
          this.config.categories[categoryId]?.config ?? {},
      };
      this.config = {
        ...this.config,
        categories: {
          ...this.config.categories,
          [categoryId]: catConfig,
        },
      };
      this.instantiateCategory(categoryId, catConfig);
    } else {
      this.disposeCategory(categoryId);
      const existing = this.config.categories[categoryId];
      if (existing) {
        this.config = {
          ...this.config,
          categories: {
            ...this.config.categories,
            [categoryId]: { ...existing, enabled: false },
          },
        };
      }
    }
  }

  /**
   * Update config for a specific category. Merges with current config.
   * Auto-applies to the live instance.
   */
  updateCategoryConfig(
    categoryId: PresetCategoryId,
    newConfig: Record<string, unknown>,
  ): void {
    const existing = this.config.categories[categoryId];
    if (!existing) return;

    const merged = { ...existing.config, ...newConfig };
    this.config = {
      ...this.config,
      categories: {
        ...this.config.categories,
        [categoryId]: { ...existing, config: merged },
      },
    };

    const instance = this.activeInstances.get(categoryId);
    if (instance) {
      const defaults = extractKnobDefaults(instance.definition);
      instance.applyConfig(mergeCategoryConfig(merged, defaults));
    }
  }

  /**
   * Apply a game profile. Returns the new config.
   * Top-down/Platformer profiles enable recommended presets.
   * Custom profile leaves config unchanged.
   */
  applyProfile(
    profile: GameProfile,
    profileRecommendations?: Partial<Record<PresetCategoryId, string>>,
  ): PresetSavedConfig {
    if (profile === 'custom' || !profileRecommendations) {
      this.config = { ...this.config, profile };
      return this.config;
    }

    const categories: Record<string, PresetCategoryConfig> = {};
    for (const [catId, presetId] of Object.entries(profileRecommendations)) {
      if (presetId) {
        categories[catId] = {
          enabled: true,
          presetId,
          config: {},
        };
      }
    }

    this.config = {
      formatVersion: this.config.formatVersion,
      profile,
      categories,
    };

    // Re-initialize with new config
    this.disposeInstances();
    this.commandHandlers.clear();
    this.stateGetters.clear();

    for (const [categoryId, catConfig] of Object.entries(this.config.categories)) {
      if (!catConfig.enabled) continue;
      this.instantiateCategory(categoryId as PresetCategoryId, catConfig);
    }

    if (this.registrar) {
      this.registerApi(this.registrar);
    }

    return this.config;
  }

  /** Get current config for persistence. */
  getConfig(): PresetSavedConfig {
    return this.config;
  }

  /** Get the current profile. */
  getProfile(): string {
    return this.config.profile;
  }

  /**
   * Detect conflicts between active presets.
   * Checks conflictsWith metadata on each active preset's definition.
   */
  getConflicts(): PresetConflict[] {
    const conflicts: PresetConflict[] = [];
    const activeEntries = Array.from(this.activeInstances.entries());

    for (let i = 0; i < activeEntries.length; i++) {
      const [catA, instA] = activeEntries[i];
      const defA = instA.definition;
      if (!defA.compatibility.conflictsWith) continue;

      for (let j = i + 1; j < activeEntries.length; j++) {
        const [catB, instB] = activeEntries[j];
        const defB = instB.definition;

        if (defA.compatibility.conflictsWith.includes(defB.id)) {
          conflicts.push({
            categoryA: catA,
            presetA: defA.id,
            categoryB: catB,
            presetB: defB.id,
            suggestion: defA.compatibility.suggestedAlternative,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Handle a command call. Routes to the registered handler.
   * Returns undefined if command not found.
   */
  handleCall(
    commandId: string,
    args?: Record<string, unknown>,
  ): unknown {
    const handler = this.commandHandlers.get(commandId);
    if (!handler) {
      console.warn(
        `[PresetManager] Unknown command: "${commandId}"`,
      );
      return undefined;
    }
    return handler(args ?? {});
  }

  /**
   * Handle a state read. Routes to the registered getter.
   * Returns undefined if state not found.
   */
  handleRead(stateId: string): unknown {
    const getter = this.stateGetters.get(stateId);
    if (!getter) {
      console.warn(`[PresetManager] Unknown state: "${stateId}"`);
      return undefined;
    }
    return getter();
  }

  /** Check if a category is currently enabled with an active instance. */
  isCategoryActive(categoryId: PresetCategoryId): boolean {
    return this.activeInstances.has(categoryId);
  }

  /** Get the active preset ID for a category, or null. */
  getActivePresetId(categoryId: PresetCategoryId): string | null {
    return this.activeInstances.get(categoryId)?.definition.id ?? null;
  }

  /** Get all registered command IDs. */
  getRegisteredCommands(): string[] {
    return Array.from(this.commandHandlers.keys());
  }

  /** Get all registered state IDs. */
  getRegisteredState(): string[] {
    return Array.from(this.stateGetters.keys());
  }

  /** Per-frame update for presets that need it. */
  update(delta: number): void {
    if (this.disposed) return;
    for (const instance of this.activeInstances.values()) {
      if (instance.update) {
        instance.update(delta);
      }
    }
  }

  /** Dispose all active instances and clear state. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disposeInstances();
    this.commandHandlers.clear();
    this.stateGetters.clear();
    this.registrar = null;
  }

  // --- Private helpers ---

  private instantiateCategory(
    categoryId: PresetCategoryId,
    catConfig: PresetCategoryConfig,
  ): void {
    // Dispose existing instance for this category
    this.disposeCategory(categoryId);

    const entry = this.registry.getById(catConfig.presetId);
    if (!entry) {
      console.warn(
        `[PresetManager] Preset "${catConfig.presetId}" not found in registry for category "${categoryId}", skipping`,
      );
      return;
    }

    const instance = entry.factory(entry.definition);
    const defaults = extractKnobDefaults(entry.definition);
    const merged = mergeCategoryConfig(catConfig.config, defaults);
    instance.applyConfig(merged);

    this.activeInstances.set(categoryId, instance);

    // If registrar is already set, register API immediately
    if (this.registrar) {
      this.registerInstanceApi(instance, this.registrar);
    }
  }

  private registerInstanceApi(
    instance: PresetInstance,
    registrar: PresetApiRegistrar,
  ): void {
    // Create a wrapper registrar that also stores handlers locally
    const wrappedRegistrar: PresetApiRegistrar = {
      registerCommand: (id, handler) => {
        this.commandHandlers.set(id, handler);
        registrar.registerCommand(id, handler);
      },
      registerState: (id, getter) => {
        this.stateGetters.set(id, getter);
        registrar.registerState(id, getter);
      },
      emitEvent: (id, payload) => {
        registrar.emitEvent(id, payload);
      },
    };

    instance.registerApi(wrappedRegistrar);
  }

  private disposeCategory(categoryId: PresetCategoryId): void {
    const existing = this.activeInstances.get(categoryId);
    if (existing) {
      // Remove commands/state registered by this instance
      for (const cmd of existing.definition.commands) {
        this.commandHandlers.delete(cmd.id);
      }
      for (const st of existing.definition.state) {
        this.stateGetters.delete(st.id);
      }
      existing.dispose();
      this.activeInstances.delete(categoryId);
    }
  }

  private disposeInstances(): void {
    for (const instance of this.activeInstances.values()) {
      instance.dispose();
    }
    this.activeInstances.clear();
  }

  private resolveDefaultPreset(
    categoryId: PresetCategoryId,
  ): string | null {
    const entries = this.registry.getByCategory(categoryId);
    return entries.length > 0 ? entries[0].definition.id : null;
  }
}
