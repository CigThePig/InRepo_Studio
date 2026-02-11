import type { PresetDefinition } from '../../../types/preset';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';
import { getMoveVector } from '../../input/moveInput';
import { getRuntimeEnv } from '../runtimeEnv';

const EPSILON = 0.001;

function getNumber(config: Record<string, unknown>, key: string, fallback: number): number {
  const value = config[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
}

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
  let velocityX = 0;
  let velocityY = 0;
  let isMoving = false;
  let wasMoving = false;
  let emitEvent: PresetApiRegistrar['emitEvent'] | null = null;

  return {
    definition: def,

    applyConfig(c) {
      config = { ...c };
    },

    registerApi(registrar: PresetApiRegistrar) {
      emitEvent = registrar.emitEvent;

      registrar.registerCommand('movement.setOption', (args) => {
        const key = args.key as string;
        if (key in config) {
          config[key] = args.value;
        }
        return undefined;
      });

      registrar.registerCommand('movement.teleport', (args) => {
        const env = getRuntimeEnv();
        const player = env?.getPlayerSprite() ?? null;
        if (!player) return undefined;

        player.x = Number(args.x ?? player.x);
        player.y = Number(args.y ?? player.y);
        velocityX = 0;
        velocityY = 0;
        return undefined;
      });

      registrar.registerState('movement.velocityX', () => velocityX);
      registrar.registerState('movement.velocityY', () => velocityY);
      registrar.registerState('movement.isMoving', () => isMoving);
    },

    update(delta) {
      const env = getRuntimeEnv();
      const player = env?.getPlayerSprite() ?? null;
      if (!player) return;

      const dt = Math.max(delta, 0) / 1000;
      const maxSpeed = getNumber(config, 'maxSpeed', 200);
      const acceleration = getNumber(config, 'acceleration', 600);
      const friction = getNumber(config, 'friction', 0.8);
      const move = getMoveVector();

      const desiredVx = move.x * maxSpeed;
      const desiredVy = move.y * maxSpeed;

      velocityX = approach(velocityX, desiredVx, acceleration * dt);
      velocityY = approach(velocityY, desiredVy, acceleration * dt);

      if (Math.abs(move.x) + Math.abs(move.y) <= EPSILON) {
        const frictionAccel = Math.max(0, friction) * maxSpeed;
        velocityX = approach(velocityX, 0, frictionAccel * dt);
        velocityY = approach(velocityY, 0, frictionAccel * dt);
      }

      player.x += velocityX * dt;
      player.y += velocityY * dt;

      const speed = Math.hypot(velocityX, velocityY);
      isMoving = speed > 1;

      if (!wasMoving && isMoving) {
        emitEvent?.('movement.started');
      }
      if (wasMoving && !isMoving) {
        emitEvent?.('movement.stopped');
      }
      wasMoving = isMoving;
    },

    dispose() {
      config = {};
      velocityX = 0;
      velocityY = 0;
      isMoving = false;
      wasMoving = false;
      emitEvent = null;
    },
  };
};
