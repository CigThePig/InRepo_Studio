import type { PresetDefinition } from '../../../types/preset';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';

export const definition: PresetDefinition = {
  id: 'movement-platformer',
  category: 'movement',
  label: 'Platformer Movement',
  description:
    'Gravity-based movement with jumping, falling, and ground detection.',
  version: '1.0.0',
  tags: ['platformer', 'gravity', 'jump', 'physics'],
  recommendedProfiles: ['platformer'],

  knobs: [
    {
      id: 'gravity',
      label: 'Gravity',
      description: 'Downward acceleration in pixels per second squared.',
      type: 'number',
      default: 800,
      runtimeSettable: true,
      constraints: { min: 0, max: 3000, step: 50 },
      group: 'Basics',
    },
    {
      id: 'jumpForce',
      label: 'Jump Force',
      description: 'Initial upward velocity when jumping.',
      type: 'number',
      default: 400,
      runtimeSettable: true,
      constraints: { min: 0, max: 1500, step: 25 },
      group: 'Basics',
    },
    {
      id: 'maxFallSpeed',
      label: 'Max Fall Speed',
      description: 'Terminal velocity when falling.',
      type: 'number',
      default: 600,
      constraints: { min: 0, max: 2000, step: 50 },
      group: 'Basics',
    },
    {
      id: 'runAcceleration',
      label: 'Run Acceleration',
      description: 'Horizontal acceleration rate.',
      type: 'number',
      default: 800,
      constraints: { min: 0, max: 3000, step: 50 },
      group: 'Advanced',
      advanced: true,
    },
    {
      id: 'airControl',
      label: 'Air Control',
      description:
        'Horizontal acceleration multiplier while airborne (0-1).',
      type: 'number',
      default: 0.7,
      constraints: { min: 0, max: 1, step: 0.05 },
      group: 'Advanced',
      advanced: true,
    },
  ],

  commands: [
    {
      id: 'movement.jump',
      label: 'Jump',
      description: 'Make the player jump if grounded.',
      args: [],
      keywords: ['jump', 'hop', 'leap'],
    },
    {
      id: 'movement.applyImpulse',
      label: 'Apply Impulse',
      description: 'Apply a one-time velocity change.',
      args: [
        { name: 'x', type: 'number', label: 'Impulse X' },
        { name: 'y', type: 'number', label: 'Impulse Y' },
      ],
      keywords: ['impulse', 'push', 'knock', 'force'],
      advanced: true,
    },
    {
      id: 'movement.setOption',
      label: 'Set Movement Option',
      description: 'Change a movement setting at runtime.',
      args: [
        {
          name: 'key',
          type: 'enum',
          label: 'Option',
          options: ['gravity', 'jumpForce', 'maxFallSpeed'],
        },
        { name: 'value', type: 'number', label: 'Value' },
      ],
      keywords: ['option', 'setting'],
      advanced: true,
    },
  ],

  events: [
    {
      id: 'movement.landed',
      label: 'When Player Lands',
      description: 'Fires when the player lands on a surface.',
      payload: [
        {
          name: 'fallSpeed',
          type: 'number',
          label: 'Fall Speed',
          description: 'Speed at moment of landing.',
        },
      ],
      keywords: ['land', 'ground', 'touch'],
    },
    {
      id: 'movement.jumped',
      label: 'When Player Jumps',
      description: 'Fires when the player leaves the ground via jump.',
      payload: [],
      keywords: ['jump', 'leap', 'hop'],
    },
    {
      id: 'movement.startedFalling',
      label: 'When Player Starts Falling',
      description: 'Fires when the player begins to fall (velocity Y > 0).',
      payload: [],
      keywords: ['fall', 'drop', 'descend'],
    },
  ],

  state: [
    {
      id: 'movement.grounded',
      label: 'Is Grounded',
      description: 'Whether the player is on the ground.',
      type: 'boolean',
      keywords: ['ground', 'floor', 'standing'],
    },
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
      description: 'Current vertical velocity (positive = down).',
      type: 'number',
      keywords: ['speed', 'vertical', 'fall'],
    },
    {
      id: 'movement.fallSpeed',
      label: 'Fall Speed',
      description: 'Absolute vertical speed when falling.',
      type: 'number',
      keywords: ['fall', 'speed', 'dropping'],
    },
  ],

  compatibility: {
    conflictsWith: ['movement-topdown'],
    suggestedAlternative: 'movement-topdown',
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
      registrar.registerCommand('movement.jump', () => {
        // Stub: no-op until Phaser integration
        return undefined;
      });

      registrar.registerCommand('movement.applyImpulse', (_args) => {
        // Stub: no-op until Phaser integration
        return undefined;
      });

      registrar.registerCommand('movement.setOption', (args) => {
        const key = args.key as string;
        if (key in config) {
          config[key] = args.value;
        }
        return undefined;
      });

      registrar.registerState('movement.grounded', () => false);
      registrar.registerState('movement.velocityX', () => 0);
      registrar.registerState('movement.velocityY', () => 0);
      registrar.registerState('movement.fallSpeed', () => 0);
    },

    dispose() {
      config = {};
    },
  };
};
