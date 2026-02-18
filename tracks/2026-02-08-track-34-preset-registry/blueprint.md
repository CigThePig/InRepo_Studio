# Track 34 — Blueprint (Technical Design)

## Architecture Overview

Track 34 builds the runtime preset engine inside `src/runtime/presets/`. It has three layers:

1. **PresetInstance** — runtime interface that each preset implementation conforms to
2. **PresetRegistry** — static discovery layer that indexes PresetDefinitions
3. **PresetManager** — orchestration engine that manages the full lifecycle

```
PresetSavedConfig (/game/presets.json)
        │
        v
  PresetManager (lifecycle engine)
        │
        ├── reads PresetRegistry (which definitions exist?)
        ├── instantiates PresetInstances per enabled category
        ├── merges config (user overrides + preset defaults)
        ├── registers commands/events/state into ApiContext
        └── disposes all on shutdown
```

## File Layout

```
src/runtime/presets/
├── AGENTS.md              (existing)
├── index.ts               (existing — update with exports)
├── presetInstance.ts       NEW — PresetInstance interface + factory type
├── presetRegistry.ts       NEW — Registry loader via import.meta.glob
├── presetManager.ts        NEW — PresetManager engine
├── gameProfiles.ts         NEW — Profile definitions + profile apply logic
└── defs/                   NEW — v1 preset stub definitions
    ├── controls-topdown.ts
    ├── controls-platformer.ts
    ├── movement-topdown.ts
    ├── movement-platformer.ts
    ├── camera-follow.ts
    └── animation-driver.ts
```

## Interfaces and Types

### PresetInstance (runtime interface)

```ts
interface PresetInstance {
  readonly definition: PresetDefinition;

  /** Apply merged config to the live system. */
  applyConfig(config: Record<string, unknown>): void;

  /** Register commands, events, state into an API registration surface. */
  registerApi(registrar: PresetApiRegistrar): void;

  /** Called per frame if the preset needs update-loop work (optional). */
  update?(delta: number): void;

  /** Clean up all resources. */
  dispose(): void;
}
```

### PresetApiRegistrar (registration surface)

```ts
interface PresetApiRegistrar {
  registerCommand(id: string, handler: (args: Record<string, unknown>) => unknown): void;
  registerState(id: string, getter: () => unknown): void;
  emitEvent(id: string, payload?: Record<string, unknown>): void;
}
```

This avoids passing the full ApiContext to preset instances. PresetManager creates a registrar that routes commands/state/events into the ApiContext.

### PresetFactory

```ts
type PresetFactory = (definition: PresetDefinition) => PresetInstance;
```

Each preset def file exports both a `PresetDefinition` and a `PresetFactory`.

### PresetRegistry

```ts
interface PresetRegistryEntry {
  definition: PresetDefinition;
  factory: PresetFactory;
}

interface PresetRegistry {
  getById(presetId: string): PresetRegistryEntry | null;
  getByCategory(categoryId: PresetCategoryId): PresetRegistryEntry[];
  getAllDefinitions(): PresetDefinition[];
  getAllIds(): string[];
}
```

Built at startup via `import.meta.glob('./defs/*.ts', { eager: true })`. Each file must export `definition: PresetDefinition` and `factory: PresetFactory`.

### PresetManager

```ts
interface PresetManagerState {
  readonly config: PresetSavedConfig;
  readonly activeInstances: Map<PresetCategoryId, PresetInstance>;
  readonly profile: GameProfile;
}

class PresetManager {
  constructor(registry: PresetRegistry);

  /** Load config and instantiate active presets. */
  initialize(config: PresetSavedConfig): void;

  /** Register all active preset commands/state into the registrar. */
  registerApi(registrar: PresetApiRegistrar): void;

  /** Apply a config change to a specific category. */
  updateCategoryConfig(categoryId: PresetCategoryId, config: Record<string, unknown>): void;

  /** Enable/disable a category. */
  setCategoryEnabled(categoryId: PresetCategoryId, enabled: boolean, presetId?: string): void;

  /** Apply a game profile (selects recommended presets). */
  applyProfile(profile: GameProfile): PresetSavedConfig;

  /** Get current state for persistence. */
  getConfig(): PresetSavedConfig;

  /** Check for conflicts in current configuration. */
  getConflicts(): PresetConflict[];

  /** Called per frame for presets that need updates. */
  update(delta: number): void;

  /** Dispose all active instances. */
  dispose(): void;
}
```

### PresetConflict

```ts
interface PresetConflict {
  categoryA: PresetCategoryId;
  presetA: string;
  categoryB: PresetCategoryId;
  presetB: string;
  suggestion?: string;
}
```

## Game Profiles

```ts
interface GameProfileDef {
  id: GameProfile;
  label: string;
  recommendations: Partial<Record<PresetCategoryId, string>>;
}
```

Top-down profile recommends: controls-topdown, movement-topdown, camera-follow, animation-driver.
Platformer profile recommends: controls-platformer, movement-platformer, camera-follow, animation-driver.
Custom profile: no recommendations (user-driven).

Profile apply logic:
1. Iterate recommendations.
2. For each category, set enabled=true, presetId=recommended.
3. Apply default config for each.
4. Return new PresetSavedConfig.
5. If user later mixes incompatible presets, profile auto-switches to 'custom'.

## v1 Preset Stubs

Each stub exports a `PresetDefinition` with realistic knobs/commands/events/state, and a `PresetFactory` that returns a no-op `PresetInstance`. The no-op instance:
- `applyConfig()` — stores config but does nothing with it
- `registerApi()` — registers commands that log "not implemented", state getters that return defaults
- `update()` — no-op
- `dispose()` — clears stored config

This makes the full pipeline testable (registry → manager → API registration) without requiring Phaser.

### Stub schema examples (abbreviated):

**controls-topdown**: knobs (moveSpeed, diagonalEnabled), commands (controls.setOption), events (controls.directionChanged), state (controls.moveX, controls.moveY)

**movement-platformer**: knobs (gravity, jumpForce, maxFallSpeed), commands (movement.jump, movement.applyImpulse), events (movement.landed, movement.jumped), state (movement.grounded, movement.velocityY)

**camera-follow**: knobs (followOffsetX, followOffsetY, lerpSpeed, deadzoneWidth, deadzoneHeight), commands (camera.shake, camera.setZoom), events (camera.shakeStarted, camera.shakeEnded), state (camera.zoom, camera.isShaking)

**animation-driver**: knobs (idleAnim, walkAnim, jumpAnim, fallAnim), commands (animation.play, animation.stop), events (animation.completed), state (animation.currentAnim, animation.isPlaying)

## Config Merging Flow

1. Load PresetSavedConfig from /game/presets.json (or create default).
2. For each enabled category:
   a. Look up presetId in registry.
   b. If not found: log warning, skip (missing preset safe handling).
   c. Extract knob defaults from definition.
   d. Merge: user config + defaults using `mergeCategoryConfig()`.
   e. Validate merged config (unknown keys preserved, invalid values fall back to defaults).
3. Pass merged config to `PresetInstance.applyConfig()`.

## API Registration Flow

1. PresetManager creates a `PresetApiRegistrar` backed by Maps.
2. Each active PresetInstance calls `registrar.registerCommand(id, handler)` and `registrar.registerState(id, getter)`.
3. PresetManager exposes `handleCall(commandId, args)` and `handleRead(stateId)` — these are wired into `ApiContext.call()` and `ApiContext.read()` by SceneHost (Track 35).
4. Events are emitted via `registrar.emitEvent(id, payload)` which delegates to the event bus.

## Error Handling

- Missing presetId in registry → warn + skip, category stays "enabled but inactive"
- Conflicting presets → detect and return via `getConflicts()`, never crash
- Invalid config values → fall back to defaults with warning
- Zero presets enabled → safe default, PresetManager runs with empty instance map

## Dependencies

- `src/types/preset.ts` (PresetDefinition, PresetSavedConfig, PresetCategoryId)
- `src/types/presetDefaults.ts` (mergeCategoryConfig, createDefaultPresetConfig, GameProfile)
- `src/types/presetValidation.ts` (validatePresetDefinition)
- `src/types/gameApi.ts` (PresetSurface, PresetCategorySurface — for type alignment)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PresetInstance interface too rigid | Blocks future preset needs | Keep minimal; additive evolution |
| import.meta.glob path wrong | Registry empty | Unit test registry loading |
| Config validation too strict | Rejects valid user configs | Lenient validation: preserve unknown keys, only reject wrong types |
