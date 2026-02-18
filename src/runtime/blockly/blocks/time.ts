/**
 * Core block definitions: Time category.
 *
 * Wait/delay, interval/repeat, and cancel timer blocks.
 * Uses api.time.after, api.time.every, api.time.clear from the Game API.
 */

import type {
  BlockDefinition,
  BlockPackEntry,
  BlockDependency,
  BlockGenerator,
  BlockPack,
} from '../schemaToBlocks';
import { codegenTimeAfter, codegenTimeEvery } from '../codegenRules';

const COLOUR = 120; // green

const CORE_DEPENDENCY: BlockDependency = {
  requiresCategoryEnabled: '__core',
};

const ORDER_NONE = 99;

// --- Wait N ms then do ---

const afterDef: BlockDefinition = {
  type: 'inrepo_time_after',
  message0: 'wait %1 ms then %2',
  args0: [
    { type: 'input_value', name: 'MS', check: 'Number' },
    { type: 'input_statement', name: 'DO' },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: COLOUR,
  tooltip: 'Wait a number of milliseconds, then run the enclosed blocks.',
  helpUrl: '',
};

const afterGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
    statementToCode?: (b: unknown, n: string) => string;
  };
  const ms = gen.valueToCode?.(block, 'MS', ORDER_NONE) || '1000';
  const statements = gen.statementToCode?.(block, 'DO') ?? '';
  return codegenTimeAfter(ms, statements);
};

// --- Every N ms do ---

const everyDef: BlockDefinition = {
  type: 'inrepo_time_every',
  message0: 'every %1 ms do %2',
  args0: [
    { type: 'input_value', name: 'MS', check: 'Number' },
    { type: 'input_statement', name: 'DO' },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: COLOUR,
  tooltip: 'Repeat the enclosed blocks at a regular interval (minimum 50ms).',
  helpUrl: '',
};

const everyGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
    statementToCode?: (b: unknown, n: string) => string;
  };
  const ms = gen.valueToCode?.(block, 'MS', ORDER_NONE) || '1000';
  const statements = gen.statementToCode?.(block, 'DO') ?? '';
  return codegenTimeEvery(ms, statements);
};

// --- Cancel timer ---

const cancelDef: BlockDefinition = {
  type: 'inrepo_time_cancel',
  message0: 'cancel timer %1',
  args0: [{ type: 'input_value', name: 'HANDLE' }],
  previousStatement: null,
  nextStatement: null,
  colour: COLOUR,
  tooltip: 'Cancel a running timer.',
  helpUrl: '',
};

const cancelGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
  };
  const handle = gen.valueToCode?.(block, 'HANDLE', ORDER_NONE) || 'null';
  return `api.time.clear(${handle});\n`;
};

// --- Pack ---

const entries: BlockPackEntry[] = [
  {
    definition: afterDef,
    generator: afterGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['wait', 'delay', 'after', 'timeout', 'pause'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'command',
  },
  {
    definition: everyDef,
    generator: everyGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['every', 'interval', 'repeat', 'loop', 'timer'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'command',
  },
  {
    definition: cancelDef,
    generator: cancelGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['cancel', 'stop', 'clear', 'timer'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'command',
  },
];

export const coreBlockPack: BlockPack = {
  entries,
  categoryId: 'time',
  presetId: '__core_time',
};
