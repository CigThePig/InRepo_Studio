/**
 * Phaser 3 Scene Template — InRepo Studio
 *
 * A best-practice scene template for mobile-first Phaser 3 game development.
 * Copy this file and rename the class/key to create new scenes.
 *
 * Features:
 * - Proper ES class extending Phaser.Scene
 * - All lifecycle methods with helpful guidance
 * - Mobile-safe input setup (touch + keyboard fallback)
 * - Audio unlock pattern for mobile browsers
 * - Responsive resize handler
 * - Asset loading with error handling
 * - Frame-rate-independent movement in update()
 */

class TemplateScene extends Phaser.Scene {
  constructor() {
    super('TemplateScene');

    // Pre-allocate reusable objects to avoid GC pressure in update()
    this._tempVec = null;
  }

  /**
   * init() — Called first when the scene starts.
   * Use for resetting state and receiving data from scene.start().
   */
  init(data) {
    this.score = data.score || 0;
    this.level = data.level || 1;
    this.loadErrors = [];
  }

  /**
   * preload() — Load all assets here.
   * The scene will not call create() until loading is complete.
   */
  preload() {
    // Track loading errors
    this.load.on('loaderror', (fileObj) => {
      console.error('Failed to load:', fileObj.key, fileObj.url);
      this.loadErrors.push(fileObj.key);
    });

    // Example assets — replace with your own
    // this.load.image('player', 'assets/sprites/player.png');
    // this.load.spritesheet('hero', 'assets/sprites/hero_sheet.png', {
    //   frameWidth: 32,
    //   frameHeight: 48,
    // });
    // this.load.audio('bgm', ['assets/audio/bgm.ogg', 'assets/audio/bgm.mp3']);
  }

  /**
   * create() — Called after preload() assets are ready.
   * Set up game objects, physics, input, and cameras here.
   */
  create() {
    // Warn about load errors
    if (this.loadErrors.length > 0) {
      console.warn('Some assets failed to load:', this.loadErrors);
    }

    // Pre-allocate temp vector for update loop
    this._tempVec = new Phaser.Math.Vector2();

    // ── Game Objects ──
    // this.player = this.physics.add.sprite(
    //   this.scale.width / 2,
    //   this.scale.height / 2,
    //   'player'
    // );
    // this.player.body.setCollideWorldBounds(true);

    // ── Input Setup ──
    this.setupInput();

    // ── Audio Unlock (critical for mobile) ──
    this.setupAudioUnlock();

    // ── Responsive Resize ──
    this.scale.on('resize', this.onResize, this);

    // ── Cleanup on Shutdown ──
    this.events.on('shutdown', this.onShutdown, this);
  }

  /**
   * update(time, delta) — Called every frame.
   * @param {number} time  - Total elapsed time in ms
   * @param {number} delta - Time since last frame in ms
   *
   * IMPORTANT: Always use delta for frame-rate-independent movement.
   * IMPORTANT: Never create objects here without pooling.
   */
  update(time, delta) {
    // Frame-rate-independent movement example:
    // const speed = 200; // pixels per second
    // this.player.x += speed * (delta / 1000);

    // Read input
    this.handleInput(delta);
  }

  // ────────────────────────────────────────────────────────────
  // Input
  // ────────────────────────────────────────────────────────────

  setupInput() {
    // Keyboard (desktop only — null on mobile)
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Touch / Pointer (works on all platforms)
    this.input.on('pointerdown', this.onPointerDown, this);
  }

  handleInput(delta) {
    // const speed = 200;
    // let vx = 0;
    // let vy = 0;

    // // Keyboard
    // if (this.cursors) {
    //   if (this.cursors.left.isDown) vx = -1;
    //   if (this.cursors.right.isDown) vx = 1;
    //   if (this.cursors.up.isDown) vy = -1;
    //   if (this.cursors.down.isDown) vy = 1;
    // }

    // this.player.body.setVelocity(vx * speed, vy * speed);
  }

  onPointerDown(pointer) {
    // Example: move player to tap position
    // this.player.body.reset(pointer.worldX, pointer.worldY);
  }

  // ────────────────────────────────────────────────────────────
  // Audio
  // ────────────────────────────────────────────────────────────

  setupAudioUnlock() {
    // Mobile browsers require a user gesture before audio can play.
    this.sound.unlock();

    this.input.once('pointerdown', () => {
      if (this.sound.locked) {
        this.sound.once('unlocked', () => this.startAudio());
      } else {
        this.startAudio();
      }
    });
  }

  startAudio() {
    // Uncomment when audio assets are loaded:
    // this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
    // this.bgm.play();
  }

  // ────────────────────────────────────────────────────────────
  // Responsive Resize
  // ────────────────────────────────────────────────────────────

  onResize(gameSize) {
    const { width, height } = gameSize;

    // Update camera
    this.cameras.main.setSize(width, height);

    // Reposition UI elements relative to new dimensions
    // this.scoreText?.setPosition(16, 16);
    // this.pauseButton?.setPosition(width - 40, 16);
  }

  // ────────────────────────────────────────────────────────────
  // Cleanup
  // ────────────────────────────────────────────────────────────

  onShutdown() {
    // Remove input listeners
    this.input.off('pointerdown', this.onPointerDown, this);

    // Remove resize listener
    this.scale.off('resize', this.onResize, this);

    // Remove any custom timers
    // if (this.spawnTimer) this.spawnTimer.remove();

    // Remove external event listeners
    // window.removeEventListener('inrepo:hot-reload', this.reloadHandler);
  }
}

// Export for use in InRepo Studio or module bundlers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TemplateScene;
}
