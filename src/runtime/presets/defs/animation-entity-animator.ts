/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Entity animation preset definition + runtime behavior.
 *
 * Defines:
 * - PresetDefinition (entity-animation-animator)
 *
 * Canonical key set:
 * - Knobs: defaultAnim, autoFacing, phaseMode
 * - Commands: entity.playAnim, entity.stopAnim
 * - Events: entity.animComplete
 * - State: entity.currentAnim
 *
 * Apply/Rebuild semantics:
 * - Apply mode: live (config changes applied through PresetManager)
 */

import Phaser from 'phaser';
import type { PresetDefinition } from '../../../types/preset';
import type {
  PresetFactory,
  PresetInstance,
  PresetApiRegistrar,
} from '../presetInstance';
import { getRuntimeEnv } from '../runtimeEnv';

export const definition: PresetDefinition = {
  id: 'entity-animation-animator',
  category: 'entity-animation',
  label: 'Entity Animator',
  description:
    'Controls non-player entity animations with Blockly commands. If you target the player entity, this preset temporarily suppresses Animation Driver auto-selection.',
  version: '1.0.0',
  tags: ['animation', 'entities', 'blockly'],

  knobs: [
    {
      id: 'defaultAnim',
      label: 'Default Animation',
      description: 'Animation to auto-play on entities that are idle.',
      type: 'string',
      default: 'idle',
      group: 'Basics',
    },
    {
      id: 'autoFacing',
      label: 'Auto-Facing',
      description: 'Flip entities horizontally based on movement direction.',
      type: 'boolean',
      default: false,
      group: 'Basics',
    },
    {
      id: 'phaseMode',
      label: 'Animation Phase',
      description:
        'sync = all instances align, hash = deterministic per-entity phase offset.',
      type: 'enum',
      default: 'sync',
      constraints: { options: ['sync', 'hash'] },
      group: 'Advanced',
      advanced: true,
    },
  ],

  commands: [
    {
      id: 'entity.playAnim',
      label: 'Play Entity Animation',
      description: 'Play an animation on an entity by id.',
      args: [
        { name: 'entityId', type: 'entityId', label: 'Entity ID' },
        { name: 'key', type: 'string', label: 'Animation (id/name/key)' },
        { name: 'loop', type: 'boolean', label: 'Loop', default: true },
      ],
      keywords: ['entity', 'animation', 'play'],
    },
    {
      id: 'entity.stopAnim',
      label: 'Stop Entity Animation',
      description: 'Stop animation playback on an entity by id.',
      args: [{ name: 'entityId', type: 'entityId', label: 'Entity ID' }],
      keywords: ['entity', 'animation', 'stop'],
    },
  ],

  events: [
    {
      id: 'entity.animComplete',
      label: 'When Entity Animation Completes',
      description: 'Fires when a non-looping entity animation completes.',
      payload: [
        { name: 'entityId', type: 'string', label: 'Entity ID' },
        { name: 'key', type: 'string', label: 'Animation Key' },
      ],
      keywords: ['entity', 'animation', 'complete'],
    },
  ],

  state: [
    {
      id: 'entity.currentAnim',
      label: 'Entity Current Animation',
      description:
        'Last animation key played by this preset in the format "entityId:key".',
      type: 'string',
      keywords: ['entity', 'animation', 'current'],
    },
  ],

  compatibility: {
    compatibleWith: [
      'controls-topdown',
      'controls-platformer',
      'movement-topdown',
      'movement-platformer',
      'camera-follow',
      'animation-driver',
      'entity-animation-animator',
    ],
  },
};

type PhaseMode = 'sync' | 'hash';

interface EntityAnimState {
  lastX: number;
  lastY: number;
}

const PLAYER_OVERRIDE_MS = 1500;

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function applyDeterministicPhase(sprite: Phaser.GameObjects.Sprite, entityId: string): void {
  const anim = sprite.anims.currentAnim;
  if (!anim) return;
  const durationMs = Math.max(1, anim.duration || 0);
  if (!durationMs) return;

  const offsetMs = hashString(entityId) % durationMs;
  sprite.anims.setProgress(offsetMs / durationMs);
}

export const factory: PresetFactory = (def): PresetInstance => {
  let defaultAnim = 'idle';
  let autoFacing = false;
  let phaseMode: PhaseMode = 'sync';
  let emitEvent: PresetApiRegistrar['emitEvent'] | null = null;
  let lastCurrentAnim = '';
  const entityState = new Map<string, EntityAnimState>();
  const completionHandlers = new Map<string, (animation: Phaser.Animations.Animation) => void>();

  function resolveAnimationKey(raw: string): string {
    const env = getRuntimeEnv();
    return env?.resolveAnimationKey?.(raw) ?? raw;
  }

  function playAnimation(
    entityId: string,
    rawAnimationKey: string,
    loop: boolean
  ): void {
    const env = getRuntimeEnv();
    const sprite = env?.getEntitySprite?.(entityId);
    if (!env || !sprite) return;

    const animationKey = resolveAnimationKey(rawAnimationKey);
    if (!sprite.scene.anims.exists(animationKey)) return;

    const pivot = env.getAnimationPivotByKey?.(animationKey);
    if (pivot) sprite.setOrigin(pivot.x, pivot.y);

    sprite.anims.play(animationKey, loop);
    if (phaseMode === 'hash') {
      applyDeterministicPhase(sprite, entityId);
    }

    if (env.getPlayerSprite() === sprite) {
      env.setPlayerAnimationOverride?.(PLAYER_OVERRIDE_MS);
    }

    const prevHandler = completionHandlers.get(entityId);
    if (prevHandler) {
      sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, prevHandler);
    }
    const nextHandler = (animation: Phaser.Animations.Animation) => {
      if (animation.key !== animationKey) return;
      emitEvent?.('entity.animComplete', { entityId, key: animation.key });
    };
    completionHandlers.set(entityId, nextHandler);
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, nextHandler);

    lastCurrentAnim = `${entityId}:${animationKey}`;
  }

  return {
    definition: def,

    applyConfig(config: Record<string, unknown>) {
      defaultAnim = toString(config.defaultAnim, 'idle');
      autoFacing = toBoolean(config.autoFacing, false);
      const rawPhase = toString(config.phaseMode, 'sync');
      phaseMode = rawPhase === 'hash' ? 'hash' : 'sync';
    },

    registerApi(registrar: PresetApiRegistrar) {
      emitEvent = registrar.emitEvent;

      registrar.registerCommand('entity.playAnim', (args) => {
        const entityId = toString(args.entityId, '');
        const key = toString(args.key, defaultAnim);
        const loop = toBoolean(args.loop, true);
        if (!entityId || !key) return undefined;
        playAnimation(entityId, key, loop);
        return undefined;
      });

      registrar.registerCommand('entity.stopAnim', (args) => {
        const entityId = toString(args.entityId, '');
        if (!entityId) return undefined;

        const env = getRuntimeEnv();
        const sprite = env?.getEntitySprite?.(entityId);
        if (!env || !sprite) return undefined;
        sprite.anims.stop();
        if (env.getPlayerSprite() === sprite) {
          env.setPlayerAnimationOverride?.(0);
        }
        return undefined;
      });

      registrar.registerState('entity.currentAnim', () => lastCurrentAnim);
    },

    update() {
      const env = getRuntimeEnv();
      const sprites = env?.getAllEntitySprites?.();
      if (!env || !sprites) return;

      for (const [entityId, sprite] of sprites.entries()) {
        if (!sprite.active) continue;

        if (!sprite.anims.isPlaying && defaultAnim) {
          playAnimation(entityId, defaultAnim, true);
        }

        const prev = entityState.get(entityId) ?? {
          lastX: sprite.x,
          lastY: sprite.y,
        };

        if (autoFacing) {
          const dx = sprite.x - prev.lastX;
          if (Math.abs(dx) > 0.01) {
            sprite.setFlipX(dx < 0);
          }
        }

        prev.lastX = sprite.x;
        prev.lastY = sprite.y;
        entityState.set(entityId, prev);
      }
    },

    dispose() {
      const env = getRuntimeEnv();
      if (env?.getAllEntitySprites) {
        const sprites = env.getAllEntitySprites();
        for (const [entityId, handler] of completionHandlers.entries()) {
          sprites.get(entityId)?.off(Phaser.Animations.Events.ANIMATION_COMPLETE, handler);
        }
      }
      completionHandlers.clear();
      entityState.clear();
      emitEvent = null;
      lastCurrentAnim = '';
    },
  };
};
