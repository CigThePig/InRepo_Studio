<!-- This skill is maintained in two locations for cross-agent discovery:
     - .claude/skills/phaser3-dev/  (Claude Code)
     - .agents/skills/phaser3-dev/  (OpenAI Codex CLI)
     Keep both directories in sync when making changes. -->
---
name: phaser3-dev
description: >
  Phaser 3 game development for InRepo Studio. Use when creating, editing, or
  debugging Phaser 3 scenes, game objects, animations, physics, input handling,
  tilemaps, sprite sheets, or any browser-based game logic. Also use when
  optimizing game performance for mobile, setting up asset pipelines, or
  working with the InRepo Studio editor integration layer. Do NOT use for
  general web development unrelated to game mechanics or Phaser.
license: MIT
metadata:
  author: InRepo Studio
  version: "1.0"
  tags:
    - phaser3
    - gamedev
    - mobile
    - browser-game
    - inrepo-studio
---

# Phaser 3 Game Development — InRepo Studio

## 1. InRepo Studio Context

InRepo Studio is a **mobile-first, browser-based game editor** that integrates directly with GitHub repositories.

- All game code runs **in the browser** — there is no Node.js server at runtime.
- The editor targets **touch-first interactions** on phones and tablets.
- Phaser 3 is loaded via CDN or bundled; never assume a Node/npm build pipeline at game runtime.
- Game assets (sprites, audio, tilemaps) live in the repo and load at runtime via relative URLs or GitHub raw content URLs.
- Scene files are ES modules or plain scripts that the editor injects into the page.

## 2. Phaser 3 Core Patterns

See [Phaser 3 API Patterns](references/PHASER3-API-PATTERNS.md) for detailed API signatures and examples.

### Game Config

```js
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 300 }, debug: false },
  },
  scene: [BootScene, GameScene, HUDScene],
};
const game = new Phaser.Game(config);
```

### Scene Structure

Every scene follows the `preload → create → update` lifecycle. See [Scene Lifecycle](references/SCENE-LIFECYCLE.md) for the full event flow.

```js
class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  preload() {
    this.load.image('player', 'assets/player.png');
  }

  create() {
    this.player = this.physics.add.sprite(100, 100, 'player');
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.setupTouchInput();
  }

  update(time, delta) {
    const speed = 200;
    // Always use delta for frame-rate-independent movement
    this.player.x += speed * (delta / 1000);
  }
}
```

### Scene Management

```js
this.scene.start('GameScene', { level: 2 });  // Stop current, start target
this.scene.launch('HUDScene');                 // Run in parallel
this.scene.stop('HUDScene');                   // Stop parallel scene
this.scene.get('HUDScene').updateScore(10);    // Cross-scene communication
```

### Game Objects

| Object | Use When |
|--------|----------|
| `Sprite` | Animated entities with physics |
| `Image` | Static graphics, backgrounds |
| `Text` | UI labels, scores — cache the object, call `.setText()` |
| `Graphics` | Procedural shapes, debug drawing |
| `Container` | Grouping objects for joint transforms |
| `Group` | Managing pools of similar objects |

### Physics (Arcade)

```js
this.physics.add.collider(player, platforms);
this.physics.add.overlap(player, coins, collectCoin, null, this);
player.body.setVelocityX(160);
player.body.setAccelerationY(300);
this.physics.world.setBounds(0, 0, 2000, 600);
```

### Tweens & Animations

```js
// Sprite sheet animation
this.anims.create({
  key: 'walk',
  frames: this.anims.generateFrameNumbers('player', { start: 0, end: 7 }),
  frameRate: 10,
  repeat: -1,
});
// Tween
this.tweens.add({
  targets: sprite,
  y: sprite.y - 50,
  duration: 300,
  ease: 'Power2',
  yoyo: true,
});
```

### Camera

```js
this.cameras.main.startFollow(player, true, 0.1, 0.1);
this.cameras.main.setZoom(1.5);
this.cameras.main.setBounds(0, 0, 2000, 600);
this.cameras.main.shake(200, 0.01);       // Screen-shake on impact
this.cameras.main.fade(500, 0, 0, 0);     // Fade to black
```

### Tilemaps

```js
const map = this.make.tilemap({ key: 'level1' });
const tileset = map.addTilesetImage('tiles', 'tilesheet');
const ground = map.createLayer('Ground', tileset);
ground.setCollisionByProperty({ collides: true });
this.physics.add.collider(player, ground);
```

### Audio

```js
preload() { this.load.audio('bgm', ['audio/bgm.ogg', 'audio/bgm.mp3']); }
create() {
  // Mobile audio unlock — critical!
  this.sound.unlock();
  this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
  this.input.once('pointerdown', () => this.bgm.play());
}
```

## 3. Mobile-First Game Development

See [Mobile Input](references/MOBILE-INPUT.md) for comprehensive touch and gesture patterns.
See [Performance](references/PERFORMANCE.md) for mobile optimization techniques.

### Touch Input

```js
this.input.on('pointerdown', (pointer) => {
  this.player.moveTo(pointer.worldX, pointer.worldY);
});
// Multi-touch
this.input.on('pointerdown', (pointer) => {
  if (pointer === this.input.pointer1) { /* first finger */ }
  if (pointer === this.input.pointer2) { /* second finger */ }
});
```

### Responsive Scaling

```js
this.scale.on('resize', (gameSize) => {
  this.cameras.resize(gameSize.width, gameSize.height);
  this.repositionUI(gameSize.width, gameSize.height);
});
```

### Virtual Controls

Build on-screen joystick/buttons with Phaser game objects — see [Mobile Input](references/MOBILE-INPUT.md) for a full implementation.

### Audio Unlock

Browsers require a user gesture before playing audio. Always include:

```js
create() {
  this.sound.unlock();
  this.input.once('pointerdown', () => {
    if (this.sound.locked) this.sound.once('unlocked', () => this.startAudio());
    else this.startAudio();
  });
}
```

## 4. InRepo Studio Integration Patterns

### Editor ↔ Game Communication

```js
// Game → Editor: dispatch a CustomEvent
window.dispatchEvent(new CustomEvent('inrepo:scene-ready', {
  detail: { sceneKey: this.scene.key },
}));

// Editor → Game: listen for editor commands
window.addEventListener('inrepo:load-scene', (e) => {
  game.scene.start(e.detail.sceneKey, e.detail.data);
});
```

### Loading Assets from Repo

```js
const repoBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
this.load.setBaseURL(repoBase);
this.load.image('player', 'assets/sprites/player.png');
```

### Hot-Reload During Editing

```js
window.addEventListener('inrepo:hot-reload', (e) => {
  const scene = game.scene.getScene(e.detail.sceneKey);
  if (scene) {
    scene.scene.restart(e.detail.data);
  }
});
```

### Saving Scene Config

```js
function exportSceneConfig(scene) {
  return JSON.stringify({
    key: scene.scene.key,
    objects: scene.children.list.map(obj => ({
      type: obj.type,
      x: obj.x, y: obj.y,
      texture: obj.texture?.key,
    })),
  }, null, 2);
}
```

## 5. Common Patterns & Recipes

### Frame-Rate-Independent Movement

```js
update(time, delta) {
  const speed = 200; // pixels per second
  sprite.x += speed * (delta / 1000);
}
```

### Object Pooling

```js
this.bulletPool = this.physics.add.group({
  maxSize: 30,
  classType: Bullet,
  runChildUpdate: true,
});
function fireBullet(x, y) {
  const bullet = this.bulletPool.get(x, y);
  if (bullet) { bullet.fire(); }
}
```

### State Machine for AI

```js
const States = { IDLE: 0, PATROL: 1, CHASE: 2, ATTACK: 3 };
update(time, delta) {
  switch (this.state) {
    case States.IDLE:    this.idle(delta); break;
    case States.PATROL:  this.patrol(delta); break;
    case States.CHASE:   this.chase(delta); break;
    case States.ATTACK:  this.attack(delta); break;
  }
}
```

### Scene Fade Transition

```js
changeScene(target) {
  this.cameras.main.fadeOut(500, 0, 0, 0);
  this.cameras.main.once('camerafadeoutcomplete', () => {
    this.scene.start(target);
  });
}
```

### HUD as Parallel Scene

```js
// In GameScene.create():
this.scene.launch('HUDScene');
// In HUDScene — ignore game camera movement:
create() {
  this.scoreText = this.add.text(16, 16, 'Score: 0').setScrollFactor(0);
}
```

### Save/Load with localStorage

```js
saveGame(data) { localStorage.setItem('inrepo_save', JSON.stringify(data)); }
loadGame() {
  const raw = localStorage.getItem('inrepo_save');
  return raw ? JSON.parse(raw) : null;
}
```

## 6. Anti-Patterns & Gotchas

- **Never create objects in `update()` without pooling.** This causes GC pauses and frame drops.
- **Never use `setInterval`/`setTimeout`** — use `this.time.addEvent()` or `this.time.delayedCall()`.
- **Destroy listeners and timers** in `shutdown`/`destroy` scene events to prevent memory leaks.
- **Don't call `this.add.text()` in `update()`** — cache the text object and call `.setText()`.
- **Mobile audio requires a user gesture** — always gate audio playback behind a tap event.
- **`this.input.keyboard` is `null` on mobile** — always provide touch alternatives alongside keyboard input.
- **Don't hardcode canvas dimensions** — always use `this.scale.width` / `this.scale.height`.
- **Don't use `Phaser.Math.Between()` in tight loops** for pooling — use group `.get()` instead.

## 7. Debugging & Profiling

### Enable Physics Debug

```js
physics: { arcade: { debug: true, debugShowBody: true, debugShowVelocity: true } }
```

### Monitor FPS

```js
update() {
  console.log('FPS:', Math.round(this.game.loop.actualFps));
}
```

### Chrome Remote Debugging

1. Enable USB debugging on the Android device.
2. Open `chrome://inspect` on desktop Chrome.
3. Inspect the InRepo Studio browser tab to access DevTools.

### Common Errors

| Error | Cause |
|-------|-------|
| `Cannot read property 'x' of null` | Object destroyed but reference kept — check pool lifecycle |
| `Texture 'key' not found` | Asset not loaded in `preload()` or wrong key |
| `Audio play() failed` | Missing user gesture unlock — see Audio Unlock pattern above |
| `this.input.keyboard is null` | Running on mobile — use pointer input instead |

## 8. Validation

Run the scene validator to check for common issues:

```bash
node scripts/validate-scene.cjs path/to/scene.js
```

See [scripts/validate-scene.cjs](scripts/validate-scene.cjs) for the full checker. Use [assets/scene-template.js](assets/scene-template.js) as a starting point for new scenes.
