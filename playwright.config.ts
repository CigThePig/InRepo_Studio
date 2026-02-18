import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for InRepo Studio editor UI testing.
 *
 * Key notes:
 * - Editor mode requires the `?tool=editor` query parameter — the default
 *   URL loads the game runtime instead. Tests should navigate to
 *   `/?tool=editor` (or use the `editorURL` export from tests/editor/helpers.ts).
 * - The app uses IndexedDB and a custom hot-storage layer that initialises
 *   asynchronously. Wait for `window.__editor__.ready === true` before
 *   interacting with editor APIs.
 * - Canvas interactions use pixel coordinates via `page.mouse.click(x, y)` or
 *   `page.locator('#canvas-container canvas').click({ position: { x, y } })`.
 */

export default defineConfig({
  testDir: '.',
  testMatch: ['playwright-smoke.spec.ts', 'tests/**/*.spec.ts'],

  /* Global timeout per test */
  timeout: 60_000,

  /* Retry on CI */
  retries: process.env.CI ? 1 : 0,

  /* Reporter */
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    /* Base URL lets tests use relative paths like `page.goto('/?tool=editor')` */
    baseURL: 'http://localhost:5173',

    /* Capture screenshot on every test failure */
    screenshot: 'only-on-failure',

    /* Capture video on failure for debugging */
    video: 'retain-on-failure',

    /* Capture trace on first retry */
    trace: 'on-first-retry',

    /* Viewport matching a typical editor session on a laptop */
    viewport: { width: 1280, height: 800 },

    /* Accept insecure certs (dev server may use self-signed) */
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start the Vite dev server automatically if it isn't already running */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
