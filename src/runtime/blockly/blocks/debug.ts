/**
 * Core block definitions: Debug category.
 *
 * Log message and log value blocks.
 * Uses api.log from the Game API.
 */

import type {
  BlockDefinition,
  BlockPackEntry,
  BlockDependency,
  BlockGenerator,
  BlockPack,
} from '../schemaToBlocks';
import { codegenLog, escapeJsString } from '../codegenRules';

const COLOUR = 0; // red

const CORE_DEPENDENCY: BlockDependency = {
  requiresCategoryEnabled: '__core',
};

const ORDER_NONE = 99;

// --- Log message ---

const logDef: BlockDefinition = {
  type: 'inrepo_debug_log',
  message0: 'log %1 %2',
  args0: [
    {
      type: 'field_dropdown',
      name: 'LEVEL',
      options: [
        ['info', 'info'],
        ['warn', 'warn'],
        ['error', 'error'],
      ],
    },
    { type: 'input_value', name: 'MSG', check: 'String' },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: COLOUR,
  tooltip: 'Log a message to the debug console.',
  helpUrl: '',
};

const logGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
  };
  const b = block as { getFieldValue?: (name: string) => string };
  const level = (b.getFieldValue?.('LEVEL') ?? 'info') as 'info' | 'warn' | 'error';
  const msg = gen.valueToCode?.(block, 'MSG', ORDER_NONE) || "''";
  return codegenLog(level, msg);
};

// --- Log value with label ---

const logValueDef: BlockDefinition = {
  type: 'inrepo_debug_log_value',
  message0: 'log %1 = %2',
  args0: [
    { type: 'field_input', name: 'LABEL', text: 'value' },
    { type: 'input_value', name: 'VALUE' },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: COLOUR,
  tooltip: 'Log a labeled value to the debug console.',
  helpUrl: '',
};

const logValueGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    valueToCode?: (b: unknown, n: string, order: number) => string;
  };
  const b = block as { getFieldValue?: (name: string) => string };
  const label = escapeJsString(b.getFieldValue?.('LABEL') ?? 'value');
  const value = gen.valueToCode?.(block, 'VALUE', ORDER_NONE) || '0';
  return codegenLog('info', `'${label}: ' + String(${value})`);
};

// --- Pack ---

const entries: BlockPackEntry[] = [
  {
    definition: logDef,
    generator: logGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['log', 'print', 'debug', 'console', 'message'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'command',
  },
  {
    definition: logValueDef,
    generator: logValueGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['log', 'print', 'debug', 'value', 'inspect', 'watch'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'command',
  },
];

export const coreBlockPack: BlockPack = {
  entries,
  categoryId: 'debug',
  presetId: '__core_debug',
};
