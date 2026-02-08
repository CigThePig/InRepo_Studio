/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Game API contract types — the single doorway for Presets and Blockly.
 *
 * Defines:
 * - ApiContext — top-level API shape (meta, events, time, log, entities, presets, call, on, read)
 * - EventBus — scene-scoped event pub/sub
 * - TimeHelpers — safe timer wrappers
 * - LogApi — structured logging
 * - EntityHandle — stable entity reference (no raw Phaser)
 * - PresetSurface — enabled preset modules
 * - ApiMeta — version + registry metadata + logicTarget
 *
 * Canonical key set:
 * - Keys defined here; used by PresetManager, ScriptHost, and Blockly codegen.
 * - Category prefixes: controls.*, movement.*, camera.*, animation.*
 *
 * Apply/Rebuild semantics:
 * - Apply mode: scene-scoped (created per playable Scene, disposed on shutdown)
 *
 * Verification:
 * - [ ] Types compile with isolatedModules
 * - [ ] Generic call/on/read methods cover all Blockly codegen patterns
 */

// --- Disposer ---

/** A function that cancels a subscription or timer. */
export type Disposer = () => void;

// --- Timer handle ---

export type TimerHandle = Disposer;

// --- Event Bus ---

export interface EventBus {
  /** Subscribe to an event. Returns a disposer. */
  on(eventId: string, handler: (payload: Record<string, unknown>) => void): Disposer;
  /** Subscribe once. Returns a disposer. */
  once(eventId: string, handler: (payload: Record<string, unknown>) => void): Disposer;
  /** Unsubscribe a specific handler. */
  off(eventId: string, handler: (payload: Record<string, unknown>) => void): void;
  /** Emit an event. Payload must be plain JSON. */
  emit(eventId: string, payload?: Record<string, unknown>): void;
  /** List registered event IDs (debug/introspection). */
  list(): string[];
}

// --- Time Helpers ---

export interface TimeHelpers {
  /** Execute fn after ms. Returns cancellation handle. */
  after(ms: number, fn: () => void): TimerHandle;
  /** Execute fn every ms. Returns cancellation handle. Min interval: 50ms. */
  every(ms: number, fn: () => void): TimerHandle;
  /** Cancel a timer by handle. */
  clear(handle: TimerHandle): void;
}

// --- Log API ---

export interface LogApi {
  info(msg: string, details?: Record<string, unknown>): void;
  warn(msg: string, details?: Record<string, unknown>): void;
  error(msg: string, details?: Record<string, unknown>): void;
  event(eventId: string, payload?: Record<string, unknown>): void;
}

// --- Entity Handle ---

export interface EntityHandle {
  readonly id: string;
  readonly type: string;
  readonly x: number;
  readonly y: number;
  readonly exists: boolean;
}

// --- Entity Lookup ---

export interface EntityLookup {
  getById(id: string): EntityHandle | null;
  getByTag(tag: string): EntityHandle[];
  setTag(entityId: string, tag: string, enabled: boolean): void;
  exists(id: string): boolean;
}

// --- Preset Surface ---

export interface PresetCategorySurface {
  readonly categoryId: string;
  readonly presetId: string;
  readonly enabled: boolean;
}

export interface PresetSurface {
  getCategory(categoryId: string): PresetCategorySurface | null;
  isEnabled(categoryId: string): boolean;
  activePresetId(categoryId: string): string | null;
}

// --- Logic Target ---

export type LogicTargetType = 'game' | 'map';

export interface LogicTargetMeta {
  readonly type: LogicTargetType;
  readonly id: string;
  readonly label: string;
}

// --- API Meta ---

export interface ApiMeta {
  readonly apiVersion: string;
  readonly schemaVersion: number;
  readonly logicTarget: LogicTargetMeta;
  readonly categories: string[];
  readonly capabilities: Record<string, boolean>;
}

// --- ApiContext (top-level) ---

export interface ApiContext {
  readonly meta: ApiMeta;
  readonly events: EventBus;
  readonly time: TimeHelpers;
  readonly log: LogApi;
  readonly entities: EntityLookup;
  readonly presets: PresetSurface;

  /** Generic command call (used by Blockly codegen). */
  call(commandId: string, args?: Record<string, unknown>): unknown;
  /** Generic event subscription (used by Blockly codegen). Returns disposer. */
  on(eventId: string, handler: (payload: Record<string, unknown>) => void): Disposer;
  /** Generic state read (used by Blockly codegen). */
  read(stateId: string): unknown;
}
