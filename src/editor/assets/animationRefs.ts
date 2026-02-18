import type { Scene } from '@/types';
import type { AnimationSetAsset, AnimStateMachineAsset, Facing4 } from './assetRegistry';

export interface AnimationEntityReferenceHit {
  kind: 'entity';
  entityId: string;
  sceneId: string;
  field: 'animationId' | 'animationSetId' | 'animStateMachineId';
}

export interface AnimationSetReferenceHit {
  kind: 'animationSet';
  setId: string;
  facing?: Facing4;
}

export interface AnimStateMachineReferenceHit {
  kind: 'animStateMachine';
  smId: string;
  stateId?: string;
}

export type AnimationReferenceHit =
  | AnimationEntityReferenceHit
  | AnimationSetReferenceHit
  | AnimStateMachineReferenceHit;

export function collectAnimationReferences(
  animationId: string,
  scenes: Record<string, Scene>,
  animationSets: AnimationSetAsset[] = [],
  stateMachines: AnimStateMachineAsset[] = []
): AnimationReferenceHit[] {
  const target = animationId.trim();
  if (!target) return [];

  const hits: AnimationReferenceHit[] = [];

  // Check entity references
  for (const scene of Object.values(scenes)) {
    for (const entity of scene.entities ?? []) {
      const value = entity.properties?.animationId;
      if (typeof value !== 'string') continue;
      if (value !== target) continue;
      hits.push({
        kind: 'entity',
        entityId: entity.id,
        sceneId: scene.id,
        field: 'animationId',
      });
    }
  }

  // Check animation set references
  for (const animationSet of animationSets) {
    (Object.entries(animationSet.directions) as Array<[Facing4, string]>).forEach(([facing, value]) => {
      if (value !== target) return;
      hits.push({
        kind: 'animationSet',
        setId: animationSet.id,
        facing,
      });
    });
  }

  // Check state machine references (Track F)
  for (const sm of stateMachines) {
    for (const state of sm.states) {
      if (state.animationId === target) {
        hits.push({
          kind: 'animStateMachine',
          smId: sm.id,
          stateId: state.id,
        });
      }
    }
  }

  return hits;
}
