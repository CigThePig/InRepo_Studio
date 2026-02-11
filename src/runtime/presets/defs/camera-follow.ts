import type { PresetDefinition } from '../../../types/preset';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';
import { getRuntimeEnv } from '../runtimeEnv';

function getNumber(config: Record<string, unknown>, key: string, fallback: number): number {
  const value = config[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

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
  let emitEvent: PresetApiRegistrar['emitEvent'] | null = null;

  return {
    definition: def,

    applyConfig(c) {
      config = { ...c };
    },

    registerApi(registrar: PresetApiRegistrar) {
      emitEvent = registrar.emitEvent;

      registrar.registerCommand('camera.shake', (args) => {
        const env = getRuntimeEnv();
        const camera = env?.getMainCamera();
        if (!camera) return undefined;

        const duration = Number(args.duration ?? 200);
        const intensity = Number(args.intensity ?? 0.01);
        isShaking = true;
        emitEvent?.('camera.shakeStarted', { duration });
        camera.shake(duration, intensity);

        camera.once('camerashakecomplete', () => {
          isShaking = false;
          emitEvent?.('camera.shakeEnded');
        });

        return undefined;
      });

      registrar.registerCommand('camera.setZoom', (args) => {
        const env = getRuntimeEnv();
        const camera = env?.getMainCamera();
        if (!camera) return undefined;

        currentZoom = Number(args.zoom ?? currentZoom);
        camera.setZoom(currentZoom);
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

    update(_delta) {
      const env = getRuntimeEnv();
      const player = env?.getPlayerSprite();
      const camera = env?.getMainCamera();
      if (!player || !camera) return;

      const lerpSpeed = Math.max(0.01, Math.min(1, getNumber(config, 'lerpSpeed', 0.1)));
      const offsetX = getNumber(config, 'followOffsetX', 0);
      const offsetY = getNumber(config, 'followOffsetY', 0);
      const deadzoneWidth = Math.max(0, getNumber(config, 'deadzoneWidth', 50));
      const deadzoneHeight = Math.max(0, getNumber(config, 'deadzoneHeight', 50));

      camera.setDeadzone(deadzoneWidth, deadzoneHeight);

      const targetScrollX = player.x + offsetX - camera.width * 0.5;
      const targetScrollY = player.y + offsetY - camera.height * 0.5;
      camera.scrollX += (targetScrollX - camera.scrollX) * lerpSpeed;
      camera.scrollY += (targetScrollY - camera.scrollY) * lerpSpeed;
    },

    dispose() {
      config = {};
      currentZoom = 1;
      isShaking = false;
      emitEvent = null;
    },
  };
};
