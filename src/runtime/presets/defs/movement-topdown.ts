import type { PresetDefinition } from '../../../types/preset';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';

export const definition: PresetDefinition = {
  id: 'movement-topdown',
  category: 'movement',
  label: 'Top-down Movement',
  description:
    'Free movement in all directions with optional friction and acceleration.',
  version: '1.0.0',
  tags: ['topdown', 'free', 'movement'],
  recommendedProfiles: ['topdown'],

  knobs: [
    {
      id: 'maxSpeed',
      label: 'Max Speed',
      description: 'Maximum movement speed in pixels per second.',
      type: 'number',
      default: 200,
      runtimeSettable: true,
      constraints: { min: 0, max: 1000, step: 10 },
      group: 'Basics',
    },
    {
      id: 'friction',
      label: 'Friction',
      description:
        'Deceleration factor (0 = ice, 1 = instant stop).',
      type: 'number',
      default: 0.8,
      runtimeSettable: true,
      constraints: { min: 0, max: 1, step: 0.05 },
      group: 'Basics',
    },
    {
      id: 'acceleration',
      label: 'Acceleration',
      description: 'Acceleration rate in pixels per second squared.',
      type: 'number',
      default: 600,
      constraints: { min: 0, max: 3000, step: 50 },
      group: 'Advanced',
      advanced: true,
    },
  ],

  commands: [
    {
      id: 'movement.setOption',
      label: 'Set Movement Option',
      description: 'Change a movement setting at runtime.',
      args: [
        {
          name: 'key',
          type: 'enum',
          label: 'Option',
          options: ['maxSpeed', 'friction', 'acceleration'],
        },
        { name: 'value', type: 'number', label: 'Value' },
      ],
      keywords: ['option', 'setting', 'speed', 'friction'],
      advanced: true,
    },
    {
      id: 'movement.teleport',
      label: 'Teleport',
      description: 'Instantly move the player to a position.',
      args: [
        { name: 'x', type: 'number', label: 'X' },
        { name: 'y', type: 'number', label: 'Y' },
      ],
      keywords: ['teleport', 'warp', 'position', 'move'],
    },
  ],

  events: [
    {
      id: 'movement.started',
      label: 'When Movement Starts',
      description: 'Fires when the player begins moving from standstill.',
      payload: [],
      keywords: ['start', 'begin', 'move'],
    },
    {
      id: 'movement.stopped',
      label: 'When Movement Stops',
      description: 'Fires when the player comes to a complete stop.',
      payload: [],
      keywords: ['stop', 'halt', 'idle'],
    },
  ],

  state: [
    {
      id: 'movement.velocityX',
      label: 'Velocity X',
      description: 'Current horizontal velocity.',
      type: 'number',
      keywords: ['speed', 'horizontal'],
    },
    {
      id: 'movement.velocityY',
      label: 'Velocity Y',
      description: 'Current vertical velocity.',
      type: 'number',
      keywords: ['speed', 'vertical'],
    },
    {
      id: 'movement.isMoving',
      label: 'Is Moving',
      description: 'Whether the player is currently moving.',
      type: 'boolean',
      keywords: ['moving', 'motion'],
    },
  ],

  compatibility: {
    conflictsWith: ['movement-platformer'],
    suggestedAlternative: 'movement-platformer',
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
      registrar.registerCommand('movement.setOption', (args) => {
        const key = args.key as string;
        if (key in config) {
          config[key] = args.value;
        }
        return undefined;
      });

      registrar.registerCommand('movement.teleport', (_args) => {
        // Stub: no-op until Phaser integration (Track 35)
        return undefined;
      });

      registrar.registerState('movement.velocityX', () => 0);
      registrar.registerState('movement.velocityY', () => 0);
      registrar.registerState('movement.isMoving', () => false);
    },

    dispose() {
      config = {};
    },
  };
};
