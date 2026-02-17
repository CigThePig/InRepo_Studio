import { describe, expect, it } from 'vitest';
import { parseAtlasJson } from './atlasImporter';

describe('parseAtlasJson', () => {
  it('parses Aseprite array format with duration', () => {
    const result = parseAtlasJson({
      frames: [
        { filename: 'attack_0.png', frame: { x: 0, y: 0, w: 16, h: 16 }, duration: 100 },
        { filename: 'attack_1.png', frame: { x: 16, y: 0, w: 16, h: 16 }, duration: 50 },
      ],
    }, 'atlas-source');

    expect(result.format).toBe('aseprite-array');
    expect(result.frames[0].name).toBe('attack_0');
    expect(result.frames[0].ref.durationMs).toBe(100);
    expect(result.frames[1].ref.rect.x).toBe(16);
  });

  it('parses Aseprite hash format with duration', () => {
    const result = parseAtlasJson({
      frames: {
        'idle_0.png': { frame: { x: 0, y: 0, w: 8, h: 8 }, duration: 120 },
      },
    }, 'atlas-source');

    expect(result.format).toBe('aseprite-hash');
    expect(result.frames).toHaveLength(1);
    expect(result.frames[0].name).toBe('idle_0');
    expect(result.frames[0].ref.durationMs).toBe(120);
  });

  it('parses texturepacker/phaser array format without duration', () => {
    const result = parseAtlasJson({
      frames: [
        { filename: 'hero-run-0', frame: { x: 0, y: 0, w: 32, h: 32 } },
      ],
    }, 'atlas-source');

    expect(['texturepacker-array', 'aseprite-array']).toContain(result.format);
    expect(result.frames[0].name).toBe('hero-run-0');
    expect(result.frames[0].ref.durationMs).toBeUndefined();
  });
});
