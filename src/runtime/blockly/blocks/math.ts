/**
 * Core block definitions: Math category.
 *
 * Number literal, arithmetic, rounding, random integer, modulo.
 * These generate pure JavaScript — no api.* calls needed.
 */

import type {
  BlockDefinition,
  BlockPackEntry,
  BlockDependency,
  BlockGenerator,
  BlockPack,
} from '../schemaToBlocks';

const COLOUR = 230; // indigo

const CORE_DEPENDENCY: BlockDependency = {
  requiresCategoryEnabled: '__core',
};

/** Blockly ORDER constants for JS operator precedence. */
const ORDER_ATOMIC = 0;
const ORDER_UNARY_NEGATION = 4.3;
const ORDER_MULTIPLICATION = 5.1;
const ORDER_ADDITION = 6.1;
const ORDER_FUNCTION_CALL = 2;
const ORDER_NONE = 99;

// --- Number literal ---

const numberDef: BlockDefinition = {
  type: 'inrepo_math_number',
  message0: '%1',
  args0: [{ type: 'field_number', name: 'NUM', value: 0 }],
  output: 'Number',
  colour: COLOUR,
  tooltip: 'A number.',
  helpUrl: '',
};

const numberGen: BlockGenerator = (block) => {
  const b = block as { getFieldValue?: (name: string) => unknown };
  const num = Number(b.getFieldValue?.('NUM'));
  const val = isNaN(num) ? 0 : num;
  return [String(val), ORDER_ATOMIC];
};

// --- Arithmetic (+, -, *, /, ^) ---

const ARITH_OPS: readonly (readonly [string, string])[] = [
  ['+', 'ADD'],
  ['\u2212', 'MINUS'],
  ['\u00D7', 'MULTIPLY'],
  ['\u00F7', 'DIVIDE'],
  ['^', 'POWER'],
];

const ARITH_JS: Record<string, string> = {
  ADD: '+',
  MINUS: '-',
  MULTIPLY: '*',
  DIVIDE: '/',
  POWER: '**',
};

const ARITH_ORDER: Record<string, number> = {
  ADD: ORDER_ADDITION,
  MINUS: ORDER_ADDITION,
  MULTIPLY: ORDER_MULTIPLICATION,
  DIVIDE: ORDER_MULTIPLICATION,
  POWER: ORDER_UNARY_NEGATION,
};

const arithmeticDef: BlockDefinition = {
  type: 'inrepo_math_arithmetic',
  message0: '%1 %2 %3',
  args0: [
    { type: 'input_value', name: 'A', check: 'Number' },
    { type: 'field_dropdown', name: 'OP', options: ARITH_OPS },
    { type: 'input_value', name: 'B', check: 'Number' },
  ],
  output: 'Number',
  colour: COLOUR,
  tooltip: 'Perform arithmetic on two numbers.',
  helpUrl: '',
};

const arithmeticGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
  };
  const b = block as { getFieldValue?: (name: string) => string };
  const op = b.getFieldValue?.('OP') ?? 'ADD';
  const order = ARITH_ORDER[op] ?? ORDER_ADDITION;
  const a = gen.valueToCode?.(block, 'A', order) || '0';
  const bVal = gen.valueToCode?.(block, 'B', order) || '0';
  const jsOp = ARITH_JS[op] ?? '+';
  return [`${a} ${jsOp} ${bVal}`, order];
};

// --- Round / Ceil / Floor ---

const ROUND_OPS: readonly (readonly [string, string])[] = [
  ['round', 'ROUND'],
  ['ceil', 'CEIL'],
  ['floor', 'FLOOR'],
];

const ROUND_JS: Record<string, string> = {
  ROUND: 'Math.round',
  CEIL: 'Math.ceil',
  FLOOR: 'Math.floor',
};

const roundDef: BlockDefinition = {
  type: 'inrepo_math_round',
  message0: '%1 %2',
  args0: [
    { type: 'field_dropdown', name: 'OP', options: ROUND_OPS },
    { type: 'input_value', name: 'NUM', check: 'Number' },
  ],
  output: 'Number',
  colour: COLOUR,
  tooltip: 'Round, ceil, or floor a number.',
  helpUrl: '',
};

const roundGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
  };
  const b = block as { getFieldValue?: (name: string) => string };
  const op = b.getFieldValue?.('OP') ?? 'ROUND';
  const fn = ROUND_JS[op] ?? 'Math.round';
  const num = gen.valueToCode?.(block, 'NUM', ORDER_NONE) || '0';
  return [`${fn}(${num})`, ORDER_FUNCTION_CALL];
};

// --- Random integer between ---

const randomIntDef: BlockDefinition = {
  type: 'inrepo_math_random_int',
  message0: 'random integer from %1 to %2',
  args0: [
    { type: 'input_value', name: 'FROM', check: 'Number' },
    { type: 'input_value', name: 'TO', check: 'Number' },
  ],
  output: 'Number',
  colour: COLOUR,
  tooltip: 'Return a random integer between two values (inclusive).',
  helpUrl: '',
};

const randomIntGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
  };
  const from = gen.valueToCode?.(block, 'FROM', ORDER_NONE) || '0';
  const to = gen.valueToCode?.(block, 'TO', ORDER_NONE) || '100';
  const code =
    `Math.floor(Math.random() * (${to} - ${from} + 1)) + ${from}`;
  return [code, ORDER_FUNCTION_CALL];
};

// --- Modulo ---

const moduloDef: BlockDefinition = {
  type: 'inrepo_math_modulo',
  message0: 'remainder of %1 \u00F7 %2',
  args0: [
    { type: 'input_value', name: 'DIVIDEND', check: 'Number' },
    { type: 'input_value', name: 'DIVISOR', check: 'Number' },
  ],
  output: 'Number',
  colour: COLOUR,
  tooltip: 'Return the remainder of dividing two numbers.',
  helpUrl: '',
};

const moduloGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
  };
  const dividend = gen.valueToCode?.(block, 'DIVIDEND', ORDER_MULTIPLICATION) || '0';
  const divisor = gen.valueToCode?.(block, 'DIVISOR', ORDER_MULTIPLICATION) || '1';
  return [`${dividend} % ${divisor}`, ORDER_MULTIPLICATION];
};

// --- Pack ---

const entries: BlockPackEntry[] = [
  {
    definition: numberDef,
    generator: numberGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['number', 'value', 'literal', 'constant'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'state',
  },
  {
    definition: arithmeticDef,
    generator: arithmeticGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['add', 'subtract', 'multiply', 'divide', 'power', 'math', 'plus', 'minus'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'state',
  },
  {
    definition: roundDef,
    generator: roundGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['round', 'ceil', 'floor', 'truncate'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'state',
  },
  {
    definition: randomIntDef,
    generator: randomIntGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['random', 'dice', 'chance', 'integer'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'state',
  },
  {
    definition: moduloDef,
    generator: moduloGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['modulo', 'remainder', 'mod', 'wrap'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'state',
  },
];

export const coreBlockPack: BlockPack = {
  entries,
  categoryId: 'math',
  presetId: '__core_math',
};
