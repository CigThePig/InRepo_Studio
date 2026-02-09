/**
 * Core block definitions: Logic category.
 *
 * If/else, comparisons, boolean operators, boolean constants.
 * These generate pure JavaScript — no api.* calls needed.
 */

import type {
  BlockDefinition,
  BlockPackEntry,
  BlockDependency,
  BlockGenerator,
  BlockPack,
} from '../schemaToBlocks';

const COLOUR = 210; // blue

const CORE_DEPENDENCY: BlockDependency = {
  requiresCategoryEnabled: '__core',
};

/** Blockly ORDER constants for JS operator precedence. */
const ORDER_ATOMIC = 0;
const ORDER_LOGICAL_NOT = 4.4;
const ORDER_RELATIONAL = 9;
const ORDER_EQUALITY = 10;
const ORDER_LOGICAL_AND = 13;
const ORDER_LOGICAL_OR = 14;
const ORDER_NONE = 99;

// --- if / do ---

const ifDef: BlockDefinition = {
  type: 'inrepo_logic_if',
  message0: 'if %1 then %2',
  args0: [
    { type: 'input_value', name: 'CONDITION', check: 'Boolean' },
    { type: 'input_statement', name: 'DO' },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: COLOUR,
  tooltip: 'If a condition is true, run the enclosed blocks.',
  helpUrl: '',
};

const ifGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
    statementToCode?: (b: unknown, n: string) => string;
  };
  const condition = gen.valueToCode?.(block, 'CONDITION', ORDER_NONE) || 'false';
  const statements = gen.statementToCode?.(block, 'DO') ?? '';
  return `if (${condition}) {\n${statements}}\n`;
};

// --- if / do / else ---

const ifElseDef: BlockDefinition = {
  type: 'inrepo_logic_ifelse',
  message0: 'if %1 then %2 else %3',
  args0: [
    { type: 'input_value', name: 'CONDITION', check: 'Boolean' },
    { type: 'input_statement', name: 'DO' },
    { type: 'input_statement', name: 'ELSE' },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: COLOUR,
  tooltip: 'If a condition is true, run the first set of blocks. Otherwise, run the second set.',
  helpUrl: '',
};

const ifElseGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
    statementToCode?: (b: unknown, n: string) => string;
  };
  const condition = gen.valueToCode?.(block, 'CONDITION', ORDER_NONE) || 'false';
  const doStatements = gen.statementToCode?.(block, 'DO') ?? '';
  const elseStatements = gen.statementToCode?.(block, 'ELSE') ?? '';
  return `if (${condition}) {\n${doStatements}} else {\n${elseStatements}}\n`;
};

// --- compare (=, !=, <, <=, >, >=) ---

const COMPARE_OPS: readonly (readonly [string, string])[] = [
  ['=', 'EQ'],
  ['\u2260', 'NEQ'],
  ['<', 'LT'],
  ['\u2264', 'LTE'],
  ['>', 'GT'],
  ['\u2265', 'GTE'],
];

const COMPARE_JS: Record<string, string> = {
  EQ: '==',
  NEQ: '!=',
  LT: '<',
  LTE: '<=',
  GT: '>',
  GTE: '>=',
};

const COMPARE_ORDER: Record<string, number> = {
  EQ: ORDER_EQUALITY,
  NEQ: ORDER_EQUALITY,
  LT: ORDER_RELATIONAL,
  LTE: ORDER_RELATIONAL,
  GT: ORDER_RELATIONAL,
  GTE: ORDER_RELATIONAL,
};

const compareDef: BlockDefinition = {
  type: 'inrepo_logic_compare',
  message0: '%1 %2 %3',
  args0: [
    { type: 'input_value', name: 'A', check: 'Number' },
    { type: 'field_dropdown', name: 'OP', options: COMPARE_OPS },
    { type: 'input_value', name: 'B', check: 'Number' },
  ],
  output: 'Boolean',
  colour: COLOUR,
  tooltip: 'Compare two values.',
  helpUrl: '',
};

const compareGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
  };
  const b = block as { getFieldValue?: (name: string) => string };
  const op = b.getFieldValue?.('OP') ?? 'EQ';
  const order = COMPARE_ORDER[op] ?? ORDER_EQUALITY;
  const a = gen.valueToCode?.(block, 'A', order) || '0';
  const bVal = gen.valueToCode?.(block, 'B', order) || '0';
  const jsOp = COMPARE_JS[op] ?? '==';
  return [`${a} ${jsOp} ${bVal}`, order];
};

// --- and / or ---

const LOGIC_OPS: readonly (readonly [string, string])[] = [
  ['and', 'AND'],
  ['or', 'OR'],
];

const operationDef: BlockDefinition = {
  type: 'inrepo_logic_operation',
  message0: '%1 %2 %3',
  args0: [
    { type: 'input_value', name: 'A', check: 'Boolean' },
    { type: 'field_dropdown', name: 'OP', options: LOGIC_OPS },
    { type: 'input_value', name: 'B', check: 'Boolean' },
  ],
  output: 'Boolean',
  colour: COLOUR,
  tooltip: 'Combine two conditions with AND or OR.',
  helpUrl: '',
};

const operationGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
  };
  const b = block as { getFieldValue?: (name: string) => string };
  const op = b.getFieldValue?.('OP') ?? 'AND';
  const jsOp = op === 'AND' ? '&&' : '||';
  const order = op === 'AND' ? ORDER_LOGICAL_AND : ORDER_LOGICAL_OR;
  const a = gen.valueToCode?.(block, 'A', order) || 'false';
  const bVal = gen.valueToCode?.(block, 'B', order) || 'false';
  return [`${a} ${jsOp} ${bVal}`, order];
};

// --- not ---

const negateDef: BlockDefinition = {
  type: 'inrepo_logic_negate',
  message0: 'not %1',
  args0: [{ type: 'input_value', name: 'BOOL', check: 'Boolean' }],
  output: 'Boolean',
  colour: COLOUR,
  tooltip: 'Returns the opposite of the input.',
  helpUrl: '',
};

const negateGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
  };
  const value = gen.valueToCode?.(block, 'BOOL', ORDER_LOGICAL_NOT) || 'true';
  return [`!${value}`, ORDER_LOGICAL_NOT];
};

// --- true / false ---

const booleanDef: BlockDefinition = {
  type: 'inrepo_logic_boolean',
  message0: '%1',
  args0: [
    {
      type: 'field_dropdown',
      name: 'BOOL',
      options: [
        ['true', 'TRUE'],
        ['false', 'FALSE'],
      ],
    },
  ],
  output: 'Boolean',
  colour: COLOUR,
  tooltip: 'A true or false value.',
  helpUrl: '',
};

const booleanGen: BlockGenerator = (block) => {
  const b = block as { getFieldValue?: (name: string) => string };
  const val = b.getFieldValue?.('BOOL') === 'TRUE' ? 'true' : 'false';
  return [val, ORDER_ATOMIC];
};

// --- Pack ---

const entries: BlockPackEntry[] = [
  {
    definition: ifDef,
    generator: ifGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['if', 'condition', 'branch', 'then'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'command',
  },
  {
    definition: ifElseDef,
    generator: ifElseGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['if', 'else', 'condition', 'branch', 'otherwise'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'command',
  },
  {
    definition: compareDef,
    generator: compareGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['compare', 'equal', 'less', 'greater', 'not equal'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'state',
  },
  {
    definition: operationDef,
    generator: operationGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['and', 'or', 'logic', 'boolean', 'combine'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'state',
  },
  {
    definition: negateDef,
    generator: negateGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['not', 'negate', 'opposite', 'inverse'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'state',
  },
  {
    definition: booleanDef,
    generator: booleanGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['true', 'false', 'boolean', 'yes', 'no'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'state',
  },
];

export const coreBlockPack: BlockPack = {
  entries,
  categoryId: 'logic',
  presetId: '__core_logic',
};
