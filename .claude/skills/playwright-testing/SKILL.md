# Browser Testing with Playwright MCP

InRepo Studio has Playwright MCP configured, giving Claude Code a real browser it can control to test the app like a user would.

## Critical: Editor vs. Game URL

**Always append `?tool=editor` to reach the editor UI.**
Without it, the page boots the **game runtime** instead.

| Mode | URL |
|------|-----|
| Editor | `http://localhost:5173/?tool=editor` |
| Game | `http://localhost:5173/` |
| Playtest | set via session flag (do not navigate directly) |

## How It Works

When the dev server is running, Claude can open a browser, navigate the UI, click buttons, fill inputs, take screenshots, and verify behaviour — all without a human operating the device.

## Standard Test Workflow

```
1. Start the dev server:       npm run dev
2. Open editor:                playwright_navigate → http://localhost:5173/?tool=editor
3. Wait for ready:             playwright_evaluate → window.__editor__.ready === true
4. Take a screenshot:          playwright_screenshot
5. Inspect state:              playwright_evaluate → window.__editor__.getState()
6. Interact with the UI:       playwright_click, playwright_fill, etc.
7. Verify results:             playwright_screenshot + visual inspection
```

## Key MCP Tools Available

| Tool | Use For |
|------|---------|
| `playwright_navigate` | Open a URL |
| `playwright_screenshot` | Capture current state of the browser |
| `playwright_click` | Click a button, tab, or element |
| `playwright_fill` | Type into an input field |
| `playwright_select_option` | Choose from a dropdown |
| `playwright_hover` | Hover over an element |
| `playwright_evaluate` | Run JavaScript in the browser context |
| `playwright_get_visible_text` | Read text content from the page |
| `playwright_close` | Close the browser when done |

## window.__editor__ Bridge (Dev Mode Only)

When the dev server is running (`npm run dev`), the editor exposes a test bridge at `window.__editor__`. Use it via `playwright_evaluate` to inspect and drive the editor without fragile DOM selectors.

### Readiness gate

Always wait until `ready` is `true` before calling other methods — the editor performs async IndexedDB reads on startup:

```js
// Poll or use page.waitForFunction in Playwright scripts
window.__editor__.ready  // → true once fully initialised
```

### State inspection

```js
window.__editor__.getState()       // Full editor state snapshot (tool, layer, viewport, …)
window.__editor__.getScene()       // Current scene data (tile layers, entities, …)
window.__editor__.getProject()     // Project metadata (name, tilesets, …)
window.__editor__.getCurrentTool() // 'paint' | 'erase' | 'select' | 'entity'
window.__editor__.getActiveLayer() // 'ground' | 'props' | 'entities' | 'collision' | 'triggers'
window.__editor__.getViewport()    // { x: number, y: number, zoom: number }
window.__editor__.getEditorMode()  // current editor domain mode
window.__editor__.getLayoutInfo()  // { editorContainer, topPanel, canvas, bottomPanel, leftBerry, rightBerry }
```

### Programmatic actions

```js
window.__editor__.setActiveLayer('props')   // Switch active layer
window.__editor__.setTool('erase')          // Switch active tool
```

### Canvas geometry

```js
// Get the canvas bounding rect to compute absolute page coordinates
const rect = window.__editor__.getCanvasRect()
// → { x, y, width, height } in page pixels

// Then click the centre of the canvas using absolute coordinates:
// absolute_x = rect.x + rect.width/2
// absolute_y = rect.y + rect.height/2
```

## DOM Selectors Reference

These selectors are stable across editor versions:

| Element | Selector |
|---------|----------|
| Editor shell | `#editor-container` |
| Canvas wrapper | `#canvas-container` |
| Phaser canvas | `#canvas-container canvas` |
| Top bar (V2) | `.top-bar-v2` |
| Bottom tool bar | `.bottom-panel` |
| Bottom action strip | `.bottom-context-strip` |
| Left side panel | `.left-berry` |
| Right side panel | `.right-berry` |

## Canvas Click Coordinates

The editor canvas is a Phaser `<canvas>` element. Clicks use coordinates **relative to the canvas element** (not the page).

```js
// In a Playwright script:
const box = await page.locator('#canvas-container canvas').boundingBox();
const cx = box.width / 2;
const cy = box.height / 2;

// Click the centre of the canvas
await page.locator('#canvas-container canvas').click({ position: { x: cx, y: cy } });
```

Or via MCP `playwright_evaluate` to get absolute coordinates:

```js
const rect = window.__editor__.getCanvasRect();
// Then use playwright_click at { x: rect.x + cx, y: rect.y + cy }
```

## InRepo Studio Test Scenarios

### Smoke Test (run after any major change)
1. Navigate to `http://localhost:5173/?tool=editor`
2. Wait for `window.__editor__.ready === true`
3. Screenshot — verify editor layout loads
4. `window.__editor__.getLayoutInfo()` — confirm all panels present
5. Screenshot — confirm no visual regressions

### Layer Switching Test
1. Navigate to editor, wait for ready
2. `window.__editor__.getActiveLayer()` — note starting layer
3. Click a layer button in the bottom panel (`.bottom-panel button`)
4. `window.__editor__.getActiveLayer()` — confirm layer changed
5. Screenshot

### Canvas Paint Test
1. Navigate to editor, wait for ready
2. Ensure paint tool: `window.__editor__.setTool('paint')`
3. `window.__editor__.getCanvasRect()` — get canvas bounds
4. Click or drag across canvas centre
5. Screenshot — verify tile was painted

### Tool Switching Test
1. Navigate to editor
2. `window.__editor__.getCurrentTool()` — note starting tool
3. Click a tool button in the bottom panel
4. `window.__editor__.getCurrentTool()` — confirm tool changed

### Viewport / Pan Test
1. Navigate to editor
2. `window.__editor__.getViewport()` — note starting x/y/zoom
3. Click-drag on the canvas (pan gesture)
4. `window.__editor__.getViewport()` — confirm x/y changed

## Running Tests via CLI

```bash
# All Playwright tests (smoke + tests/editor/)
npm run test:e2e

# Smoke spec only
npx playwright test playwright-smoke.spec.ts

# Editor spec only
npx playwright test tests/editor/editor-basic.spec.ts

# With visible browser (headed mode, useful for debugging)
npx playwright test --headed

# Update snapshots
npx playwright test --update-snapshots
```

## Tips

- Always take a screenshot first before interacting — it helps orient to the current state
- Use `window.__editor__.getLayoutInfo()` to check which panels are visible before trying to click them
- Use `window.__editor__.getCanvasRect()` to translate canvas-relative positions into page coordinates
- If the page is slow to load (Vite cold start), `waitForFunction` on `window.__editor__.ready` is more reliable than `waitForTimeout`
- The bridge is only available in dev mode (`npm run dev`) — it is stripped from production builds

## Troubleshooting

**"npx: command not found"** — Node.js isn't on PATH in the MCP process. Fix by using the full path in settings.json:
```json
"command": "/usr/local/bin/npx"
```

**Screenshot is blank** — The dev server may not have started yet. Run `npm run dev` first and wait for "ready" message.

**`window.__editor__` is undefined** — Either you navigated to the game URL (missing `?tool=editor`) or the editor hasn't finished initialising yet. Wait for `ready === true`.

**Can't find an element** — Use `playwright_get_visible_text` or `window.__editor__.getLayoutInfo()` to see what's actually rendered, then adjust selectors.
