# Phaser 3 Scene Lifecycle

Complete documentation of the Phaser 3 scene lifecycle, events, and state transitions.

## Lifecycle Flow

```
Scene Added to Manager
        │
        ▼
     init(data)          ← Called once when scene starts; receives data from scene.start()
        │
        ▼
   preload()             ← Load assets here; scene pauses until loading completes
        │
        ▼
    create(data)         ← Set up game objects, physics, input; receives same data as init()
        │
        ▼
  ┌─► update(time, delta) ◄─┐
  │       │                  │
  │       └──────────────────┘   ← Runs every frame (~60fps)
  │
  │   [scene.pause()]
  │       │
  │       ▼
  │    PAUSED ──[scene.resume()]──► update loop resumes
  │
  │   [scene.sleep()]
  │       │
  │       ▼
  │   SLEEPING ──[scene.wake()]──► update loop resumes
  │
  │   [scene.restart()]──► init() (re-enters full lifecycle)
  │
  │   [scene.stop()]
  │       │
  │       ▼
  │   SHUTDOWN ──► scene removed from active list
  │
  └── [scene.start('Other')]──► current scene shuts down, target scene starts
```

## Lifecycle Methods

### `init(data)`

Called first when a scene starts. Use for initializing variables that must be set before loading.

```js
init(data) {
  this.level = data.level || 1;
  this.score = data.score || 0;
}
```

### `preload()`

Called after `init()`. Load all assets here. The scene will not call `create()` until all assets finish loading.

```js
preload() {
  this.load.image('bg', 'assets/bg.png');
  this.load.spritesheet('hero', 'assets/hero.png', { frameWidth: 32, frameHeight: 48 });
}
```

### `create(data)`

Called after all assets from `preload()` are loaded. Set up game objects, physics bodies, input handlers, animations, and cameras here.

```js
create(data) {
  this.bg = this.add.image(0, 0, 'bg').setOrigin(0);
  this.hero = this.physics.add.sprite(100, 100, 'hero');
  this.setupInput();
}
```

### `update(time, delta)`

Called every frame. `time` is ms since game started. `delta` is ms since last frame. Always use `delta` for movement.

```js
update(time, delta) {
  this.hero.x += this.speed * (delta / 1000);
}
```

## Scene Events

Listen on the scene's `events` emitter or directly on `this.events`:

```js
create() {
  this.events.on('pause', this.onPause, this);
  this.events.on('resume', this.onResume, this);
  this.events.on('sleep', this.onSleep, this);
  this.events.on('wake', this.onWake, this);
  this.events.on('shutdown', this.onShutdown, this);
  this.events.on('destroy', this.onDestroy, this);
}
```

### Event Descriptions

| Event | Trigger | Use Case |
|-------|---------|----------|
| `pause` | `scene.pause()` | Pause game logic, show pause menu |
| `resume` | `scene.resume()` | Resume from pause |
| `sleep` | `scene.sleep()` | Scene still in memory but not updating or rendering |
| `wake` | `scene.wake()` | Resume from sleep, re-bind input |
| `shutdown` | `scene.stop()` or `scene.start('Other')` | **Clean up**: remove listeners, timers, custom events |
| `destroy` | Scene removed from manager entirely | Final cleanup, release all references |

### Critical: Cleanup in Shutdown

Always clean up in `shutdown` to prevent memory leaks. This is especially important when scenes are restarted.

```js
onShutdown() {
  // Remove custom event listeners
  this.input.off('pointerdown', this.onTap, this);
  window.removeEventListener('inrepo:hot-reload', this.reloadHandler);

  // Remove timers
  if (this.spawnTimer) this.spawnTimer.remove();

  // Tweens are auto-destroyed, but cancel any pending if needed
  this.tweens.killAll();
}
```

## Scene Management Methods

```js
// Start a scene (stops current scene if called from within)
this.scene.start('TargetScene', { level: 1 });

// Launch a scene in parallel (both run simultaneously)
this.scene.launch('HUDScene');

// Stop a running scene
this.scene.stop('HUDScene');

// Pause/resume
this.scene.pause('GameScene');
this.scene.resume('GameScene');

// Sleep/wake (lighter than stop/start)
this.scene.sleep('GameScene');
this.scene.wake('GameScene');

// Restart current scene
this.scene.restart({ level: this.level + 1 });

// Get reference to another scene
const hud = this.scene.get('HUDScene');

// Bring scene to top of render order
this.scene.bringToTop('HUDScene');

// Check if scene is active
this.scene.isActive('GameScene');
```

## Parallel Scenes Pattern

Run multiple scenes simultaneously for UI layers:

```js
// In BootScene:
create() {
  this.scene.start('GameScene');
  this.scene.launch('HUDScene');
  this.scene.launch('PauseButtonScene');
}
```

Each parallel scene has its own independent `update()` loop, input handlers, and camera. Use `this.scene.get()` or events to communicate between them.
