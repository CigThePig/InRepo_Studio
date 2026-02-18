function readPositiveNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function getPixelWidthFromImageLike(source: unknown): number {
  if (!source || typeof source !== 'object') {
    return 0;
  }

  const naturalWidth = readPositiveNumber((source as { naturalWidth?: unknown }).naturalWidth);
  if (naturalWidth > 0) {
    return naturalWidth;
  }

  return readPositiveNumber((source as { width?: unknown }).width);
}

export function getPixelHeightFromImageLike(source: unknown): number {
  if (!source || typeof source !== 'object') {
    return 0;
  }

  const naturalHeight = readPositiveNumber((source as { naturalHeight?: unknown }).naturalHeight);
  if (naturalHeight > 0) {
    return naturalHeight;
  }

  return readPositiveNumber((source as { height?: unknown }).height);
}
