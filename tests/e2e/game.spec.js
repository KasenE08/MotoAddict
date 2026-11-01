import { test, expect } from '@playwright/test';

// The game is landscape-only; test at iPhone 14 landscape size.
test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

const boot = async (page, time) => {
  await page.clock.install({ time: new Date(time) });
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
};
const cash = (page) => page.evaluate(() => window.__game.state.cash);

test('earns passive income during open hours, shown live in the HUD', async ({ page }) => {
  await boot(page, '2026-11-02T10:00:00-05:00');
  await expect(page.locator('#openTag')).toHaveText('OPEN');
  await expect(page.locator('#cash')).toHaveText('$20,000');
  await expect(page.locator('#rate')).toHaveText('+$10/min');
  await page.clock.runFor(60_000);
  expect(await cash(page)).toBeCloseTo(20010, 0);
  await expect(page.locator('#cash')).toHaveText('$20,010');
});

test('earns nothing while closed, and the clock shows CLOSED', async ({ page }) => {
  await boot(page, '2026-11-02T20:00:00-05:00');
  await expect(page.locator('#openTag')).toContainText('CLOSED');
  await expect(page.locator('#rate')).toHaveText('closed');
  await page.clock.runFor(10 * 60_000);
  expect(await cash(page)).toBe(20000);
  // night tint is on
  expect(Number(await page.locator('#night').evaluate((e) => e.style.opacity))).toBeGreaterThan(0.5);
});

test('opens at 9:00 and closes at 18:00 on the real clock', async ({ page }) => {
  await boot(page, '2026-11-02T08:59:30-05:00');
  await expect(page.locator('#openTag')).toContainText('CLOSED');
  await page.clock.runFor(60_000);
  await expect(page.locator('#openTag')).toHaveText('OPEN');
  await page.clock.setFixedTime(new Date('2026-11-02T18:00:05-05:00'));
  await page.clock.runFor(1000).catch(() => {});
  await expect(page.locator('#openTag')).toContainText('CLOSED');
});

test('autosaves and shows offline earnings (capped at 4 open hours) on return', async ({ page, context }) => {
  await boot(page, '2026-11-02T09:00:00-05:00');
  await page.evaluate(() => window.__game.save());
  // come back 2 days later: 18+ open hours passed, only 4 count
  const page2 = await context.newPage();
  await page.close();
  await page2.clock.install({ time: new Date('2026-11-04T12:00:00-05:00') });
  await page2.goto('/');
  await page2.waitForSelector('body[data-ready]');
  await expect(page2.locator('.welcome')).toBeVisible();
  await expect(page2.locator('.welcome .big')).toHaveText('$2,400');
  await expect(page2.locator('.welcome')).toContainText('offline cap: 4h');
  await page2.getByRole('button', { name: 'Collect' }).click();
  await expect(page2.locator('#cash')).toHaveText('$22,400');
});

test('pauses when the app is hidden and catches up as offline time', async ({ page }) => {
  await boot(page, '2026-11-02T09:00:00-05:00');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.setFixedTime(new Date('2026-11-02T17:00:00-05:00'));
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('.welcome .big')).toHaveText('$2,400');
});

test('save code: export, then import on a fresh game', async ({ page, context }) => {
  await boot(page, '2026-11-02T10:00:00-05:00');
  await page.evaluate(() => { window.__game.state.cash = 98765; });
  await page.locator('#btnSettings').click();
  const code = await page.locator('#exportCode').inputValue();
  expect(code).toMatch(/^MOTO1\.2\./);

  await page.evaluate(() => localStorage.clear());
  const fresh = await context.newPage();
  await fresh.clock.install({ time: new Date('2026-11-02T10:00:00-05:00') });
  await fresh.goto('/');
  await fresh.waitForSelector('body[data-ready]');
  await expect(fresh.locator('#cash')).toHaveText('$20,000');
  await fresh.locator('#btnSettings').click();
  await fresh.locator('#importCode').fill('not a save');
  await fresh.locator('#loadCode').click();
  await expect(fresh.locator('#importErr')).toContainText("doesn't look like");
  fresh.once('dialog', (d) => d.accept());
  await fresh.locator('#importCode').fill(code);
  await fresh.locator('#loadCode').click();
  await expect(fresh.locator('#cash')).toHaveText('$98,765');
});

test('drag pans the dealership map', async ({ page }) => {
  await boot(page, '2026-11-02T10:00:00-05:00');
  const before = await page.evaluate(() => window.__cam.pos);
  await page.mouse.move(420, 200);
  await page.mouse.down();
  await page.mouse.move(250, 120, { steps: 5 });
  await page.mouse.up();
  const after = await page.evaluate(() => window.__cam.pos);
  expect(after.x).toBeLessThan(before.x);
  expect(after.y).toBeLessThan(before.y);
});

test('portrait shows the rotate-your-phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page, '2026-11-02T10:00:00-05:00');
  await expect(page.locator('#rotate')).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#rotate')).toBeHidden();
});

test('no console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await boot(page, '2026-11-02T10:00:00-05:00');
  await page.locator('#btnSettings').click();
  expect(errors).toEqual([]);
});
