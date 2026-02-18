/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Schema-driven Blockly block generation from PresetDefinition schemas.
 *
 * Defines:
 * - BlockDefinition — Blockly JSON block definition shape
 * - BlockPackEntry — single block with definition, generator, dependency, keywords
 * - BlockPack — all blocks generated from one PresetDefinition
 * - generateBlockPack() — deterministic PresetDefinition → BlockPack converter
 *
 * Canonical key set:
 * - Block type IDs: inrepo_when_<eventId>, inrepo_do_<commandId>,
 *   inrepo_get_<stateId>, inrepo_event_<eventId>_<fieldName>
 * - STABLE: block type IDs must never change once released
 *
 * Apply/Rebuild semantics:
 * - Apply mode: runtime generation in editor (Option A per Part 14)
 *
 * Verification:
 * - [ ] Deterministic block generation from any PresetDefinition
 * - [ ] All codegen uses Game API surface only
 * - [ ] Block type IDs follow stable naming rules
 * - [ ] Arg UI matches Part 14 rules (boolean→checkbox, enum→dropdown, etc.)
 */

import type {
  PresetDefinition,
  PresetCategoryId,
  EventDef,
  EventPayloadFieldDef,
  CommandDef,
  CommandArgDef,
  StateDef,
} from '../../types/preset';
import {
  codegenEventHandler,
  codegenCommandCall,
  codegenStateRead,
  codegenPayloadFieldAccess,
  escapeJsString,
} from './codegenRules';

// --- Category colors (hue, 0-360) ---

const CATEGORY_COLOURS: Record<PresetCategoryId, number> = {
  controls: 210,
  movement: 160,
  camera: 30,
  animation: 290,
  'entity-animation': 290,
};

const DEFAULT_COLOUR = 230;

// --- Block type ID builders (stable, never change) ---

export function hatBlockType(eventId: string): string {
  return `inrepo_when_${eventId}`;
}

export function payloadFieldBlockType(
  eventId: string,
  fieldName: string,
): string {
  return `inrepo_event_${eventId}_${fieldName}`;
}

export function commandBlockType(commandId: string): string {
  return `inrepo_do_${commandId}`;
}

export function stateBlockType(stateId: string): string {
  return `inrepo_get_${stateId}`;
}

// --- Blockly-compatible types ---

/** Minimal Blockly JSON block definition shape (subset of Blockly.BlockDefinition). */
export interface BlockDefinition {
  readonly type: string;
  readonly message0: string;
  readonly args0?: readonly BlocklyArg[];
  readonly output?: string | null;
  readonly previousStatement?: string | null;
  readonly nextStatement?: string | null;
  readonly colour: number;
  readonly tooltip: string;
  readonly helpUrl: string;
}

/** Blockly field/input argument. */
export interface BlocklyArg {
  readonly type: string;
  readonly name: string;
  readonly text?: string;
  readonly check?: string | string[];
  readonly options?: readonly (readonly [string, string])[];
  readonly value?: unknown;
  readonly min?: number;
  readonly max?: number;
  readonly precision?: number;
}

// --- Block pack types ---

/** Dependency metadata carried by each block. */
export interface BlockDependency {
  readonly requiresCategoryEnabled: string;
  readonly requiresPresetId?: string;
}

/**
 * Generator function signature.
 * For statement blocks: returns a code string.
 * For value (reporter) blocks: returns [code, precedence].
 */
export type BlockGenerator = (
  block: unknown,
  generator: unknown,
) => string | [string, number];

/** Single block with all metadata. */
export interface BlockPackEntry {
  readonly definition: BlockDefinition;
  readonly generator: BlockGenerator;
  readonly dependency: BlockDependency;
  readonly keywords: readonly string[];
  readonly advanced: boolean;
  readonly logicTargetFilter: 'game' | 'map' | null;
  readonly blockFamily: 'event' | 'payload' | 'command' | 'state';
}

/** All blocks generated from one PresetDefinition. */
export interface BlockPack {
  readonly entries: readonly BlockPackEntry[];
  readonly categoryId: string;
  readonly presetId: string;
}

// --- Blockly codegen order of operations constants ---

/** Blockly ORDER_ATOMIC (highest precedence). */
const ORDER_ATOMIC = 0;
/** Blockly ORDER_FUNCTION_CALL. */
const ORDER_FUNCTION_CALL = 2;
/** Blockly ORDER_NONE (lowest precedence). */
const ORDER_NONE = 99;

// --- Main entry point ---

/**
 * Generate a complete BlockPack from a PresetDefinition.
 *
 * Deterministic: same input always produces the same output.
 * Follows Part 14 rules for block families, codegen, naming, and dependency.
 */
export function generateBlockPack(preset: PresetDefinition): BlockPack {
  const entries: BlockPackEntry[] = [];

  // Events → hat blocks + payload field reporters
  for (const event of preset.events) {
    const eventEntries = generateEventBlocks(event, preset);
    entries.push(...eventEntries);
  }

  // Commands → action blocks
  for (const command of preset.commands) {
    entries.push(generateCommandBlock(command, preset));
  }

  // State → reporter blocks
  for (const state of preset.state) {
    entries.push(generateStateBlock(state, preset));
  }

  return {
    entries,
    categoryId: preset.category,
    presetId: preset.id,
  };
}

// --- Event hat blocks ---

function generateEventBlocks(
  event: EventDef,
  preset: PresetDefinition,
): BlockPackEntry[] {
  const result: BlockPackEntry[] = [];
  const colour = CATEGORY_COLOURS[preset.category] ?? DEFAULT_COLOUR;
  const dependency: BlockDependency = {
    requiresCategoryEnabled: preset.category,
    requiresPresetId: preset.id,
  };

  // Hat block: "When <event label>"
  const hatDef: BlockDefinition = {
    type: hatBlockType(event.id),
    message0: `🎩 ${event.label} %1`,
    args0: [
      {
        type: 'input_statement',
        name: 'DO',
      },
    ],
    colour,
    tooltip: event.description,
    helpUrl: '',
  };

  const hatGenerator: BlockGenerator = (block, generator) => {
    const gen = generator as { statementToCode?: (b: unknown, n: string) => string };
    const statementsCode = gen.statementToCode?.(block, 'DO') ?? '';
    return codegenEventHandler(event.id, statementsCode);
  };

  result.push({
    definition: hatDef,
    generator: hatGenerator,
    dependency,
    keywords: [...(event.keywords ?? []), event.label.toLowerCase()],
    advanced: event.advanced ?? false,
    logicTargetFilter: null,
    blockFamily: 'event',
  });

  // Payload field reporters
  for (const field of event.payload) {
    result.push(generatePayloadFieldBlock(event, field, preset));
  }

  return result;
}

function generatePayloadFieldBlock(
  event: EventDef,
  field: EventPayloadFieldDef,
  preset: PresetDefinition,
): BlockPackEntry {
  const colour = CATEGORY_COLOURS[preset.category] ?? DEFAULT_COLOUR;
  const outputType = mapPayloadTypeToBlocklyOutput(field.type);

  const def: BlockDefinition = {
    type: payloadFieldBlockType(event.id, field.name),
    message0: `${field.label}`,
    output: outputType,
    colour,
    tooltip: field.description ?? `${field.label} from ${event.label} event`,
    helpUrl: '',
  };

  const generator: BlockGenerator = () => {
    return [codegenPayloadFieldAccess(field.name), ORDER_ATOMIC];
  };

  return {
    definition: def,
    generator,
    dependency: {
      requiresCategoryEnabled: preset.category,
    },
    keywords: [field.name, field.label.toLowerCase()],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'payload',
  };
}

// --- Command action blocks ---

function generateCommandBlock(
  command: CommandDef,
  preset: PresetDefinition,
): BlockPackEntry {
  const colour = CATEGORY_COLOURS[preset.category] ?? DEFAULT_COLOUR;
  const { message, args } = buildCommandMessage(command);

  const def: BlockDefinition = {
    type: commandBlockType(command.id),
    message0: message,
    args0: args.length > 0 ? args : undefined,
    previousStatement: null,
    nextStatement: null,
    colour,
    tooltip: command.description,
    helpUrl: '',
  };

  const generator: BlockGenerator = (block, generator) => {
    const argEntries: [string, string][] = [];
    const gen = generator as {
      valueToCode?: (b: unknown, n: string, order: number) => string;
      getFieldValue?: never;
    };

    for (const arg of command.args) {
      const fieldName = argFieldName(arg.name);
      const valueCode = resolveArgValue(block, gen, arg, fieldName);
      argEntries.push([arg.name, valueCode]);
    }

    return codegenCommandCall(command.id, argEntries);
  };

  return {
    definition: def,
    generator,
    dependency: {
      requiresCategoryEnabled: preset.category,
      requiresPresetId: preset.id,
    },
    keywords: [...(command.keywords ?? []), command.label.toLowerCase()],
    advanced: command.advanced ?? false,
    logicTargetFilter: null,
    blockFamily: 'command',
  };
}

// --- State reporter blocks ---

function generateStateBlock(
  state: StateDef,
  preset: PresetDefinition,
): BlockPackEntry {
  const colour = CATEGORY_COLOURS[preset.category] ?? DEFAULT_COLOUR;
  const outputType = mapStateTypeToBlocklyOutput(state.type);

  const def: BlockDefinition = {
    type: stateBlockType(state.id),
    message0: state.label,
    output: outputType,
    colour,
    tooltip: state.description,
    helpUrl: '',
  };

  const generator: BlockGenerator = () => {
    return [codegenStateRead(state.id), ORDER_FUNCTION_CALL];
  };

  return {
    definition: def,
    generator,
    dependency: {
      requiresCategoryEnabled: preset.category,
      requiresPresetId: preset.id,
    },
    keywords: [...(state.keywords ?? []), state.label.toLowerCase()],
    advanced: state.advanced ?? false,
    logicTargetFilter: null,
    blockFamily: 'state',
  };
}

// --- Helpers: command arg UI mapping ---

function argFieldName(argName: string): string {
  return `ARG_${argName.toUpperCase()}`;
}

function buildCommandMessage(
  command: CommandDef,
): { message: string; args: BlocklyArg[] } {
  if (command.args.length === 0) {
    return { message: command.label, args: [] };
  }

  const parts: string[] = [command.label];
  const args: BlocklyArg[] = [];

  for (let i = 0; i < command.args.length; i++) {
    const arg = command.args[i];
    const fieldName = argFieldName(arg.name);
    parts.push(`${arg.label}: %${i + 1}`);
    args.push(mapArgToBlocklyField(arg, fieldName));
  }

  return { message: parts.join(' '), args };
}

/**
 * Map a CommandArgDef to a Blockly field/input spec.
 *
 * Per Part 14.2:
 * - boolean → checkbox toggle field
 * - enum → dropdown field
 * - number → number input with validator + optional slider
 * - entityId → text input (v1; dynamic dropdown in future track)
 * - string → text field
 */
function mapArgToBlocklyField(
  arg: CommandArgDef,
  fieldName: string,
): BlocklyArg {
  switch (arg.type) {
    case 'boolean':
      return {
        type: 'field_checkbox',
        name: fieldName,
        value: arg.default === true ? 'TRUE' : 'FALSE',
      };

    case 'enum':
      return {
        type: 'field_dropdown',
        name: fieldName,
        options:
          arg.options?.map((opt) => [opt, opt] as readonly [string, string]) ??
          [],
      };

    case 'number':
      return {
        type: 'field_number',
        name: fieldName,
        value: (arg.default as number) ?? 0,
        min: arg.constraints?.min,
        max: arg.constraints?.max,
      };

    case 'entityId':
      return {
        type: 'field_input',
        name: fieldName,
        text: (arg.default as string) ?? '',
      };

    case 'string':
      return {
        type: 'field_input',
        name: fieldName,
        text: (arg.default as string) ?? '',
      };

    default:
      return {
        type: 'field_input',
        name: fieldName,
        text: '',
      };
  }
}

/**
 * Resolve a command arg value from the block at codegen time.
 * For field types (checkbox, dropdown, number, text) use getFieldValue.
 * For input types (value inputs) use valueToCode.
 */
function resolveArgValue(
  block: unknown,
  generator: { valueToCode?: (b: unknown, n: string, order: number) => string },
  arg: CommandArgDef,
  fieldName: string,
): string {
  const b = block as { getFieldValue?: (name: string) => unknown };

  switch (arg.type) {
    case 'boolean': {
      const val = b.getFieldValue?.(fieldName);
      return val === 'TRUE' ? 'true' : 'false';
    }

    case 'enum': {
      const val = b.getFieldValue?.(fieldName) as string | undefined;
      return `'${escapeJsString(val ?? '')}'`;
    }

    case 'number': {
      const val = b.getFieldValue?.(fieldName);
      const num = Number(val);
      return isNaN(num) ? '0' : String(num);
    }

    case 'entityId':
    case 'string': {
      if (generator.valueToCode) {
        return (
          generator.valueToCode(block, fieldName, ORDER_NONE) || `''`
        );
      }
      const val = b.getFieldValue?.(fieldName) as string | undefined;
      return `'${escapeJsString(val ?? '')}'`;
    }

    default:
      return 'undefined';
  }
}

// --- Helpers: type mapping ---

function mapPayloadTypeToBlocklyOutput(
  type: EventPayloadFieldDef['type'],
): string {
  switch (type) {
    case 'boolean':
      return 'Boolean';
    case 'number':
      return 'Number';
    case 'string':
      return 'String';
    default:
      return 'String';
  }
}

function mapStateTypeToBlocklyOutput(type: StateDef['type']): string {
  switch (type) {
    case 'boolean':
      return 'Boolean';
    case 'number':
      return 'Number';
    case 'string':
      return 'String';
    case 'vec2':
      // v1: vec2 returns as generic (users use helper blocks for x/y)
      return 'Number';
    default:
      return 'String';
  }
}
