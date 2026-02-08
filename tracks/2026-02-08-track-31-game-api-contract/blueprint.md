# Track 31 — Game API Contract + Types — Blueprint

## Technical Design

### File layout

Single file: `src/types/gameApi.ts`
Re-exports: `src/types/index.ts`

### Type architecture

The Game API follows a layered design:

```
┌─────────────────────────────────────┐
│           ApiContext                  │
│  (top-level, one per playable Scene) │
├─────────────────────────────────────┤
│  meta     │ ApiMeta                  │
│  events   │ EventBus                 │
│  time     │ TimeHelpers              │
│  log      │ LogApi                   │
│  entities │ EntityLookup             │
│  presets  │ PresetSurface            │
│  call()   │ generic command dispatch  │
│  on()     │ generic event subscribe   │
│  read()   │ generic state query       │
└─────────────────────────────────────┘
```

### Interface contracts

**Disposer pattern**: All subscriptions and timers return a `Disposer` (function that cancels). This enables SceneHost to track and bulk-dispose on shutdown.

**EventBus**: `on`/`once`/`off`/`emit`/`list`. Payloads are `Record<string, unknown>` (plain JSON requirement per invariant). Events are scene-scoped.

**TimeHelpers**: `after`/`every`/`clear`. `every()` minimum interval: 50ms (enforced by implementation, documented in type). All timers auto-cancel on scene shutdown.

**LogApi**: `info`/`warn`/`error`/`event`. Details are optional `Record<string, unknown>`. Logs include source info (block ID + Logic Target) when available.

**EntityHandle**: Read-only lightweight reference with `id`, `type`, `x`, `y`, `exists`. No raw Phaser leakage.

**EntityLookup**: `getById`/`getByTag`/`setTag`/`exists`. Returns `EntityHandle` objects.

**PresetSurface**: `getCategory`/`isEnabled`/`activePresetId`. Returns `PresetCategorySurface` with `categoryId`, `presetId`, `enabled`.

**ApiMeta**: `apiVersion` (string), `schemaVersion` (number), `logicTarget` (LogicTargetMeta), `categories` (string[]), `capabilities` (Record<string, boolean>).

**LogicTargetMeta**: `type` ('game' | 'map'), `id` (string), `label` (string). Used for error attribution.

### Generic script surface (the sandbox-friendly layer)

Three methods on `ApiContext` that Blockly codegen exclusively uses:
- `call(commandId, args?)` — dispatch a preset command
- `on(eventId, handler)` — subscribe to an event (returns Disposer)
- `read(stateId)` — query a preset state value

This makes generated JS stable, simple, and easy to validate. Blockly never needs to know about typed preset internals.

### Naming conventions

Category prefixes: `controls.*`, `movement.*`, `camera.*`, `animation.*`.
- Events: present/past tense (`movement.landed`, `controls.jumpPressed`)
- Commands: verbs (`camera.shake`, `movement.setRunSpeed`)
- State: nouns/adjectives (`movement.isGrounded`, `camera.zoom`)

### Dependencies

- No runtime dependencies (pure type definitions)
- Consumed by: PresetManager (Track 34), ScriptHost (Track 36), SceneHost (Track 35), schema-driven block generation (Track 37)

### Risks and mitigations

| Risk | Mitigation |
|------|------------|
| API shape changes break Blockly codegen | Generic call/on/read layer isolates block generators from type changes |
| Over-constrained generics | Keep return types as `unknown` for generic methods; typed wrappers are internal |
| Missing interface members discovered later | Additive: new members can be added to interfaces without breaking existing code |
