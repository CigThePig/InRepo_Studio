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
  sliceHeight: number
): Promise<SliceResult[]> {
  if (sliceWidth <= 0 || sliceHeight <= 0) {
    throw new Error('Slice size must be greater than zero.');
  }

  const decoded = await decodeImage(blob);
  const { source, width, height } = decoded;

  const columns = Math.floor(width / sliceWidth);
  const rows = Math.floor(height / sliceHeight);
  const results: SliceResult[] = [];

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
