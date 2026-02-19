# Track 35 — SceneHost + ApiContext Runtime — Blueprint

## Architecture

### SceneHost (owns everything)

```
SceneHost
├── PresetManager (from Track 34)
├── ApiContext (created per scene)
│   ├── EventBus (scene-scoped pub/sub)
│   ├── TimeHelpers (safe timer wrappers)
│   ├── LogApi (structured logging)
│   ├── EntityLookup (stub in v1)
│   └── PresetSurface (delegates to PresetManager)
└── Disposables[] (all cleanup functions)
```

### Lifecycle

1. `InRepoRuntime.attach(scene, config)` — called in Scene.create()
2. SceneHost constructs ApiContext subsystems
3. PresetManager.initialize(presetConfig) + registerApi(registrar)
4. SceneHost registers Phaser shutdown/destroy handlers
5. On shutdown: call all disposers, stop timers, unsubscribe events
6. On destroy: hard dispose, null references

### Files

| File | Role |
|------|------|
| `src/runtime/apiContext/eventBus.ts` | Scene-scoped event pub/sub implementation |
| `src/runtime/apiContext/timeHelpers.ts` | Safe timer wrappers around Phaser time |
| `src/runtime/apiContext/logApi.ts` | Structured logging implementation |
| `src/runtime/apiContext/entityLookup.ts` | Entity lookup stub for v1 |
| `src/runtime/apiContext/createApiContext.ts` | Factory that assembles ApiContext |
| `src/runtime/apiContext/index.ts` | Module exports |
| `src/runtime/sceneHost.ts` | SceneHost class (attach/detach/update/dispose) |
| `src/runtime/inrepoRuntime.ts` | Top-level attach entry point |

### Key Design Decisions

1. **Explicit attach (v1)**: `InRepoRuntime.attach(scene)` in Scene.create(). Plugin auto-attach deferred.
2. **Scene eligibility**: Check `scene.data.get('inrepoRole') === 'play'` or explicit opt-in.
3. **Disposer pattern**: Every subscription returns a Disposer. SceneHost collects all disposers.
4. **Timer safety**: Minimum 50ms interval for `every()`. Hard cap of 64 active timers per scene.
5. **No raw Phaser exposure**: ApiContext never exposes scene object to external consumers.
6. **PresetSurface delegation**: `api.call/read` route through PresetManager.handleCall/handleRead.
7. **EventBus isolation**: Each SceneHost gets its own EventBus instance. No shared mutable state.

### Interfaces (no new types — uses existing gameApi.ts)

All types already defined in `src/types/gameApi.ts`. This track provides concrete implementations.

### Risks & Mitigations

- **Memory leaks**: Mitigated by disposer array + forced cleanup on scene shutdown/destroy
- **Timer overflow**: Mitigated by hard cap (64 timers) + minimum interval (50ms)
- **Event handler accumulation**: Mitigated by EventBus.dispose() clearing all handlers
