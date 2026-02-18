/**
 * SCHEMA INVENTORY (lists-of-truth)
 * Owner: this file
 * Purpose: Shared codegen utilities for Blockly → JavaScript code generation.
 *
 * Defines:
 * - String builder functions for api.on/call/read/time patterns
 * - JS string escaping utility
 *
 * Canonical key set:
 * - All generated code uses ONLY: api.on, api.call, api.read, api.time.after,
 *   api.time.every, api.log.info/warn/error
 *
 * Apply/Rebuild semantics:
 * - Apply mode: used at codegen time (editor-side), never at runtime
 *
 * Verification:
 * - [ ] All codegen outputs valid JS
 * - [ ] No raw Phaser/DOM/window references in output
 * - [ ] String escaping prevents injection
 */

// --- JS string escaping ---

/** Escape a string for safe embedding in a JS string literal (single-quoted). */
export function escapeJsString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// --- Codegen patterns ---

/**
 * Generate: api.on("eventId", (payload) => { ...statements... })
 * Used by event hat blocks.
 */
export function codegenEventHandler(
  eventId: string,
  statementsCode: string,
): string {
  const escaped = escapeJsString(eventId);
  return (
    `api.on('${escaped}', function(payload) {\n` +
    `${statementsCode}` +
    `});\n`
  );
}

/**
 * Generate: api.call("commandId", { arg1: val1, ... })
 * Used by command action blocks.
 */
export function codegenCommandCall(
  commandId: string,
  argEntries: [string, string][],
): string {
  const escaped = escapeJsString(commandId);
  if (argEntries.length === 0) {
    return `api.call('${escaped}');\n`;
  }
  const argsObj = argEntries
    .map(([key, valueCode]) => `'${escapeJsString(key)}': ${valueCode}`)
    .join(', ');
  return `api.call('${escaped}', {${argsObj}});\n`;
}

/**
 * Generate: api.read("stateId")
 * Used by state reporter blocks.
 */
export function codegenStateRead(stateId: string): string {
  return `api.read('${escapeJsString(stateId)}')`;
}

/**
 * Generate: api.time.after(ms, function() { ...statements... })
 * Used by "wait then do" timer blocks.
 */
export function codegenTimeAfter(
  msCode: string,
  statementsCode: string,
): string {
  return (
    `api.time.after(${msCode}, function() {\n` +
    `${statementsCode}` +
    `});\n`
  );
}

/**
 * Generate: api.time.every(ms, function() { ...statements... })
 * Used by "every N ms do" timer blocks.
 */
export function codegenTimeEvery(
  msCode: string,
  statementsCode: string,
): string {
  return (
    `api.time.every(${msCode}, function() {\n` +
    `${statementsCode}` +
    `});\n`
  );
}

/**
 * Generate: payload["fieldName"]
 * Used by event payload field reporter blocks.
 */
export function codegenPayloadFieldAccess(fieldName: string): string {
  return `payload['${escapeJsString(fieldName)}']`;
}

/**
 * Generate: api.log.info/warn/error("message")
 * Used by debug blocks.
 */
export function codegenLog(
  level: 'info' | 'warn' | 'error',
  messageCode: string,
): string {
  return `api.log.${level}(${messageCode});\n`;
}
