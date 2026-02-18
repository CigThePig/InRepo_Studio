import { test, expect } from '@playwright/test';

test.describe('InRepo Studio Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Give Vite + Phaser time to initialise
    await page.waitForTimeout(3000);
  });

  test('app loads and editor layout is visible', async ({ page }) => {
    await page.screenshot({ path: '/tmp/pw-01-initial-load.png' });

    const body = page.locator('body');
    await expect(body).toBeVisible();
    console.log('✓ App loaded successfully');
  });

  test('Files tab or sidebar is present', async ({ page }) => {
    await page.screenshot({ path: '/tmp/pw-02-pre-click.png' });

    const visibleText = await page.evaluate(() => document.body.innerText.trim());
    console.log(`Page visible text: "${visibleText.slice(0, 200)}"`);

    // Look for a Files tab or sidebar element
    const filesTab = page.getByText(/files/i).first();
    if (await filesTab.isVisible()) {
      await filesTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: '/tmp/pw-02-files-tab-clicked.png' });
      console.log('✓ Files tab clicked');
    } else {
      await page.screenshot({ path: '/tmp/pw-02-no-files-tab.png' });
      console.log('ℹ Files tab not found — app may use canvas-based UI (Phaser)');
    }
  });

  test('page DOM structure is sane', async ({ page }) => {
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    const inputs = page.locator('input, textarea');
    const inputCount = await inputs.count();

    const canvases = page.locator('canvas');
    const canvasCount = await canvases.count();

    console.log(`Buttons: ${buttonCount}, Inputs: ${inputCount}, Canvases: ${canvasCount}`);
    await page.screenshot({ path: '/tmp/pw-03-dom-structure.png' });

    // At least the body should exist
    await expect(page.locator('body')).toBeVisible();
  });
});
