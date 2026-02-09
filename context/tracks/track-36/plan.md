# Track 36 — ScriptHost Engine (Part 11) — Plan

## Phase 1: ScriptHost Core Implementation

### Tasks
- [ ] Create `src/runtime/blockly/scriptHost.ts` with:
  - ScriptState type (`stopped` | `running` | `error`)
  - ScriptEntry interface (per-script tracking)
  - ScriptErrorInfo interface
  - ScriptHost class with full lifecycle
  - Compilation stub (accepts register function or raw JS string)
  - Per-script disposer tracking
  - Error handling with Logic Target attribution
  - Safety limits (recursion guard)
  - Lifecycle event emission
- [ ] Update `src/runtime/blockly/index.ts` — export ScriptHost + types
- [ ] Update `src/runtime/sceneHost.ts` — integrate ScriptHost:
  - SceneHost creates and owns ScriptHost
  - SceneHost.dispose() disposes ScriptHost
  - Expose getScriptHost() accessor
- [ ] Update `INDEX.md` — add scriptHost.ts entry
- [ ] Update `context/schema-registry.md` — add ScriptHost section
- [ ] Update `context/repo-map.md` — update runtime/blockly description
- [ ] Update `context/active-track.md` — mark Track 36 complete

### Files touched
- `src/runtime/blockly/scriptHost.ts` (new)
- `src/runtime/blockly/index.ts` (modified)
- `src/runtime/sceneHost.ts` (modified)
- `INDEX.md` (modified)
- `context/schema-registry.md` (modified)
- `context/repo-map.md` (modified)
- `context/active-track.md` (modified)

### Verification checklist
- [ ] `tsc --noEmit` passes (or `npm run build`)
- [ ] `npm run lint` passes
- [ ] ScriptHost lifecycle transitions are correct (Stopped → Running → Error → Stopped)
- [ ] Multi-script support: can track multiple scripts simultaneously
- [ ] Error in one script doesn't affect others
- [ ] Lifecycle events emitted correctly
- [ ] Disposers tracked and cleaned up on stop/dispose
- [ ] Recursion guard prevents runaway handler chains
- [ ] SceneHost correctly owns and disposes ScriptHost

### Stop point
Pause for review after Phase 1 implementation and verification.
