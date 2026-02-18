/**
 * Editor Test Helpers
 *
 * Shared utilities for Playwright tests that interact with the InRepo Studio
 * editor UI.  Import these instead of duplicating wait logic across specs.
 *
 * Quick-start:
 *   import { gotoEditor, waitForEditorReady, clickCanvas } from './helpers';
 *
 *   test('my test', async ({ page }) => {
 *     await gotoEditor(page);
 *     const state = await waitForEditorReady(page);
 *     console.log('active layer:', state.activeLayer);
 *     await clickCanvas(page, { x: 200, y: 200 });
 *   });
 */

import type { Page, Locator } from '@playwright/test';

// ---------------------------------------------------------------------------
// URL constants
// ---------------------------------------------------------------------------

/** URL path that boots the editor (vs. the game runtime). */
export const EDITOR_PATH = '/?tool=editor';

/** How long to wait for the editor to finish its async initialisation. */
const EDITOR_READY_TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/**
 * Navigate to the editor and wait for the page to load.
 * Does NOT wait for full editor initialisation — call `waitForEditorReady`
 * afterwards if you need the editor APIs.
 */
export async function gotoEditor(page: Page): Promise<void> {
  await page.goto(EDITOR_PATH);
}

// ---------------------------------------------------------------------------
// Editor readiness
// ---------------------------------------------------------------------------

/**
 * Wait until `window.__editor__.ready === true`, then return a snapshot of
 * the editor state object.
 *
 * The editor performs async IndexedDB reads during startup, so this is the
 * reliable gate before calling any `window.__editor__.*` methods.
 */
export async function waitForEditorReady(page: Page): Promise<Record<string, unknown>> {
  await page.waitForFunction(
    () => (window as unknown as { __editor__?: { ready?: boolean } }).__editor__?.ready === true,
    { timeout: EDITOR_READY_TIMEOUT },
  );

  const state = await page.evaluate(() => {
    const ed = (window as unknown as { __editor__: { getState: () => unknown } }).__editor__;
    return ed.getState() as Record<string, unknown>;
  });

  return state ?? {};
}

// ---------------------------------------------------------------------------
// Editor state accessors (thin wrappers around window.__editor__)
// ---------------------------------------------------------------------------

/** Call any `window.__editor__` method and return the result. */
export async function editorCall<T = unknown>(
  page: Page,
  method: string,
  ...args: unknown[]
): Promise<T> {
  return page.evaluate(
    ([m, a]) => {
      const ed = (window as unknown as Record<string, Record<string, (...args: unknown[]) => unknown>>).__editor__;
      return ed[m](...(a as unknown[]));
    },
    [method, args] as [string, unknown[]],
  ) as Promise<T>;
}

/** Return the current viewport state `{ x, y, zoom }`. */
export async function getViewport(page: Page) {
  return editorCall<{ x: number; y: number; zoom: number }>(page, 'getViewport');
}

/** Return the active layer name. */
export async function getActiveLayer(page: Page) {
  return editorCall<string>(page, 'getActiveLayer');
}

/** Return the current tool name. */
export async function getCurrentTool(page: Page) {
  return editorCall<string>(page, 'getCurrentTool');
}

/** Return a summary of which major panels are currently visible in the DOM. */
export async function getLayoutInfo(page: Page) {
  return editorCall<{
    editorContainer: boolean;
    topPanel: boolean;
    canvas: boolean;
    bottomPanel: boolean;
    leftBerry: boolean;
    rightBerry: boolean;
  }>(page, 'getLayoutInfo');
}

// ---------------------------------------------------------------------------
// Canvas interaction
// ---------------------------------------------------------------------------

/**
 * Locator for the Phaser canvas element inside the editor canvas container.
 * Use this for canvas-relative clicks.
 */
export function canvasLocator(page: Page): Locator {
  return page.locator('#canvas-container canvas');
}

/**
 * Click at a pixel coordinate inside the editor canvas.
 *
 * Coordinates are relative to the top-left corner of the canvas element.
 * Use `getCanvasRect()` / `getViewport()` to convert world coords to pixels.
 *
 * @example
 *   await clickCanvas(page, { x: 200, y: 300 });
 */
export async function clickCanvas(
  page: Page,
  position: { x: number; y: number },
): Promise<void> {
  await canvasLocator(page).click({ position });
}

/**
 * Mouse-down then mouse-up drag across the canvas (for paint strokes, selections, etc.).
 */
export async function dragCanvas(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  const canvas = canvasLocator(page);
  await canvas.hover({ position: from });
  await page.mouse.down();
  await canvas.hover({ position: to });
  await page.mouse.up();
}

/**
 * Return the bounding client rect of the canvas (useful for computing
 * absolute page coordinates from canvas-relative positions).
 */
export async function getCanvasRect(
  page: Page,
): Promise<{ x: number; y: number; width: number; height: number }> {
  return editorCall(page, 'getCanvasRect') as Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

// ---------------------------------------------------------------------------
// Panel locators (by stable class / ID)
// ---------------------------------------------------------------------------

export const panels = {
  /** The full editor shell */
  container: (page: Page) => page.locator('#editor-container'),

  /** Top bar (V2 mode: scene selector, undo/redo, play button) */
  topBar: (page: Page) => page.locator('.top-bar-v2'),

  /** Bottom toolbar (tool selector buttons) */
  bottomPanel: (page: Page) => page.locator('.bottom-panel'),

  /** Bottom context action strip (Move / Copy / Delete etc.) */
  bottomContextStrip: (page: Page) => page.locator('.bottom-context-strip'),

  /** Left side panel (asset library, tools tab, etc.) */
  leftBerry: (page: Page) => page.locator('.left-berry'),

  /** Right side panel (properties / layer picker) */
  rightBerry: (page: Page) => page.locator('.right-berry'),

  /** Canvas wrapper div */
  canvasContainer: (page: Page) => page.locator('#canvas-container'),
};

// ---------------------------------------------------------------------------
// Screenshot helper
// ---------------------------------------------------------------------------

/**
 * Take a labelled screenshot to `/tmp/pw-<label>.png`.
 * Useful for visual debugging during a test run.
 */
export async function snap(page: Page, label: string): Promise<void> {
  await page.screenshot({ path: `/tmp/pw-${label}.png` });
}
