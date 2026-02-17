import { describe, expect, it } from 'vitest';
import { createAnimationClock } from './animationClock';
import type { AnimationAsset } from '@/editor/assets/assetRegistry';

function makeAnimation(overrides: Partial<AnimationAsset> = {}): AnimationAsset {
  return {
    id: 'anim-run',
    name: 'Run',
    fps: 10,
    loopMode: 'loop',
    pivot: { x: 0.5, y: 0.5 },
    createdAt: 1,
    frames: [
      { sourceAssetId: 'asset-1', rect: { x: 0, y: 0, w: 16, h: 16 } },
      { sourceAssetId: 'asset-1', rect: { x: 16, y: 0, w: 16, h: 16 } },
      { sourceAssetId: 'asset-1', rect: { x: 32, y: 0, w: 16, h: 16 } },
    ],
    ...overrides,
  };
}

describe('animationClock', () => {
  it('advances frames at configured fps', () => {
    const clock = createAnimationClock();
    clock.register('anim-run', makeAnimation({ fps: 10 }));

    expect(clock.getCurrentFrame('anim-run')).toBe(0);

    const dirty = clock.tick(100);

    expect(dirty.has('anim-run')).toBe(true);
    expect(clock.getCurrentFrame('anim-run')).toBe(1);
  });

  it('respects once loop mode by stopping on last frame', () => {
    const clock = createAnimationClock();
    clock.register('anim-once', makeAnimation({ loopMode: 'once' }));

    clock.tick(1000);

    expect(clock.getCurrentFrame('anim-once')).toBe(2);
    const dirty = clock.tick(500);
    expect(dirty.has('anim-once')).toBe(false);
    expect(clock.getCurrentFrame('anim-once')).toBe(2);
  });

  it('supports pingpong loop mode', () => {
    const clock = createAnimationClock();
    clock.register('anim-pingpong', makeAnimation({ loopMode: 'pingpong' }));

    clock.tick(100); // 0 -> 1
    clock.tick(100); // 1 -> 2
    clock.tick(100); // 2 -> 1

    expect(clock.getCurrentFrame('anim-pingpong')).toBe(1);
  });
});
