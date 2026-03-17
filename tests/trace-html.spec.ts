import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Trace HTML Timeline', () => {
  test.beforeAll(async () => {
    // Ensure trace.html exists
    const fs = await import('fs');
    const tracePath = path.join(process.cwd(), 'trace.html');
    if (!fs.existsSync(tracePath)) {
      throw new Error('trace.html not found — run: node scripts/code-paths.mjs --trace "..." --html');
    }
  });

  test('page loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const tracePath = `file://${path.join(process.cwd(), 'trace.html')}`;
    await page.goto(tracePath, { waitUntil: 'networkidle' });

    // Wait for D3 to render
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });

  test('header renders with description and stats', async ({ page }) => {
    const tracePath = `file://${path.join(process.cwd(), 'trace.html')}`;
    await page.goto(tracePath, { waitUntil: 'networkidle' });

    const description = await page.locator('#description').textContent();
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(5);

    const stats = await page.locator('#stats').textContent();
    expect(stats).toContain('files');
  });

  test('SVG timeline is rendered with correct dimensions', async ({ page }) => {
    const tracePath = `file://${path.join(process.cwd(), 'trace.html')}`;
    await page.goto(tracePath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const svg = page.locator('#timeline svg');
    await expect(svg).toBeVisible();

    const width = await svg.getAttribute('width');
    expect(Number(width)).toBeGreaterThan(100);

    const height = await svg.getAttribute('height');
    expect(Number(height)).toBeGreaterThan(100);
  });

  test('time axis has valid date labels (not NaN or Invalid)', async ({ page }) => {
    const tracePath = `file://${path.join(process.cwd(), 'trace.html')}`;
    await page.goto(tracePath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const axisTexts = await page.locator('#timeline svg text').allTextContents();
    const dateTexts = axisTexts.filter(t => t.match(/[A-Z][a-z]{2}\s+\d{4}/)); // e.g. "Feb 2026"

    expect(dateTexts.length).toBeGreaterThan(0);
    for (const t of dateTexts) {
      expect(t).not.toContain('NaN');
      expect(t).not.toContain('Invalid');
    }
  });

  test('file bars are rendered at valid positions', async ({ page }) => {
    const tracePath = `file://${path.join(process.cwd(), 'trace.html')}`;
    await page.goto(tracePath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const bars = page.locator('.file-bar');
    const count = await bars.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const x = await bars.nth(i).getAttribute('x');
      const w = await bars.nth(i).getAttribute('width');
      expect(Number(x)).not.toBeNaN();
      expect(Number(w)).not.toBeNaN();
      expect(Number(x)).toBeGreaterThanOrEqual(0);
      expect(Number(w)).toBeGreaterThan(0);
    }
  });

  test('file labels are present and readable', async ({ page }) => {
    const tracePath = `file://${path.join(process.cwd(), 'trace.html')}`;
    await page.goto(tracePath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const labels = page.locator('.file-label');
    const count = await labels.count();
    expect(count).toBeGreaterThan(0);

    const firstLabel = await labels.first().textContent();
    expect(firstLabel).toBeTruthy();
    expect(firstLabel!.length).toBeGreaterThan(1);
  });

  test('clicking a file bar updates the detail panel', async ({ page }) => {
    const tracePath = `file://${path.join(process.cwd(), 'trace.html')}`;
    await page.goto(tracePath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const initialTitle = await page.locator('#panel-title').textContent();
    expect(initialTitle).toBe('Overview');

    // Click the first file bar (the rect, not the g — SVG g elements need child with area)
    const firstBar = page.locator('.file-bar').first();
    await firstBar.click();

    const newTitle = await page.locator('#panel-title').textContent();
    expect(newTitle).not.toBe('Overview');
    expect(newTitle!.length).toBeGreaterThan(0);

    // Panel should show file details
    const panelBody = await page.locator('#panel-body').textContent();
    expect(panelBody).toContain('commits');
    expect(panelBody).toContain('lines');
  });

  test('dead code markers render at valid positions', async ({ page }) => {
    const tracePath = `file://${path.join(process.cwd(), 'trace.html')}`;
    await page.goto(tracePath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const deadMarkers = page.locator('.dead-marker');
    const count = await deadMarkers.count();

    if (count > 0) {
      // Check that circles have valid cx values
      const circles = page.locator('.dead-marker circle');
      const circleCount = await circles.count();
      for (let i = 0; i < Math.min(circleCount, 5); i++) {
        const cx = await circles.nth(i).getAttribute('cx');
        expect(Number(cx)).not.toBeNaN();
        expect(Number(cx)).toBeGreaterThan(0);
      }

      // Click a dead marker circle and check panel
      await circles.first().click();
      const panelTitle = await page.locator('#panel-title').textContent();
      expect(panelTitle).not.toBe('Overview');
    }
  });

  test('no NaN values anywhere in the SVG', async ({ page }) => {
    const tracePath = `file://${path.join(process.cwd(), 'trace.html')}`;
    await page.goto(tracePath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const svgHtml = await page.locator('#timeline svg').innerHTML();
    expect(svgHtml).not.toContain('NaN');
  });

  test('dependency graph section is present', async ({ page }) => {
    const tracePath = `file://${path.join(process.cwd(), 'trace.html')}`;
    await page.goto(tracePath, { waitUntil: 'networkidle' });

    const depSection = page.locator('.dep-section');
    await expect(depSection).toBeVisible();

    const content = await depSection.textContent();
    expect(content).toContain('→');
  });
});
