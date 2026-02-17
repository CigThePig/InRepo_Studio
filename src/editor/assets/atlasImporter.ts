import type { AnimationFrameRef } from './assetRegistry';

export type AtlasImportFormat =
  | 'aseprite-array'
  | 'aseprite-hash'
  | 'texturepacker-array'
  | 'phaser-array';

export interface AtlasImportFrame {
  name: string;
  ref: AnimationFrameRef;
}

export interface AtlasImportResult {
  format: AtlasImportFormat;
  frames: AtlasImportFrame[];
}

interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function isFrameRect(value: unknown): value is FrameRect {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.x === 'number' &&
    typeof v.y === 'number' &&
    typeof v.w === 'number' &&
    typeof v.h === 'number'
  );
}

function parseDuration(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(1, Math.round(value));
}

function toUniqueName(baseName: string, used: Set<string>): string {
  const trimmed = baseName.trim() || 'frame';
  if (!used.has(trimmed)) {
    used.add(trimmed);
    return trimmed;
  }
  let index = 2;
  while (used.has(`${trimmed}-${index}`)) index += 1;
  const name = `${trimmed}-${index}`;
  used.add(name);
  return name;
}

function baseName(value: string): string {
  return value.replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '');
}

function parseArrayFrames(
  frames: unknown[],
  options: { includeDuration: boolean; nameKey: 'filename' | 'name' }
): Array<{ name: string; rect: FrameRect; durationMs?: number }> {
  const usedNames = new Set<string>();
  return frames.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Record<string, unknown>;
    const rect = record.frame;
    if (!isFrameRect(rect)) return [];
    const rawName = typeof record[options.nameKey] === 'string'
      ? String(record[options.nameKey])
      : `frame-${index + 1}`;
    return [{
      name: toUniqueName(baseName(rawName), usedNames),
      rect,
      durationMs: options.includeDuration ? parseDuration(record.duration) : undefined,
    }];
  });
}

export function parseAtlasJson(json: unknown, sourceAssetId: string): AtlasImportResult {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid atlas JSON: expected an object.');
  }

  const record = json as Record<string, unknown>;
  const frames = record.frames;

  if (Array.isArray(frames) && frames.every((entry) => typeof entry === 'object' && entry !== null && 'filename' in (entry as object))) {
    const parsed = parseArrayFrames(frames, { includeDuration: true, nameKey: 'filename' });
    const format: AtlasImportFormat = parsed.some((frame) => typeof frame.durationMs === 'number')
      ? 'aseprite-array'
      : 'texturepacker-array';
    return {
      format,
      frames: parsed.map((frame) => ({
        name: frame.name,
        ref: {
          sourceAssetId,
          rect: frame.rect,
          durationMs: frame.durationMs,
        },
      })),
    };
  }

  if (frames && typeof frames === 'object' && !Array.isArray(frames)) {
    const usedNames = new Set<string>();
    const parsed = Object.entries(frames).flatMap(([key, value]) => {
      if (!value || typeof value !== 'object') return [];
      const frameRecord = value as Record<string, unknown>;
      if (!isFrameRect(frameRecord.frame)) return [];
      return [{
        name: toUniqueName(baseName(key), usedNames),
        rect: frameRecord.frame,
        durationMs: parseDuration(frameRecord.duration),
      }];
    });
    return {
      format: 'aseprite-hash',
      frames: parsed.map((frame) => ({
        name: frame.name,
        ref: {
          sourceAssetId,
          rect: frame.rect,
          durationMs: frame.durationMs,
        },
      })),
    };
  }

  if (Array.isArray(frames)) {
    const parsed = parseArrayFrames(frames, { includeDuration: false, nameKey: 'name' });
    return {
      format: 'phaser-array',
      frames: parsed.map((frame) => ({
        name: frame.name,
        ref: {
          sourceAssetId,
          rect: frame.rect,
        },
      })),
    };
  }

  throw new Error('Unsupported atlas JSON format.');
}
