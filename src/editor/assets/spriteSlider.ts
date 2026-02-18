export interface SliceResult {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    const bitmap = await createImageBitmap(blob);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(blob);
  const img = new Image();
  const loaded = new Promise<DecodedImage>((resolve, reject) => {
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        cleanup: () => URL.revokeObjectURL(url),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image.'));
    };
  });
  img.src = url;
  return loaded;
}

export async function sliceImage(
  blob: Blob,
  sliceWidth: number,
  sliceHeight: number,
  options?: { skipEmpty?: boolean; nonEmptyMask?: boolean[][] }
): Promise<SliceResult[]> {
  if (sliceWidth <= 0 || sliceHeight <= 0) {
    throw new Error('Slice size must be greater than zero.');
  }

  const decoded = await decodeImage(blob);
  const { source, width, height } = decoded;

  const columns = Math.floor(width / sliceWidth);
  const rows = Math.floor(height / sliceHeight);
  const results: SliceResult[] = [];
  const skipEmpty = options?.skipEmpty === true;
  const mask = skipEmpty
    ? options?.nonEmptyMask ??
      (await computeNonEmptyTileMask(blob, sliceWidth, sliceHeight))
    : null;

  const canvas = document.createElement('canvas');
  canvas.width = sliceWidth;
  canvas.height = sliceHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    decoded.cleanup();
    throw new Error('Canvas context unavailable.');
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      if (skipEmpty && !mask?.[row]?.[col]) {
        continue;
      }
      const x = col * sliceWidth;
      const y = row * sliceHeight;
      ctx.clearRect(0, 0, sliceWidth, sliceHeight);
      ctx.drawImage(
        source,
        x,
        y,
        sliceWidth,
        sliceHeight,
        0,
        0,
        sliceWidth,
        sliceHeight
      );
      results.push({
        dataUrl: canvas.toDataURL('image/png'),
        x,
        y,
        width: sliceWidth,
        height: sliceHeight,
      });
    }
  }

  decoded.cleanup();
  return results;
}

export async function computeNonEmptyTileMask(
  blob: Blob,
  sliceWidth: number,
  sliceHeight: number,
  alphaThreshold = 8,
  coverageThreshold = 0.002
): Promise<boolean[][]> {
  if (sliceWidth <= 0 || sliceHeight <= 0) {
    throw new Error('Slice size must be greater than zero.');
  }

  const decoded = await decodeImage(blob);
  const { source, width, height } = decoded;
  const columns = Math.floor(width / sliceWidth);
  const rows = Math.floor(height / sliceHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    decoded.cleanup();
    throw new Error('Canvas context unavailable.');
  }

  ctx.drawImage(source, 0, 0, width, height);

  const tileArea = sliceWidth * sliceHeight;
  const minCoveragePixels = tileArea * coverageThreshold;
  const mask: boolean[][] = [];

  for (let row = 0; row < rows; row += 1) {
    const rowMask: boolean[] = [];
    for (let col = 0; col < columns; col += 1) {
      const x = col * sliceWidth;
      const y = row * sliceHeight;
      const data = ctx.getImageData(x, y, sliceWidth, sliceHeight).data;
      let nonTransparent = 0;
      for (let idx = 3; idx < data.length; idx += 4) {
        if (data[idx] >= alphaThreshold) {
          nonTransparent += 1;
        }
      }
      rowMask.push(nonTransparent >= minCoveragePixels);
    }
    mask.push(rowMask);
  }

  decoded.cleanup();
  return mask;
}

export async function sliceImageRegions(
  blob: Blob,
  regions: Array<{ x: number; y: number; w: number; h: number }>
): Promise<SliceResult[]> {
  const decoded = await decodeImage(blob);
  const { source } = decoded;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    decoded.cleanup();
    throw new Error('Canvas context unavailable.');
  }

  const results: SliceResult[] = [];
  for (const region of regions) {
    canvas.width = region.w;
    canvas.height = region.h;
    ctx.clearRect(0, 0, region.w, region.h);
    ctx.drawImage(source, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);
    results.push({
      dataUrl: canvas.toDataURL('image/png'),
      x: region.x,
      y: region.y,
      width: region.w,
      height: region.h,
    });
  }

  decoded.cleanup();
  return results;
}
