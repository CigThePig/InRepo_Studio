import type { LayerType, Scene } from '@/types';

export interface FloodFillConfig {
  scene: Scene;
  layer: LayerType;
  startX: number;
  startY: number;
  fillValue: number;
  maxTiles?: number;
}

export interface FloodFillResult {
  count: number;
  limitReached: boolean;
}

export function floodFill(config: FloodFillConfig): FloodFillResult {
  const { scene, layer, startX, startY, fillValue, maxTiles = 10000 } = config;
  const layerData = scene.layers[layer];
  const row = layerData[startY];
  const targetValue = row?.[startX];

  if (targetValue === undefined || targetValue === fillValue) {
    return { count: 0, limitReached: false };
  }

  const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  const visited = new Set<string>();
  let count = 0;

  while (queue.length > 0 && count < maxTiles) {
    const point = queue.shift();
    if (!point) break;

    const { x, y } = point;
    const key = `${x},${y}`;
    if (visited.has(key)) continue;

    if (x < 0 || x >= scene.width || y < 0 || y >= scene.height) {
      continue;
    }

    if (layerData[y][x] !== targetValue) {
      continue;
    }

    visited.add(key);
    layerData[y][x] = fillValue;
    count += 1;

    queue.push({ x: x + 1, y });
    queue.push({ x: x - 1, y });
    queue.push({ x, y: y + 1 });
    queue.push({ x, y: y - 1 });
  }

  return { count, limitReached: queue.length > 0 };
}
