import { describe, expect, it } from 'vitest';
import { getPixelWidthFromImageLike } from './texturePixelSize';

describe('getPixelWidthFromImageLike', () => {
  it('uses naturalWidth when present', () => {
    expect(getPixelWidthFromImageLike({ naturalWidth: 512, width: 256 })).toBe(512);
  });

  it('uses width when naturalWidth is absent', () => {
    expect(getPixelWidthFromImageLike({ width: 512 })).toBe(512);
  });

  it('returns 0 for invalid inputs', () => {
    expect(getPixelWidthFromImageLike(null)).toBe(0);
    expect(getPixelWidthFromImageLike({})).toBe(0);
    expect(getPixelWidthFromImageLike({ width: '512' })).toBe(0);
    expect(getPixelWidthFromImageLike({ naturalWidth: 0, width: 0 })).toBe(0);
  });
});
