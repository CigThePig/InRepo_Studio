import type { PresetDefinition } from '../../../types/preset';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';

export const definition: PresetDefinition = {
  id: 'camera-follow',
  category: 'camera',
  label: 'Camera Follow',
  description:
    'Smooth camera that follows the player with configurable deadzone and bounds.',
  version: '1.0.0',
  tags: ['camera', 'follow', 'smooth', 'scroll'],
  recommendedProfiles: ['topdown', 'platformer'],

  knobs: [
    {
      id: 'followOffsetX',
      label: 'Follow Offset X',
      description: 'Horizontal offset from the follow target.',
      type: 'number',
      default: 0,
      runtimeSettable: true,
      constraints: { min: -500, max: 500, step: 5 },
      group: 'Basics',
    },
    {
      id: 'followOffsetY',
      label: 'Follow Offset Y',
      description: 'Vertical offset from the follow target.',
      type: 'number',
      default: 0,
      runtimeSettable: true,
      constraints: { min: -500, max: 500, step: 5 },
      group: 'Basics',
    },
    {
      id: 'lerpSpeed',
      label: 'Lerp Speed',
      description:
        'Camera smoothing (0 = no smoothing, 1 = instant snap).',
      type: 'number',
      default: 0.1,
      runtimeSettable: true,
      constraints: { min: 0.01, max: 1, step: 0.01 },
      group: 'Basics',
    },
    {
      id: 'deadzoneWidth',
      label: 'Deadzone Width',
      description: 'Width of the camera deadzone in pixels.',
      type: 'number',
      default: 50,
      runtimeSettable: true,
      constraints: { min: 0, max: 500, step: 10 },
      group: 'Basics',
    },
    {
      id: 'deadzoneHeight',
      label: 'Deadzone Height',
      description: 'Height of the camera deadzone in pixels.',
      type: 'number',
      default: 50,
      runtimeSettable: true,
      constraints: { min: 0, max: 500, step: 10 },
      group: 'Basics',
    },
    {
      id: 'boundToMap',
      label: 'Bound to Map',
      description: 'Prevent the camera from scrolling past map edges.',
      type: 'boolean',
      default: true,
      group: 'Basics',
    },
  ],

  commands: [
    {
      id: 'camera.shake',
      label: 'Shake Camera',
      description: 'Apply a screen shake effect.',
      args: [
        {
          name: 'duration',
          type: 'number',
          label: 'Duration (ms)',
          default: 200,
          constraints: { min: 0, max: 5000 },
        },
        {
          name: 'intensity',
          type: 'number',
          label: 'Intensity',
          default: 0.01,
          constraints: { min: 0, max: 0.1 },
        },
      ],
      keywords: ['shake', 'rumble', 'impact', 'hit'],
    },
    {
      id: 'camera.setZoom',
      label: 'Set Camera Zoom',
      description: 'Change the camera zoom level.',
      args: [
        {
          name: 'zoom',
          type: 'number',
          label: 'Zoom',
          default: 1,
          constraints: { min: 0.25, max: 4 },
        },
      ],
      keywords: ['zoom', 'scale', 'magnify'],
    },
    {
      id: 'camera.setOption',
      label: 'Set Camera Option',
      description: 'Change a camera setting at runtime.',
      args: [
        {
          name: 'key',
          type: 'enum',
          label: 'Option',
          options: [
            'followOffsetX',
            'followOffsetY',
            'lerpSpeed',
            'deadzoneWidth',
            'deadzoneHeight',
          ],
        },
        { name: 'value', type: 'number', label: 'Value' },
      ],
      keywords: ['option', 'setting', 'configure'],
      advanced: true,
    },
  ],

  events: [
    {
      id: 'camera.shakeStarted',
      label: 'When Camera Shakes',
      description: 'Fires when a camera shake effect begins.',
      payload: [
        {
          name: 'duration',
          type: 'number',
          label: 'Duration',
        },
      ],
      keywords: ['shake', 'start', 'rumble'],
    },
    {
      id: 'camera.shakeEnded',
      label: 'When Shake Ends',
      description: 'Fires when a camera shake effect finishes.',
      payload: [],
      keywords: ['shake', 'end', 'stop'],
    },
  ],

  state: [
    {
      id: 'camera.zoom',
      label: 'Camera Zoom',
      description: 'Current camera zoom level.',
      type: 'number',
      keywords: ['zoom', 'scale'],
    },
    {
      id: 'camera.isShaking',
      label: 'Is Shaking',
      description: 'Whether the camera is currently shaking.',
      type: 'boolean',
      keywords: ['shake', 'shaking', 'rumble'],
    },
  ],

  compatibility: {
    compatibleWith: [
      'controls-topdown',
      'controls-platformer',
      'movement-topdown',
      'movement-platformer',
    ],
  },
};

export const factory: PresetFactory = (def): PresetInstance => {
  let config: Record<string, unknown> = {};
  let currentZoom = 1;
  let isShaking = false;

  return {
    definition: def,

    applyConfig(c) {
      config = { ...c };
    },

    registerApi(registrar: PresetApiRegistrar) {
      registrar.registerCommand('camera.shake', (args) => {
        isShaking = true;
        registrar.emitEvent('camera.shakeStarted', {
          duration: args.duration as number,
        });
        // Stub: no actual shake until Phaser integration
        isShaking = false;
        registrar.emitEvent('camera.shakeEnded');
        return undefined;
      });

      registrar.registerCommand('camera.setZoom', (args) => {
        currentZoom = args.zoom as number;
        return undefined;
      });

      registrar.registerCommand('camera.setOption', (args) => {
        const key = args.key as string;
        if (key in config) {
          config[key] = args.value;
        }
        return undefined;
      });

      registrar.registerState('camera.zoom', () => currentZoom);
      registrar.registerState('camera.isShaking', () => isShaking);
    },

    dispose() {
      config = {};
      currentZoom = 1;
      isShaking = false;
    },
  };
};
