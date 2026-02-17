import type { PresetDefinition } from '../../../types/preset';
import type { Facing4 } from '@/types';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';
import { getRuntimeEnv } from '../runtimeEnv';

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
      id: 'idleSet',
      label: 'Idle Animation Set',
      description: 'Directional animation set used when standing still.',
      type: 'string',
      default: '',
      group: 'Basics',
    },
    {
      id: 'walkSet',
      label: 'Walk Animation Set',
      description: 'Directional animation set used when moving.',
      type: 'string',
      default: '',
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

const MOVE_EPSILON = 0.5;

export const factory: PresetFactory = (def): PresetInstance => {
  let currentAnimKey: string | null = null;
  let isPlaying = false;
  let lastX = 0;
  let lastY = 0;

  // Knob values (populated via applyConfig)
  let idleAnimKey = 'idle';
  let walkAnimKey = 'walk';
  let idleSetId = '';
  let walkSetId = '';
  let lastFacing: Facing4 = 'down';

  function resolveKey(value: string): string {
    const env = getRuntimeEnv();
    return env?.resolveAnimationKey?.(value) ?? value;
  }

  function getFacing(dx: number, dy: number): Facing4 {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'down' : 'up';
  }

  function resolveDirectionalKey(setIdOrName: string, facing: Facing4): string | null {
    const env = getRuntimeEnv();
    return env?.resolveAnimationSetKey?.(setIdOrName, facing) ?? null;
  }

  function playOnSprite(key: string, ignoreIfPlaying = false): void {
    const env = getRuntimeEnv();
    const sprite = env?.getPlayerSprite();
    if (!sprite) return;

    if (ignoreIfPlaying && currentAnimKey === key && isPlaying) return;

    const pivot = env?.getAnimationPivotByKey?.(key);
    if (pivot) sprite.setOrigin(pivot.x, pivot.y);

    sprite.anims.play(key, true);
    currentAnimKey = key;
    isPlaying = true;
  }

  return {
    definition: def,

    applyConfig(config: Record<string, unknown>) {
      if (typeof config.idleAnim === 'string') idleAnimKey = config.idleAnim;
      if (typeof config.walkAnim === 'string') walkAnimKey = config.walkAnim;
      if (typeof config.idleSet === 'string') idleSetId = config.idleSet;
      if (typeof config.walkSet === 'string') walkSetId = config.walkSet;
    },

    registerApi(registrar: PresetApiRegistrar) {

      registrar.registerCommand('animation.play', (args) => {
        const rawKey = (args.key as string) || '';
        if (!rawKey) return undefined;
        const resolved = resolveKey(rawKey);
        playOnSprite(resolved);
        registrar.emitEvent('animation.started', { key: resolved });
        return undefined;
      });

      registrar.registerCommand('animation.stop', () => {
        const env = getRuntimeEnv();
        const sprite = env?.getPlayerSprite();
        if (sprite) sprite.anims.stop();
        isPlaying = false;
        registrar.emitEvent('animation.stopped', {});
        return undefined;
      });

      registrar.registerState(
        'animation.currentAnim',
        () => currentAnimKey ?? '',
      );
      registrar.registerState(
        'animation.isPlaying',
        () => isPlaying,
      );
    },

    update(_delta: number) {
      const env = getRuntimeEnv();
      const player = env?.getPlayerSprite();
      if (!env || !player) return;
      if (env.isPlayerAnimationOverrideActive?.()) return;

      const dx = player.x - lastX;
      const dy = player.y - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moved = dist > MOVE_EPSILON;

      if (moved) {
        lastFacing = getFacing(dx, dy);
      }

      const setId = moved ? walkSetId : idleSetId;
      const desired = setId
        ? (resolveDirectionalKey(setId, lastFacing) ?? resolveKey(moved ? walkAnimKey : idleAnimKey))
        : resolveKey(moved ? walkAnimKey : idleAnimKey);

      if (desired !== currentAnimKey) {
        playOnSprite(desired, false);
      }

      lastX = player.x;
      lastY = player.y;
    },

    dispose() {
      currentAnimKey = null;
      isPlaying = false;
      lastX = 0;
      lastY = 0;
    },
  };
};
