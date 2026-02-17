import type { Scene } from '@/types';

export interface AnimationEntityReferenceHit {
  kind: 'entity';
  entityId: string;
  sceneId: string;
  field: 'animationId' | 'animationSetId' | 'animStateMachineId';
}

export type AnimationReferenceHit = AnimationEntityReferenceHit;

export function collectAnimationReferences(
  animationId: string,
  scenes: Record<string, Scene>
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

  return hits;
}
