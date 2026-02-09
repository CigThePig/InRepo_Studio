# Track 36 — ScriptHost Engine (Part 11) — Spec

## Intent

Implement the ScriptHost engine that compiles Blockly workspace JSON into JavaScript and manages script lifecycle (start/stop/error). This is the runtime-side execution engine for user-authored Blockly scripts.

## Scope

- ScriptHost class with per-script state machine (Stopped → Running → Error)
- Workspace → JS compilation via `register(api)` function pattern
- Multi-script support: Game Logic + Map Logic running simultaneously
- Per-script independent error handling (one script erroring doesn't kill the other)
- Timer management (auto-cancel on stop/shutdown)
- Safety limits (timer caps, recursion guards)
- Lifecycle events emitted on the shared EventBus
- Integration point with SceneHost (SceneHost owns ScriptHost)

## Out of scope

- Blockly workspace UI (Track 39)
- Block definitions and generators (Tracks 37-38)
- Schema-driven block generation (Track 37)
- JS-Interpreter sandboxing (future — v1 uses Function constructor)
- "Advanced tick" per-frame execution (future toggle)

## Acceptance criteria

1. ScriptHost lifecycle works: Stopped → Running → Error, with transitions via start/stop
2. Scripts are event-first and scene-scoped
3. Multi-script: Game Logic + Map Logic run simultaneously against the same ApiContext
4. Runtime errors in one script don't stop the other script
5. Error reporting includes: user-friendly message, block ID (if available), Logic Target attribution, optional stack trace
6. Timers auto-cancel on script stop and on SceneHost shutdown
7. Safety limits enforced: timer caps per script, recursion depth guard
8. Lifecycle events emitted: script.starting, script.started, script.stopping, script.stopped, script.error
9. Generated JS structure follows `register(api)` pattern returning disposers
10. ScriptHost integrates cleanly into SceneHost (single ownership, single cleanup)
11. `tsc --noEmit` passes
12. `npm run lint` passes

## Risks

- Generated JS execution safety (mitigated by Game API sandbox — no raw Phaser/DOM access)
- Error recovery after handler throws (mitigated by try/catch in all handler wrappers)
- Memory leaks from untracked subscriptions (mitigated by disposer tracking per script)
