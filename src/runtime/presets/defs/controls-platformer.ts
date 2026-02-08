import type { PresetDefinition } from '../../../types/preset';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';

export const definition: PresetDefinition = {
  id: 'controls-platformer',
  category: 'controls',
  label: 'Platformer Controls',
  description:
    'Left/right movement with jump button for side-scrolling platformers.',
  version: '1.0.0',
  tags: ['platformer', 'sidescroller', 'jump'],
  recommendedProfiles: ['platformer'],

  knobs: [
    {
      id: 'runSpeed',
      label: 'Run Speed',
      description: 'Horizontal run speed in pixels per second.',
      type: 'number',
      default: 250,
      runtimeSettable: true,
      constraints: { min: 0, max: 1000, step: 10 },
      group: 'Basics',
    },
    {
      id: 'jumpBufferMs',
      label: 'Jump Buffer',
      description:
        'How long before landing a jump press is still accepted (ms).',
      type: 'number',
      default: 100,
      constraints: { min: 0, max: 500, step: 10 },
      group: 'Advanced',
      advanced: true,
    },
    {
      id: 'coyoteTimeMs',
      label: 'Coyote Time',
      description:
        'How long after leaving a ledge the player can still jump (ms).',
      type: 'number',
      default: 80,
      constraints: { min: 0, max: 500, step: 10 },
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
          options: ['runSpeed', 'jumpBufferMs', 'coyoteTimeMs'],
        },
        { name: 'value', type: 'number', label: 'Value' },
      ],
      keywords: ['option', 'setting', 'configure'],
      advanced: true,
    },
  ],

  events: [
    {
      id: 'controls.jumpPressed',
      label: 'When Jump Pressed',
      description: 'Fires when the player presses the jump button.',
      payload: [],
      keywords: ['jump', 'press', 'button'],
    },
    {
      id: 'controls.jumpReleased',
      label: 'When Jump Released',
      description: 'Fires when the player releases the jump button.',
      payload: [],
      keywords: ['jump', 'release'],
    },
  ],

  state: [
    {
      id: 'controls.moveX',
      label: 'Move X',
      description: 'Current horizontal input (-1, 0, or 1).',
      type: 'number',
      keywords: ['input', 'horizontal', 'left', 'right'],
    },
    {
      id: 'controls.jumpHeld',
      label: 'Jump Held',
      description: 'Whether the jump button is currently held.',
      type: 'boolean',
      keywords: ['jump', 'button', 'held'],
    },
  ],

  compatibility: {
    conflictsWith: ['controls-topdown'],
    suggestedAlternative: 'controls-topdown',
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
      registrar.registerState('controls.jumpHeld', () => false);
    },

    dispose() {
      config = {};
    },
  };
};
