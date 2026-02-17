import type { Scene } from '@/types';
import type { AnimationSetAsset, Facing4 } from './assetRegistry';

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

export type AnimationReferenceHit = AnimationEntityReferenceHit | AnimationSetReferenceHit;

export function collectAnimationReferences(
  animationId: string,
  scenes: Record<string, Scene>,
  animationSets: AnimationSetAsset[] = []
): AnimationReferenceHit[] {
  const target = animationId.trim();
  if (!target) return [];

  const hits: AnimationReferenceHit[] = [];
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

  return hits;
}
