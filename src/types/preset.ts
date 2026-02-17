/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: PresetDefinition schema types — single source of truth for presets.
 *
 * Defines:
 * - PresetDefinition — full preset definition shape (knobs, commands, events, state)
 * - KnobDef — configuration option definition
 * - CommandDef — callable action definition
 * - EventDef — emitted signal definition
 * - StateDef — readable state definition
 * - PresetCompatibility — compatibility/conflict metadata
 * - PresetCategory — category identifiers
 * - PresetSavedConfig — persisted preset configuration (/game/presets.json shape)
 *
 * Canonical key set:
 * - Category IDs: controls, movement, camera, animation, entity-animation
 * - Naming: category prefix on all command/event/state IDs
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (config changes auto-apply at runtime)
 *
 * Verification:
 * - [ ] Every preset declares knobs/commands/events/state
 * - [ ] Compatibility metadata prevents silent conflicts
 * - [ ] Schema compiles with isolatedModules
 */

// --- Preset Categories (v1) ---

export type PresetCategoryId = 'controls' | 'movement' | 'camera' | 'animation' | 'entity-animation';

// --- Knob Types ---

export type KnobType = 'number' | 'boolean' | 'string' | 'enum';

export interface KnobDef {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly type: KnobType;
  readonly default: unknown;
  readonly runtimeSettable?: boolean;
  readonly constraints?: {
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
    readonly options?: readonly string[];
  };
  readonly group?: string;
  readonly advanced?: boolean;
}

// --- Command Types ---

export interface CommandArgDef {
  readonly name: string;
  readonly type: 'number' | 'boolean' | 'string' | 'enum' | 'entityId';
  readonly label: string;
  readonly default?: unknown;
  readonly options?: readonly string[];
  readonly constraints?: {
    readonly min?: number;
    readonly max?: number;
  };
}

export interface CommandDef {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly args: readonly CommandArgDef[];
  readonly keywords?: readonly string[];
  readonly advanced?: boolean;
}

// --- Event Types ---

export interface EventPayloadFieldDef {
  readonly name: string;
  readonly type: 'number' | 'boolean' | 'string';
  readonly label: string;
  readonly description?: string;
}

export interface EventDef {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly payload: readonly EventPayloadFieldDef[];
  readonly keywords?: readonly string[];
  readonly advanced?: boolean;
}

// --- State Types ---

export interface StateDef {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly type: 'number' | 'boolean' | 'string' | 'vec2';
  readonly keywords?: readonly string[];
  readonly advanced?: boolean;
}

// --- Compatibility ---

export interface PresetCompatibility {
  readonly compatibleWith?: readonly string[];
  readonly conflictsWith?: readonly string[];
  readonly suggestedAlternative?: string;
}

// --- PresetDefinition (the full shape) ---

export interface PresetDefinition {
  readonly id: string;
  readonly category: PresetCategoryId;
  readonly label: string;
  readonly description: string;
  readonly version: string;
  readonly tags?: readonly string[];
  readonly recommendedProfiles?: readonly string[];

  readonly knobs: readonly KnobDef[];
  readonly commands: readonly CommandDef[];
  readonly events: readonly EventDef[];
  readonly state: readonly StateDef[];

  readonly compatibility: PresetCompatibility;
}

// --- Persisted Preset Config (/game/presets.json) ---

export interface PresetCategoryConfig {
  readonly enabled: boolean;
  readonly presetId: string;
  readonly config: Record<string, unknown>;
}

export interface PresetSavedConfig {
  readonly formatVersion: number;
  readonly profile: string;
  readonly categories: Record<string, PresetCategoryConfig>;
}
