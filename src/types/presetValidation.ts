/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Validation utilities for PresetDefinition schemas.
 *
 * Defines:
 * - validatePresetDefinition — checks a definition has all required surfaces
 * - validateKnobDef — checks a single knob definition
 * - validateCommandDef — checks a single command definition
 * - validateEventDef — checks a single event definition
 * - validateStateDef — checks a single state definition
 * - validatePresetSavedConfig — checks saved config shape
 *
 * Canonical key set:
 * - Validates against types from ./preset.ts
 *
 * Apply/Rebuild semantics:
 * - Apply mode: build-time validation (no runtime rebuild)
 *
 * Verification:
 * - [ ] Rejects definitions missing required surfaces
 * - [ ] Accepts well-formed definitions
 * - [ ] Returns meaningful error messages
 */

import type {
  PresetDefinition,
  PresetCategoryId,
  KnobDef,
  KnobType,
  CommandDef,
  EventDef,
  StateDef,
  PresetSavedConfig,
} from './preset';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_CATEGORIES: readonly PresetCategoryId[] = [
  'controls',
  'movement',
  'camera',
  'animation',
];

const VALID_KNOB_TYPES: readonly KnobType[] = [
  'number',
  'boolean',
  'string',
  'enum',
];

const VALID_ARG_TYPES = [
  'number',
  'boolean',
  'string',
  'enum',
  'entityId',
] as const;

const VALID_STATE_TYPES = ['number', 'boolean', 'string', 'vec2'] as const;

const VALID_PAYLOAD_TYPES = ['number', 'boolean', 'string'] as const;

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.length > 0;
}

function isArray(val: unknown): val is readonly unknown[] {
  return Array.isArray(val);
}

/** Validate a KnobDef. */
export function validateKnobDef(knob: unknown): ValidationResult {
  const errors: string[] = [];
  if (!knob || typeof knob !== 'object') {
    return { valid: false, errors: ['KnobDef must be an object'] };
  }
  const k = knob as Record<string, unknown>;
  if (!isNonEmptyString(k.id)) errors.push('KnobDef.id is required');
  if (!isNonEmptyString(k.label)) errors.push('KnobDef.label is required');
  if (!isNonEmptyString(k.description))
    errors.push('KnobDef.description is required');
  if (!VALID_KNOB_TYPES.includes(k.type as KnobType))
    errors.push(`KnobDef.type must be one of: ${VALID_KNOB_TYPES.join(', ')}`);
  if (k.default === undefined) errors.push('KnobDef.default is required');
  if (
    k.type === 'enum' &&
    (!k.constraints ||
      typeof k.constraints !== 'object' ||
      !isArray((k.constraints as Record<string, unknown>).options) ||
      ((k.constraints as Record<string, unknown>).options as unknown[])
        .length === 0)
  ) {
    errors.push('Enum knob must have constraints.options with at least one value');
  }
  return { valid: errors.length === 0, errors };
}

/** Validate a CommandDef. */
export function validateCommandDef(cmd: unknown): ValidationResult {
  const errors: string[] = [];
  if (!cmd || typeof cmd !== 'object') {
    return { valid: false, errors: ['CommandDef must be an object'] };
  }
  const c = cmd as Record<string, unknown>;
  if (!isNonEmptyString(c.id)) errors.push('CommandDef.id is required');
  if (!isNonEmptyString(c.label)) errors.push('CommandDef.label is required');
  if (!isNonEmptyString(c.description))
    errors.push('CommandDef.description is required');
  if (!isArray(c.args)) {
    errors.push('CommandDef.args must be an array');
  } else {
    for (let i = 0; i < c.args.length; i++) {
      const arg = c.args[i] as Record<string, unknown>;
      if (!isNonEmptyString(arg.name))
        errors.push(`CommandDef.args[${i}].name is required`);
      if (!VALID_ARG_TYPES.includes(arg.type as (typeof VALID_ARG_TYPES)[number]))
        errors.push(
          `CommandDef.args[${i}].type must be one of: ${VALID_ARG_TYPES.join(', ')}`,
        );
      if (!isNonEmptyString(arg.label))
        errors.push(`CommandDef.args[${i}].label is required`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Validate an EventDef. */
export function validateEventDef(evt: unknown): ValidationResult {
  const errors: string[] = [];
  if (!evt || typeof evt !== 'object') {
    return { valid: false, errors: ['EventDef must be an object'] };
  }
  const e = evt as Record<string, unknown>;
  if (!isNonEmptyString(e.id)) errors.push('EventDef.id is required');
  if (!isNonEmptyString(e.label)) errors.push('EventDef.label is required');
  if (!isNonEmptyString(e.description))
    errors.push('EventDef.description is required');
  if (!isArray(e.payload)) {
    errors.push('EventDef.payload must be an array');
  } else {
    for (let i = 0; i < e.payload.length; i++) {
      const field = e.payload[i] as Record<string, unknown>;
      if (!isNonEmptyString(field.name))
        errors.push(`EventDef.payload[${i}].name is required`);
      if (
        !VALID_PAYLOAD_TYPES.includes(
          field.type as (typeof VALID_PAYLOAD_TYPES)[number],
        )
      )
        errors.push(
          `EventDef.payload[${i}].type must be one of: ${VALID_PAYLOAD_TYPES.join(', ')}`,
        );
      if (!isNonEmptyString(field.label))
        errors.push(`EventDef.payload[${i}].label is required`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Validate a StateDef. */
export function validateStateDef(st: unknown): ValidationResult {
  const errors: string[] = [];
  if (!st || typeof st !== 'object') {
    return { valid: false, errors: ['StateDef must be an object'] };
  }
  const s = st as Record<string, unknown>;
  if (!isNonEmptyString(s.id)) errors.push('StateDef.id is required');
  if (!isNonEmptyString(s.label)) errors.push('StateDef.label is required');
  if (!isNonEmptyString(s.description))
    errors.push('StateDef.description is required');
  if (
    !VALID_STATE_TYPES.includes(s.type as (typeof VALID_STATE_TYPES)[number])
  )
    errors.push(
      `StateDef.type must be one of: ${VALID_STATE_TYPES.join(', ')}`,
    );
  return { valid: errors.length === 0, errors };
}

/** Validate a full PresetDefinition. */
export function validatePresetDefinition(def: unknown): ValidationResult {
  const errors: string[] = [];
  if (!def || typeof def !== 'object') {
    return { valid: false, errors: ['PresetDefinition must be an object'] };
  }
  const d = def as Record<string, unknown>;

  // Required string fields
  if (!isNonEmptyString(d.id)) errors.push('PresetDefinition.id is required');
  if (!VALID_CATEGORIES.includes(d.category as PresetCategoryId))
    errors.push(
      `PresetDefinition.category must be one of: ${VALID_CATEGORIES.join(', ')}`,
    );
  if (!isNonEmptyString(d.label))
    errors.push('PresetDefinition.label is required');
  if (!isNonEmptyString(d.description))
    errors.push('PresetDefinition.description is required');
  if (!isNonEmptyString(d.version))
    errors.push('PresetDefinition.version is required');

  // Four surfaces must be arrays
  if (!isArray(d.knobs)) {
    errors.push('PresetDefinition.knobs must be an array');
  } else {
    for (let i = 0; i < d.knobs.length; i++) {
      const result = validateKnobDef(d.knobs[i]);
      errors.push(...result.errors.map((e) => `knobs[${i}]: ${e}`));
    }
  }

  if (!isArray(d.commands)) {
    errors.push('PresetDefinition.commands must be an array');
  } else {
    for (let i = 0; i < d.commands.length; i++) {
      const result = validateCommandDef(d.commands[i]);
      errors.push(...result.errors.map((e) => `commands[${i}]: ${e}`));
    }
  }

  if (!isArray(d.events)) {
    errors.push('PresetDefinition.events must be an array');
  } else {
    for (let i = 0; i < d.events.length; i++) {
      const result = validateEventDef(d.events[i]);
      errors.push(...result.errors.map((e) => `events[${i}]: ${e}`));
    }
  }

  if (!isArray(d.state)) {
    errors.push('PresetDefinition.state must be an array');
  } else {
    for (let i = 0; i < d.state.length; i++) {
      const result = validateStateDef(d.state[i]);
      errors.push(...result.errors.map((e) => `state[${i}]: ${e}`));
    }
  }

  // Compatibility
  if (!d.compatibility || typeof d.compatibility !== 'object') {
    errors.push('PresetDefinition.compatibility must be an object');
  }

  // ID naming convention: should use category prefix
  if (
    isNonEmptyString(d.id) &&
    VALID_CATEGORIES.includes(d.category as PresetCategoryId)
  ) {
    const prefix = `${d.category as string}-`;
    if (!(d.id as string).startsWith(prefix)) {
      errors.push(
        `PresetDefinition.id "${d.id}" should start with category prefix "${prefix}"`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Validate a PresetSavedConfig (/game/presets.json). */
export function validatePresetSavedConfig(
  config: unknown,
): ValidationResult {
  const errors: string[] = [];
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['PresetSavedConfig must be an object'] };
  }
  const c = config as Record<string, unknown>;

  if (typeof c.formatVersion !== 'number' || c.formatVersion < 1) {
    errors.push('PresetSavedConfig.formatVersion must be a positive number');
  }
  if (!isNonEmptyString(c.profile)) {
    errors.push('PresetSavedConfig.profile is required');
  }
  if (!c.categories || typeof c.categories !== 'object') {
    errors.push('PresetSavedConfig.categories must be an object');
  } else {
    for (const [key, val] of Object.entries(
      c.categories as Record<string, unknown>,
    )) {
      if (!val || typeof val !== 'object') {
        errors.push(`categories.${key} must be an object`);
        continue;
      }
      const cat = val as Record<string, unknown>;
      if (typeof cat.enabled !== 'boolean')
        errors.push(`categories.${key}.enabled must be a boolean`);
      if (!isNonEmptyString(cat.presetId))
        errors.push(`categories.${key}.presetId is required`);
      if (!cat.config || typeof cat.config !== 'object')
        errors.push(`categories.${key}.config must be an object`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Type guard: checks if a validated object is a PresetDefinition.
 * Use after validatePresetDefinition returns valid: true.
 */
export function isPresetDefinition(val: unknown): val is PresetDefinition {
  return validatePresetDefinition(val).valid;
}

// Re-export types used in validation results for convenience
export type {
  PresetDefinition,
  KnobDef,
  CommandDef,
  EventDef,
  StateDef,
  PresetSavedConfig,
};
