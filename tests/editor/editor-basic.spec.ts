/**
 * Editor Basic Spec
 *
 * Foundational tests that verify the editor UI loads, core panels are
 * present, and canvas interaction works.  These run against the Vite dev
 * server at http://localhost:5173/?tool=editor.
 *
 * Run with:
 *   npm run test:e2e -- tests/editor/editor-basic.spec.ts
 */

import { test, expect } from '@playwright/test';
import {
  gotoEditor,
  waitForEditorReady,
  getLayoutInfo,
  getActiveLayer,
  getCurrentTool,
  getViewport,
  clickCanvas,
  dragCanvas,
  panels,
  snap,
} from './helpers';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
  await gotoEditor(page);
});

// ---------------------------------------------------------------------------
// Load & layout
// ---------------------------------------------------------------------------

test.describe('Editor loads', () => {
  test('window.__editor__.ready becomes true', async ({ page }) => {
    const state = await waitForEditorReady(page);
    expect(state).not.toBeNull();
    await snap(page, '01-editor-ready');
  });

  test('major panels are present in the DOM', async ({ page }) => {
    await waitForEditorReady(page);
    const layout = await getLayoutInfo(page);

    expect(layout.editorContainer).toBe(true);
    expect(layout.canvas).toBe(true);
    // At least top or bottom panel should be present
    expect(layout.topPanel || layout.bottomPanel).toBe(true);

    await snap(page, '02-layout');
  });

  test('canvas element is visible', async ({ page }) => {
    await waitForEditorReady(page);
    await expect(panels.canvasContainer(page)).toBeVisible();
    await expect(page.locator('#canvas-container canvas')).toBeVisible();
    await snap(page, '03-canvas-visible');
  });
});

// ---------------------------------------------------------------------------
// Editor state via window.__editor__
// ---------------------------------------------------------------------------

test.describe('Editor state bridge', () => {
  test('getActiveLayer returns a valid layer name', async ({ page }) => {
    await waitForEditorReady(page);
    const layer = await getActiveLayer(page);
    expect(['ground', 'props', 'entities', 'collision', 'triggers']).toContain(layer);
  });

  test('getCurrentTool returns a valid tool name', async ({ page }) => {
    await waitForEditorReady(page);
    const tool = await getCurrentTool(page);
    expect(['paint', 'erase', 'select', 'entity']).toContain(tool);
  });

  test('getViewport returns numeric x/y/zoom', async ({ page }) => {
    await waitForEditorReady(page);
    const vp = await getViewport(page);
    expect(typeof vp?.x).toBe('number');
    expect(typeof vp?.y).toBe('number');
    expect(typeof vp?.zoom).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Canvas interaction
// ---------------------------------------------------------------------------

test.describe('Canvas interaction', () => {
  test('click at canvas centre does not throw', async ({ page }) => {
    await waitForEditorReady(page);

    const canvas = page.locator('#canvas-container canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    const cx = Math.round((box!.width ?? 400) / 2);
    const cy = Math.round((box!.height ?? 300) / 2);

    await clickCanvas(page, { x: cx, y: cy });
    await snap(page, '04-canvas-click');
  });

  test('drag across canvas centre does not throw', async ({ page }) => {
    await waitForEditorReady(page);

    const canvas = page.locator('#canvas-container canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    const cx = Math.round((box!.width ?? 400) / 2);
    const cy = Math.round((box!.height ?? 300) / 2);

    // Short drag: 40 px to the right
    await dragCanvas(page, { x: cx - 20, y: cy }, { x: cx + 20, y: cy });
    await snap(page, '05-canvas-drag');
  });
});

// ---------------------------------------------------------------------------
// Top bar (V2) interaction
// ---------------------------------------------------------------------------

test.describe('Top bar V2', () => {
  test('top bar is visible', async ({ page }) => {
    await waitForEditorReady(page);
    const topBar = panels.topBar(page);
    // Top bar may not exist if V2 flag is off — check rather than assert hard
    const count = await topBar.count();
    if (count > 0) {
      await expect(topBar).toBeVisible();
      await snap(page, '06-top-bar');
    } else {
      // Legacy top panel
      await expect(panels.container(page)).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Bottom panel interaction
// ---------------------------------------------------------------------------

test.describe('Bottom panel', () => {
  test('bottom panel or context strip is present', async ({ page }) => {
    await waitForEditorReady(page);

    const bp = panels.bottomPanel(page);
    const bcs = panels.bottomContextStrip(page);

    const bpCount = await bp.count();
    const bcsCount = await bcs.count();

    expect(bpCount + bcsCount).toBeGreaterThan(0);
    await snap(page, '07-bottom-panel');
  });
});
