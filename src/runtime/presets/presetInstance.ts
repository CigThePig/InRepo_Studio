/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Runtime interface for live preset instances + API registration surface.
 *
 * Defines:
 * - PresetInstance — runtime contract for instantiated presets
 * - PresetFactory — function that creates a PresetInstance from a PresetDefinition
 * - PresetApiRegistrar — registration surface for commands/state/events
 * - PresetRegistryEntry — definition + factory pair stored in the registry
 *
 * Canonical key set:
 * - Keys come from: PresetDefinition (src/types/preset.ts)
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (applyConfig auto-applies at runtime)
 *
 * Verification:
 * - [ ] PresetInstance lifecycle is clear (applyConfig → registerApi → update → dispose)
 * - [ ] PresetApiRegistrar decouples presets from raw ApiContext
 */

import type { PresetDefinition } from '../../types/preset';

/**
 * Registration surface that PresetInstances use to expose
 * commands, state, and events into the Game API.
 *
 * This decouples preset implementations from the full ApiContext.
 * PresetManager creates a registrar that routes registrations
 * into the appropriate ApiContext surfaces.
 */
export interface PresetApiRegistrar {
  /** Register a command handler. Called via api.call(id, args). */
  registerCommand(
    id: string,
    handler: (args: Record<string, unknown>) => unknown,
  ): void;

  /** Register a state getter. Called via api.read(id). */
  registerState(id: string, getter: () => unknown): void;

  /** Emit an event through the event bus. */
  emitEvent(id: string, payload?: Record<string, unknown>): void;
}

/**
 * Runtime interface for a live preset instance.
 *
 * Lifecycle:
 * 1. Factory creates instance from PresetDefinition
 * 2. applyConfig() — apply merged user config
 * 3. registerApi() — register commands/state/events
 * 4. update() — called per frame if defined (optional)
 * 5. dispose() — clean up all resources
 */
export interface PresetInstance {
  /** The definition this instance was created from. */
  readonly definition: PresetDefinition;

  /** Apply merged configuration. Called on init and on config change. */
  applyConfig(config: Record<string, unknown>): void;

  /** Register commands, state getters, and events via the registrar. */
  registerApi(registrar: PresetApiRegistrar): void;

  /** Per-frame update (optional). Only called if defined. */
  update?(delta: number): void;

  /** Dispose all resources: timers, listeners, references. */
  dispose(): void;
}

/**
 * Factory function that creates a PresetInstance from a definition.
 * Each preset def file exports one of these.
 */
export type PresetFactory = (definition: PresetDefinition) => PresetInstance;

/**
 * A registry entry pairs a definition with its factory.
 */
export interface PresetRegistryEntry {
  readonly definition: PresetDefinition;
  readonly factory: PresetFactory;
}
