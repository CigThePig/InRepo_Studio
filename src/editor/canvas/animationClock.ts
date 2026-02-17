import type { AnimationAsset, AnimationFrameRef, AnimationLoopMode } from '@/editor/assets/assetRegistry';

export interface AnimationFrameSnapshot {
  frame: AnimationFrameRef;
  pivot: { x: number; y: number };
}

export interface AnimationClock {
  register(animationId: string, animation: AnimationAsset): void;
  unregister(animationId: string): void;
  tick(deltaMs: number): Set<string>;
  getCurrentFrame(animationId: string): number;
  getCurrentFrameSnapshot(animationId: string): AnimationFrameSnapshot | null;
  reset(animationId?: string): void;
  destroy(): void;
}

interface PlaybackState {
  animation: AnimationAsset;
  frameDurations: number[];
  cumulativeDurations: number[];
  totalDurationMs: number;
  currentFrame: number;
  elapsedMs: number;
  loopMode: AnimationLoopMode;
  direction: 1 | -1;
}

const DEFAULT_FPS = 12;

function clampFps(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_FPS;
  return value;
}

function buildPlaybackState(animation: AnimationAsset): PlaybackState {
  const fps = clampFps(animation.fps);
  const fallbackDuration = 1000 / fps;
  const frameDurations = animation.frames.map((frame) => {
    const override = (frame as { durationMs?: number }).durationMs;
    return typeof override === 'number' && override > 0 ? override : fallbackDuration;
  });
  const cumulativeDurations: number[] = [];
  let sum = 0;
  for (const duration of frameDurations) {
    sum += duration;
    cumulativeDurations.push(sum);
  }

  return {
    animation,
    frameDurations,
    cumulativeDurations,
    totalDurationMs: sum,
    currentFrame: 0,
    elapsedMs: 0,
    loopMode: animation.loopMode,
    direction: 1,
  };
}

function findFrameIndex(cumulativeDurations: number[], elapsedMs: number): number {
  for (let i = 0; i < cumulativeDurations.length; i += 1) {
    if (elapsedMs < cumulativeDurations[i]) return i;
  }
  return cumulativeDurations.length - 1;
}

export function createAnimationClock(): AnimationClock {
  const states = new Map<string, PlaybackState>();

  function tickLoopOrOnce(state: PlaybackState, deltaMs: number): number {
    if (state.totalDurationMs <= 0 || state.animation.frames.length <= 1) {
      return state.currentFrame;
    }

    const maxElapsed = Math.max(0, state.totalDurationMs - 0.0001);
    if (state.loopMode === 'once') {
      state.elapsedMs = Math.min(maxElapsed, state.elapsedMs + deltaMs);
      return findFrameIndex(state.cumulativeDurations, state.elapsedMs);
    }

    const nextElapsed = state.elapsedMs + deltaMs;
    state.elapsedMs = ((nextElapsed % state.totalDurationMs) + state.totalDurationMs) % state.totalDurationMs;
    return findFrameIndex(state.cumulativeDurations, state.elapsedMs);
  }

  function tickPingPong(state: PlaybackState, deltaMs: number): number {
    if (state.animation.frames.length <= 1) {
      return 0;
    }

    let remaining = deltaMs;
    let frameIndex = state.currentFrame;
    let elapsedInFrame = state.elapsedMs;

    while (remaining > 0) {
      const frameDuration = state.frameDurations[frameIndex] ?? state.frameDurations[0] ?? 0;
      if (frameDuration <= 0) {
        break;
      }

      const timeLeft = frameDuration - elapsedInFrame;
      if (remaining < timeLeft) {
        elapsedInFrame += remaining;
        remaining = 0;
        break;
      }

      remaining -= timeLeft;
      elapsedInFrame = 0;

      if (state.direction === 1) {
        if (frameIndex >= state.animation.frames.length - 1) {
          state.direction = -1;
          frameIndex = Math.max(0, frameIndex - 1);
        } else {
          frameIndex += 1;
        }
      } else if (frameIndex <= 0) {
        state.direction = 1;
        frameIndex = Math.min(state.animation.frames.length - 1, frameIndex + 1);
      } else {
        frameIndex -= 1;
      }
    }

    state.elapsedMs = elapsedInFrame;
    return frameIndex;
  }

  return {
    register(animationId: string, animation: AnimationAsset): void {
      const current = states.get(animationId);
      if (current && current.animation.createdAt === animation.createdAt) {
        return;
      }
      states.set(animationId, buildPlaybackState(animation));
    },

    unregister(animationId: string): void {
      states.delete(animationId);
    },

    tick(deltaMs: number): Set<string> {
      const dirty = new Set<string>();
      if (deltaMs <= 0 || !Number.isFinite(deltaMs)) return dirty;

      for (const [animationId, state] of states.entries()) {
        if (state.animation.frames.length === 0) continue;
        const nextFrame = state.loopMode === 'pingpong'
          ? tickPingPong(state, deltaMs)
          : tickLoopOrOnce(state, deltaMs);

        if (nextFrame !== state.currentFrame) {
          state.currentFrame = nextFrame;
          dirty.add(animationId);
        }
      }

      return dirty;
    },

    getCurrentFrame(animationId: string): number {
      return states.get(animationId)?.currentFrame ?? 0;
    },

    getCurrentFrameSnapshot(animationId: string): AnimationFrameSnapshot | null {
      const state = states.get(animationId);
      if (!state) return null;
      const frame = state.animation.frames[state.currentFrame] ?? state.animation.frames[0];
      if (!frame) return null;
      return {
        frame,
        pivot: state.animation.pivot,
      };
    },

    reset(animationId?: string): void {
      if (animationId) {
        const state = states.get(animationId);
        if (!state) return;
        state.currentFrame = 0;
        state.elapsedMs = 0;
        state.direction = 1;
        return;
      }

      for (const state of states.values()) {
        state.currentFrame = 0;
        state.elapsedMs = 0;
        state.direction = 1;
      }
    },

    destroy(): void {
      states.clear();
    },
  };
}
