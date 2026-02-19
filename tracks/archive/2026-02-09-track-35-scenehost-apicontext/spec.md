# Track 35 — SceneHost + ApiContext Runtime — Spec

## Goal

Implement SceneHost that integrates PresetManager into Phaser scenes, plus the concrete ApiContext runtime (EventBus, TimeHelpers, LogApi, EntityLookup stubs).

SceneHost is the single attach/detach point for InRepo runtime systems on a playable scene.

## Non-goals

- ScriptHost engine (Track 36)
- Blockly block generation (Track 37)
- Full entity system integration (future)
- Phaser plugin auto-attach (v1 uses explicit attach)

## Acceptance criteria

- [ ] SceneHost class exists with attach/dispose lifecycle
- [ ] Single attach point (`InRepoRuntime.attach(scene)`) and single cleanup point
- [ ] SceneHost owns: PresetManager, ApiContext, Disposables list
- [ ] ApiContext implementation: EventBus, TimeHelpers, LogApi, EntityLookup (stub), PresetSurface
- [ ] Generic api.call/on/read route through PresetManager
- [ ] All subscriptions/timers tracked via disposer pattern
- [ ] Scene shutdown disposes all resources (no leaks)
- [ ] Scene eligibility check (only attach to play-role scenes)
- [ ] Presets and Blockly share one ApiContext
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds

## Risks

- Memory leaks on scene transitions (mitigated by disposer tracking)
- Timer accumulation if timers aren't properly cancelled on shutdown

## Dependencies

- Track 31: Game API types (`src/types/gameApi.ts`)
- Track 32: Preset types (`src/types/preset.ts`)
- Track 33: Script envelope types (`src/types/script.ts`)
- Track 34: PresetManager + PresetRegistry (`src/runtime/presets/`)
