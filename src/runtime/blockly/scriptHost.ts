/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: ScriptHost — Blockly script execution engine.
 *
 * Defines:
 * - ScriptHost — manages multiple script lifecycles (compile, run, stop, error)
 * - ScriptState — per-script state machine (stopped → running → error)
 * - ScriptEntry — per-script tracking (disposers, state, error info)
 * - ScriptErrorInfo — structured error information with Logic Target attribution
 *
 * Canonical key set:
 * - Lifecycle events: script.starting, script.started, script.stopping, script.stopped, script.error
 * - States: stopped, running, error
 *
 * Apply/Rebuild semantics:
 * - Apply mode: scene-scoped (one ScriptHost per SceneHost, disposed on shutdown)
 *
 * Verification:
 * - [ ] Lifecycle transitions: Stopped → Running → Error → Stopped
 * - [ ] Multi-script: Game Logic + Map Logic run simultaneously
 * - [ ] Error in one script does not stop the other
 * - [ ] Lifecycle events emitted on shared EventBus
 * - [ ] All disposers tracked and cleaned up on stop/dispose
 * - [ ] Recursion guard prevents runaway handler chains
 */

import type { ApiContext, Disposer } from '../../types/gameApi';
import type { ScriptLogicTarget } from '../../types/script';

// --- Constants ---

const MAX_RECURSION_DEPTH = 32;

// --- Types ---

/** Script execution state. */
export type ScriptState = 'stopped' | 'running' | 'error';

/** Structured error information with Logic Target attribution. */
export interface ScriptErrorInfo {
  readonly message: string;
  readonly blockId?: string;
  readonly stack?: string;
  readonly logicTarget: ScriptLogicTarget;
}

/** Per-script tracking entry (internal). */
export interface ScriptEntry {
  readonly scriptId: string;
  readonly logicTarget: ScriptLogicTarget;
  state: ScriptState;
  disposers: Disposer[];
  errorInfo?: ScriptErrorInfo;
}

/**
 * A register function produced by compiling a Blockly workspace.
 *
 * The function receives the ApiContext, registers event handlers and timers,
 * and returns a list of disposers for cleanup.
 *
 * Generated JS structure:
 * ```js
 * function register(api) {
 *   const disposers = [];
 *   disposers.push(api.on("movement.landed", (payload) => { ... }));
 *   disposers.push(api.time.every(1000, () => { ... }));
 *   return disposers;
 * }
 * ```
 */
export type ScriptRegisterFn = (api: ApiContext) => Disposer[];

/**
 * Options for starting a script.
 * In v1, provide either a register function directly or raw JS source.
 * Real Blockly codegen (workspace JSON → JS) will be wired in Tracks 37-38.
 */
export interface StartScriptOptions {
  readonly scriptId: string;
  readonly logicTarget: ScriptLogicTarget;
  /** Pre-compiled register function (preferred for testing and direct use). */
  readonly registerFn?: ScriptRegisterFn;
  /** Raw JS source string that evaluates to a register(api) function body. */
  readonly jsSource?: string;
}

// --- ScriptHost ---

/**
 * ScriptHost — the Blockly script execution engine.
 *
 * Manages multiple scripts simultaneously (Game Logic + Map Logic).
 * Each script has independent state: one script erroring doesn't affect others.
 * All scripts share the same ApiContext (event bus, timers, presets).
 *
 * Owned by SceneHost. Dispose on scene shutdown.
 */
export class ScriptHost {
  private readonly apiContext: ApiContext;
  private readonly scripts = new Map<string, ScriptEntry>();
  private recursionDepth = 0;
  private disposed = false;

  constructor(apiContext: ApiContext) {
    this.apiContext = apiContext;
  }

  /**
   * Start a script. Compiles (if needed) and executes the register function.
   *
   * If the script is already running, it is stopped first.
   * Emits script.starting and script.started lifecycle events.
   * On compilation or registration error, transitions to Error state.
   */
  startScript(options: StartScriptOptions): void {
    if (this.disposed) return;

    const { scriptId, logicTarget } = options;

    // Stop existing script with same ID
    if (this.scripts.has(scriptId)) {
      this.stopScript(scriptId);
    }

    // Create entry
    const entry: ScriptEntry = {
      scriptId,
      logicTarget,
      state: 'stopped',
      disposers: [],
    };
    this.scripts.set(scriptId, entry);

    // Emit starting event
    this.emitLifecycle('script.starting', entry);

    // Resolve register function
    let registerFn: ScriptRegisterFn;
    try {
      registerFn = this.resolveRegisterFn(options);
    } catch (err) {
      this.transitionToError(entry, err, 'Compilation failed');
      return;
    }

    // Execute register function with error boundary
    try {
      const wrappedApi = this.createWrappedApi(entry);
      const disposers = registerFn(wrappedApi);

      if (Array.isArray(disposers)) {
        entry.disposers.push(...disposers);
      }

      entry.state = 'running';
      this.emitLifecycle('script.started', entry);
    } catch (err) {
      this.transitionToError(entry, err, 'Registration failed');
    }
  }

  /**
   * Stop a specific script. Cancels all its timers and subscriptions.
   * Emits script.stopping and script.stopped lifecycle events.
   */
  stopScript(scriptId: string): void {
    const entry = this.scripts.get(scriptId);
    if (!entry) return;

    if (entry.state === 'stopped') {
      this.scripts.delete(scriptId);
      return;
    }

    this.emitLifecycle('script.stopping', entry);
    this.disposeEntry(entry);
    entry.state = 'stopped';
    this.emitLifecycle('script.stopped', entry);
    this.scripts.delete(scriptId);
  }

  /** Stop all running scripts. */
  stopAll(): void {
    const ids = Array.from(this.scripts.keys());
    for (const id of ids) {
      this.stopScript(id);
    }
  }

  /** Get the current state of a script. Returns 'stopped' if not found. */
  getScriptState(scriptId: string): ScriptState {
    return this.scripts.get(scriptId)?.state ?? 'stopped';
  }

  /** Get error info for a script in Error state. Returns undefined otherwise. */
  getScriptError(scriptId: string): ScriptErrorInfo | undefined {
    return this.scripts.get(scriptId)?.errorInfo;
  }

  /** Get IDs of all currently running scripts. */
  getRunningScriptIds(): string[] {
    const ids: string[] = [];
    for (const [id, entry] of this.scripts) {
      if (entry.state === 'running') ids.push(id);
    }
    return ids;
  }

  /** Get IDs of all tracked scripts (any state). */
  getAllScriptIds(): string[] {
    return Array.from(this.scripts.keys());
  }

  /** Whether this ScriptHost has been disposed. */
  isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Dispose the ScriptHost. Stops all scripts and clears all references.
   * After disposal, no scripts can be started.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopAll();
    this.scripts.clear();
  }

  // --- Private helpers ---

  /**
   * Resolve a register function from the start options.
   * Accepts either a pre-built function or raw JS source.
   */
  private resolveRegisterFn(options: StartScriptOptions): ScriptRegisterFn {
    if (options.registerFn) {
      return options.registerFn;
    }

    if (options.jsSource) {
      return this.compileJsSource(options.jsSource);
    }

    throw new Error(
      `No register function or JS source provided for script "${options.scriptId}"`,
    );
  }

  /**
   * Compile raw JS source into a register function.
   *
   * v1 compilation: wraps source in a Function constructor.
   * The source must define the body of a function that takes `api` and returns Disposer[].
   *
   * Security boundary: the generated code only has access to `api` (the Game API).
   * No raw Phaser, DOM, window, or imports are available.
   */
  private compileJsSource(source: string): ScriptRegisterFn {
    try {
      // The source should be the body of: function(api) { ...source... }
      // It must return an array of disposer functions.
      // eslint-disable-next-line no-new-func
      const fn = new Function('api', source) as ScriptRegisterFn;
      return fn;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown compilation error';
      throw new Error(`Failed to compile script: ${message}`);
    }
  }

  /**
   * Create a wrapped ApiContext for a specific script entry.
   *
   * The wrapper adds:
   * - Recursion depth tracking on event handlers
   * - Error boundary that transitions the script to Error state
   * - Disposer tracking for the script entry
   */
  private createWrappedApi(entry: ScriptEntry): ApiContext {
    const host = this;
    const baseApi = this.apiContext;

    return {
      meta: baseApi.meta,
      events: baseApi.events,
      time: {
        after(ms: number, fn: () => void) {
          const handle = baseApi.time.after(ms, () => {
            host.safeExecute(entry, fn);
          });
          entry.disposers.push(handle);
          return handle;
        },
        every(ms: number, fn: () => void) {
          const handle = baseApi.time.every(ms, () => {
            host.safeExecute(entry, fn);
          });
          entry.disposers.push(handle);
          return handle;
        },
        clear: baseApi.time.clear,
      },
      log: baseApi.log,
      entities: baseApi.entities,
      presets: baseApi.presets,

      call(commandId: string, args?: Record<string, unknown>): unknown {
        return host.safeExecuteWithReturn(entry, () =>
          baseApi.call(commandId, args),
        );
      },

      on(
        eventId: string,
        handler: (payload: Record<string, unknown>) => void,
      ): Disposer {
        const wrappedHandler = (payload: Record<string, unknown>) => {
          host.safeExecute(entry, () => handler(payload));
        };
        const disposer = baseApi.on(eventId, wrappedHandler);
        entry.disposers.push(disposer);
        return disposer;
      },

      read(stateId: string): unknown {
        return baseApi.read(stateId);
      },
    };
  }

  /**
   * Safely execute a function within the context of a script entry.
   * Handles recursion depth tracking and error transitions.
   */
  private safeExecute(entry: ScriptEntry, fn: () => void): void {
    if (entry.state !== 'running') return;
    if (this.disposed) return;

    // Recursion guard
    if (this.recursionDepth >= MAX_RECURSION_DEPTH) {
      this.transitionToError(
        entry,
        new Error(`Recursion depth exceeded (max ${MAX_RECURSION_DEPTH})`),
        'Recursion limit exceeded',
      );
      return;
    }

    this.recursionDepth++;
    try {
      fn();
    } catch (err) {
      this.transitionToError(entry, err, 'Runtime error in handler');
    } finally {
      this.recursionDepth--;
    }
  }

  /**
   * Safely execute a function that returns a value.
   * On error, transitions to Error and returns undefined.
   */
  private safeExecuteWithReturn(
    entry: ScriptEntry,
    fn: () => unknown,
  ): unknown {
    if (entry.state !== 'running') return undefined;
    if (this.disposed) return undefined;

    if (this.recursionDepth >= MAX_RECURSION_DEPTH) {
      this.transitionToError(
        entry,
        new Error(`Recursion depth exceeded (max ${MAX_RECURSION_DEPTH})`),
        'Recursion limit exceeded',
      );
      return undefined;
    }

    this.recursionDepth++;
    try {
      return fn();
    } catch (err) {
      this.transitionToError(entry, err, 'Runtime error in command call');
      return undefined;
    } finally {
      this.recursionDepth--;
    }
  }

  /**
   * Transition a script entry to Error state.
   * Disposes all its registrations, preserves error info, emits script.error.
   */
  private transitionToError(
    entry: ScriptEntry,
    err: unknown,
    context: string,
  ): void {
    const message =
      err instanceof Error ? err.message : String(err);
    const stack =
      err instanceof Error ? err.stack : undefined;

    entry.errorInfo = {
      message: `${context}: ${message}`,
      logicTarget: entry.logicTarget,
      stack,
    };

    // Dispose all subscriptions/timers for this script
    this.disposeEntry(entry);
    entry.state = 'error';

    // Emit error event
    this.apiContext.events.emit('script.error', {
      scriptId: entry.scriptId,
      logicTarget: entry.logicTarget as unknown as Record<string, unknown>,
      message: entry.errorInfo.message,
      ...(entry.errorInfo.blockId ? { blockId: entry.errorInfo.blockId } : {}),
      ...(stack ? { stack } : {}),
    });

    this.apiContext.log.error(
      `[ScriptHost] ${context} in "${entry.scriptId}": ${message}`,
      { logicTarget: entry.logicTarget as unknown as Record<string, unknown> },
    );
  }

  /** Dispose all subscriptions/timers for a script entry. */
  private disposeEntry(entry: ScriptEntry): void {
    for (let i = entry.disposers.length - 1; i >= 0; i--) {
      try {
        entry.disposers[i]();
      } catch (err) {
        console.error(
          `[ScriptHost] Error disposing resource for "${entry.scriptId}":`,
          err,
        );
      }
    }
    entry.disposers.length = 0;
  }

  /** Emit a lifecycle event on the shared event bus. */
  private emitLifecycle(
    eventId: string,
    entry: ScriptEntry,
  ): void {
    try {
      this.apiContext.events.emit(eventId, {
        scriptId: entry.scriptId,
        logicTarget: entry.logicTarget as unknown as Record<string, unknown>,
      });
    } catch {
      // Don't let lifecycle event errors break the host
    }
  }
}
