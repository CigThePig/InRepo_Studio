# Phaser 3 API Patterns Reference

Detailed API signatures and usage examples for the most-used Phaser 3 APIs in InRepo Studio.

## Sprites

### Creating a Sprite

```js
// Physics-enabled sprite
const player = this.physics.add.sprite(x, y, 'textureKey', frame);

// Static sprite (no physics)
const bg = this.add.sprite(x, y, 'textureKey');
```

### Key Sprite Properties

```js
sprite.setPosition(x, y);
sprite.setScale(scaleX, scaleY);
sprite.setOrigin(0.5, 0.5);       // Anchor point (0–1)
sprite.setAlpha(0.8);
sprite.setDepth(10);               // Z-order (higher = on top)
sprite.setFlipX(true);             // Mirror horizontally
sprite.setTint(0xff0000);          // Color tint
sprite.setVisible(false);          // Hide without destroying
sprite.setActive(false);           // Disable update processing
sprite.destroy();                  // Remove from scene permanently
```

### Sprite with Physics Body

```js
sprite.body.setVelocity(vx, vy);
sprite.body.setVelocityX(200);
sprite.body.setAcceleration(ax, ay);
sprite.body.setDrag(drag);
sprite.body.setMaxVelocity(maxVx, maxVy);
sprite.body.setBounce(0.5);
sprite.body.setCollideWorldBounds(true);
sprite.body.setSize(width, height);          // Hitbox size
sprite.body.setOffset(offsetX, offsetY);     // Hitbox offset from sprite
sprite.body.setImmovable(true);              // Platforms, walls
sprite.body.setGravityY(500);                // Per-body gravity override
```

## Physics (Arcade)

### World Setup

```js
// In game config:
physics: {
  default: 'arcade',
  arcade: {
    gravity: { y: 300 },
    debug: false,
    fps: 60,
  }
}

// At runtime:
this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
this.physics.world.setBoundsCollision(true, true, true, true); // l, r, t, b
```

### Collisions

```js
// Collide: physical separation + callback
this.physics.add.collider(spriteA, spriteB, onCollide, processCallback, this);

// Overlap: no separation, callback only
this.physics.add.overlap(player, coins, collectCoin, null, this);

// Collide with tilemap layer
this.physics.add.collider(player, groundLayer);

// Static group (platforms)
const platforms = this.physics.add.staticGroup();
platforms.create(400, 568, 'ground').setScale(2).refreshBody();
```

### Collision Callbacks

```js
function onCollide(objectA, objectB) {
  // objectA and objectB are the colliding game objects
}
function processCallback(objectA, objectB) {
  // Return true to process collision, false to skip
  return objectA.active && objectB.active;
}
```

## Tweens

### Basic Tween

```js
this.tweens.add({
  targets: sprite,            // Single object or array
  x: 400,                     // Target value
  y: { from: 0, to: 300 },   // Explicit from/to
  alpha: { start: 1, to: 0 },
  duration: 1000,             // ms
  ease: 'Power2',             // Ease function
  delay: 200,
  repeat: 3,                  // -1 for infinite
  yoyo: true,                 // Reverse after completing
  hold: 500,                  // Pause at end before yoyo
  onComplete: () => { sprite.destroy(); },
  onUpdate: (tween, target) => {},
});
```

### Common Ease Functions

`Linear`, `Power1` (Quad), `Power2` (Cubic), `Power3` (Quart), `Power4` (Quint), `Sine`, `Expo`, `Circ`, `Elastic`, `Back`, `Bounce`. Append `.easeIn`, `.easeOut`, `.easeInOut`.

### Tween Chain

```js
this.tweens.chain({
  targets: sprite,
  tweens: [
    { y: '-=100', duration: 300, ease: 'Power2' },
    { x: '+=200', duration: 500, ease: 'Linear' },
    { alpha: 0, duration: 200 },
  ],
  onComplete: () => sprite.destroy(),
});
```

## Input

### Pointer (Mouse + Touch)

```js
this.input.on('pointerdown', (pointer) => {
  console.log(pointer.x, pointer.y);         // Screen coords
  console.log(pointer.worldX, pointer.worldY); // World coords (camera-adjusted)
});
this.input.on('pointermove', (pointer) => { /* ... */ });
this.input.on('pointerup', (pointer) => { /* ... */ });
```

### Interactive Game Objects

```js
sprite.setInteractive();
sprite.on('pointerdown', (pointer) => { /* tapped this sprite */ });
sprite.on('pointerover', () => { sprite.setTint(0xff0000); });
sprite.on('pointerout', () => { sprite.clearTint(); });

// Custom hit area
sprite.setInteractive(new Phaser.Geom.Circle(50, 50, 50), Phaser.Geom.Circle.Contains);

// Drag
this.input.setDraggable(sprite);
sprite.on('drag', (pointer, dragX, dragY) => {
  sprite.x = dragX;
  sprite.y = dragY;
});
```

### Keyboard (Desktop Only)

```js
// Always guard for mobile
if (this.input.keyboard) {
  this.cursors = this.input.keyboard.createCursorKeys();
  this.wasd = this.input.keyboard.addKeys('W,A,S,D');
  this.input.keyboard.on('keydown-SPACE', () => { this.jump(); });
}
```

## Cameras

### Main Camera

```js
const cam = this.cameras.main;
cam.startFollow(target, roundPixels, lerpX, lerpY);
cam.setFollowOffset(offsetX, offsetY);
cam.stopFollow();
cam.setZoom(1.5);
cam.setBounds(0, 0, mapWidth, mapHeight);
cam.setBackgroundColor('#2d2d2d');
```

### Camera Effects

```js
cam.shake(duration, intensity);      // e.g., (200, 0.01)
cam.flash(duration, r, g, b);       // e.g., (250, 255, 255, 255)
cam.fade(duration, r, g, b);        // e.g., (500, 0, 0, 0)
cam.pan(x, y, duration, ease);
cam.zoomTo(zoom, duration, ease);
cam.once('camerafadeoutcomplete', () => { /* transition */ });
```

### Multiple Cameras

```js
const uiCam = this.cameras.add(0, 0, width, height);
uiCam.setScroll(0, 0);        // Fixed position
cam.ignore(uiElements);       // Main camera ignores UI
uiCam.ignore(gameObjects);    // UI camera ignores game
```

## Groups

### Dynamic Group (Physics)

```js
const enemies = this.physics.add.group({
  classType: Enemy,
  maxSize: 20,
  runChildUpdate: true,        // Calls update() on each active child
  createCallback: (enemy) => { enemy.init(); },
});
const enemy = enemies.get(x, y, 'enemy_texture');
```

### Static Group

```js
const platforms = this.physics.add.staticGroup();
platforms.create(400, 568, 'ground');
platforms.create(600, 400, 'ground');
```

### Group Iteration

```js
enemies.getChildren().forEach(enemy => { /* ... */ });
enemies.countActive(true);    // Number of active members
enemies.countActive(false);   // Number of inactive members
```

## Tilemaps

### Loading (in preload)

```js
this.load.tilemapTiledJSON('map', 'maps/level1.json');
this.load.image('tiles', 'tilesets/tileset.png');
// For extruded tilesets:
this.load.image('tiles', 'tilesets/tileset.png');
```

### Creating the Map

```js
const map = this.make.tilemap({ key: 'map' });
const tileset = map.addTilesetImage('TilesetName', 'tiles', tileW, tileH, margin, spacing);
const bgLayer = map.createLayer('Background', tileset, 0, 0);
const groundLayer = map.createLayer('Ground', tileset, 0, 0);
```

### Tilemap Collision

```js
// By property (set in Tiled)
groundLayer.setCollisionByProperty({ collides: true });

// By tile index
groundLayer.setCollision([1, 2, 3]);

// By exclusion
groundLayer.setCollisionByExclusion([-1]); // All non-empty tiles collide
```

### Object Layers

```js
const spawnPoints = map.getObjectLayer('Spawns').objects;
spawnPoints.forEach(point => {
  if (point.name === 'player') {
    this.player = this.physics.add.sprite(point.x, point.y, 'player');
  }
});
```

## Timers

```js
// Delayed call (one-shot)
this.time.delayedCall(1000, () => { /* fires once after 1s */ });

// Repeating timer
this.spawnTimer = this.time.addEvent({
  delay: 2000,
  callback: this.spawnEnemy,
  callbackScope: this,
  repeat: 10,       // -1 for infinite
  loop: false,
});

// Remove timer
this.spawnTimer.remove();
```

## Loading

```js
preload() {
  // Images
  this.load.image('key', 'path/to/image.png');

  // Sprite sheets
  this.load.spritesheet('key', 'path/to/sheet.png', {
    frameWidth: 32, frameHeight: 32, startFrame: 0, endFrame: 15,
  });

  // Texture atlas (JSON Hash)
  this.load.atlas('key', 'path/to/atlas.png', 'path/to/atlas.json');

  // Tilemap
  this.load.tilemapTiledJSON('map', 'path/to/map.json');

  // Audio (with fallback)
  this.load.audio('sfx', ['audio/sfx.ogg', 'audio/sfx.mp3']);

  // Progress bar
  this.load.on('progress', (value) => { progressBar.width = 300 * value; });
  this.load.on('complete', () => { this.scene.start('GameScene'); });
}
```
