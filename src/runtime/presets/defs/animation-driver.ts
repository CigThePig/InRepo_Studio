import type { PresetDefinition } from '../../../types/preset';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';

export const definition: PresetDefinition = {
  id: 'animation-driver',
  category: 'animation',
  label: 'Animation Driver',
  description:
    'Automatically selects player animations based on movement state.',
  version: '1.0.0',
  tags: ['animation', 'sprite', 'auto'],
  recommendedProfiles: ['topdown', 'platformer'],

  knobs: [
    {
      id: 'idleAnim',
      label: 'Idle Animation',
      description: 'Animation key to play when standing still.',
      type: 'string',
      default: 'idle',
      group: 'Basics',
    },
    {
      id: 'walkAnim',
      label: 'Walk Animation',
      description: 'Animation key to play when moving.',
      type: 'string',
      default: 'walk',
      group: 'Basics',
    },
    {
      id: 'jumpAnim',
      label: 'Jump Animation',
      description:
        'Animation key to play when jumping (platformer only).',
      type: 'string',
      default: 'jump',
      group: 'Basics',
    },
    {
      id: 'fallAnim',
      label: 'Fall Animation',
      description:
        'Animation key to play when falling (platformer only).',
      type: 'string',
      default: 'fall',
      group: 'Basics',
    },
  ],

  commands: [
    {
      id: 'animation.play',
      label: 'Play Animation',
      description: 'Force play a specific animation by key.',
      args: [
        { name: 'key', type: 'string', label: 'Animation Key' },
        {
          name: 'loop',
          type: 'boolean',
          label: 'Loop',
          default: false,
        },
      ],
      keywords: ['play', 'animate', 'start'],
    },
    {
      id: 'animation.stop',
      label: 'Stop Animation',
      description: 'Stop the current animation.',
      args: [],
      keywords: ['stop', 'halt', 'pause'],
    },
  ],

  events: [
    {
      id: 'animation.completed',
      label: 'When Animation Completes',
      description:
        'Fires when a non-looping animation finishes playing.',
      payload: [
        {
          name: 'key',
          type: 'string',
          label: 'Animation Key',
        },
      ],
      keywords: ['complete', 'finish', 'end', 'done'],
    },
  ],

  state: [
    {
      id: 'animation.currentAnim',
      label: 'Current Animation',
      description: 'The key of the currently playing animation.',
      type: 'string',
      keywords: ['current', 'playing', 'active'],
    },
    {
      id: 'animation.isPlaying',
      label: 'Is Playing',
      description: 'Whether an animation is currently playing.',
      type: 'boolean',
      keywords: ['playing', 'animating', 'active'],
    },
  ],

  compatibility: {
    compatibleWith: [
      'controls-topdown',
      'controls-platformer',
      'movement-topdown',
      'movement-platformer',
      'camera-follow',
    ],
  },
};

export const factory: PresetFactory = (def): PresetInstance => {
  let currentAnim = '';
  let isPlaying = false;

  return {
    definition: def,

    applyConfig() {
      // Config stored but no runtime-settable knobs in v1 stub
    },

    registerApi(registrar: PresetApiRegistrar) {
      registrar.registerCommand('animation.play', (args) => {
        currentAnim = (args.key as string) || '';
        isPlaying = true;
        // Stub: no actual animation until Phaser integration
        return undefined;
      });

      registrar.registerCommand('animation.stop', () => {
        isPlaying = false;
        return undefined;
      });

      registrar.registerState(
        'animation.currentAnim',
        () => currentAnim,
      );
      registrar.registerState(
        'animation.isPlaying',
        () => isPlaying,
      );
    },

    dispose() {
      currentAnim = '';
      isPlaying = false;
    },
  };
};
