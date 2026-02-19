/**
 * smSimulator.ts
 *
 * Pure TypeScript state machine simulator for the SM editor's "Simulate" mode.
 * No Phaser imports. No DOM side effects.
 *
 * Usage:
 *   const sim = createSmSimulator(machine);
 *   sim.tick(deltaMs, animTotalDurationMs);   // call each rAF
 *   sim.sendEvent('jump');
 *   sim.setVariable('velocity', 5);
 *   const stateId = sim.getCurrentStateId();
 *   sim.reset();
 */

import type { AnimStateMachineAsset } from '@/editor/assets';
import type { AnimTransition, TransitionCondition } from '@/types/animStateMachine';

// -------------------------------------------------------------------------
// Public interface
// -------------------------------------------------------------------------

export interface SmSimulator {
  /** Current active state id. Empty string before first tick if no initial state. */
  getCurrentStateId(): string;

  /** Queue an event to be consumed on the next tick. */
  sendEvent(name: string): void;

  /** Set a named variable that 'state' conditions can read. */
  setVariable(name: string, value: number | boolean): void;

  /** Get current value of a named variable. */
  getVariable(name: string): number | boolean | undefined;

  /**
   * Advance the simulation by deltaMs milliseconds.
   *
   * @param deltaMs            Elapsed time since last tick (ms)
   * @param animTotalDurationMs Optional total duration of the current state's
   *                            animation (used for exitTime and animComplete
   *                            conditions). If omitted, these conditions never
   *                            become true.
   */
  tick(deltaMs: number, animTotalDurationMs?: number): void;

  /**
   * Returns all unique event ids referenced in any transition condition in the
   * machine.  Used to render the "Send Event" button row.
   */
  getUniqueEventNames(): string[];

  /** Reset to the initial state. Clears elapsed time, pending events, animComplete. */
  reset(): void;

  /** Replace the machine (e.g. after an edit). Resets simulation. */
  setMachine(machine: AnimStateMachineAsset): void;
}

// -------------------------------------------------------------------------
// Factory
// -------------------------------------------------------------------------

export function createSmSimulator(machine: AnimStateMachineAsset): SmSimulator {
  let _machine = machine;
  let _currentStateId = machine.initialStateId;
  let _stateElapsedMs = 0;
  let _animComplete = false;
  let _pendingEvents: string[] = [];
  const _variables = new Map<string, number | boolean>();

  // -----------------------------------------------------------------------
  // Condition evaluation — mirrors state-machine-driver.ts without Phaser
  // -----------------------------------------------------------------------

  function evaluateCondition(
    condition: TransitionCondition,
    animTotalDurationMs: number | undefined
  ): boolean {
    switch (condition.type) {
      case 'always':
        return true;

      case 'animComplete':
        return _animComplete;

      case 'exitTime': {
        if (!animTotalDurationMs || animTotalDurationMs <= 0) return false;
        const normalizedTime = _stateElapsedMs / animTotalDurationMs;
        return normalizedTime >= condition.normalizedTime;
      }

      case 'event':
        return _pendingEvents.includes(condition.eventId);

      case 'state': {
        const value = _variables.get(condition.stateId);
        if (value === undefined) return false;
        const expected = condition.value;
        switch (condition.operator) {
          case '==': return value == expected;
          case '!=': return value != expected;
          case '>':
            return typeof value === 'number' && typeof expected === 'number' && value > expected;
          case '<':
            return typeof value === 'number' && typeof expected === 'number' && value < expected;
          default:
            return false;
        }
      }

      default:
        return false;
    }
  }

  function evaluateTransitions(animTotalDurationMs: number | undefined): AnimTransition | null {
    // Collect eligible transitions from current state + wildcard
    const eligible = _machine.transitions.filter(
      (t) => t.fromStateId === _currentStateId || t.fromStateId === '*'
    );

    // Sort by priority descending; state-specific before wildcard at same priority
    eligible.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.fromStateId === '*' && b.fromStateId !== '*') return 1;
      if (a.fromStateId !== '*' && b.fromStateId === '*') return -1;
      return 0;
    });

    for (const transition of eligible) {
      if (evaluateCondition(transition.condition, animTotalDurationMs)) {
        return transition;
      }
    }

    return null;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  return {
    getCurrentStateId(): string {
      return _currentStateId;
    },

    sendEvent(name: string): void {
      if (name) _pendingEvents.push(name);
    },

    setVariable(name: string, value: number | boolean): void {
      _variables.set(name, value);
    },

    getVariable(name: string): number | boolean | undefined {
      return _variables.get(name);
    },

    tick(deltaMs: number, animTotalDurationMs?: number): void {
      if (!_machine || !_currentStateId) return;

      _stateElapsedMs += deltaMs;

      // Determine animComplete based on elapsed vs total duration
      if (animTotalDurationMs && animTotalDurationMs > 0) {
        if (_stateElapsedMs >= animTotalDurationMs) {
          _animComplete = true;
        }
      }

      const transition = evaluateTransitions(animTotalDurationMs);
      if (transition && transition.toStateId !== _currentStateId) {
        _currentStateId = transition.toStateId;
        _stateElapsedMs = 0;
        _animComplete = false;
      }

      // Clear pending events at end of tick
      _pendingEvents = [];
    },

    getUniqueEventNames(): string[] {
      const names = new Set<string>();
      for (const t of _machine.transitions) {
        if (t.condition.type === 'event' && t.condition.eventId) {
          names.add(t.condition.eventId);
        }
      }
      return Array.from(names).sort();
    },

    reset(): void {
      _currentStateId = _machine.initialStateId;
      _stateElapsedMs = 0;
      _animComplete = false;
      _pendingEvents = [];
    },

    setMachine(machine: AnimStateMachineAsset): void {
      _machine = machine;
      _currentStateId = machine.initialStateId;
      _stateElapsedMs = 0;
      _animComplete = false;
      _pendingEvents = [];
      _variables.clear();
    },
  };
}
