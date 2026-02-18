# Browser Testing with Playwright MCP

InRepo Studio has Playwright MCP configured, giving Claude Code a real browser it can control to test the app like a user would.

## How It Works

When the dev server is running, Claude can open a browser, navigate the UI, click buttons, fill inputs, take screenshots, and verify behaviour — all without a human operating the device.

## Standard Test Workflow

```
1. Start the dev server:       npm run dev
2. Open browser to app:        playwright_navigate → http://localhost:5173
3. Take a screenshot:          playwright_screenshot
4. Interact with the UI:       playwright_click, playwright_fill, etc.
5. Verify results:             playwright_screenshot + visual inspection
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

## InRepo Studio Test Scenarios

### Smoke Test (run after any major change)
1. Navigate to `http://localhost:5173`
2. Screenshot — verify editor layout loads
3. Click the Files tab — verify file tree appears
4. Click a file — verify it opens in the editor panel
5. Screenshot — confirm no visual regressions

### GitHub Integration Test
1. Navigate to the app
2. Trigger the GitHub repo load flow
3. Screenshot each step
4. Verify repo files appear in the file tree

### Editor Interaction Test
1. Open a file in the code editor
2. Make a small edit via `playwright_fill` or `playwright_evaluate`
3. Screenshot — verify the edit is reflected
4. Check the diff/preview panel responds

### Agent Panel Test
1. Open the agent panel
2. Verify the input and send button are present
3. Screenshot the panel state

## Tips

- Always take a screenshot first before interacting — it helps Claude orient to the current state
- Use `playwright_evaluate` to query the DOM or check app state directly:
  ```js
  document.querySelector('.editor-panel')?.classList
  ```
- If the page is slow to load (Vite cold start), add a short wait or screenshot loop
- The `--headless` flag means no visible window is needed on the server — works perfectly for remote sessions

## Troubleshooting

**"npx: command not found"** — Node.js isn't on PATH in the MCP process. Fix by using the full path in settings.json:
```json
"command": "/usr/local/bin/npx"
```

**Screenshot is blank** — The dev server may not have started yet. Run `npm run dev` first and wait for "ready" message.

**Can't find an element** — Use `playwright_get_visible_text` to see what's actually rendered, then adjust selectors.
