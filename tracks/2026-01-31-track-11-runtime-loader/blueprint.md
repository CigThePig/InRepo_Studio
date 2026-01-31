# Track 11: Runtime Loader — Blueprint

## Overview

This blueprint details the technical design for loading InRepo Studio data into Phaser, creating tilemaps, spawning entities, and managing scene transitions. The runtime loader bridges the data format gap between editor storage and Phaser's runtime requirements.

---

## Architecture

### Module Structure

```
src/runtime/
├── init.ts              # MODIFY - Use runtime loader
├── loader.ts            # EXISTS (from Track 10) - Data source abstraction
├── projectLoader.ts     # NEW - Project initialization
├── sceneLoader.ts       # NEW - Scene loading and setup
├── tileMapFactory.ts    # NEW - Phaser tilemap creation
├── entityRegistry.ts    # NEW - Entity type management
├── entitySpawner.ts     # NEW - Entity instantiation
├── sceneManager.ts      # NEW - Scene transitions
└── AGENTS.md            # EXISTS - Runtime rules
```

### Data Flow

```
Game Start:
  1. loader.loadProject() → Project data
  2. projectLoader.init(project) → Register tilesets, entity types
  3. sceneLoader.load(sceneId) → Scene data
  4. tileMapFactory.create(scene) → Phaser tilemap
  5. entitySpawner.spawn(scene.entities) → Game objects

Scene Transition:
  1. sceneManager.goTo(sceneId)
  2. Clean up current scene
  3. sceneLoader.load(newSceneId)
  4. Recreate tilemap and entities
```

---

## Detailed Design

### 1. Project Loader

**Interface:**

```typescript
interface ProjectRuntime {
  /** Project configuration */
  project: Project;

  /** Loaded tileset textures */
  tilesets: Map<string, Phaser.Textures.Texture>;

  /** Entity type definitions */
  entityTypes: Map<string, EntityType>;

  /** Get tile texture by category and index */
  getTileTexture(category: string, index: number): string | null;
}

interface ProjectLoaderConfig {
  loader: UnifiedLoader;
  phaserLoader: Phaser.Loader.LoaderPlugin;
}

async function initProject(config: ProjectLoaderConfig): Promise<ProjectRuntime>;
```

**Implementation:**

```typescript
async function initProject(config: ProjectLoaderConfig): Promise<ProjectRuntime> {
  const { loader, phaserLoader } = config;

  // Load project data
  const project = await loader.loadProject();

  // Register entity types
  const entityTypes = new Map<string, EntityType>();
  for (const entityType of project.entityTypes) {
    entityTypes.set(entityType.name, entityType);
  }

  // Load tileset images
  const tilesets = new Map<string, Phaser.Textures.Texture>();

  for (const category of project.tileCategories) {
    for (let i = 0; i < category.files.length; i++) {
      const key = `${category.name}_${i}`;
      const url = `${category.path}/${category.files[i]}`;

      await loadTexture(phaserLoader, key, url);
      tilesets.set(key, phaserLoader.textureManager.get(key));
    }
  }

  return {
    project,
    tilesets,
    entityTypes,

    getTileTexture(category: string, index: number) {
      return `${category}_${index}`;
    },
  };
}
```

### 2. Scene Loader

**Interface:**

```typescript
interface SceneRuntime {
  /** Scene data */
  scene: Scene;

  /** Scene ID */
  id: string;

  /** Scene dimensions in pixels */
  widthPx: number;
  heightPx: number;
}

interface SceneLoaderConfig {
  loader: UnifiedLoader;
  projectRuntime: ProjectRuntime;
}

async function loadScene(
  config: SceneLoaderConfig,
  sceneId: string
): Promise<SceneRuntime>;
```

**Implementation:**

```typescript
async function loadScene(
  config: SceneLoaderConfig,
  sceneId: string
): Promise<SceneRuntime> {
  const { loader, projectRuntime } = config;

  const scene = await loader.loadScene(sceneId);

  return {
    scene,
    id: sceneId,
    widthPx: scene.width * scene.tileSize,
    heightPx: scene.height * scene.tileSize,
  };
}
```

### 3. Tilemap Factory

**Interface:**

```typescript
interface TileMapConfig {
  phaserScene: Phaser.Scene;
  sceneRuntime: SceneRuntime;
  projectRuntime: ProjectRuntime;
}

interface TileMapResult {
  /** The created tilemap */
  tilemap: Phaser.Tilemaps.Tilemap;

  /** Layer references */
  layers: {
    ground: Phaser.Tilemaps.TilemapLayer | null;
    props: Phaser.Tilemaps.TilemapLayer | null;
    collision: Phaser.Tilemaps.TilemapLayer | null;
    triggers: Phaser.Tilemaps.TilemapLayer | null;
  };

  /** Cleanup function */
  destroy(): void;
}

function createTileMap(config: TileMapConfig): TileMapResult;
```

**Implementation approach:**

Since Phaser expects a specific tilemap format, we create a tilemap dynamically:

```typescript
function createTileMap(config: TileMapConfig): TileMapResult {
  const { phaserScene, sceneRuntime, projectRuntime } = config;
  const { scene } = sceneRuntime;

  // Create an empty tilemap
  const tilemap = phaserScene.make.tilemap({
    tileWidth: scene.tileSize,
    tileHeight: scene.tileSize,
    width: scene.width,
    height: scene.height,
  });

  // Add tilesets
  const tilesetImages: Phaser.Tilemaps.Tileset[] = [];
  for (const [key, texture] of projectRuntime.tilesets) {
    const tileset = tilemap.addTilesetImage(key, key, scene.tileSize, scene.tileSize);
    if (tileset) {
      tilesetImages.push(tileset);
    }
  }

  // Create layers
  const groundLayer = createLayer(tilemap, 'ground', scene.layers.ground, tilesetImages);
  const propsLayer = createLayer(tilemap, 'props', scene.layers.props, tilesetImages);
  const collisionLayer = createCollisionLayer(tilemap, 'collision', scene.layers.collision);
  const triggerLayer = createTriggerLayer(tilemap, 'triggers', scene.layers.triggers);

  return {
    tilemap,
    layers: {
      ground: groundLayer,
      props: propsLayer,
      collision: collisionLayer,
      triggers: triggerLayer,
    },
    destroy() {
      tilemap.destroy();
    },
  };
}

function createLayer(
  tilemap: Phaser.Tilemaps.Tilemap,
  name: string,
  data: number[][],
  tilesets: Phaser.Tilemaps.Tileset[]
): Phaser.Tilemaps.TilemapLayer | null {
  // Create blank layer
  const layer = tilemap.createBlankLayer(name, tilesets);
  if (!layer) return null;

  // Fill with data
  for (let y = 0; y < data.length; y++) {
    for (let x = 0; x < data[y].length; x++) {
      const tileIndex = data[y][x];
      if (tileIndex > 0) {
        layer.putTileAt(tileIndex - 1, x, y); // Convert from 1-indexed
      }
    }
  }

  return layer;
}
```

### 4. Entity Registry

**Interface:**

```typescript
interface EntityRegistry {
  /** Get entity type definition */
  getType(name: string): EntityType | undefined;

  /** Check if type exists */
  hasType(name: string): boolean;

  /** Get all type names */
  getTypeNames(): string[];
}

function createEntityRegistry(entityTypes: EntityType[]): EntityRegistry;
```

### 5. Entity Spawner

**Interface:**

```typescript
interface SpawnConfig {
  phaserScene: Phaser.Scene;
  entityRegistry: EntityRegistry;
  projectRuntime: ProjectRuntime;
}

interface SpawnedEntity {
  /** Entity instance data */
  instance: EntityInstance;

  /** Phaser game object */
  gameObject: Phaser.GameObjects.GameObject;

  /** Destroy the entity */
  destroy(): void;
}

function spawnEntities(
  config: SpawnConfig,
  entities: EntityInstance[]
): SpawnedEntity[];

function spawnEntity(
  config: SpawnConfig,
  entity: EntityInstance
): SpawnedEntity | null;
```

**Implementation:**

```typescript
function spawnEntity(
  config: SpawnConfig,
  entity: EntityInstance
): SpawnedEntity | null {
  const { phaserScene, entityRegistry, projectRuntime } = config;

  const entityType = entityRegistry.getType(entity.type);
  if (!entityType) {
    console.warn(`Unknown entity type: ${entity.type}`);
    return null;
  }

  // Create a sprite or container based on entity type
  // For now, create a simple sprite placeholder
  const sprite = phaserScene.add.sprite(entity.x, entity.y, 'entity_placeholder');

  // Apply properties
  for (const [key, value] of Object.entries(entity.properties)) {
    // Handle common properties
    if (key === 'scale' && typeof value === 'number') {
      sprite.setScale(value);
    }
    // Store others as data
    sprite.setData(key, value);
  }

  return {
    instance: entity,
    gameObject: sprite,
    destroy() {
      sprite.destroy();
    },
  };
}
```

### 6. Scene Manager

**Interface:**

```typescript
interface SceneManagerConfig {
  loader: UnifiedLoader;
  projectRuntime: ProjectRuntime;
  phaserScene: Phaser.Scene;
  onSceneLoad?: (sceneId: string) => void;
}

interface SceneManager {
  /** Current scene ID */
  currentSceneId: string | null;

  /** Load and switch to a scene */
  goTo(sceneId: string, options?: { x?: number; y?: number }): Promise<void>;

  /** Reload current scene */
  reload(): Promise<void>;

  /** Get current scene runtime */
  getCurrentScene(): SceneRuntime | null;

  /** Cleanup */
  destroy(): void;
}

function createSceneManager(config: SceneManagerConfig): SceneManager;
```

**Implementation:**

```typescript
function createSceneManager(config: SceneManagerConfig): SceneManager {
  const { loader, projectRuntime, phaserScene, onSceneLoad } = config;

  let currentSceneRuntime: SceneRuntime | null = null;
  let currentTilemap: TileMapResult | null = null;
  let currentEntities: SpawnedEntity[] = [];

  async function cleanup(): Promise<void> {
    // Destroy entities
    for (const entity of currentEntities) {
      entity.destroy();
    }
    currentEntities = [];

    // Destroy tilemap
    if (currentTilemap) {
      currentTilemap.destroy();
      currentTilemap = null;
    }

    currentSceneRuntime = null;
  }

  return {
    currentSceneId: null,

    async goTo(sceneId, options = {}) {
      await cleanup();

      // Load scene
      currentSceneRuntime = await loadScene(
        { loader, projectRuntime },
        sceneId
      );

      // Create tilemap
      currentTilemap = createTileMap({
        phaserScene,
        sceneRuntime: currentSceneRuntime,
        projectRuntime,
      });

      // Spawn entities
      const entityRegistry = createEntityRegistry(
        Array.from(projectRuntime.entityTypes.values())
      );

      currentEntities = spawnEntities(
        { phaserScene, entityRegistry, projectRuntime },
        currentSceneRuntime.scene.entities
      );

      this.currentSceneId = sceneId;
      onSceneLoad?.(sceneId);
    },

    async reload() {
      if (this.currentSceneId) {
        await this.goTo(this.currentSceneId);
      }
    },

    getCurrentScene() {
      return currentSceneRuntime;
    },

    destroy() {
      cleanup();
    },
  };
}
```

### 7. Runtime Init Integration

**Updated init:**

```typescript
interface RuntimeInitConfig {
  loader: UnifiedLoader;
  startSceneId?: string;
}

async function initRuntime(config: RuntimeInitConfig): Promise<void> {
  const { loader, startSceneId } = config;

  // Initialize Phaser
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    scene: {
      preload: async function() {
        // Load project
        projectRuntime = await initProject({
          loader,
          phaserLoader: this.load,
        });
      },

      create: async function() {
        // Create scene manager
        sceneManager = createSceneManager({
          loader,
          projectRuntime,
          phaserScene: this,
        });

        // Load starting scene
        const scene = startSceneId || projectRuntime.project.defaultScene;
        await sceneManager.goTo(scene);
      },

      update: function(time, delta) {
        // Game loop
      },
    },
  });
}
```

---

## State Management

### Runtime State

```typescript
interface RuntimeState {
  projectRuntime: ProjectRuntime | null;
  sceneManager: SceneManager | null;
  game: Phaser.Game | null;
}
```

Not persisted - recreated on each runtime init.

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/runtime/projectLoader.ts` | Create | Project initialization |
| `src/runtime/sceneLoader.ts` | Create | Scene loading |
| `src/runtime/tileMapFactory.ts` | Create | Phaser tilemap creation |
| `src/runtime/entityRegistry.ts` | Create | Entity type management |
| `src/runtime/entitySpawner.ts` | Create | Entity instantiation |
| `src/runtime/sceneManager.ts` | Create | Scene transitions |
| `src/runtime/init.ts` | Modify | Use new loaders |

---

## API Contracts

### Project Loader

```typescript
const projectRuntime = await initProject({
  loader: createUnifiedLoader('hot'),
  phaserLoader: scene.load,
});
```

### Scene Manager

```typescript
const sceneManager = createSceneManager({
  loader,
  projectRuntime,
  phaserScene: scene,
});

await sceneManager.goTo('level-1');
await sceneManager.goTo('level-2', { x: 100, y: 200 });
```

### Tilemap Factory

```typescript
const tilemap = createTileMap({
  phaserScene: scene,
  sceneRuntime,
  projectRuntime,
});

// Access layers
tilemap.layers.ground;
tilemap.layers.collision;
```

---

## Edge Cases

1. **Missing Tileset Image**: Log warning, use placeholder
2. **Unknown Entity Type**: Log warning, skip entity
3. **Invalid Scene Data**: Throw error, show user message
4. **Scene Not Found**: Throw error, suggest fallback
5. **Empty Scene**: Valid - just no tiles/entities
6. **Circular Scene Transitions**: No protection needed (not our concern)

---

## Performance Considerations

1. **Texture Atlas**: Consider combining tiles into atlas
2. **Tileset Caching**: Don't reload same textures
3. **Scene Cleanup**: Properly destroy to prevent leaks
4. **Lazy Entity Loading**: Spawn visible entities first (future)

---

## Testing Strategy

### Manual Tests

1. Load game, verify tilemap renders
2. Verify all four layers visible
3. Edit in editor, playtest, verify changes
4. Add entities in editor, verify they appear
5. Test scene transitions

### Unit Tests

1. `initProject`: Loads project and registers types
2. `loadScene`: Loads scene data correctly
3. `createTileMap`: Creates valid Phaser tilemap
4. `spawnEntity`: Creates game objects with properties
5. `sceneManager.goTo`: Transitions cleanly

---

## Notes

- Phaser tilemap format differs from our data format
- Collision handling may need Arcade physics setup
- Entity spawner is simple now; behaviors added later
- Consider texture atlas generation for performance
- Scene manager handles all transitions and cleanup
