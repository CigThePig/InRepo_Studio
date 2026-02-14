# Mobile Input Patterns

Comprehensive guide to touch input, gesture detection, and virtual controls for Phaser 3 on mobile devices.

## Pointer Events

Phaser unifies mouse and touch into the pointer abstraction. On mobile, `pointer1` through `pointer10` track individual fingers.

```js
// Basic tap
this.input.on('pointerdown', (pointer) => {
  console.log('Screen:', pointer.x, pointer.y);
  console.log('World:', pointer.worldX, pointer.worldY);
  console.log('Duration:', pointer.getDuration()); // ms since down
});

this.input.on('pointermove', (pointer) => {
  if (pointer.isDown) {
    // Finger is dragging
    console.log('Drag delta:', pointer.velocity.x, pointer.velocity.y);
  }
});

this.input.on('pointerup', (pointer) => {
  console.log('Released at:', pointer.upX, pointer.upY);
});
```

## Multi-Touch

Enable multi-touch input (up to 10 pointers):

```js
create() {
  this.input.addPointer(2); // Add 2 extra pointers (total: 3)

  this.input.on('pointerdown', (pointer) => {
    if (pointer === this.input.pointer1) {
      // First finger — movement
      this.moveTarget = { x: pointer.worldX, y: pointer.worldY };
    }
    if (pointer === this.input.pointer2) {
      // Second finger — action (shoot, jump, etc.)
      this.performAction();
    }
  });
}
```

## Swipe Detection

Detect swipe gestures by measuring pointer travel and velocity:

```js
create() {
  this.swipeThreshold = 50;    // Minimum distance in pixels
  this.swipeVelocity = 0.3;    // Minimum speed (px/ms)

  this.input.on('pointerup', (pointer) => {
    const dx = pointer.upX - pointer.downX;
    const dy = pointer.upY - pointer.downY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = pointer.upTime - pointer.downTime;
    const speed = dist / duration;

    if (dist < this.swipeThreshold || speed < this.swipeVelocity) return;

    const angle = Math.atan2(dy, dx);
    if (angle > -Math.PI / 4 && angle < Math.PI / 4) {
      this.onSwipe('right');
    } else if (angle > Math.PI / 4 && angle < (3 * Math.PI) / 4) {
      this.onSwipe('down');
    } else if (angle < -Math.PI / 4 && angle > -(3 * Math.PI) / 4) {
      this.onSwipe('up');
    } else {
      this.onSwipe('left');
    }
  });
}
```

## Pinch-to-Zoom

Detect pinch gestures using two pointers:

```js
create() {
  this.input.addPointer(1); // Need at least 2 pointers
  this.pinchStartDist = 0;
  this.pinchStartZoom = 1;
}

update() {
  const p1 = this.input.pointer1;
  const p2 = this.input.pointer2;

  if (p1.isDown && p2.isDown) {
    const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);

    if (this.pinchStartDist === 0) {
      this.pinchStartDist = dist;
      this.pinchStartZoom = this.cameras.main.zoom;
    } else {
      const scale = dist / this.pinchStartDist;
      this.cameras.main.setZoom(
        Phaser.Math.Clamp(this.pinchStartZoom * scale, 0.5, 3)
      );
    }
  } else {
    this.pinchStartDist = 0;
  }
}
```

## Long Press

Detect a tap held for a specified duration:

```js
create() {
  this.longPressDelay = 500; // ms
  this.longPressTimer = null;

  this.input.on('pointerdown', (pointer) => {
    this.longPressTimer = this.time.delayedCall(this.longPressDelay, () => {
      this.onLongPress(pointer.worldX, pointer.worldY);
    });
  });

  this.input.on('pointerup', () => {
    if (this.longPressTimer) {
      this.longPressTimer.remove();
      this.longPressTimer = null;
    }
  });

  this.input.on('pointermove', (pointer) => {
    // Cancel if finger moved too far
    if (this.longPressTimer && pointer.getDistance() > 10) {
      this.longPressTimer.remove();
      this.longPressTimer = null;
    }
  });
}
```

## Virtual Joystick

On-screen joystick built with Phaser game objects:

```js
createJoystick() {
  const cx = 120, cy = this.scale.height - 120, radius = 60;

  this.joyBase = this.add.circle(cx, cy, radius, 0x888888, 0.5)
    .setScrollFactor(0).setDepth(1000);
  this.joyThumb = this.add.circle(cx, cy, 30, 0xcccccc, 0.8)
    .setScrollFactor(0).setDepth(1001);

  this.joyBase.setInteractive();
  this.input.setDraggable(this.joyBase);
  this.joyVector = new Phaser.Math.Vector2(0, 0);

  this.input.on('pointerdown', (pointer) => {
    if (pointer.x < this.scale.width / 2) {
      this.joyBase.setPosition(pointer.x, pointer.y);
      this.joyThumb.setPosition(pointer.x, pointer.y);
      this.activeJoyPointer = pointer;
    }
  });

  this.input.on('pointermove', (pointer) => {
    if (pointer !== this.activeJoyPointer || !pointer.isDown) return;
    const dx = pointer.x - this.joyBase.x;
    const dy = pointer.y - this.joyBase.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampDist = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);

    this.joyThumb.x = this.joyBase.x + Math.cos(angle) * clampDist;
    this.joyThumb.y = this.joyBase.y + Math.sin(angle) * clampDist;
    this.joyVector.set(
      Math.cos(angle) * (clampDist / radius),
      Math.sin(angle) * (clampDist / radius)
    );
  });

  this.input.on('pointerup', (pointer) => {
    if (pointer === this.activeJoyPointer) {
      this.joyThumb.setPosition(this.joyBase.x, this.joyBase.y);
      this.joyVector.set(0, 0);
      this.activeJoyPointer = null;
    }
  });
}

update(time, delta) {
  const speed = 200;
  this.player.body.setVelocityX(this.joyVector.x * speed);
  this.player.body.setVelocityY(this.joyVector.y * speed);
}
```

## Virtual Buttons

On-screen action buttons:

```js
createActionButton(x, y, label, callback) {
  const btn = this.add.circle(x, y, 35, 0xdd4444, 0.7)
    .setScrollFactor(0).setDepth(1000).setInteractive();
  const text = this.add.text(x, y, label, { fontSize: '18px', color: '#fff' })
    .setOrigin(0.5).setScrollFactor(0).setDepth(1001);

  btn.on('pointerdown', () => {
    btn.setFillStyle(0xff6666, 1);
    callback();
  });
  btn.on('pointerup', () => btn.setFillStyle(0xdd4444, 0.7));
  btn.on('pointerout', () => btn.setFillStyle(0xdd4444, 0.7));

  return { btn, text };
}
```

## Hybrid Input (Touch + Mouse)

For testing in desktop browsers while targeting mobile:

```js
create() {
  // Keyboard (desktop only)
  if (this.input.keyboard) {
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  // Pointer (works on both)
  this.createJoystick();
}

update(time, delta) {
  let moveX = 0, moveY = 0;

  // Keyboard input
  if (this.cursors) {
    if (this.cursors.left.isDown) moveX = -1;
    if (this.cursors.right.isDown) moveX = 1;
    if (this.cursors.up.isDown) moveY = -1;
    if (this.cursors.down.isDown) moveY = 1;
  }

  // Joystick overrides if active
  if (this.joyVector && (this.joyVector.x !== 0 || this.joyVector.y !== 0)) {
    moveX = this.joyVector.x;
    moveY = this.joyVector.y;
  }

  this.player.body.setVelocity(moveX * 200, moveY * 200);
}
```
