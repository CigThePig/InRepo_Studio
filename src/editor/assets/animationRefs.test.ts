import { describe, expect, it } from 'vitest';
import { collectAnimationReferences } from './animationRefs';

describe('collectAnimationReferences', () => {
  it('finds entity animationId references across scenes', () => {
    const hits = collectAnimationReferences('anim-run', {
      s1: {
        id: 's1',
        name: 'Scene 1',
        width: 10,
        height: 10,
        tileSize: 16,
        tilesets: [],
        layers: { ground: [], props: [], collision: [], triggers: [] },
        entities: [
          { id: 'e1', type: 'npc', x: 0, y: 0, properties: { animationId: 'anim-run' } },
          { id: 'e2', type: 'npc', x: 0, y: 0, properties: { animationId: 'anim-idle' } },
        ],
        propSprites: [],
      },
      s2: {
        id: 's2',
        name: 'Scene 2',
        width: 10,
        height: 10,
        tileSize: 16,
        tilesets: [],
        layers: { ground: [], props: [], collision: [], triggers: [] },
        entities: [
          { id: 'e3', type: 'npc', x: 0, y: 0, properties: { animationId: 'anim-run' } },
        ],
        propSprites: [],
      },
    });

    expect(hits).toEqual([
      { kind: 'entity', sceneId: 's1', entityId: 'e1', field: 'animationId' },
      { kind: 'entity', sceneId: 's2', entityId: 'e3', field: 'animationId' },
    ]);
  });
});
