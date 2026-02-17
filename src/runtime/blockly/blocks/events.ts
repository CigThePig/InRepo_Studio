/**
 * Core block definitions: Events category.
 *
 * Common event hat blocks that exist independently of any preset.
 * These are the universal "When ..." entry points for scripts.
 */

import type {
  BlockDefinition,
  BlockPackEntry,
  BlockDependency,
  BlockGenerator,
  BlockPack,
} from '../schemaToBlocks';
import { codegenEventHandler } from '../codegenRules';

const COLOUR = 40; // gold

const CORE_DEPENDENCY: BlockDependency = {
  requiresCategoryEnabled: '__core',
};

// --- When Scene Starts ---

const whenSceneStartsDef: BlockDefinition = {
  type: 'inrepo_event_scene_started',
  message0: '🎩 When scene starts %1',
  args0: [{ type: 'input_statement', name: 'DO' }],
  colour: COLOUR,
  tooltip: 'Runs once when the scene starts.',
  helpUrl: '',
};

const whenSceneStartsGen: BlockGenerator = (block, generator) => {
  const gen = generator as {
    statementToCode?: (b: unknown, n: string) => string;
  };
  const statementsCode = gen.statementToCode?.(block, 'DO') ?? '';
  return codegenEventHandler('scene.started', statementsCode);
};

// --- Pack ---

const entries: BlockPackEntry[] = [
  {
    definition: whenSceneStartsDef,
    generator: whenSceneStartsGen,
    dependency: CORE_DEPENDENCY,
    keywords: ['scene', 'start', 'begin', 'create', 'init'],
    advanced: false,
    logicTargetFilter: null,
    blockFamily: 'event',
  },
];

export const coreBlockPack: BlockPack = {
  entries,
  categoryId: 'events',
  presetId: '__core_events',
};
