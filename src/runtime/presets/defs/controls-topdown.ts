import type { PresetDefinition } from '../../../types/preset';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';

export const definition: PresetDefinition = {
  id: 'controls-topdown',
  category: 'controls',
  label: 'Top-down Controls',
  description:
    'Four or eight-directional movement input for top-down games.',
  version: '1.0.0',
  tags: ['topdown', '2d', 'wasd', 'arrows'],
  recommendedProfiles: ['topdown'],

  knobs: [
    {
      id: 'moveSpeed',
      label: 'Move Speed',
      description: 'Base movement speed in pixels per second.',
      type: 'number',
      default: 200,
      runtimeSettable: true,
      constraints: { min: 0, max: 1000, step: 10 },
      group: 'Basics',
    },
    {
      id: 'diagonalEnabled',
      label: 'Allow Diagonal',
      description: 'Allow diagonal movement (8 directions).',
      type: 'boolean',
      default: true,
      group: 'Basics',
    },
    {
      id: 'diagonalNormalize',
      label: 'Normalize Diagonal',
      description:
        'Normalize diagonal speed so it matches cardinal speed.',
      type: 'boolean',
      default: true,
      group: 'Advanced',
      advanced: true,
    },
  ],

  commands: [
    {
      id: 'controls.setOption',
      label: 'Set Controls Option',
      description: 'Change a controls setting at runtime.',
      args: [
        {
          name: 'key',
          type: 'enum',
          label: 'Option',
          options: ['moveSpeed', 'diagonalEnabled'],
        },
        { name: 'value', type: 'number', label: 'Value' },
      ],
      keywords: ['option', 'setting', 'configure'],
      advanced: true,
    },
  ],

  events: [
    {
      id: 'controls.directionChanged',
      label: 'When Direction Changes',
      description: 'Fires when the player changes movement direction.',
      payload: [
        { name: 'dx', type: 'number', label: 'Direction X' },
        { name: 'dy', type: 'number', label: 'Direction Y' },
      ],
      keywords: ['direction', 'turn', 'move'],
    },
    {
      id: 'controls.stopped',
      label: 'When Player Stops',
      description: 'Fires when the player releases all movement inputs.',
      payload: [],
      keywords: ['stop', 'idle', 'still'],
    },
  ],

  state: [
    {
      id: 'controls.moveX',
      label: 'Move X',
      description: 'Current horizontal input (-1, 0, or 1).',
      type: 'number',
      keywords: ['input', 'horizontal'],
    },
    {
      id: 'controls.moveY',
      label: 'Move Y',
      description: 'Current vertical input (-1, 0, or 1).',
      type: 'number',
      keywords: ['input', 'vertical'],
    },
    {
      id: 'controls.isMoving',
      label: 'Is Moving',
      description: 'Whether any movement input is active.',
      type: 'boolean',
      keywords: ['moving', 'walking'],
    },
  ],

  compatibility: {
    conflictsWith: ['controls-platformer'],
    suggestedAlternative: 'controls-platformer',
  },
};

export const factory: PresetFactory = (def): PresetInstance => {
  let config: Record<string, unknown> = {};

  return {
    definition: def,

    applyConfig(c) {
      config = { ...c };
    },

    registerApi(registrar: PresetApiRegistrar) {
      registrar.registerCommand('controls.setOption', (args) => {
        const key = args.key as string;
        if (key in config) {
          config[key] = args.value;
        }
        return undefined;
      });

      registrar.registerState('controls.moveX', () => 0);
      registrar.registerState('controls.moveY', () => 0);
      registrar.registerState('controls.isMoving', () => false);
    },

    dispose() {
      config = {};
    },
  };
};
