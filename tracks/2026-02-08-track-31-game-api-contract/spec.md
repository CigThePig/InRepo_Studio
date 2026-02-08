# Track 31 — Game API Contract + Types

## Intent

Define the TypeScript Game API contract that Presets implement and Blockly-generated JS calls. This is the single most important technical artifact for the Presets + Blockly system (Part 4 of the Blockly Plan Revised).

The Game API is the **only doorway** between:
- Presets (which implement systems behind the API)
- Blockly scripts (which call/listen/read through the API)
- The editor (which introspects the API to generate UI and blocks)

## Scope

### In scope
1. `ApiContext` interface — top-level shape with `meta`, `events`, `time`, `log`, `entities`, `presets`
2. Generic `call()`, `on()`, `read()` methods for Blockly codegen
3. `EventBus` — scene-scoped event pub/sub
4. `TimeHelpers` — safe timer wrappers (after, every, clear)
5. `LogApi` — structured logging (info, warn, error, event)
6. `EntityHandle` + `EntityLookup` — stable entity references without raw Phaser
7. `PresetSurface` + `PresetCategorySurface` — enabled preset module query
8. `LogicTargetMeta` + `LogicTargetType` — identifies script scope for error reporting
9. `ApiMeta` — version, schema version, logic target, categories, capabilities
10. `Disposer` / `TimerHandle` — cleanup primitives

### Out of scope
- Runtime implementations of any interface (Track 35)
- PresetDefinition schema (Track 32)
- Script envelope types (Track 33)
- Blockly block generation from API introspection (Track 37)

## Acceptance criteria

- [ ] All interfaces defined in `src/types/gameApi.ts`
- [ ] Types compile with `isolatedModules` (no type-only enum abuse, no const-enum)
- [ ] Generic `call`/`on`/`read` methods cover all Blockly codegen patterns
- [ ] `api.meta.logicTarget` identifies which Logic Target a script instance belongs to
- [ ] Event payloads typed as `Record<string, unknown>` (plain JSON requirement)
- [ ] Timer minimum interval constraint documented (50ms for `every()`)
- [ ] All types re-exported from `src/types/index.ts`
- [ ] `schema-registry.md` updated with Game API Contract section
- [ ] `INDEX.md` updated with `gameApi.ts` entry
- [ ] `tsc --noEmit` passes for Track 31 type files

## Risks

- API shape changes later require Blockly codegen updates (mitigated by generic call/on/read layer)
- Over-engineering the type system now may constrain future extensions (mitigated by keeping types simple and additive)
