/**
 * Core block definitions: Map category.
 *
 * Map-specific event hat blocks. These are only visible when
 * a Map Logic target is selected (logicTargetFilter: 'map').
 */

import type {
  BlockDefinition,
  BlockPackEntry,
  BlockDependency,
  BlockGenerator,
  BlockPack,
} from '../schemaToBlocks';
import { codegenEventHandler } from '../codegenRules';

const COLOUR = 60; // yellow

const CORE_DEPENDENCY: BlockDependency = {
  requiresCategoryEnabled: '__core',
};

// --- When map entered ---

const mapEnteredDef: BlockDefinition = {
  type: 'inrepo_event_map_entered',
  message0: '🎩 When this map is entered %1',
  args0: [{ type: 'input_dummy', name: 'DUMMY' }],
  nextStatement: null,
  colour: COLOUR,
  tooltip: 'Runs when this map becomes the active scene.',
  helpUrl: '',
};

const mapEnteredGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    statementToCode?: (b: unknown, n: string) => string;
  };
  const statementsCode = gen.statementToCode?.(block, 'DO') ?? '';
  return codegenEventHandler('map.entered', statementsCode);
};

// --- When map exited ---

const mapExitedDef: BlockDefinition = {
  type: 'inrepo_event_map_exited',
  message0: '🎩 When this map is exited %1',
  args0: [{ type: 'input_dummy', name: 'DUMMY' }],
  nextStatement: null,
  colour: COLOUR,
  tooltip: 'Runs when this map is no longer the active scene.',
  helpUrl: '',
};

const mapExitedGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    statementToCode?: (b: unknown, n: string) => string;
  };
  const statementsCode = gen.statementToCode?.(block, 'DO') ?? '';
  return codegenEventHandler('map.exited', statementsCode);
};

// --- Pack ---

const entries: BlockPackEntry[] = [
  {
    definition: mapEnteredDef,
    generator: mapEnteredGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['map', 'enter', 'start', 'scene', 'load', 'arrive'],
    advanced: false,
    logicTargetFilter: 'map',
    blockFamily: 'event',
  },
  {
    definition: mapExitedDef,
    generator: mapExitedGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['map', 'exit', 'leave', 'scene', 'unload', 'depart'],
    advanced: false,
    logicTargetFilter: 'map',
    blockFamily: 'event',
  },
];

export const coreBlockPack: BlockPack = {
  entries,
  categoryId: 'map',
  presetId: '__core_map',
};
