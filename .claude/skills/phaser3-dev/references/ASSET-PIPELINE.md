# Asset Pipeline

Loading and managing game assets in InRepo Studio's browser-only environment.

## Loading from Relative URLs

In InRepo Studio, assets are stored in the repository and served at runtime:

```js
preload() {
  // Relative to the HTML page serving the game
  this.load.image('player', 'assets/sprites/player.png');
  this.load.audio('bgm', ['assets/audio/bgm.ogg', 'assets/audio/bgm.mp3']);
}
```

## Loading from GitHub Raw Content URLs

When loading directly from a GitHub repository:

```js
const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;

preload() {
  this.load.setBaseURL(rawBase);
  this.load.image('player', 'assets/sprites/player.png');
}
```

**Caveats:**
- GitHub raw URLs have rate limits; for production use, serve assets from a CDN or GitHub Pages.
- CORS is allowed on `raw.githubusercontent.com` for standard asset types.
- Large files (>100MB) won't be served by GitHub raw URLs.

## Sprite Sheets

For uniformly-sized frames in a grid layout:

```js
this.load.spritesheet('hero', 'assets/hero_sheet.png', {
  frameWidth: 32,
  frameHeight: 48,
  startFrame: 0,
  endFrame: 23,     // Optional: limits frames loaded
  margin: 0,        // Pixels around the edge of the sheet
  spacing: 0,       // Pixels between frames
});
```

## Texture Atlases

Atlases pack multiple differently-sized sprites into one image. Phaser supports several formats:

### JSON Hash (Recommended)

```js
this.load.atlas('ui', 'assets/ui_atlas.png', 'assets/ui_atlas.json');

// atlas.json structure:
// { "frames": { "button_play": { "frame": { "x":0, "y":0, "w":64, "h":32 } }, ... } }
```

### JSON Array

```js
this.load.atlas('ui', 'assets/ui_atlas.png', 'assets/ui_atlas.json');

// atlas.json structure:
// { "frames": [ { "filename": "button_play", "frame": { "x":0, "y":0, "w":64, "h":32 } }, ... ] }
```

Phaser auto-detects whether the JSON uses Hash or Array format.

### XML (Starling/Sparrow)

```js
this.load.atlasXML('ui', 'assets/ui_atlas.png', 'assets/ui_atlas.xml');
```

### Using Atlas Frames

```js
// Create sprite from atlas frame
this.add.sprite(x, y, 'ui', 'button_play');

// Animation from atlas
this.anims.create({
  key: 'explode',
  frames: this.anims.generateFrameNames('effects', {
    prefix: 'explosion_',
    start: 1,
    end: 12,
    zeroPad: 2,
  }),
  frameRate: 20,
  repeat: 0,
});
```

## Audio Formats and Fallbacks

Mobile browser support varies. Always provide at least two formats:

```js
this.load.audio('sfx_jump', [
  'assets/audio/jump.ogg',   // Preferred: smaller, better quality
  'assets/audio/jump.mp3',   // Fallback: universal support
]);

this.load.audio('bgm', [
  'assets/audio/bgm.ogg',
  'assets/audio/bgm.mp3',
]);
```

**Format support:**
| Format | Chrome | Safari/iOS | Firefox |
|--------|--------|------------|---------|
| OGG    | Yes    | No         | Yes     |
| MP3    | Yes    | Yes        | Yes     |
| AAC    | Yes    | Yes        | No      |
| WAV    | Yes    | Yes        | Yes     |

**Best practice:** Ship OGG + MP3 for full coverage. OGG is smaller; MP3 is the universal fallback.

### Audio Sprites

Pack multiple short sounds into a single audio file with a JSON marker map:

```js
this.load.audioSprite('sfx', 'assets/audio/sfx.json', [
  'assets/audio/sfx.ogg',
  'assets/audio/sfx.mp3',
]);

// sfx.json:
// { "spritemap": { "jump": { "start": 0, "end": 0.5 }, "hit": { "start": 0.6, "end": 1.0 } } }

// Play:
this.sound.playAudioSprite('sfx', 'jump');
```

## Preloader Progress Bar

Show loading progress to the player:

```js
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    const { width, height } = this.scale;

    // Background bar
    const bgBar = this.add.rectangle(width / 2, height / 2, 320, 30, 0x222222);

    // Fill bar
    const fillBar = this.add.rectangle(
      width / 2 - 150, height / 2, 0, 20, 0x44aaff
    ).setOrigin(0, 0.5);

    // Progress text
    const text = this.add.text(width / 2, height / 2 + 30, '0%', {
      fontSize: '16px', color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      fillBar.width = 300 * value;
      text.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      this.scene.start('GameScene');
    });

    // Queue all game assets
    this.load.image('player', 'assets/player.png');
    // ... more assets
  }
}
```

## Loading Error Handling

Handle missing or failed assets gracefully:

```js
preload() {
  this.load.on('loaderror', (fileObj) => {
    console.error('Failed to load:', fileObj.key, fileObj.url);
    // Optionally set a fallback or flag
    this.loadErrors = this.loadErrors || [];
    this.loadErrors.push(fileObj.key);
  });
}

create() {
  if (this.loadErrors?.length) {
    console.warn('Missing assets:', this.loadErrors);
    // Show user-facing error or use placeholder textures
  }
}
```

## Recommended Repo Asset Structure

```
assets/
├── sprites/
│   ├── player.png
│   ├── enemies/
│   └── atlas/
│       ├── game_atlas.png
│       └── game_atlas.json
├── tilemaps/
│   ├── level1.json
│   └── tilesets/
│       └── terrain.png
├── audio/
│   ├── bgm.ogg
│   ├── bgm.mp3
│   ├── sfx.ogg
│   └── sfx.mp3
└── ui/
    ├── buttons.png
    └── fonts/
```
