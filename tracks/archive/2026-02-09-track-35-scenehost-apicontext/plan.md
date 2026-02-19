# Track 35 — Plan

## Phase 1: ApiContext subsystems (EventBus, TimeHelpers, LogApi, EntityLookup)

### Tasks
- [ ] Create `src/runtime/apiContext/eventBus.ts` — scene-scoped event pub/sub
- [ ] Create `src/runtime/apiContext/timeHelpers.ts` — safe timer wrappers
- [ ] Create `src/runtime/apiContext/logApi.ts` — structured logging
- [ ] Create `src/runtime/apiContext/entityLookup.ts` — stub for v1
- [ ] Create `src/runtime/apiContext/createApiContext.ts` — factory
- [ ] Create `src/runtime/apiContext/index.ts` — module exports

### Files touched
- `src/runtime/apiContext/eventBus.ts` (new)
- `src/runtime/apiContext/timeHelpers.ts` (new)
- `src/runtime/apiContext/logApi.ts` (new)
- `src/runtime/apiContext/entityLookup.ts` (new)
- `src/runtime/apiContext/createApiContext.ts` (new)
- `src/runtime/apiContext/index.ts` (new)

### Verification
- [ ] `tsc --noEmit` passes
- [ ] All subsystems implement their gameApi.ts interfaces

### Stop point
Pause — review ApiContext implementations before building SceneHost.

---

## Phase 2: SceneHost + InRepoRuntime entry point

### Tasks
- [ ] Create `src/runtime/sceneHost.ts` — SceneHost class
- [ ] Create `src/runtime/inrepoRuntime.ts` — top-level attach entry
- [ ] Wire PresetManager into SceneHost lifecycle
- [ ] Wire ApiContext into SceneHost
- [ ] Implement scene eligibility check
- [ ] Implement disposer tracking and cleanup

### Files touched
- `src/runtime/sceneHost.ts` (new)
- `src/runtime/inrepoRuntime.ts` (new)

### Verification
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds

### Stop point
Pause — review SceneHost before docs.

---

## Phase 3: Documentation + verification + commit

### Tasks
- [ ] Update `INDEX.md` with new files
- [ ] Update `context/schema-registry.md` with SceneHost + ApiContext entries
- [ ] Update `context/active-track.md` to mark Track 35 complete
- [ ] Run `tsc --noEmit` and `npm run build`
- [ ] Commit and push

### Files touched
- `INDEX.md` (update)
- `context/schema-registry.md` (update)
- `context/active-track.md` (update)

### Verification
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] All new files listed in INDEX.md
- [ ] Schema registry reflects new lists-of-truth

### Stop point
Track complete.
