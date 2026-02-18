# /src/runtime — Local AGENTS.md

Purpose:
- Owns game/runtime loading, play mode behavior, and the **InRepo runtime system** (SceneHost, PresetManager, ScriptHost, Game API).

Owns:
- Loading project/scene from hot or cold sources
- Instantiating tilemaps and entities in the engine layer
- Scene transitions
- **SceneHost**: the per-scene attachment point that owns PresetManager, ScriptHost(s), and ApiContext
- **PresetManager**: loads `/game/presets.json`, instantiates preset systems, exposes commands/events/state into Game API
- **ScriptHost**: runs Blockly-generated JS against the Game API (one instance per Logic Target per scene)
- **ApiContext**: the shared Game API instance bound to a scene (events, time, log, entities, presets, generic call/on/read)
- **Event bridging**: Phaser events → InRepo event bus → Blockly scripts

Does NOT own:
- Editor panels/tools/canvas (use `/src/editor`)
- GitHub deploy/auth logic (use `/src/deploy`)
- Blockly workspace UI rendering (use `/src/editor/blockly`)
- Type definitions for API/preset/script schemas (use `/src/types`)

Sub-modules:
- `/src/runtime/presets/` — Preset definitions, registry, PresetManager engine (see local AGENTS.md)
- `/src/runtime/blockly/` — Block definitions, generators, ScriptHost engine (see local AGENTS.md)

Local invariants:
- Runtime must work if the editor folder is deleted.
- Runtime must never import editor modules.
- Data source selection must be explicit (hot for playtest, cold for public).

SceneHost rules:
- One SceneHost per running playable Phaser Scene. Attach in `Scene.create()` after world objects exist.
- SceneHost owns: PresetManager, ScriptHost(s), ApiContext, disposables list.
- SceneHost does NOT own: asset loading, rendering, scene switching logic, editor UI.
- On shutdown: stop timers, unsubscribe events, disable systems (allow scene restart). On destroy: hard dispose everything.
- **Scene eligibility**: attach only if scene has `inrepoRole === "play"` or is the configured main playable scene.
- **No shared mutable state** between SceneHost instances (multiple scenes safe).

PresetManager rules:
- PresetManager is **game-wide / global** — not Logic-Target-specific. Both Game Logic and Map Logic scripts share the same PresetManager.
- Lifecycle: instantiate → attach to scene → apply config → expose API surface → dispose on shutdown.
- Preset categories own specific systems (Controls → input, Movement → physics, Camera → follow, Animation → state-driven anims). Categories must not silently override each other's owned systems.
- Config changes auto-apply; undo supported via Undo toast in editor.

ScriptHost rules:
- ScriptHost supports running **multiple scripts per scene simultaneously** (Game Logic + Map Logic in v1).
- Scripts are **event-first**: register handlers via `api.on(...)`, then exit. No per-frame loops by default.
- States: Stopped → Running → Error. Error state is per-script (one script erroring doesn't kill the other).
- Error events include `logicTarget` field for attribution.
- Generated JS shape: `register(api) → disposer[]`. All handlers wrapped in try/catch.
- **Safety limits**: min interval for "Every" timers (≥ 50ms), max active timers per script (64), recursion depth guard.
- Scripts receive only safe Game API surface: `api.on/call/read/time/log`. No raw Phaser, DOM, or window.

Game API rules:
- Scene-bound, not global. Created per playable scene, disposed on shutdown.
- Blockly listens to InRepo events, not Phaser events. SceneHost bridges Phaser → InRepo event bus.
- Generic script surface: `api.call(commandId, args)`, `api.on(eventId, fn)`, `api.read(stateId)`.
- `api.meta.logicTarget` identifies the script instance's scope.

Runtime script discovery:
- Game Logic: look for `/game/logic/main.json`. Missing = no game logic (safe).
- Map Logic: look for `/game/logic/maps/<currentMapId>.json`. Missing = no map logic (safe).
- Both scripts run simultaneously against the same ApiContext and event bus.

Verification:
- Public mode loads from `/game/*` and plays.
- Playtest mode loads from hot storage and reflects current edits.
- SceneHost attaches and disposes cleanly without leaks.
- Game Logic + Map Logic scripts run simultaneously and independently.
- Script errors report which Logic Target caused them.
- PresetManager exposes commands/events/state that Blockly scripts can call.
