# Animation Workflow — Full Implementation Plan

## Current State Audit

Before defining what needs to be built, here is a precise inventory of what already exists, what partially works, and what is entirely missing.

### What EXISTS and WORKS

| Component | File(s) | Status |
|-----------|---------|--------|
| **Animation types** | `src/types/animation.ts` | Complete. `ProjectAnimation`, `ProjectAnimationFrame`, `ProjectAnimationLoopMode`, `ProjectAnimationSet` (reserved), `Facing4` (reserved) |
| **Asset registry — animation CRUD** | `src/editor/assets/assetRegistry.ts` | Complete. `addAnimation()`, `updateAnimation()`, `removeAnimation()`, `getAnimation()`, `getAnimations()`. Internal state stores `AnimationAsset[]` with frames, fps, loopMode, pivot |
| **Animation tab UI** | `src/editor/panels/animationTab.ts` | Substantial. Import spritesheet, grid-slice frames, add individual files as frames, drag-reorder frames, preview playback with play/pause/fps/loop controls, pivot editing with snap/nudge, save/update animation to registry |
| **Build pack compilation** | `src/pack/buildProjectPack.ts` | Complete. Compiles `AnimationAsset` → `ProjectAnimation` by resolving frame sourceAssetIds to atlas `textureKey:frameName` pairs |
| **Runtime animation registration** | `src/runtime/projectLoader.ts` | Complete. `registerProjectAnimations()` creates Phaser `anims.create()` with key `anim:${id}`, builds lookup maps `animationsById`, `animationKeyById`, `animationKeyByName`, stores pivots |
| **Runtime animation key resolution** | `src/runtime/projectLoader.ts` | Complete. `resolveAnimationKey()` resolves by id, by lowercase name, or raw `anim:` prefix |
| **Animation driver preset** | `src/runtime/presets/defs/animation-driver.ts` | Complete. Auto-selects idle/walk animation based on player movement. Registers `animation.play`, `animation.stop` commands and `animation.completed` event, `currentAnim`/`isPlaying` state |
| **Entity spawner animation** | `src/runtime/entitySpawner.ts` | Partial. Auto-plays animation on spawn if entity has `animationId` property, resolves key via `projectRuntime.resolveAnimationKey()` |
| **Entities tab — animation binding** | `src/editor/panels/entitiesTab.ts` | Complete. Dropdown to select saved animation for entity, "Edit Animation" button that opens animation tab, undo/redo support |
| **Entity renderer — static preview** | `src/editor/canvas/entityRenderer.ts` | Partial. Shows **first frame only** of assigned animation on canvas. No animated playback in editor |
| **Blockly block generation** | `src/runtime/blockly/schemaToBlocks.ts` | Complete. Animation category gets hue 290 (purple). Blocks are auto-generated from animation-driver preset definition |
| **Left Berry integration** | `src/editor/panels/leftBerry.ts` | Complete. Animation tab registered, `openAnimation(id)` method wired |

### What is PARTIALLY BUILT (needs completion)

1. **Entity renderer shows only frame 0** — no animated preview on the editor canvas. The `getAnimationFrame()` function always returns the first frame. No tick/timer drives frame advancement in the editor.

2. **Animation driver only handles player** — `getRuntimeEnv().getPlayerSprite()` is the only target. Non-player entities with animations play their animation once at spawn via `entitySpawner.ts` but have no ongoing driver (no idle/walk transitions, no script control).

3. **`ProjectAnimationSet` (directional animations)** — types are defined but marked `[reserved]`. No editor UI, no build compilation, no runtime consumption. Cannot assign "walk-left", "walk-right", "walk-up", "walk-down" as a single set.

4. **Animation-entity data flow at runtime** — the spawner does a one-shot `sprite.anims.play()` but there's no mechanism for the entity to change animations later (e.g., switching from idle to walk based on behavior), unless it's the player with the animation-driver preset.

5. **No per-frame duration support** — `ProjectAnimationFrame.durationMs` is defined in the type but never written by the animation tab UI and never read by the build pack or runtime registration.

### What is MISSING entirely

1. **Animated preview on canvas** — entities on the tilemap canvas always show a static first-frame thumbnail. There is no animation clock in the editor canvas.

2. **Animation list/browser panel** — the animation tab works on one animation at a time. There's no list view of all saved animations with thumbnails, no way to browse/search/filter/delete animations except through code or the entities tab dropdown.

3. **Spritesheet atlas auto-detection** — users must manually enter tile width/height/margin/spacing. No auto-detect for common formats (e.g., reading JSON atlas files, detecting uniform grids).

4. **Animation preview on entity selection** — when you select an entity with an animation, the entity inspector shows the animation name in a dropdown, but there's no inline animated preview showing what it looks like.

5. **Runtime animation controller for non-player entities** — enemies, NPCs, decorative objects with animations have no ongoing animation management. No "entity animation driver" preset equivalent.

6. **Animation events per-entity** — `animation.completed` event only exists on the player's animation driver. Non-player entities can't emit animation events.

7. **Transition/blend system** — no support for animation transitions (e.g., fade between idle and walk over N frames).

8. **Audio sync** — no way to attach sound effects to specific animation frames.

9. **Animation state machine** — no visual state machine editor. The animation-driver preset does a simple if/else (moving → walk, still → idle). More complex behavior (attack, hurt, death, etc.) requires Blockly scripts with manual `animation.play` commands.

---

## Implementation Plan

The plan is organized into 6 tracks, ordered by dependency and user-facing impact. Each track is self-contained and shippable.

---

### Track A — Animation List Panel + Management

**Goal:** Give users a browsable list of all animations in the project with thumbnails, rename, duplicate, and delete operations.

**Why first:** The animation tab currently only edits one animation at a time with no way to see all animations at a glance. This is the foundational UX for everything else (and it becomes the home for “where is this used?” safety checks).

**Files to create/modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/panels/animationListPanel.ts` | CREATE | New panel showing grid/list of all saved animations with thumbnails (optionally animated) |
| `src/editor/panels/animationTab.ts` | MODIFY | Add "Back to list" button, wire up navigation between list and editor |
| `src/editor/panels/leftBerry.ts` | MODIFY | Replace single animation tab with list→editor navigation flow |
| `src/editor/assets/assetRegistry.ts` | MODIFY | Add `duplicateAnimation(id)` method, add `onAnimationsChanged` event emitter, add reference-scanning helpers |

**Detailed steps:**

**A1 — Animation registry events.** Add a simple event callback to `assetRegistry` so that when animations are added/updated/removed, listeners get notified. This replaces the current pattern where the animation tab has to manually call `refresh()`.

```typescript
// In AssetRegistry interface, add:
onAnimationsChanged(callback: () => void): () => void;  // returns unsubscribe
duplicateAnimation(animationId: string): AnimationAsset | null;
```

**A2 — Animation list panel.** Create `animationListPanel.ts` rendering a scrollable card grid. Each card shows:
- Thumbnail (canvas element)
- Animation name
- Frame count badge
- Tap to open in animation editor
- Long-press or overflow menu for: Rename, Duplicate, Delete, Where Used

Thumbnail behavior:
- Default mode: **Animated thumbnails ON**, driven by a single shared `requestAnimationFrame` loop.
- **Animate thumbnails toggle** (battery/perf friendly). When OFF, cards render only the first frame.
- Cards outside the scroll viewport skip animation work (IntersectionObserver).
- Optional “Animate only selected/visible” mode to reduce visual noise on mobile.

**A3 — Navigation flow.** The left berry "Animation" tab now starts at the list view. Tapping an animation opens the existing animation editor tab in "edit mode." A "← Back" chip at the top returns to the list. The "New Animation" button at the bottom of the list opens the editor in "create mode" (same as current empty state).

**A4 — Naming policy (avoid runtime confusion).**
Runtime resolution can resolve animations by **name**, and duplicates can lead to “wrong animation plays” ambiguity. To keep behavior predictable:
- **Enforce unique animation names at save/rename/duplicate** (recommended default).
- Implement a helper like `makeUniqueAnimationName(baseName)` that yields:
  - `"Run (copy)"` then `"Run (copy 2)"` then `"Run (copy 3)"`, etc.
  - Applies equally to Duplicate and Rename collisions.
- If you decide to allow duplicates later, the list UI must surface a clear warning and “Resolve by ID” guidance. (But “unique by default” keeps the system calm.)

**A5 — Duplicate, delete, and reference safety.**
Duplicate:
- Clones the animation including frames, fps, loopMode, pivot, and per-frame duration overrides (Track C).
- Assigns a unique name via `makeUniqueAnimationName()`.

Delete:
- Add a **standalone utility** (e.g., `src/editor/assets/animationRefs.ts`) that returns a **reference report**. This function needs access to scene entity data and can’t live inside the asset registry. Keep it pure (dependencies as args) for testability:

```typescript
type ReferenceHit =
  | { kind: 'entity'; entityId: string; sceneId: string; field: 'animationId' | 'animationSetId' | 'animStateMachineId' }
  | { kind: 'animationSet'; setId: string; facing?: Facing4 }         // added in Track D
  | { kind: 'animStateMachine'; smId: string; stateId?: string };     // added in Track F

// Pure function — takes dependencies as args, no module coupling
collectAnimationReferences(
  animationId: string,
  scenes: Record<string, SceneData>,
  animationSets?: AnimationSetAsset[],       // Track D
  stateMachines?: AnimStateMachine[],        // Track F
): ReferenceHit[];
```

Entities are found by iterating `scenes[*].entities[*].properties.animationId`.

- In Track A, the report initially includes **entities** (today’s reality). Tracks D/F extend it to sets/state machines once they exist.
- The delete confirmation sheet shows:
  - “Used in X places” list (tap to jump-to)
  - Primary action: **Delete & Clear References**
  - Secondary action: Cancel

Clear behavior:
- For entity hits: clear the relevant field (e.g., `animationId = ''`).
- For future hits: remove/clear that mapping (e.g., set direction becomes unassigned).

**Acceptance criteria:**
- User can see all animations as a grid/list (thumbnails, optionally animated)
- Tap opens editor, back returns to list
- Rename inline with unique-name enforcement
- Duplicate always produces a guaranteed-unique name
- Delete shows a “where used” report and can clear references safely
- List auto-updates when animations are saved from the editor

---

### Track B — Animated Entity Preview on Canvas

**Status:** ✅ Implemented (editor canvas now uses clock-driven animated frames for visible entities).

**Goal:** Entities with assigned animations play their animation on the editor canvas instead of showing a static first frame.

**Why second:** This is the single biggest gap in the current experience. Users create animations and assign them to entities but never see them move on the map until they hit Play.

**Files to create/modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/canvas/animationClock.ts` | CREATE | Shared animation clock that advances frame indices for all animated entities |
| `src/editor/canvas/entityRenderer.ts` | MODIFY | Replace static first-frame lookup with clock-driven frame selection (and consistent pivot/offset rendering) |
| `src/editor/canvas/Canvas.ts` | MODIFY | Own the clock lifecycle, keep it synced with *visible* entities, trigger redraws on frame changes |
| `src/editor/canvas/renderer.ts` | MODIFY | Accept animation clock reference for render passes |

**Detailed steps:**

**B1 — Animation clock module.** Create a lightweight clock that:
- Tracks `animationId → playbackState` (frame index, elapsed time, loop mode)
- Has a single `tick(deltaMs)` method that advances all tracked animations
- Returns a set of animation IDs whose `currentFrame` changed this tick (dirty set)
- Is started/stopped with the editor (no ticking when minimized or in play mode)
- Is *pure playback*: it does **not** scan entities itself (Canvas owns what should be registered)

```typescript
export interface AnimationClock {
  register(animationId: string, animation: AnimationAsset): void;  // idempotent
  unregister(animationId: string): void;
  tick(deltaMs: number): Set<string>;  // returns dirty animation IDs
  getCurrentFrame(animationId: string): number;
  reset(animationId?: string): void;   // reset one or all (useful when edits happen)
  destroy(): void;
}
```

**B1 design note: build the clock duration-aware from the start.** The internal playback state should track elapsed time against cumulative frame boundaries, not just `elapsed % (1000/fps)`. This way, when Track C adds `durationMs` per frame, the clock already supports it without a rewrite:

```typescript
// Internal per-animation playback state
interface PlaybackState {
  frameDurations: number[];  // precomputed: per-frame ms (uniform or overridden)
  totalDurationMs: number;
  currentFrame: number;
  elapsedMs: number;
  loopMode: AnimationLoopMode;
}
```

On `register()`, precompute the frame duration array: if no per-frame overrides exist, all frames get `1000 / fps`. If overrides exist (Track C), use `frame.durationMs ?? (1000 / fps)` per frame. On `tick()`, advance `elapsedMs` and walk the cumulative duration array to find the current frame. For `'loop'` mode, wrap modulo `totalDurationMs`. This costs nothing extra for uniform-fps animations.

**B2 — Entity renderer integration (frame + pivot correctness).**
Modify `getAnimationFrame()` to accept a `frameIndex` parameter instead of always returning frame 0:

```typescript
const frameIndex = animationClock?.getCurrentFrame(animationId) ?? 0;
const frame = animation?.frames?.[frameIndex] ?? animation?.frames?.[0];
```

Also ensure the editor renderer uses the **same pivot/offset math** as runtime:
- Apply `animation.pivot` (and any per-frame offset if present in your data model) when drawing.
- This prevents “looks aligned in animation tab, floats on the map” mismatches.

**B3 — Canvas render loop owns registration + redraw decisions.**
Add the clock tick into the canvas render loop:

- Each `requestAnimationFrame`:
  1) Gather visible entities and the set of `visibleAnimationIds` they reference.
  2) **Sync the clock registry**:
     - Register any new IDs (look up `AnimationAsset` once, cache it)
     - Unregister any IDs no longer visible
  3) Call `animationClock.tick(deltaMs)`
  4) If the dirty set intersects `visibleAnimationIds`, request a redraw.

Key point: the clock tracks animations, but **Canvas decides what animations are active** (based on visibility).

**B4 — Performance guardrails.**
- Cap tracked unique animations (e.g., 60) to avoid pathological cases.
- Don’t tick/redraw if no animated entities are visible.
- Entities outside the viewport do not cause redraw even if their animation advances.
- Avoid per-entity lookups inside render hot paths (cache animation pointers and invalidate on asset change events from Track A).
- **Cache animation metadata in the clock, not just images in the sprite cache.** Currently `assetRegistry.getAnimation()` deep-clones via `cloneAnimation()` on every call. The clock’s `register()` already receives the `AnimationAsset` — cache this reference internally and only refresh it when `onAnimationsChanged` fires. The entity renderer should read frame data from the clock’s cached state during render, never from the registry.

**B5 — Optional polish: deterministic de-sync for repeated ambience.**
If multiple torches/waterfalls are on screen, perfect sync can look robotic.
- Add an optional “phase offset” per entity:
  - `offsetMs = hash(entityId) % periodMs`
  - Use this offset when computing elapsed time for that entity’s animation instance
- Keep it optional (default OFF) to avoid surprising users who want sync.

**Acceptance criteria:**
- Entities with animations visually animate on the editor canvas
- Frame rate matches the animation’s configured fps (or per-frame durations once Track C lands)
- Loop/once modes work correctly
- Canvas doesn’t redraw when no animations are visible
- Pauses when switching to play mode or minimizing

---

### Track C — Per-Frame Duration + Atlas Auto-Detection

**Goal:** Support variable frame timing and make spritesheet import smarter.

**Why third:** These are quality-of-life improvements that make the animation creation workflow significantly faster, especially for users importing existing game assets.

**Files to create/modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/panels/animationTab.ts` | MODIFY | Add per-frame duration editing UI, JSON atlas import button |
| `src/editor/assets/atlasImporter.ts` | CREATE | Parse common atlas JSON formats (Aseprite, TexturePacker, Phaser JSON Array/Hash) |
| `src/pack/buildProjectPack.ts` | MODIFY | Honor `durationMs` per frame when compiling |
| `src/runtime/projectLoader.ts` | MODIFY | Pass per-frame durations to Phaser's `anims.create()` |
| `src/types/animation.ts` | NO CHANGE | `durationMs` already defined, just unused |

**Detailed steps:**

**C0 — Persist `durationMs` in hot storage (and migrate safely).**
Right now `durationMs` exists in the runtime type (`ProjectAnimationFrame` in `src/types/animation.ts`) but is absent from the editor type (`AnimationFrameRef` in `src/editor/assets/assetRegistry.ts`). Make it real end-to-end:

1. **Add `durationMs?: number` to `AnimationFrameRef`** in `src/editor/assets/assetRegistry.ts`. This is a separate type from `ProjectAnimationFrame` — both must carry the field for the build pack to compile it through.
2. **Update `cloneAnimation()`** in the same file — it deep-clones frames and must preserve `durationMs`.
3. **CRITICAL: Update `cloneAssetRegistryState()`** in `src/storage/hot.ts`. This function uses **explicit field enumeration** (not spread) when copying animation frames. The current code (line ~89) only copies `sourceAssetId`, `rect`, `offset`. Any new field is silently dropped on every save/restore cycle. Add `durationMs`:
   ```typescript
   frames: animation.frames.map((frame) => ({
     sourceAssetId: frame.sourceAssetId,
     rect: { ...frame.rect },
     offset: frame.offset ? { ...frame.offset } : undefined,
     durationMs: frame.durationMs,  // NEW — Track C
   })),
   ```
4. Migration: missing `durationMs` stays `undefined` (meaning “use default fps timing”). No `WORKSPACE_VERSION` bump needed since `undefined` is a safe default.

**Cross-cutting warning:** This same `cloneAssetRegistryState()` bottleneck affects Tracks D and F. Every track that adds new arrays to `AssetRegistryState` (animation sets, state machines) must add a corresponding clone block to this function. Treat it as a mandatory checklist item.

**C1 — Per-frame duration UI.**
In the animation tab's frame strip, tapping a frame opens a small popover showing:
- Frame thumbnail (existing)
- Duration override input (ms). Blank = use animation default (1000/fps)
- Reset-to-default button
- Frame index (existing)
Optional: multi-select frames to batch-apply a duration (nice on phone).

**C2 — Build pack + runtime duration support.**
When compiling `ProjectAnimation` frames:
- If *no* frames have overrides, keep the current uniform-fps path.
- If *any* frame has `durationMs`, emit explicit Phaser frame configs with per-frame `duration`.

Phaser 3 supports per-frame duration via the `duration` property on individual frame configs:

```typescript
scene.anims.create({
  key: 'attack',
  frames: [
    { key: 'atlas', frame: 'attack-0', duration: 100 },
    { key: 'atlas', frame: 'attack-1', duration: 50 },   // fast
    { key: 'atlas', frame: 'attack-2', duration: 200 },  // hold
  ],
  repeat: 0,
});
```

**C3 — Atlas JSON import (format detection + naming + asset strategy).**
Create `atlasImporter.ts` that accepts a JSON file and detects the format:

| Format | Detection | Output |
|--------|-----------|--------|
| Aseprite JSON Array | `frames` is array with `frame: {x,y,w,h}` | Frame rects + per-frame durations from `duration` field |
| Aseprite JSON Hash | `frames` is object with keys | Same, keyed by slice name |
| TexturePacker JSON Array | `frames` array with `filename` and `frame` | Frame rects |
| Phaser JSON Array | `frames` array with `filename` | Frame rects |
| Generic grid | No JSON, just the image | Falls back to manual grid slice (existing) |

Importer output should include a stable `name` per frame:
- Default naming: JSON key / `filename` base name.
- Enforce uniqueness via the same `makeUnique*Name()` policy used in Track A.

**Important: pick one of two import modes (offer in UI, default A).**
- **Mode A (recommended): “Create/Update frame assets.”**
  - Import creates atlas-frame assets in the asset registry (re-usable elsewhere).
  - Animation frames reference these assets (keeping the existing `sourceAssetId → textureKey:frameName` compilation flow intact).
- **Mode B (advanced): “Animation-only direct atlas refs.”**
  - Animation frames store direct `{textureKey, frameName}` (no asset creation).
  - Build compilation supports this alternate path.
  - Use this if you want “just animate it” without populating the asset browser.

**C4 — Import UI.**
Add an "Import Atlas JSON" button to the animation tab (initial CTA and “source loaded” section).
After selecting JSON:
- Show a small import sheet:
  - detected format (editable if ambiguous)
  - choose / confirm the source image file
  - choose import mode (A recommended)
  - optional naming prefix (e.g. `hero/attack/`)
- On confirm, generate frames (and optionally create assets per Mode A).

**Acceptance criteria:**
- User can set per-frame duration overrides in the editor and they persist through hot storage
- Durations compile through to runtime correctly
- Aseprite JSON (array and hash) imports generate frames automatically (including durations)
- TexturePacker/Phaser JSON imports generate frames automatically
- Import enforces unique frame names and avoids collisions
- Build pack and runtime honor per-frame durations

---

### Track D — Directional Animation Sets

**Goal:** Allow users to group animations into directional sets (up/down/left/right) and have the runtime automatically select the correct direction.

**Why fourth:** This is the most-requested feature for top-down games. Currently users have to create 4 separate animations and write Blockly logic to switch between them based on movement direction. This track makes it automatic (and reduces Blockly boilerplate).

**Files to create/modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/panels/animationSetEditor.ts` | CREATE | UI for creating/editing animation sets (assign animations to 4 directions) |
| `src/editor/panels/animationListPanel.ts` | MODIFY | Add "Sets" sub-tab alongside "Animations" |
| `src/editor/assets/assetRegistry.ts` | MODIFY | Add animation set CRUD + reference scanning hooks |
| `src/types/animation.ts` | NO CHANGE | `ProjectAnimationSet` and `Facing4` already defined |
| `src/pack/buildProjectPack.ts` | MODIFY | Compile animation sets into `project.json` |
| `src/runtime/projectLoader.ts` | MODIFY | Register animation sets, add `resolveAnimationSetKey(setId, facing)` |
| `src/runtime/presets/defs/animation-driver.ts` | MODIFY | Add `idleSet`/`walkSet` knobs. When set, resolve direction from velocity vector and pick correct animation from set |
| `src/editor/panels/entitiesTab.ts` | MODIFY | Add animation set dropdown alongside animation dropdown |

**Detailed steps:**

**D1 — Asset registry animation set CRUD.** Add to the registry state:

```typescript
interface AssetRegistryState {
  // ... existing
  animationSets: AnimationSetAsset[];
}

interface AnimationSetAsset {
  id: string;
  name: string;
  directions: Partial<Record<Facing4, string>>;  // animation IDs
}
```

CRUD follows the same pattern as animation CRUD. Include `onAnimationSetsChanged` event.
Naming should follow the same **unique name policy** as Track A (recommended default).

**D1 extensibility note:** The `Partial<Record<Facing4, string>>` pattern already supports future expansion to 8-direction. If `Facing4` becomes `Facing8` (adding `'down-left'`, `'down-right'`, `'up-left'`, `'up-right'`), existing 4-direction sets remain valid because the record is `Partial`. No migration needed. Document this design intent in the type file so future agents preserve the pattern.

**D2 — Animation set editor panel.** A sheet/panel that shows:
- Name input
- 4 rows: Down, Up, Left, Right
- Each row has a dropdown of saved animations + a "Preview" button
- A visual preview showing the 4-direction diamond layout with animated thumbnails
- Save/Update button

**D3 — List panel integration.** The animation list panel gets two sub-tabs: "Clips" (individual animations) and "Sets" (directional sets). Sets show a 2×2 grid thumbnail preview.

**D4 — Build pack compilation.** Add `animationSets` to the compiled project output. Each set stores direction → animation ID mappings (the individual animations are already compiled).

**D5 — Runtime resolution.** Add to `ProjectRuntime`:

```typescript
resolveAnimationSetKey(setIdOrName: string, facing: Facing4): string | null;
```

This resolves the set, picks the direction's animation ID, then resolves that to a Phaser key.

**D6 — Animation driver integration.** Add two new knobs to the animation-driver preset:

```typescript
{ id: 'idleSet', label: 'Idle Animation Set', type: 'string', default: '' },
{ id: 'walkSet', label: 'Walk Animation Set', type: 'string', default: '' },
```

When a set is configured, the driver calculates facing from velocity:

```typescript
function getFacing(dx: number, dy: number): Facing4 {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}
```

Set knobs take priority over single-animation knobs. If both `idleSet` and `idleAnim` are set, the set is used.

**D7 — Entity binding.** The entities tab gets an "Animation Set" dropdown alongside the existing "Animation" dropdown. When a set is assigned, it overrides the single animation property. Add `animationSetId` to entity properties.

**D8 — Reference safety integration (extends Track A).**
Extend `collectAnimationReferences(animationId)` to include:
- Animation sets that reference the animation (including which facing)
So deletion in Track A becomes future-proof:
- Delete animation → set direction becomes unassigned (and UI warns)

**Acceptance criteria:**
- User can create directional animation sets from saved animations
- Sets compile into project.json
- Animation driver auto-selects direction based on velocity
- Entities can be assigned sets or individual animations
- Reference scanning reports set usage and deletion can clear set directions safely
- Entity inspector shows both options clearly

---

### Track E — Entity Animation Controllers (Non-Player)

**Status:** ✅ Implemented (runtime preset + env wiring + player override coexistence guard).

**Goal:** Allow non-player entities (enemies, NPCs, decorations) to have ongoing animation management with state transitions.

**Why fifth:** Currently only the player gets automatic idle/walk animation switching via the animation-driver preset. All other entities just play their assigned animation on spawn and never change.

**Files to create/modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/runtime/presets/defs/animation-entity-animator.ts` | CREATE | New preset: per-entity animation controller with commands/events |
| `src/runtime/entitySpawner.ts` | MODIFY | Wire entity-animator preset to spawned entities |
| `src/runtime/presets/runtimeEnv.ts` | MODIFY | Add `getEntitySprite(entityId)` to runtime env |
| `src/runtime/presets/presetManager.ts` | MODIFY | Register entity-animator preset |
| `src/types/preset.ts` | POSSIBLY MODIFY | If entity-scoped presets need a target concept |

**Detailed steps:**

**E1 — Entity runtime env expansion.** Add to `RuntimeEnv`:

```typescript
getEntitySprite(entityId: string): Phaser.GameObjects.Sprite | null;
getAllEntitySprites(): Map<string, Phaser.GameObjects.Sprite>;
```

The entity spawner already tracks sprites internally. Expose this map through the runtime env.

**E2 — Entity animator preset.** Create a new preset definition:

```typescript
{
  id: 'entity-animator',
  category: 'animation',
  label: 'Entity Animator',
  description: 'Controls animations for non-player entities.',
  knobs: [
    { id: 'defaultAnim', label: 'Default Animation', type: 'string', default: 'idle' },
    { id: 'autoFacing', label: 'Auto-Facing', type: 'boolean', default: false,
      description: 'Flip sprite based on movement direction' },
    { id: 'phaseMode', label: 'Animation Phase', type: 'string', default: 'sync',
      description: 'sync = all instances align; hash = deterministic per-entity offset (nice for ambience)' },
  ],
  commands: [
    { id: 'entity.playAnim', label: 'Play Entity Animation',
      args: [
        { name: 'entityId', type: 'string', label: 'Entity ID' },
        { name: 'key', type: 'string', label: 'Animation (id/name/anim:key)' },
        { name: 'loop', type: 'boolean', label: 'Loop', default: true },
      ] },
    { id: 'entity.stopAnim', label: 'Stop Entity Animation',
      args: [{ name: 'entityId', type: 'string', label: 'Entity ID' }] },
  ],
  events: [
    { id: 'entity.animComplete', label: 'When Entity Animation Completes',
      payload: [
        { name: 'entityId', type: 'string', label: 'Entity ID' },
        { name: 'key', type: 'string', label: 'Animation Key' },
      ] },
  ],
  state: [
    { id: 'entity.currentAnim', label: 'Entity Current Animation', type: 'string' },
  ],
}
```

Resolution guidance:
- Prefer animation **IDs** in editor-generated selections (most reliable).
- Still allow names/`anim:` keys for power users via `projectRuntime.resolveAnimationKey()`.

**E2 coexistence note:** If both `animation-driver` (player-focused) and `entity-animator` are enabled, calling `entity.playAnim` targeting the player entity creates a conflict — the animation-driver’s `update()` loop recalculates idle/walk every frame and will immediately override it. Resolution: the entity-animator should delegate to `animation.play` for the player entity and set a “forced override” flag that suppresses auto-select until explicitly cleared or timed out. Document this in the preset’s `description` so Blockly tooltip hints surface it.

**E3 — Blockly integration.** The existing schema-to-blocks generation automatically creates blocks for the new preset. Users get:
- "Play [animation] on [entity] looping [true/false]" command block
- "Stop animation on [entity]" command block
- "When entity animation completes" event hat block
- "Current animation of [entity]" state reporter block

**E4 — Auto-facing.** When `autoFacing` is enabled, the entity animator checks velocity/position changes and flips `sprite.flipX` accordingly. This is simpler than full directional sets: just horizontal mirror.

**E5 — Phase mode (optional polish).**
If `phaseMode = 'hash'`, start playback with a deterministic offset:
- `offsetMs = hash(entityId) % periodMs`
This avoids “army-of-clones sync” for ambient props without requiring per-entity clocks everywhere.

**Acceptance criteria:**
- Non-player entities can have their animations controlled via Blockly
- `entity.playAnim` command switches animation on any entity by ID/name/key
- `entity.animComplete` fires when a non-looping animation ends
- Auto-facing flips sprites based on movement direction
- Optional deterministic phase offset works when enabled
- Blockly blocks are auto-generated from preset definition

---

### Track F — Animation State Machine (Visual Editor)

**Goal:** Provide a visual state machine editor where users define animation states and transitions with conditions, replacing manual Blockly scripting for complex animation logic.

**Why last:** This is the most complex feature and builds on everything above. It's also the least critical for initial functionality — Blockly commands from Track E cover most use cases. This is the polish layer.

**Files to create/modify:**

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/panels/animStateMachine.ts` | CREATE | Visual state machine editor (node-based) |
| `src/types/animStateMachine.ts` | CREATE | Type definitions for states, transitions, conditions |
| `src/editor/assets/assetRegistry.ts` | MODIFY | Add state machine CRUD + reference scanning hooks |
| `src/runtime/presets/defs/state-machine-driver.ts` | CREATE | Runtime that evaluates state machine transitions per tick |
| `src/pack/buildProjectPack.ts` | MODIFY | Compile state machines into project.json |

**Detailed steps:**

**F1 — State machine types.**

```typescript
interface AnimStateMachine {
  id: string;
  name: string;
  initialStateId: string;
  states: AnimState[];
  transitions: AnimTransition[];
}

interface AnimState {
  id: string;
  name: string;                // e.g. "Idle", "Walk", "Attack"
  animationId: string;         // prefer animation IDs (stable). Allow name as legacy if needed.
  loop: boolean;
  position: { x: number; y: number };  // node position in visual editor
}

interface AnimTransition {
  id: string;
  fromStateId: string | '*';  // '*' = from any state (wildcard)
  toStateId: string;
  condition: TransitionCondition;
  priority: number;            // higher = evaluated first
}

type TransitionCondition =
  | { type: 'state'; stateId: string; operator: '==' | '!=' | '>' | '<'; value: string | number | boolean }
  | { type: 'event'; eventId: string }
  | { type: 'animComplete' }   // transition when current animation finishes
  | { type: 'exitTime'; normalizedTime: number }  // 0.0–1.0, fires when animation reaches this point
  | { type: 'always' };        // immediate (useful for "any state → hurt")
```

**F2 — Visual editor.** A touch-optimized canvas-based node editor:
- States rendered as rounded rectangles with animation name + tiny animated preview
- Transitions rendered as curved arrows between states
- Tap state to select/edit (change animation, rename)
- Tap-drag from state edge to create transition
- Tap transition arrow to edit condition
- Initial state marked with a special indicator
- **"Any State" node** rendered as a distinct pill at the top of the canvas (similar to Unity Animator). Wildcard transitions (`fromStateId: '*'`) originate from this node. The runtime evaluates wildcard transitions after state-specific transitions at the same priority level.
- Pan/zoom the canvas (reuse existing canvas touch handling patterns)

**F3 — State machine runtime.** The `state-machine-driver` preset:
- Takes a state machine ID as its primary knob
- On each `update()` tick, evaluates transitions from the current state in priority order
- When a condition matches, transitions to the new state and plays its animation
- Emits `stateMachine.stateChanged` event with `{ from, to, trigger }`
- Tracks animation progress as `elapsedMs / totalDurationMs` for `exitTime` condition evaluation
- Exposes `stateMachine.currentState` as readable state

**F4 — Entity binding.** Entities can be assigned a state machine instead of (or in addition to) a single animation or set. The entity inspector shows a "State Machine" dropdown.

**F5 — Reference safety integration (extends Track A).**
Extend `collectAnimationReferences(animationId)` to include state machines that reference the animation (stateId info).
- Delete animation → show impacted state machines
- Provide safe auto-fix options (e.g., clear state.animationId or redirect to a chosen replacement)

**Acceptance criteria:**
- User can visually create animation state machines with nodes and arrows
- States map to animations, transitions have configurable conditions
- Runtime evaluates transitions each tick
- Works for both player and non-player entities
- State changes emit events usable in Blockly
- Reference scanning reports state machine usage and deletion can clear references safely

---

## Implementation Priority + Dependency Map

```
Track A ─────────────────────────────────────────────> (no deps)
   ↓
Track B ─────────────────────────────────────────────> (soft dep on A for asset change events)
   ↓
Track C ─────────────────────────────────────────────> (independent, can parallel with B)
   ↓
Track D ─────────────────────────────────────────────> (depends on A for set management UI)
   ↓
Track E ─────────────────────────────────────────────> (depends on B for entity animation patterns)
   ↓
Track F ─────────────────────────────────────────────> (depends on D + E for full entity animation control)
```

**Recommended execution order:** A → B → C (parallel) → D → E → F

Tracks A and B together deliver the most impactful experience improvement. Track C can run in parallel. Track D builds on the list UI from A. Track E needs the entity animation patterns from B. Track F is a capstone.

---

## Schema Impact Summary

### project.json additions

```jsonc
{
  // existing fields...
  "animations": [/* already defined, currently empty */],
  "animationSets": [/* already defined (reserved), currently empty */],
  // NEW in Track F:
  "animStateMachines": [
    {
      "id": "sm-001",
      "name": "Player Movement",
      "initialStateId": "idle",
      "states": [
        { "id": "idle", "name": "Idle", "animationId": "anim-001", "loop": true },
        { "id": "walk", "name": "Walk", "animationId": "anim-002", "loop": true }
      ],
      "transitions": [
        { "id": "t1", "fromStateId": "idle", "toStateId": "walk",
          "condition": { "type": "state", "stateId": "movement.isMoving", "operator": "==", "value": true },
          "priority": 1 }
      ]
    }
  ]
}
```

### Entity property additions

| Property | Type | Track | Purpose |
|----------|------|-------|---------|
| `animationId` | `string` | EXISTING | Single animation reference |
| `animationState` | `string` | EXISTING | Current state (idle, etc.) |
| `animationSetId` | `string` | Track D | Directional animation set reference |
| `animStateMachineId` | `string` | Track F | State machine reference |

### Hot storage additions

The `AssetRegistryState` (persisted to IndexedDB) gains:
- `animationSets: AnimationSetAsset[]` (Track D)
- `animStateMachines: AnimStateMachine[]` (Track F)
- Per-frame `durationMs?: number` overrides stored on animation frames (Track C)

All are serialized/deserialized through the existing hot storage snapshot mechanism.

**Migration strategy:** Because new fields default to safe empty values (`animationSets: []`, `animStateMachines: []`, `durationMs: undefined`), a `WORKSPACE_VERSION` bump (currently `1` in `src/storage/hot.ts` line 46) is **not required** for Tracks C or D. The `cloneAssetRegistryState()` function should use `?? []` / `?? undefined` defaults when reading snapshots that predate these fields. Reserve a version bump for Track F only if the state machine schema requires structural migration.


---

## Risk Register
| Risk | Severity | Track | Mitigation |
|------|----------|-------|------------|
| Canvas performance with many animated entities | HIGH | B | Clock only advances visible entities; dirty-set-based redraws; auto-pause when no animations visible; cap tracked animations |
| Name collisions causing ambiguous runtime resolution | MEDIUM | A | Enforce unique names on save/rename/duplicate; generate guaranteed-unique “(copy N)” names; surface warnings if duplicates ever allowed |
| Delete/rename breaking cross-references (entities, sets, state machines) | MEDIUM | A/D/F | Central `collectAnimationReferences()` report + “Delete & Clear References”; Tracks D/F extend report coverage as new reference types ship |
| Editor/runtime pivot mismatch (looks aligned in tab, misaligned on map) | MEDIUM | B | Use the same pivot/offset math in `entityRenderer` as runtime; add snapshot tests for a pivoted sprite |
| Per-frame duration Phaser compatibility | MEDIUM | C | Phaser 3 supports `duration` on individual frames in `anims.create()`; fallback path retains uniform `frameRate` when no overrides |
| Animation set adds complexity to entity inspector | MEDIUM | D | Clear UX hierarchy: Set overrides single anim. Show only one active section with toggle |
| State machine visual editor on mobile | HIGH | F | Keep interactions simple: tap to select, drag to connect, bottom sheets for properties. Reuse established touch patterns from tilemap canvas |
| Atlas JSON import format detection false positives | LOW | C | Strict format detection with required field checks; show a confirmation of detected format before importing |
| Entity animator preset scope (per-entity vs global) | MEDIUM | E | Preset architecture is currently global. Entity-scoped commands use entityId args. Document this pattern clearly |
---

## Testing Strategy per Track
**Track A:**
- Unit: `assetRegistry.duplicateAnimation()` creates independent copy and assigns a guaranteed-unique name
- Unit: `makeUniqueAnimationName()` produces correct suffixing (`(copy)`, `(copy 2)`, ...)
- Unit: `assetRegistry.onAnimationsChanged` fires on add/update/remove
- Unit: `collectAnimationReferences()` reports entity hits correctly (initial coverage)
- Integration: Delete animation → entities lose `animationId` via “Delete & Clear References”
- Integration: Rename collision is prevented or auto-suffixed (per policy)

**Track B:**
- Unit: `AnimationClock.tick()` advances frames correctly at configured fps
- Unit: `AnimationClock.tick()` respects loopMode (loop wraps, once stops)
- Integration: Entity with animation renders correct frame at each tick
- Integration: Pivoted animation renders identically in animation tab preview and map canvas preview (snapshot test)
- Performance: 50 animated entities on screen maintain 60fps redraw (or stays within target budget)

**Track C:**
- Unit: Hot-storage migration preserves existing animations; missing `durationMs` defaults to `undefined`
- Unit: `cloneAssetRegistryState()` round-trips `durationMs` correctly (not silently dropped)
- Unit: Aseprite JSON Array parser extracts correct rects and durations
- Unit: Aseprite JSON Hash parser extracts correct rects and durations
- Unit: TexturePacker/Phaser parser extracts correct rects + names
- Integration: Imported atlas frames compile through build pack to runtime (Mode A and/or Mode B)
- Integration: Runtime honors per-frame durations when overrides exist; uses uniform fps otherwise

**Track D:**
- Unit: `resolveAnimationSetKey('setId', 'left')` returns correct Phaser key
- Unit: `getFacing(dx, dy)` returns correct cardinal direction
- Integration: Animation driver uses set when configured, falls back to single anim
- Integration: `collectAnimationReferences()` reports set hits and deletion clears set directions safely

**Track E:**
- Unit: `entity.playAnim` command changes animation on target entity
- Unit: `entity.animComplete` event fires when non-looping animation ends
- Integration: Blockly script can control entity animations via generated blocks
- Integration: Phase mode `'hash'` produces deterministic but de-synced playback starts (when enabled)

**Track F:**
- Unit: State machine evaluates transitions in priority order
- Unit: `animComplete` condition triggers on animation finish
- Unit: `always` condition triggers immediately
- Integration: Visual editor creates valid state machine that runs at runtime
- Integration: `collectAnimationReferences()` reports state machine hits and safe clear/replace works
---

## Estimated Scope

| Track | New Files | Modified Files | Estimated Complexity |
|-------|-----------|----------------|---------------------|
| A — Animation List Panel | 1 | 3 | Medium |
| B — Animated Canvas Preview | 1 | 3 | Medium-High |
| C — Per-Frame Duration + Atlas Import | 1 | 3 | Medium |
| D — Directional Animation Sets | 1 | 6 | High |
| E — Entity Animation Controllers | 1 | 4 | Medium |
| F — Animation State Machine | 3 | 3 | Very High |

**Total: 8 new files, ~22 file modifications across all 6 tracks.**

---

## Quick Win Checklist (can be done independently, any time)

These are small improvements that don't require a full track but improve the animation workflow:

- [ ] **Animation tab: show frame count in preview hint** — currently says "Source: name", should say "Source: name · 8 frames · 12 fps"
- [ ] **Animation tab: keyboard shortcut for play/pause** — spacebar toggle when animation tab is active
- [ ] **Entity renderer: cache animation lookups** — `getAnimationFrame()` does a registry lookup every render call; cache per entity and invalidate on change
- [ ] **Entities tab: show animated preview inline** — small canvas in the entity inspector showing the assigned animation playing
- [ ] **Animation tab: export as GIF** — generate a GIF from the current animation frames for sharing/documentation
- [ ] **Onion skinning** — show previous/next frame as translucent overlay in the animation preview for frame alignment verification
