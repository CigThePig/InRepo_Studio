import type Phaser from 'phaser';
import type { PresetDefinition } from '../../../types/preset';
import type { AnimStateMachine, AnimTransition, TransitionCondition } from '@/types/animStateMachine';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';
import { getRuntimeEnv } from '../runtimeEnv';

export const definition: PresetDefinition = {
  id: 'state-machine-driver',
  category: 'animation',
  label: 'Animation State Machine',
  description:
    'Evaluates animation state machine transitions each tick and plays the current state\'s animation.',
  version: '1.0.0',
  tags: ['animation', 'state-machine', 'auto'],
  recommendedProfiles: ['topdown', 'platformer'],

  knobs: [
    {
      id: 'stateMachineId',
      label: 'State Machine',
      description: 'ID or name of the animation state machine to drive.',
      type: 'string',
      default: '',
      group: 'Basics',
    },
    {
      id: 'targetEntity',
      label: 'Target Entity',
      description: 'Entity ID to control. Leave empty for player.',
      type: 'string',
      default: '',
      group: 'Basics',
    },
  ],

  commands: [
    {
      id: 'stateMachine.trigger',
      label: 'Trigger State Machine Event',
      description: 'Trigger a named event on the state machine, potentially causing a transition.',
      args: [
        { name: 'eventId', type: 'string', label: 'Event ID' },
      ],
      keywords: ['trigger', 'event', 'state', 'machine'],
    },
    {
      id: 'stateMachine.forceState',
      label: 'Force State',
      description: 'Force the state machine to a specific state by state ID.',
      args: [
        { name: 'stateId', type: 'string', label: 'State ID' },
      ],
      keywords: ['force', 'state', 'set', 'jump'],
    },
  ],

  events: [
    {
      id: 'stateMachine.stateChanged',
      label: 'When State Changes',
      description: 'Fires when the state machine transitions to a new state.',
      payload: [
        { name: 'from', type: 'string', label: 'Previous State ID' },
        { name: 'to', type: 'string', label: 'New State ID' },
        { name: 'trigger', type: 'string', label: 'Transition trigger type' },
      ],
      keywords: ['state', 'change', 'transition'],
    },
  ],

  state: [
    {
      id: 'stateMachine.currentState',
      label: 'Current State',
      description: 'The ID of the currently active state in the state machine.',
      type: 'string',
      keywords: ['current', 'state', 'active'],
    },
    {
      id: 'stateMachine.currentStateName',
      label: 'Current State Name',
      description: 'The human-readable name of the currently active state.',
      type: 'string',
      keywords: ['current', 'state', 'name'],
    },
  ],

  compatibility: {
    compatibleWith: [
      'controls-topdown',
      'controls-platformer',
      'movement-topdown',
      'movement-platformer',
      'animation-driver',
      'entity-animator',
    ],
  },
};

export const factory: PresetFactory = (def): PresetInstance => {
  let stateMachineId = '';
  let targetEntityId = '';
  let machine: AnimStateMachine | null = null;
  let currentStateId = '';
  let currentAnimKey: string | null = null;
  let stateElapsedMs = 0;
  let animComplete = false;
  let pendingEvents: string[] = [];

  function resolveStateMachine(): AnimStateMachine | null {
    const env = getRuntimeEnv();
    if (!env || !stateMachineId) return null;
    const project = (env as unknown as { project?: { animStateMachines?: AnimStateMachine[] } }).project;
    const machines = project?.animStateMachines ?? [];

    // Try by ID first
    const byId = machines.find((sm) => sm.id === stateMachineId);
    if (byId) return byId;

    // Try by name (case-insensitive)
    const lower = stateMachineId.toLowerCase();
    const byName = machines.find((sm) => sm.name.toLowerCase() === lower);
    return byName ?? null;
  }

  function resolveKey(value: string): string | null {
    const env = getRuntimeEnv();
    return env?.resolveAnimationKey?.(value) ?? null;
  }

  function getTargetSprite(): Phaser.GameObjects.Sprite | null {
    const env = getRuntimeEnv();
    if (!env) return null;
    if (targetEntityId) {
      return env.getEntitySprite?.(targetEntityId) ?? null;
    }
    return env.getPlayerSprite();
  }

  function playAnimationForState(stateId: string): void {
    if (!machine) return;
    const state = machine.states.find((s) => s.id === stateId);
    if (!state) return;

    const key = resolveKey(state.animationId);
    if (!key) return;

    const sprite = getTargetSprite();
    if (!sprite) return;

    const env = getRuntimeEnv();
    const pivot = env?.getAnimationPivotByKey?.(key);
    if (pivot) sprite.setOrigin(pivot.x, pivot.y);

    if (currentAnimKey !== key) {
      sprite.anims.play(key, true);
      currentAnimKey = key;
    }
  }

  function evaluateCondition(condition: TransitionCondition): boolean {
    switch (condition.type) {
      case 'always':
        return true;

      case 'animComplete':
        return animComplete;

      case 'exitTime': {
        if (!machine) return false;
        const state = machine.states.find((s) => s.id === currentStateId);
        if (!state) return false;
        // Estimate total animation duration from the sprite's current animation
        const sprite = getTargetSprite();
        if (!sprite?.anims?.currentAnim) return false;
        const totalDuration = sprite.anims.currentAnim.duration || 1000;
        const normalizedTime = stateElapsedMs / totalDuration;
        return normalizedTime >= condition.normalizedTime;
      }

      case 'event':
        return pendingEvents.includes(condition.eventId);

      case 'state': {
        const env = getRuntimeEnv();
        if (!env) return false;
        // Read state from runtime env (e.g. "movement.isMoving")
        // We access it through the scene's registry or preset state
        const scene = env.scene;
        const value = scene?.registry?.get?.(condition.stateId);
        if (value === undefined) return false;
        const expected = condition.value;
        switch (condition.operator) {
          case '==': return value == expected;
          case '!=': return value != expected;
          case '>': return typeof value === 'number' && typeof expected === 'number' && value > expected;
          case '<': return typeof value === 'number' && typeof expected === 'number' && value < expected;
          default: return false;
        }
      }

      default:
        return false;
    }
  }

  function evaluateTransitions(): AnimTransition | null {
    if (!machine) return null;

    // Collect eligible transitions: from current state + wildcard '*'
    const eligible = machine.transitions.filter(
      (t) => t.fromStateId === currentStateId || t.fromStateId === '*'
    );

    // Sort by priority descending (higher first)
    // State-specific transitions come before wildcards at the same priority
    eligible.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      // State-specific before wildcard at same priority
      if (a.fromStateId === '*' && b.fromStateId !== '*') return 1;
      if (a.fromStateId !== '*' && b.fromStateId === '*') return -1;
      return 0;
    });

    for (const transition of eligible) {
      if (evaluateCondition(transition.condition)) {
        return transition;
      }
    }

    return null;
  }

  function transitionTo(stateId: string, trigger: string, registrar: PresetApiRegistrar | null): void {
    const previousStateId = currentStateId;
    currentStateId = stateId;
    stateElapsedMs = 0;
    animComplete = false;
    playAnimationForState(stateId);

    registrar?.emitEvent('stateMachine.stateChanged', {
      from: previousStateId,
      to: stateId,
      trigger,
    });
  }

  let registrarRef: PresetApiRegistrar | null = null;

  return {
    definition: def,

    applyConfig(config: Record<string, unknown>) {
      if (typeof config.stateMachineId === 'string') stateMachineId = config.stateMachineId;
      if (typeof config.targetEntity === 'string') targetEntityId = config.targetEntity;
    },

    registerApi(registrar: PresetApiRegistrar) {
      registrarRef = registrar;

      registrar.registerCommand('stateMachine.trigger', (args) => {
        const eventId = (args.eventId as string) || '';
        if (eventId) {
          pendingEvents.push(eventId);
        }
        return undefined;
      });

      registrar.registerCommand('stateMachine.forceState', (args) => {
        const stateId = (args.stateId as string) || '';
        if (!machine || !stateId) return undefined;
        const targetState = machine.states.find((s) => s.id === stateId);
        if (!targetState) return undefined;
        transitionTo(stateId, 'force', registrar);
        return undefined;
      });

      registrar.registerState(
        'stateMachine.currentState',
        () => currentStateId,
      );

      registrar.registerState(
        'stateMachine.currentStateName',
        () => {
          if (!machine) return '';
          const state = machine.states.find((s) => s.id === currentStateId);
          return state?.name ?? '';
        },
      );
    },

    update(delta: number) {
      // Lazy-resolve the state machine on first update
      if (!machine) {
        machine = resolveStateMachine();
        if (!machine) return;

        // Initialize to the initial state
        currentStateId = machine.initialStateId;
        playAnimationForState(currentStateId);
      }

      stateElapsedMs += delta;

      // Check if current animation completed
      const sprite = getTargetSprite();
      if (sprite?.anims) {
        const currentAnim = sprite.anims.currentAnim;
        if (currentAnim && sprite.anims.currentFrame) {
          const isLastFrame = sprite.anims.currentFrame === currentAnim.frames[currentAnim.frames.length - 1];
          const notLooping = currentAnim.repeat === 0 && !currentAnim.yoyo;
          if (isLastFrame && notLooping && !sprite.anims.isPlaying) {
            animComplete = true;
          }
        }
      }

      // Evaluate transitions
      const transition = evaluateTransitions();
      if (transition && transition.toStateId !== currentStateId) {
        transitionTo(transition.toStateId, transition.condition.type, registrarRef);
      }

      // Clear pending events at end of tick
      pendingEvents = [];
    },

    dispose() {
      machine = null;
      currentStateId = '';
      currentAnimKey = null;
      stateElapsedMs = 0;
      animComplete = false;
      pendingEvents = [];
      registrarRef = null;
    },
  };
};
