import { test, expect } from '@playwright/test';

test('art style preview renders all 5 styles without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/preview/');
  await page.waitForSelector('body[data-ready]');
  await expect(page.locator('section.style')).toHaveCount(5);
  for (let i = 1; i <= 5; i++) {
    const sec = page.locator(`#style-${i}`);
    await expect(sec.locator('.phone .scene > *')).toHaveCount(1);
    await expect(sec.locator('.bc-specs')).toContainText('998');
    await expect(sec.locator('.bc-specs')).toContainText('228');
    await expect(sec.locator('.appicon.big > *')).toHaveCount(1);
    await expect(sec.locator('.haggle')).toBeVisible();
    await expect(sec.locator('.tab')).toHaveCount(5);
  }
  expect(errors).toEqual([]);
});

test('no horizontal scroll at phone width', async ({ page }) => {
  await page.goto('/preview/');
  await page.waitForSelector('body[data-ready]');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('landing page links to both previews', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /pixel style/i }).click();
  await expect(page).toHaveURL(/preview\/pixel/);
  await page.goto('/');
  await page.getByRole('link', { name: /5 original/i }).click();
  await expect(page).toHaveURL(/preview\/$/);
});

test('chosen pixel style: landscape iso dealership + 3D H2 card render', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/preview/pixel/');
  await page.waitForSelector('body[data-ready]');
  // world canvas is drawn at half resolution and has real pixels in it
  const info = await page.evaluate(() => {
    const c = document.querySelector('canvas.world');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const colors = new Set();
    for (let i = 0; i < d.length; i += 4 * 37) colors.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return { w: c.width, h: c.height, colors: colors.size };
  });
  expect(info).toMatchObject({ w: 422, h: 195 });
  expect(info.colors).toBeGreaterThan(20);
  await expect(page.locator('.topbar .cash')).toContainText('$128,450');
  await expect(page.locator('.clock')).toContainText('OPEN');
  await expect(page.locator('.bl .bb, .br .bb')).toHaveCount(3);
  await expect(page.locator('.rcol .tb')).toHaveCount(4);
  // landscape phone: HUD stays inside the 844x390 screen
  const box = await page.locator('.topbar').evaluate((el) => ({ w: el.scrollWidth, cw: el.clientWidth }));
  expect(box.w).toBeLessThanOrEqual(box.cw);
  await expect(page.locator('#card .sp')).toContainText('998');
  await expect(page.locator('#card .sp')).toContainText('228');
  await expect(page.locator('#card')).toContainText('$32,700');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
