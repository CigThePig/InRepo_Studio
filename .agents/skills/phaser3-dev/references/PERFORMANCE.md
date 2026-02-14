# Mobile Performance Optimization

Best practices for maintaining smooth 60fps gameplay on mobile devices with Phaser 3.

## Object Pooling

Never create and destroy objects during gameplay. Use groups with a fixed `maxSize`:

```js
// Create pool in create()
this.bulletPool = this.physics.add.group({
  classType: Bullet,
  maxSize: 30,
  runChildUpdate: true,
});

// Get from pool (returns null if pool is exhausted)
fire(x, y) {
  const bullet = this.bulletPool.get(x, y);
  if (bullet) {
    bullet.setActive(true).setVisible(true);
    bullet.fire(this.target);
  }
}

// Return to pool
class Bullet extends Phaser.Physics.Arcade.Sprite {
  deactivate() {
    this.setActive(false).setVisible(false);
    this.body.stop();
    this.body.enable = false;
  }
}
```

## Texture Atlases

Use atlases instead of individual images. One atlas = one draw call for all sprites in it.

```js
// Load a texture atlas (JSON Hash format)
this.load.atlas('gameAtlas', 'assets/atlas.png', 'assets/atlas.json');

// Use frames from the atlas
this.add.sprite(x, y, 'gameAtlas', 'player_idle_01');

// Animation from atlas frames
this.anims.create({
  key: 'walk',
  frames: this.anims.generateFrameNames('gameAtlas', {
    prefix: 'player_walk_',
    start: 1, end: 8,
    zeroPad: 2, suffix: '.png',
  }),
  frameRate: 10,
  repeat: -1,
});
```

### Atlas Tips

- Combine all sprites for a scene into a single atlas (use TexturePacker or free-tex-packer).
- Keep atlas dimensions as powers of 2 (1024×1024, 2048×2048).
- On mobile, stay at or under 2048×2048 for broad compatibility.

## Draw Call Reduction

Each unique texture or blend mode change costs a draw call. Minimize them:

- Use texture atlases (one draw call per atlas).
- Group objects by texture in the display list — Phaser batches consecutive same-texture sprites.
- Avoid mixing `setBlendMode()` values between sprites that are adjacent in the display list.
- Use `this.add.renderTexture()` to flatten complex static backgrounds into a single texture.

## Particle Budgets

Particles are cheap individually but add up on mobile:

```js
const emitter = this.add.particles(x, y, 'gameAtlas', {
  frame: 'particle',
  speed: { min: 50, max: 150 },
  lifespan: 400,
  quantity: 5,       // Keep low on mobile
  maxParticles: 20,  // Hard cap
  scale: { start: 0.5, end: 0 },
  blendMode: 'ADD',  // Caution: blend mode changes break batching
});
```

**Guidelines:**
- Limit active particle count to ~50–100 on mobile.
- Use short lifespans (200–500ms) so particles recycle fast.
- Avoid `blendMode: 'ADD'` if you can achieve the visual effect without it.
- Call `emitter.stop()` when off-screen.

## Off-Screen Culling

Disable processing for objects outside the camera view:

```js
update(time, delta) {
  const cam = this.cameras.main;
  const bounds = new Phaser.Geom.Rectangle(
    cam.scrollX - 64, cam.scrollY - 64,
    cam.width + 128, cam.height + 128
  );

  this.enemies.getChildren().forEach(enemy => {
    const visible = bounds.contains(enemy.x, enemy.y);
    enemy.setActive(visible).setVisible(visible);
    if (enemy.body) enemy.body.enable = visible;
  });
}
```

For large worlds, use spatial partitioning or check distance from camera center instead.

## setActive / setVisible Patterns

Use these instead of `destroy()` for reusable objects:

```js
// Deactivate (stop updates and rendering, keep in memory)
sprite.setActive(false).setVisible(false);
sprite.body.enable = false;

// Reactivate
sprite.setActive(true).setVisible(true);
sprite.body.enable = true;
sprite.body.reset(x, y);
```

Group methods use `active` to filter:

```js
group.get(x, y);           // Returns first inactive member
group.countActive(true);   // Active count
group.countActive(false);  // Inactive count
```

## Avoiding GC Pressure in Update Loops

Garbage collection pauses cause frame drops. Avoid allocations in `update()`:

```js
// BAD — creates a new Vector2 every frame
update(time, delta) {
  const dir = new Phaser.Math.Vector2(target.x - this.x, target.y - this.y);
  dir.normalize();
}

// GOOD — reuse a pre-allocated vector
create() {
  this._tempVec = new Phaser.Math.Vector2();
}
update(time, delta) {
  this._tempVec.set(target.x - this.x, target.y - this.y).normalize();
}
```

**Other allocation traps:**
- Don't create arrays, objects, or strings in `update()` unless necessary.
- Don't use `Array.map()`, `filter()`, or `reduce()` in hot loops — they allocate new arrays. Use `for` loops.
- Cache `this.scale.width` and `this.scale.height` if used every frame.
- Don't concatenate strings for text updates — use template literals or `.setText()` with cached strings.

## WebGL Renderer Tips

- Phaser defaults to WebGL on mobile. The `Phaser.AUTO` type selects WebGL if available.
- Set `roundPixels: true` in game config to avoid sub-pixel rendering artifacts on low-DPI screens.
- Use `pixelArt: true` in game config for pixel-art games — disables anti-aliasing.
- Avoid `Graphics` objects in `update()` — they re-tessellate every frame. Pre-render to a `RenderTexture` instead.

## Profiling

```js
// Log FPS in update
update() {
  if (this.game.loop.actualFps < 50) {
    console.warn('FPS drop:', Math.round(this.game.loop.actualFps));
  }
}
```

Use Chrome DevTools Performance tab with CPU throttling (4× slowdown) to simulate mobile performance on desktop.
