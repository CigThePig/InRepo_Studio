/**
 * Runtime Blockly module — block definitions, code generators, ScriptHost engine.
 *
 * Owns:
 * - Block definitions (blocks/*.ts)
 * - Schema-driven block generator (PresetDefinition → Blockly block packs)
 * - ScriptHost (compile workspace → JS, register handlers, start/stop/error)
 * - Code generation rules (all output uses api.on/call/read/time/log)
 *
 * See /src/runtime/blockly/AGENTS.md for full rules.
 */

export { ScriptHost } from './scriptHost';
export type {
  ScriptState,
  ScriptEntry,
  ScriptErrorInfo,
  ScriptRegisterFn,
  StartScriptOptions,
} from './scriptHost';
