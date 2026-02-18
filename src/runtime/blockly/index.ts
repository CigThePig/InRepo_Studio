/**
 * Runtime Blockly module — block definitions, code generators, ScriptHost engine.
 *
 * Owns:
 * - Block definitions (blocks/*.ts)
 * - Schema-driven block generator (PresetDefinition → Blockly block packs)
 * - ScriptHost (compile workspace → JS, register handlers, start/stop/error)
 * - Code generation rules (all output uses api.on/call/read/time/log)
 * - Block registry (lookup, search, dependency metadata)
 *
 * See /src/runtime/blockly/AGENTS.md for full rules.
 */

// ScriptHost engine
export { ScriptHost } from './scriptHost';
export type {
  ScriptState,
  ScriptEntry,
  ScriptErrorInfo,
  ScriptRegisterFn,
  StartScriptOptions,
} from './scriptHost';

// Schema-driven block generation
export { generateBlockPack } from './schemaToBlocks';
export {
  hatBlockType,
  payloadFieldBlockType,
  commandBlockType,
  stateBlockType,
} from './schemaToBlocks';
export type {
  BlockDefinition,
  BlocklyArg,
  BlockDependency,
  BlockGenerator,
  BlockPackEntry,
  BlockPack,
} from './schemaToBlocks';

// Block registry
export { createBlockRegistry } from './blockRegistry';
export type { BlockRegistry } from './blockRegistry';

// Core block definitions (built-in categories: Events, Logic, Math, etc.)
export { registerCoreBlocks, getCoreBlockPacks } from './coreBlocks';
export type { RegisterCoreBlocksOptions } from './coreBlocks';
export { registerPresetBlocks } from './coreBlocks';
export { installRegistryIntoBlockly } from './installIntoBlockly';

// Codegen rules
export {
  codegenEventHandler,
  codegenCommandCall,
  codegenStateRead,
  codegenTimeAfter,
  codegenTimeEvery,
  codegenPayloadFieldAccess,
  codegenLog,
  escapeJsString,
} from './codegenRules';
