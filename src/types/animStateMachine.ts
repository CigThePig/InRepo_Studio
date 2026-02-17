/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Define animation state machine types for visual editor and runtime.
 *
 * Defines:
 * - AnimStateMachine — top-level state machine container (type: schema)
 * - AnimState — single state node within a state machine (type: schema)
 * - AnimTransition — directed edge between states with condition (type: schema)
 * - TransitionCondition — union of condition types for transitions (type: union)
 *
 * Canonical key set:
 * - Keys come from: this file (authoritative source)
 *
 * Apply/Rebuild semantics:
 * - Rebuild: state machines are compiled at build time via buildProjectPack
 */

// --- State Machine ---

export interface AnimStateMachine {
  /** Unique state machine id */
  id: string;
  /** Human-readable name */
  name: string;
  /** The id of the state that should be active on start */
  initialStateId: string;
  /** All states in this state machine */
  states: AnimState[];
  /** All transitions between states */
  transitions: AnimTransition[];
}

// --- State Node ---

export interface AnimState {
  /** Unique state id (within this machine) */
  id: string;
  /** Human-readable name (e.g. "Idle", "Walk", "Attack") */
  name: string;
  /** Animation id to play when this state is active. Prefer stable animation IDs. */
  animationId: string;
  /** Whether the animation should loop while in this state */
  loop: boolean;
  /** Node position in the visual editor canvas */
  position: { x: number; y: number };
}

// --- Transition Condition ---

export type TransitionCondition =
  | { type: 'state'; stateId: string; operator: '==' | '!=' | '>' | '<'; value: string | number | boolean }
  | { type: 'event'; eventId: string }
  | { type: 'animComplete' }
  | { type: 'exitTime'; normalizedTime: number }
  | { type: 'always' };

// --- Transition Edge ---

export interface AnimTransition {
  /** Unique transition id (within this machine) */
  id: string;
  /** Source state id, or '*' for wildcard (from any state) */
  fromStateId: string | '*';
  /** Target state id */
  toStateId: string;
  /** Condition that triggers this transition */
  condition: TransitionCondition;
  /** Higher priority transitions are evaluated first */
  priority: number;
}
