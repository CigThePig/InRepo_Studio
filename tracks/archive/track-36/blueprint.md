# Track 36 — ScriptHost Engine (Part 11) — Blueprint

## Technical Design

### New file: `src/runtime/blockly/scriptHost.ts`

**ScriptState enum:**
- `stopped` — default, no handlers registered
- `running` — handlers registered and active
- `error` — stopped due to fatal script error, with error info preserved

**ScriptEntry (internal):**
Per-script tracking object:
- `scriptId: string` — stable ID from resolveScriptId()
- `logicTarget: ScriptLogicTarget` — metadata for error attribution
- `state: ScriptState`
- `disposers: Disposer[]` — all subscriptions/timers for this script
- `errorInfo?: { message, blockId?, stack? }` — preserved on Error state

**ScriptHost class:**
- Owned by SceneHost (one ScriptHost per SceneHost)
- Manages multiple scripts simultaneously (Map<scriptId, ScriptEntry>)
- All scripts share the same ApiContext

**Public API:**
- `startScript(scriptId, logicTarget, workspaceJson)` — compile workspace → JS, execute register(api), transition to Running
- `stopScript(scriptId)` — cancel timers, unsubscribe handlers, transition to Stopped
- `stopAll()` — stop all running scripts
- `getScriptState(scriptId)` — return current state
- `getScriptError(scriptId)` — return error info if in Error state
- `getRunningScriptIds()` — list currently running script IDs
- `dispose()` — stop all scripts, clear all references

**Compilation flow:**
1. Receive Blockly workspace JSON
2. In v1: use a stub compilation that creates a `register(api)` function
   - Real Blockly codegen will be wired in Track 37-38
   - For now: accept raw JS string OR a register function directly
3. Execute `register(api)` which returns `Disposer[]`
4. Track all returned disposers in the ScriptEntry

**Error handling:**
- Compilation errors: emit `script.error`, transition to Error, do not start
- Runtime errors in handlers: caught by the ApiContext's EventBus/TimeHelpers (already wrapped in try/catch). ScriptHost adds a wrapper layer that catches, transitions to Error, emits `script.error` with Logic Target attribution
- Error event payload: `{ message, blockId?, stack?, logicTarget }`

**Safety limits:**
- MAX_TIMERS_PER_SCRIPT: 64 (enforced by TimeHelpers already at SceneHost level; ScriptHost tracks per-script timer count for reporting)
- MAX_RECURSION_DEPTH: 32 (guard via a counter incremented on handler entry, decremented on exit)
- If limits exceeded: warn via api.log.warn, stop script if severe

**Lifecycle events (emitted on shared EventBus):**
- `script.starting` — `{ scriptId, logicTarget }`
- `script.started` — `{ scriptId, logicTarget }`
- `script.stopping` — `{ scriptId, logicTarget }`
- `script.stopped` — `{ scriptId, logicTarget }`
- `script.error` — `{ scriptId, logicTarget, message, blockId?, stack? }`

### Modified file: `src/runtime/sceneHost.ts`

- Add ScriptHost as an owned subsystem (alongside PresetManager + ApiContext)
- SceneHost.dispose() disposes ScriptHost before PresetManager
- Expose `getScriptHost()` method for external access
- SceneHostConfig gains optional `scripts` field for auto-starting scripts on attach

### Modified file: `src/runtime/blockly/index.ts`

- Export ScriptHost, ScriptState, ScriptEntry types

### Modified file: `src/runtime/inrepoRuntime.ts`

- No changes needed — ScriptHost is internal to SceneHost

## State

```
ScriptHost
  └─ scripts: Map<scriptId, ScriptEntry>
       ├─ "main" → { state: running, disposers: [...], logicTarget: {type:'game',...} }
       └─ "map:forest" → { state: running, disposers: [...], logicTarget: {type:'map',...} }
```

## Risks

- v1 compilation is a stub — real Blockly codegen comes in Tracks 37-38
- Timer caps are enforced at ApiContext level already; ScriptHost adds per-script tracking
- Error boundary must catch synchronous throws during register() AND async errors in handlers
