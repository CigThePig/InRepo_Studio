/**
 * Core block definitions: Variables category.
 *
 * Get variable and set variable blocks.
 * Uses Blockly's built-in variable model for codegen.
 * Generates pure JavaScript variable references.
 */

import type {
  BlockDefinition,
  BlockPackEntry,
  BlockDependency,
  BlockGenerator,
  BlockPack,
} from '../schemaToBlocks';
import { escapeJsString } from '../codegenRules';

const COLOUR = 330; // red/magenta

const CORE_DEPENDENCY: BlockDependency = {
  requiresCategoryEnabled: '__core',
};

const ORDER_ATOMIC = 0;
const ORDER_ASSIGNMENT = 16;

// --- Get variable ---

const getVarDef: BlockDefinition = {
  type: 'inrepo_variables_get',
  message0: '%1',
  args0: [{ type: 'field_input', name: 'VAR', text: 'myVar' }],
  output: null,
  colour: COLOUR,
  tooltip: 'Get the value of a variable.',
  helpUrl: '',
};

const getVarGen: BlockGenerator = (block) => {
  const b = block as { getFieldValue?: (name: string) => string };
  const varName = b.getFieldValue?.('VAR') ?? 'myVar';
  const safeName = sanitizeVarName(varName);
  return [safeName, ORDER_ATOMIC];
};

// --- Set variable ---

const setVarDef: BlockDefinition = {
  type: 'inrepo_variables_set',
  message0: 'set %1 to %2',
  args0: [
    { type: 'field_input', name: 'VAR', text: 'myVar' },
    { type: 'input_value', name: 'VALUE' },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: COLOUR,
  tooltip: 'Set a variable to a value.',
  helpUrl: '',
};

const setVarGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
  };
  const b = block as { getFieldValue?: (name: string) => string };
  const varName = b.getFieldValue?.('VAR') ?? 'myVar';
  const safeName = sanitizeVarName(varName);
  const value = gen.valueToCode?.(block, 'VALUE', ORDER_ASSIGNMENT) || '0';
  return `${safeName} = ${value};\n`;
};

// --- Helpers ---

/**
 * Sanitize a user-provided variable name into a valid JS identifier.
 * Prefixes with `v_` to avoid keyword collisions and replaces invalid chars.
 */
function sanitizeVarName(name: string): string {
  const clean = escapeJsString(name).replace(/[^a-zA-Z0-9_$]/g, '_');
  return `v_${clean || 'unnamed'}`;
}

// --- Pack ---

const entries: BlockPackEntry[] = [
  {
    definition: getVarDef,
    generator: getVarGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['variable', 'get', 'read', 'value'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'state',
  },
  {
    definition: setVarDef,
    generator: setVarGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['variable', 'set', 'assign', 'store'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'command',
  },
];

export const coreBlockPack: BlockPack = {
  entries,
  categoryId: 'variables',
  presetId: '__core_variables',
};
