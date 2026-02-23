import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a PNG (given width × height) with pixel data. */
function makeSizedPng(width: number, height: number): Buffer {
  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  };

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // RGBA

  // Build raw scanlines: filter byte 0 + width×4 bytes per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height, 0);
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // filter = None
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 4;
      rawData[offset] = (x * 37 + y * 59) & 0xff;
      rawData[offset + 1] = (x * 73 + y * 97) & 0xff;
      rawData[offset + 2] = (x * 113 + y * 29) & 0xff;
      rawData[offset + 3] = 255;
    }
  }

  // Compress with deflate stored blocks (max 65535 bytes per block)
  const zlibChunks: Buffer[] = [Buffer.from([0x78, 0x01])];
  const maxBlock = 65535;
  const totalLen = rawData.length;
  for (let i = 0; i < totalLen; i += maxBlock) {
    const remaining = totalLen - i;
    const blockLen = Math.min(remaining, maxBlock);
    const isFinal = (i + blockLen >= totalLen) ? 1 : 0;
    const header = Buffer.alloc(5);
    header[0] = isFinal;
    header.writeUInt16LE(blockLen, 1);
    header.writeUInt16LE(~blockLen & 0xffff, 3);
    zlibChunks.push(header, rawData.subarray(i, i + blockLen));
  }
  // Adler-32
  let s1 = 1, s2 = 0;
  for (let i = 0; i < rawData.length; i++) {
    s1 = (s1 + rawData[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE(((s2 << 16) | s1) >>> 0);
  zlibChunks.push(adler);

  const idatData = Buffer.concat(zlibChunks);
  const iendData = Buffer.alloc(0);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', idatData),
    chunk('IEND', iendData),
  ]);
}

const fixturesDir = path.join(__dirname, 'fixtures');

// Write test images to disk before all tests
function ensureFixtures() {
  if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });

  const images = [
    { name: 'red.png', buf: makeSizedPng(200, 150) },
    { name: 'green.png', buf: makeSizedPng(200, 150) },
    { name: 'blue.png', buf: makeSizedPng(200, 150) },
    { name: 'fourth.png', buf: makeSizedPng(100, 100) },
  ];

  for (const { name, buf } of images) {
    const p = path.join(fixturesDir, name);
    if (!fs.existsSync(p)) fs.writeFileSync(p, buf);
  }

  // A plain text file to test rejection of non-media
  const txtPath = path.join(fixturesDir, 'readme.txt');
  if (!fs.existsSync(txtPath)) fs.writeFileSync(txtPath, 'not an image');
}

ensureFixtures();

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Load N fixture images by setting files on the hidden input. */
async function loadImages(page: Page, fileNames: string[]) {
  const filePaths = fileNames.map(f => path.join(fixturesDir, f));
  const fileInput = page.locator('#multiFileInput');
  await fileInput.setInputFiles(filePaths);
  // Wait for the comparison view to become active
  await page.locator('#comparisonView.active').waitFor({ timeout: 5000 });
}

/** Wait for a rAF-deferred class change on body. */
async function waitForBodyClass(page: Page, hasClass: string, present: boolean, timeout = 3000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const has = await page.evaluate(
      (cls) => document.body.classList.contains(cls),
      hasClass
    );
    if (has === present) return;
    await page.waitForTimeout(50);
  }
  throw new Error(`Timed out waiting for body class "${hasClass}" to be ${present ? 'present' : 'absent'}`);
}

/** Check if body is in any split mode. */
async function isSplitMode(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    document.body.classList.contains('side-by-side') ||
    document.body.classList.contains('vertical-stack') ||
    document.body.classList.contains('tripartite') ||
    document.body.classList.contains('tripartite-columns') ||
    document.body.classList.contains('tripartite-rows')
  );
}

/** Check if body is in a 2-asset split mode. */
async function isTwoAssetSplit(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    document.body.classList.contains('side-by-side') ||
    document.body.classList.contains('vertical-stack')
  );
}

/**
 * Access a top-level `let` variable from the page's script.
 * page.evaluate(() => varName) doesn't work for `let` vars (they're not on window).
 * Using eval() string form accesses the global lexical scope.
 */
async function getVar(page: Page, name: string): Promise<any> {
  return page.evaluate(`(${name})`);
}

// ===========================================================================
// Tests
// ===========================================================================

test.describe('Page Load & Initial State', () => {
  test('title is WarpDiff', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('WarpDiff');
  });

  test('header shows version and action buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#appVersion')).toHaveText('v1');
    await expect(page.locator('#loadBtn')).toBeVisible();
    await expect(page.locator('.quick-start-btn')).toBeVisible();
  });

  test('comparison view is hidden initially', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#comparisonView')).not.toHaveClass(/active/);
  });

  test('video controls are hidden initially', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#videoControls')).not.toHaveClass(/active/);
  });

  test('quick start popup is hidden initially', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#quickStartPopup')).not.toHaveClass(/show/);
  });
});

test.describe('File Loading', () => {
  test('loading 2 images activates comparison view in split mode', async ({ page }) => {
    await page.goto('/');
    await loadImages(page, ['red.png', 'green.png']);

    await expect(page.locator('#comparisonView')).toHaveClass(/active/);
    expect(await isTwoAssetSplit(page)).toBe(true);
  });

  test('loading 3 images activates 3-UP (tripartite) mode', async ({ page }) => {
    await page.goto('/');
    await loadImages(page, ['red.png', 'green.png', 'blue.png']);

    // tripartite layout is applied via rAF — wait for it
    await page.waitForFunction(() =>
      document.body.classList.contains('tripartite') ||
      document.body.classList.contains('tripartite-columns') ||
      document.body.classList.contains('tripartite-rows')
    , {}, { timeout: 3000 });
  });

  test('rejects single file with alert', async ({ page }) => {
    await page.goto('/');
    // Register dialog handler BEFORE triggering the file input (alert blocks)
    const dialogPromise = page.waitForEvent('dialog');
    // Use setInputFiles without awaiting — the alert() blocks the change handler,
    // which blocks Playwright's setInputFiles resolution. We race with the dialog.
    const fileInput = page.locator('#multiFileInput');
    const setFilesPromise = fileInput.setInputFiles(path.join(fixturesDir, 'red.png'));
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('2 or 3');
    await dialog.accept();
    await setFilesPromise;
  });

  test('rejects 4+ files with alert', async ({ page }) => {
    await page.goto('/');
    const dialogPromise = page.waitForEvent('dialog');
    const fileInput = page.locator('#multiFileInput');
    const setFilesPromise = fileInput.setInputFiles([
      path.join(fixturesDir, 'red.png'),
      path.join(fixturesDir, 'green.png'),
      path.join(fixturesDir, 'blue.png'),
      path.join(fixturesDir, 'fourth.png'),
    ]);
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('2 or 3');
    await dialog.accept();
    await setFilesPromise;
  });

  test('rejects non-media files with alert', async ({ page }) => {
    await page.goto('/');
    const dialogPromise = page.waitForEvent('dialog');
    const fileInput = page.locator('#multiFileInput');
    const setFilesPromise = fileInput.setInputFiles([
      path.join(fixturesDir, 'readme.txt'),
      path.join(fixturesDir, 'red.png'),
    ]);
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('2 or 3');
    await dialog.accept();
    await setFilesPromise;
  });
});

test.describe('View Mode Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadImages(page, ['red.png', 'green.png']);
    // Split mode class is applied via rAF — wait for it
    await page.waitForFunction(() =>
      document.body.classList.contains('side-by-side') ||
      document.body.classList.contains('vertical-stack')
    , {}, { timeout: 3000 });
  });

  test('starts in split mode after loading 2 images', async ({ page }) => {
    expect(await isTwoAssetSplit(page)).toBe(true);
  });

  test('O key toggles to overlay mode and back', async ({ page }) => {
    // Initially in split mode, press O → overlay
    await page.keyboard.press('o');
    // setViewMode('overlay') removes classes synchronously
    await page.waitForFunction(() =>
      !document.body.classList.contains('side-by-side') &&
      !document.body.classList.contains('vertical-stack')
    , {}, { timeout: 3000 });
    expect(await isSplitMode(page)).toBe(false);

    // Press O again → back to split (applied via rAF, need to wait)
    await page.keyboard.press('o');
    // Wait for rAF to apply the class
    await page.waitForFunction(() =>
      document.body.classList.contains('side-by-side') ||
      document.body.classList.contains('vertical-stack')
    , {}, { timeout: 3000 });
    expect(await isTwoAssetSplit(page)).toBe(true);
  });

  test('C key toggles between split and overlay', async ({ page }) => {
    // Initially in split mode, press C → overlay
    await page.keyboard.press('c');
    expect(await isSplitMode(page)).toBe(false);

    // Press C again → back to split (rAF deferred)
    await page.keyboard.press('c');
    await page.waitForFunction(() =>
      document.body.classList.contains('side-by-side') ||
      document.body.classList.contains('vertical-stack')
    , {}, { timeout: 3000 });
    expect(await isTwoAssetSplit(page)).toBe(true);
  });

  test('mode strip buttons reflect current mode', async ({ page }) => {
    const modeStrip = page.locator('#modeStrip');
    await expect(modeStrip).toBeVisible();
    const activeBtn = modeStrip.locator('.mode-btn.active');
    await expect(activeBtn).toHaveCount(1);
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('L key opens file input (triggers click)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      (window as any).__fileInputClicked = false;
      document.getElementById('multiFileInput')!.addEventListener('click', () => {
        (window as any).__fileInputClicked = true;
      });
    });
    await page.keyboard.press('l');
    const clicked = await page.evaluate(() => (window as any).__fileInputClicked);
    expect(clicked).toBe(true);
  });

  test('K key toggles shortcuts panel', async ({ page }) => {
    await page.goto('/');
    const panel = page.locator('#shortcutsPanel');
    await expect(panel).not.toHaveClass(/open/);

    await page.keyboard.press('k');
    await expect(panel).toHaveClass(/open/);

    await page.keyboard.press('k');
    await expect(panel).not.toHaveClass(/open/);
  });

  test('+/- zoom in/out in overlay mode', async ({ page }) => {
    await page.goto('/');
    await loadImages(page, ['red.png', 'green.png']);
    // Switch to overlay mode
    await page.keyboard.press('o');
    // Wait for overlay zoom to initialise (resetFitZoom runs in double-rAF)
    await page.waitForTimeout(200);

    const initial = await getVar(page, 'zoomLevel');
    expect(typeof initial).toBe('number');

    await page.keyboard.press('+');
    const after = await getVar(page, 'zoomLevel');
    expect(after).toBeGreaterThan(initial);

    await page.keyboard.press('-');
    const afterOut = await getVar(page, 'zoomLevel');
    expect(afterOut).toBeLessThan(after);
  });

  test('0 key resets zoom to fit', async ({ page }) => {
    await page.goto('/');
    await loadImages(page, ['red.png', 'green.png']);
    await page.keyboard.press('o');
    await page.waitForTimeout(200);

    // Zoom in first
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    const zoomed = await getVar(page, 'zoomLevel');

    // Reset — resetFitZoom uses double rAF internally
    await page.keyboard.press('0');
    await page.waitForTimeout(200);
    const fit = await getVar(page, 'zoomLevel');
    expect(fit).toBeLessThanOrEqual(zoomed);
  });

  test('arrow keys switch assets in overlay mode', async ({ page }) => {
    await page.goto('/');
    await loadImages(page, ['red.png', 'green.png']);
    await page.keyboard.press('o');

    const initial = await getVar(page, 'currentAssetIndex');
    expect(typeof initial).toBe('number');

    await page.keyboard.press('ArrowRight');
    const after = await getVar(page, 'currentAssetIndex');
    expect(after).not.toBe(initial);

    await page.keyboard.press('ArrowLeft');
    const back = await getVar(page, 'currentAssetIndex');
    expect(back).toBe(initial);
  });
});

test.describe('Zoom & Pan (Overlay Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loadImages(page, ['red.png', 'green.png']);
    await page.keyboard.press('o');
    // Wait for overlay zoom init (double rAF in resetFitZoom)
    await page.waitForTimeout(200);
  });

  test('zoom in increases zoom level', async ({ page }) => {
    const before = await getVar(page, 'zoomLevel');
    await page.keyboard.press('+');
    const after = await getVar(page, 'zoomLevel');
    expect(after).toBeGreaterThan(before);
  });

  test('zoom out decreases zoom level', async ({ page }) => {
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    const before = await getVar(page, 'zoomLevel');
    await page.keyboard.press('-');
    const after = await getVar(page, 'zoomLevel');
    expect(after).toBeLessThan(before);
  });

  test('1 key sets zoom to 100%', async ({ page }) => {
    await page.keyboard.press('1');
    const zoom = await getVar(page, 'zoomLevel');
    expect(zoom).toBe(1);
  });

  test('0 key resets to fit zoom', async ({ page }) => {
    // Zoom in beyond fit level
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    await page.keyboard.press('+');
    const zoomed = await getVar(page, 'zoomLevel');

    // Reset to fit — resetFitZoom uses double rAF
    await page.keyboard.press('0');
    await page.waitForTimeout(200);
    const fit = await getVar(page, 'zoomLevel');
    // Fit zoom should be less than the zoomed-in level
    expect(fit).toBeLessThan(zoomed);
  });
});

test.describe('UI Elements', () => {
  test('help popup toggles on button click', async ({ page }) => {
    await page.goto('/');
    const popup = page.locator('#quickStartPopup');
    await expect(popup).not.toHaveClass(/show/);

    await page.locator('.quick-start-btn').click();
    await expect(popup).toHaveClass(/show/);

    await page.locator('.quick-start-close').click();
    await expect(popup).not.toHaveClass(/show/);
  });

  test('shortcuts panel toggles on K press', async ({ page }) => {
    await page.goto('/');
    const panel = page.locator('#shortcutsPanel');
    const backdrop = page.locator('#shortcutsBackdrop');

    await page.keyboard.press('k');
    await expect(panel).toHaveClass(/open/);
    await expect(backdrop).toHaveClass(/open/);

    await page.keyboard.press('k');
    await expect(panel).not.toHaveClass(/open/);
    await expect(backdrop).not.toHaveClass(/open/);
  });

  test('toast messages appear via showToast', async ({ page }) => {
    await page.goto('/');
    const toast = page.locator('#toast');

    await page.evaluate('showToast("Test message")');
    await expect(toast).toHaveClass(/visible/);
    await expect(toast).toHaveText('Test message');
  });

  test('reset button appears after loading and triggers confirm', async ({ page }) => {
    await page.goto('/');
    const resetBtn = page.locator('#resetBtn');
    await expect(resetBtn).toBeHidden();

    await loadImages(page, ['red.png', 'green.png']);
    await expect(resetBtn).toBeVisible();

    page.on('dialog', d => d.accept());
    await resetBtn.click();

    await expect(page.locator('#comparisonView')).not.toHaveClass(/active/);
  });
});

test.describe('Asset Info Bars', () => {
  test('display resolution after loading images', async ({ page }) => {
    await page.goto('/');
    await loadImages(page, ['red.png', 'green.png']);

    // In split mode, resolution elements exist for loaded assets.
    // Some layers may be display:none (e.g. layerOriginal with 2 files),
    // so check that at least 1 resolution element has text content.
    const resolutions = page.locator('.asset-resolution');
    const count = await resolutions.count();
    let withText = 0;
    for (let i = 0; i < count; i++) {
      const text = await resolutions.nth(i).textContent();
      if (text && text.trim().length > 0) withText++;
    }
    expect(withText).toBeGreaterThanOrEqual(2);
  });

  test('show correct resolution for each asset', async ({ page }) => {
    await page.goto('/');
    await loadImages(page, ['red.png', 'green.png']);

    const editARes = page.locator('#layerEditA .asset-resolution');
    await expect(editARes).toContainText('200');
    await expect(editARes).toContainText('150');

    const editBRes = page.locator('#layerEditB .asset-resolution');
    await expect(editBRes).toContainText('200');
    await expect(editBRes).toContainText('150');
  });

  test('show aspect ratio', async ({ page }) => {
    await page.goto('/');
    await loadImages(page, ['red.png', 'green.png']);

    const aspects = page.locator('.asset-aspect');
    const count = await aspects.count();
    let anyVisible = false;
    for (let i = 0; i < count; i++) {
      if (await aspects.nth(i).isVisible()) {
        anyVisible = true;
        const text = await aspects.nth(i).textContent();
        expect(text).toMatch(/\d+:\d+/);
      }
    }
    expect(anyVisible).toBe(true);
  });
});
