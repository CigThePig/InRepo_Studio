/**
 * InRepo Studio — Playwright Smoke Tests
 *
 * Quick sanity checks that run after any significant change to confirm the
 * editor still loads and the most critical panels are present.
 *
 * IMPORTANT: The editor requires `?tool=editor` in the URL. Without it the
 * page boots the game runtime instead of the editor UI.
 */

import { test, expect } from '@playwright/test';

const EDITOR_URL = '/?tool=editor';
const READY_TIMEOUT = 30_000;

/** Poll until window.__editor__.ready is true. */
async function waitForEditorReady(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => (window as unknown as { __editor__?: { ready?: boolean } }).__editor__?.ready === true,
    { timeout: READY_TIMEOUT },
  );
}

test.describe('InRepo Studio Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to editor mode (not the game runtime)
    await page.goto(EDITOR_URL);
  });

  // -------------------------------------------------------------------------

  test('editor initialises and window.__editor__ is ready', async ({ page }) => {
    await waitForEditorReady(page);

    const layout = await page.evaluate(() => {
      const ed = (window as unknown as { __editor__: { getLayoutInfo: () => unknown } }).__editor__;
      return ed.getLayoutInfo();
    });

    await page.screenshot({ path: '/tmp/pw-01-editor-loaded.png' });
    console.log('Editor layout:', JSON.stringify(layout));

    expect((layout as { editorContainer: boolean }).editorContainer).toBe(true);
    expect((layout as { canvas: boolean }).canvas).toBe(true);
  });

  // -------------------------------------------------------------------------

  test('canvas element is present and has non-zero dimensions', async ({ page }) => {
    await waitForEditorReady(page);

    const canvas = page.locator('#canvas-container canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    await page.screenshot({ path: '/tmp/pw-02-canvas-present.png' });
    console.log(`Canvas size: ${box!.width}×${box!.height}`);
  });

  // -------------------------------------------------------------------------

  test('editor state bridge exposes valid tool and layer', async ({ page }) => {
    await waitForEditorReady(page);

    const { tool, layer, viewport } = await page.evaluate(() => {
      const ed = (window as unknown as {
        __editor__: {
          getCurrentTool: () => string;
          getActiveLayer: () => string;
          getViewport: () => { x: number; y: number; zoom: number };
        };
      }).__editor__;
      return {
        tool: ed.getCurrentTool(),
        layer: ed.getActiveLayer(),
        viewport: ed.getViewport(),
      };
    });

    await page.screenshot({ path: '/tmp/pw-03-editor-state.png' });
    console.log(`Tool: ${tool}, Layer: ${layer}, Viewport: ${JSON.stringify(viewport)}`);

    expect(['paint', 'erase', 'select', 'entity']).toContain(tool);
    expect(['ground', 'props', 'entities', 'collision', 'triggers']).toContain(layer);
    expect(typeof viewport?.zoom).toBe('number');
  });
});
