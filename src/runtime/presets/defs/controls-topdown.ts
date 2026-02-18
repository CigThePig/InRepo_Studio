import type { PresetDefinition } from '../../../types/preset';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';
import { getMoveVector } from '../../input/moveInput';

const EPSILON = 0.001;

function getBoolean(config: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = config[key];
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeMoveVector(config: Record<string, unknown>, x: number, y: number): { x: number; y: number } {
  const diagonalEnabled = getBoolean(config, 'diagonalEnabled', true);
  const diagonalNormalize = getBoolean(config, 'diagonalNormalize', true);
  let nx = x;
  let ny = y;

  if (!diagonalEnabled && Math.abs(nx) > EPSILON && Math.abs(ny) > EPSILON) {
    if (Math.abs(nx) >= Math.abs(ny)) {
      ny = 0;
    } else {
      nx = 0;
    }
  }

  if (diagonalNormalize && Math.abs(nx) > EPSILON && Math.abs(ny) > EPSILON) {
    const mag = Math.hypot(nx, ny);
    if (mag > EPSILON) {
      nx /= mag;
      ny /= mag;
    }
  }

  return { x: nx, y: ny };
}

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
  let moveX = 0;
  let moveY = 0;
  let isMoving = false;
  let previousMoveX = 0;
  let previousMoveY = 0;
  let previousMoving = false;
  let emitEvent: PresetApiRegistrar['emitEvent'] | null = null;

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

      emitEvent = registrar.emitEvent;
      registrar.registerState('controls.moveX', () => moveX);
      registrar.registerState('controls.moveY', () => moveY);
      registrar.registerState('controls.isMoving', () => isMoving);
    },

    update() {
      const move = getMoveVector();
      const normalized = normalizeMoveVector(config, move.x, move.y);
      moveX = normalized.x;
      moveY = normalized.y;
      isMoving = Math.abs(moveX) + Math.abs(moveY) > EPSILON;

      const directionChanged =
        Math.abs(previousMoveX - moveX) > EPSILON ||
        Math.abs(previousMoveY - moveY) > EPSILON;
      if (directionChanged) {
        emitEvent?.('controls.directionChanged', {
          dx: moveX,
          dy: moveY,
        });
      }

      if (previousMoving && !isMoving) {
        emitEvent?.('controls.stopped');
      }

      previousMoveX = moveX;
      previousMoveY = moveY;
      previousMoving = isMoving;
    },

    dispose() {
      config = {};
      moveX = 0;
      moveY = 0;
      isMoving = false;
      previousMoveX = 0;
      previousMoveY = 0;
      previousMoving = false;
      emitEvent = null;
    },
  };
};
