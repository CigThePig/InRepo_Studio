# Track 7: Tilemap Rendering — Blueprint

## Overview

This blueprint details the technical design for rendering tilemaps in the InRepo Studio editor canvas. The renderer draws tile layers from scene data, culls tiles outside the viewport, and provides visual feedback for the active layer and hover position.

---

## Architecture

### Module Structure

```
src/editor/canvas/
├── renderer.ts        # NEW - Tilemap renderer
├── tileCache.ts       # NEW - Tile image cache (shared with TilePicker)
├── Canvas.ts          # MODIFY - Integrate renderer
├── viewport.ts        # EXISTING - Coordinate transforms, getVisibleTileRange
├── grid.ts            # EXISTING - Grid overlay
└── gestures.ts        # EXISTING - Touch handling
```

### Data Flow

```
Scene Data (IndexedDB)
    ↓
Renderer.setScene(scene)
    ↓
For each layer in LAYER_ORDER:
    ↓
    Get visible tile range (from viewport)
    ↓
    For each visible (x, y):
        Get tile value from layer[y][x]
        ↓
        If value > 0:
            Resolve GID → tile image
            Draw tile at world position
    ↓
    Apply layer dimming if not active layer
    ↓
Draw hover highlight (if hovering)
```

---

## Detailed Design

### 1. Tile Image Cache (`tileCache.ts`)

The TilePicker already has an image cache, but we need a shared solution that both components can use.

**Interface:**

```typescript
interface TileImageCache {
  /** Get image for a tile by category and index */
  getTileImage(category: string, index: number): HTMLImageElement | null;

  /** Preload all tiles for a category */
  preloadCategory(category: TileCategory, basePath: string): Promise<void>;

  /** Check if an image is loaded */
  isLoaded(category: string, index: number): boolean;

  /** Register callback for when an image loads */
  onImageLoad(callback: () => void): void;
}
```

**Implementation Notes:**
- Cache key: `${category}:${index}`
- Return `null` for missing/failed images (render placeholder)
- Emit callback when images load so renderer can re-draw

### 2. Tilemap Renderer (`renderer.ts`)

**Interface:**

```typescript
interface TilemapRendererConfig {
  tileCache: TileImageCache;
  assetBasePath: string;
}

interface TilemapRenderer {
  /** Set the scene to render */
  setScene(scene: Scene | null): void;

  /** Get the current scene */
  getScene(): Scene | null;

  /** Set the active layer (affects dimming) */
  setActiveLayer(layer: LayerType): void;

  /** Set the hover tile position (or null to hide) */
  setHoverTile(tileX: number | null, tileY: number | null): void;

  /** Render the tilemap to the canvas context */
  render(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    canvasWidth: number,
    canvasHeight: number
  ): void;

  /** Notify renderer that scene data changed */
  invalidate(): void;
}
```

**Constants:**

```typescript
const INACTIVE_LAYER_OPACITY = 0.4;
const COLLISION_OVERLAY_COLOR = 'rgba(255, 80, 80, 0.5)';
const TRIGGER_OVERLAY_COLOR = 'rgba(80, 255, 80, 0.5)';
const HOVER_HIGHLIGHT_COLOR = 'rgba(255, 255, 255, 0.3)';
const HOVER_HIGHLIGHT_BORDER = 'rgba(74, 158, 255, 0.8)';
```

**Rendering Order:**

1. Ground layer (dimmed if not active)
2. Props layer (dimmed if not active)
3. Collision layer (overlay style, dimmed if not active)
4. Trigger layer (overlay style, dimmed if not active)
5. Hover highlight (always on top)

### 3. GID Resolution

The scene stores tile values as indices. For Track 7, we use a simplified approach:

**Simplified Approach (Track 7):**
- Tile value 0 = empty (no render)
- Tile value N > 0 = tile index (N-1) in the currently selected category
- The active category comes from EditorState.selectedTile.category

**Future Enhancement (Track 11+):**
- Full GID system with multiple tilesets per scene
- `scene.tilesets` array maps firstGid to category
- Resolution: find tileset where `firstGid <= value < nextFirstGid`

For Track 7, the simplified approach is sufficient since we're just visualizing existing data.

### 4. Layer Rendering

**Ground/Props Layers:**
- Standard tile rendering
- Apply globalAlpha based on active layer

**Collision/Trigger Layers:**
- If tile value > 0, draw colored rectangle overlay
- No tile image needed (just solid color)
- Apply globalAlpha based on active layer

**Code Pattern:**

```typescript
function renderLayer(
  ctx: CanvasRenderingContext2D,
  layer: TileLayer,
  layerType: LayerType,
  viewport: ViewportState,
  tileSize: number,
  canvasWidth: number,
  canvasHeight: number,
  isActive: boolean
): void {
  const opacity = isActive ? 1.0 : INACTIVE_LAYER_OPACITY;
  ctx.globalAlpha = opacity;

  const range = getVisibleTileRange(viewport, canvasWidth, canvasHeight, tileSize);

  for (let y = range.minY; y <= range.maxY; y++) {
    for (let x = range.minX; x <= range.maxX; x++) {
      const tileValue = getTile(layer, x, y);
      if (tileValue === 0) continue;

      const screenPos = tileToScreen(viewport, x, y, tileSize);
      const screenSize = tileSize * viewport.zoom;

      if (layerType === 'collision' || layerType === 'triggers') {
        // Draw overlay
        ctx.fillStyle = layerType === 'collision'
          ? COLLISION_OVERLAY_COLOR
          : TRIGGER_OVERLAY_COLOR;
        ctx.fillRect(screenPos.x, screenPos.y, screenSize, screenSize);
      } else {
        // Draw tile image
        const img = tileCache.getTileImage(currentCategory, tileValue - 1);
        if (img) {
          ctx.drawImage(img, screenPos.x, screenPos.y, screenSize, screenSize);
        }
      }
    }
  }

  ctx.globalAlpha = 1.0; // Reset
}
```

### 5. Hover Highlight

**Behavior:**
- Track touch position from Canvas gestures
- Convert screen position to tile coordinates (using screenToTile)
- Apply touch offset (above finger)
- Clamp to scene bounds
- Draw highlight box at tile position

**Touch Offset:**
- Default offset: 48px above touch point
- Same offset will be used by paint tool (Track 8)

**Drawing:**

```typescript
function renderHoverHighlight(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  viewport: ViewportState,
  tileSize: number,
  scene: Scene
): void {
  // Clamp to scene bounds
  if (tileX < 0 || tileX >= scene.width || tileY < 0 || tileY >= scene.height) {
    return;
  }

  const screenPos = tileToScreen(viewport, tileX, tileY, tileSize);
  const screenSize = tileSize * viewport.zoom;

  // Fill
  ctx.fillStyle = HOVER_HIGHLIGHT_COLOR;
  ctx.fillRect(screenPos.x, screenPos.y, screenSize, screenSize);

  // Border
  ctx.strokeStyle = HOVER_HIGHLIGHT_BORDER;
  ctx.lineWidth = 2;
  ctx.strokeRect(screenPos.x + 1, screenPos.y + 1, screenSize - 2, screenSize - 2);
}
```

### 6. Canvas Integration

**Modifications to Canvas.ts:**

```typescript
interface CanvasOptions {
  // ... existing
  scene?: Scene;
  activeLayer?: LayerType;
  tileCategories?: TileCategory[];
  assetBasePath?: string;
}

interface CanvasController {
  // ... existing

  /** Set the scene to render */
  setScene(scene: Scene | null): void;

  /** Set the active layer */
  setActiveLayer(layer: LayerType): void;

  /** Notify that scene data changed */
  invalidateScene(): void;
}
```

**Render Order:**
1. Background fill
2. Tilemap (via renderer)
3. Grid overlay

---

## State Management

### Renderer State

```typescript
interface RendererState {
  scene: Scene | null;
  activeLayer: LayerType;
  hoverTileX: number | null;
  hoverTileY: number | null;
  selectedCategory: string;
}
```

### Touch Offset Constant

```typescript
const TOUCH_OFFSET_Y = -48; // Pixels above touch point
```

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/editor/canvas/tileCache.ts` | Create | Shared tile image cache |
| `src/editor/canvas/renderer.ts` | Create | Tilemap rendering logic |
| `src/editor/canvas/Canvas.ts` | Modify | Integrate renderer, expose scene API |
| `src/editor/canvas/index.ts` | Modify | Export new modules |
| `src/editor/init.ts` | Modify | Wire up scene data to canvas |

---

## API Contracts

### TileCache

```typescript
// Create cache
const cache = createTileCache();

// Preload a category
await cache.preloadCategory(category, '/game');

// Get tile image (returns null if not loaded)
const img = cache.getTileImage('terrain', 0);

// Listen for loads
cache.onImageLoad(() => canvas.render());
```

### Renderer

```typescript
// Create renderer
const renderer = createTilemapRenderer({ tileCache, assetBasePath: '/game' });

// Set scene
renderer.setScene(scene);

// Update active layer
renderer.setActiveLayer('props');

// Set hover (from touch position)
renderer.setHoverTile(5, 3);

// Clear hover
renderer.setHoverTile(null, null);

// Render to canvas context
renderer.render(ctx, viewport, width, height);
```

---

## Performance Considerations

1. **Visible Tile Culling**: Only iterate tiles within viewport bounds
2. **Image Cache**: Avoid re-fetching images on each frame
3. **Dirty Flag**: Only re-render when viewport, scene, or hover changes
4. **No DOM**: All rendering is canvas-based (no tile DOM elements)

### Estimated Render Budget

For a 20x15 scene at 60fps:
- ~300 tiles maximum visible
- ~4 layers = ~1200 tile checks per frame (most skipped as empty)
- drawImage is fast for cached images
- Should easily hit 60fps

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Images not loaded when render starts | Missing tiles | Return placeholder/skip; re-render on load |
| Large scenes cause slowdown | Frame drops | Culling limits work; defer chunking to Track 27 |
| Touch offset feels wrong | UX | Make offset configurable in Track 28 |
| Zoom artifacts | Visual glitch | Use pixelated image rendering (crisp-edges) |

---

## Testing Strategy

### Manual Tests

1. Load editor with demo scene → tiles render correctly
2. Pan/zoom → tiles stay aligned, culling works
3. Switch layer tab → active layer at full opacity, others dimmed
4. Touch canvas → hover highlight appears at correct tile
5. Move touch → highlight follows
6. Release touch → highlight disappears

### Unit Tests

1. `getVisibleTileRange`: Given viewport and canvas size, returns correct tile bounds
2. `getTile` bounds checking: Out-of-bounds returns 0
3. GID resolution: Value N maps to correct tile index

---

## Future Considerations

- **Track 8 (Paint Tool)**: Will use same touch offset and tile position logic
- **Track 18 (Layer System)**: Will add visibility toggle (skip layer in render)
- **Track 27 (Performance)**: May add tile batching, chunking, or canvas caching
- **Track 11 (Runtime)**: Will need GID resolution for Phaser tilemap

---

## Notes

- Use `image-rendering: pixelated` CSS equivalent in canvas (`ctx.imageSmoothingEnabled = false`)
- Consider adding a scene boundary indicator (dashed border) in Phase 2 or 3
- The hover highlight will be reused by the paint tool cursor in Track 8
