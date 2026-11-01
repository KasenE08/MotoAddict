import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

const boot = async (page, time) => {
  await page.clock.install({ time: new Date(time) });
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
};
const S = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__game.state)));

test('order from the supplier, truck arrives overnight, bikes appear on display', async ({ page }) => {
  await boot(page, '2026-11-02T10:00:00-05:00');
  await expect(page.locator('#capTxt')).toHaveText('0/4');
  await page.locator('#btnSupplier').click();
  await expect(page.locator('.card')).toHaveCount(31);
  // locked bikes can't be ordered at Location 1
  await expect(page.locator('.card[data-id="ninja-h2"] .lock')).toHaveText('Unlocks at Location 5');
  await page.locator('button.order[data-id="yzf-r3"]').click();
  await page.locator('button.order[data-id="ninja-500"]').click();
  await expect(page.locator('.ord')).toHaveCount(2);
  await expect(page.locator('.ord em').first()).toContainText('tonight, 2 AM');
  expect((await S(page)).cash).toBeCloseTo(20000 - 4399 - 4319, -1); // plus a few cents of income
  // brand filter
  await page.locator('.chip[data-brand="Ducati"]').click();
  await expect(page.locator('.card')).toHaveCount(4);
  await page.locator('.m-x').click();
  await expect(page.locator('#deliv')).toBeVisible();
  await expect(page.locator('#delivN')).toHaveText('2 bikes');

  await page.clock.setFixedTime(new Date('2026-11-03T02:00:30-05:00'));
  await expect(page.locator('#capTxt')).toHaveText('2/4');
  await expect(page.locator('.toast')).toContainText('Supplier truck arrived: 2 bikes');
  await expect(page.locator('#deliv')).toBeHidden();
  const st = await S(page);
  expect(st.locations[0].bikes.map((b) => b.model).sort()).toEqual(['ninja-500', 'yzf-r3']);
});

test('arranging: blocked while open, works while closed', async ({ page }) => {
  await boot(page, '2026-11-02T10:00:00-05:00');
  await page.evaluate(async () => {
    const g = window.__game.state;
    g.locations[0].bikes.push({ uid: 900, model: 'yzf-r3', spot: 'F', condition: 100, detailed: false, paid: 1, at: 0 }, { uid: 901, model: 'ninja-500', spot: 'B2', condition: 100, detailed: false, paid: 1, at: 0 });
    await window.__game.refreshWorld();
  });
  await page.locator('#btnShowroom').click();
  await expect(page.locator('.sr-top .note')).toContainText('after closing');
  await page.locator('.spot[data-uid="900"]').click();
  await expect(page.locator('.bikecard')).toBeVisible(); // open hours: tapping shows details instead
  await page.locator('.m-x').click();

  await page.clock.setFixedTime(new Date('2026-11-02T19:00:00-05:00'));
  await page.waitForTimeout(400);
  await page.locator('#btnShowroom').click();
  await page.locator('.spot[data-uid="900"]').click();
  await expect(page.locator('.spot.sel')).toHaveCount(1);
  await page.locator('.spot[data-spot="B3"]').click();
  await expect(page.locator('.toast').last()).toHaveText('Bike moved');
  expect((await S(page)).locations[0].bikes.find((b) => b.uid === 900).spot).toBe('B3');
});

test('tapping a bike in the world opens its details card', async ({ page }) => {
  await boot(page, '2026-11-02T10:00:00-05:00');
  await page.evaluate(async () => {
    window.__game.state.locations[0].bikes.push({ uid: 7, model: 'rs457', spot: 'F', condition: 100, detailed: false, paid: 5439, at: 0 });
    await window.__game.refreshWorld();
  });
  // the turntable spot is in the middle of the opening view
  const pos = await page.evaluate(() => { const c = window.__cam.pos; return { x: c.x, y: c.y, s: c.s }; });
  const [mx, my] = await page.evaluate(() => [452 + (6.2 - 5.0) * 12, 144 + (11.2) * 6 - 6]);
  await page.mouse.click(pos.x + mx * pos.s, pos.y + my * pos.s);
  await expect(page.locator('.bikecard')).toBeVisible();
  await expect(page.locator('.bikecard')).toContainText('RS 457');
  await expect(page.locator('.bikecard')).toContainText('$6,799');
});

test('pinch to zoom (settles on a crisp whole-number scale)', async ({ page }) => {
  await boot(page, '2026-11-02T10:00:00-05:00');
  expect((await page.evaluate(() => window.__cam.pos)).s).toBe(2);
  const pinch = (from, to) => page.evaluate(([a, b]) => {
    const vp = document.getElementById('viewport');
    const ev = (type, id, x, y) => vp.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: 'touch' }));
    ev('pointerdown', 1, 422 - a, 195); ev('pointerdown', 2, 422 + a, 195);
    for (let k = 1; k <= 5; k++) { const d = a + ((b - a) * k) / 5; ev('pointermove', 1, 422 - d, 195); ev('pointermove', 2, 422 + d, 195); }
    ev('pointerup', 1, 422 - b, 195); ev('pointerup', 2, 422 + b, 195);
  }, [from, to]);
  await pinch(50, 85); // spread fingers: zoom in 1.7x -> settles at 3
  await page.waitForTimeout(250);
  expect((await page.evaluate(() => window.__cam.pos)).s).toBe(3);
  await pinch(120, 40); // pinch in hard -> settles at the most zoomed-out view
  await page.waitForTimeout(250);
  const s = (await page.evaluate(() => window.__cam.pos)).s;
  expect(s).toBeLessThan(2);
  expect(s).toBeGreaterThanOrEqual(1);
});

test('old Phase 2 saves still load (save format v1 -> v2)', async ({ page }) => {
  const json = JSON.stringify({ v: 1, createdAt: 1, lastTick: new Date('2026-11-02T10:00:00-05:00').getTime(), cash: 12345, activeLoc: 0, locations: [{ id: 1, owned: true, earned: 0 }], offlineCapHours: 4, stats: {}, today: {}, settings: {} });
  let h = 0x811c9dc5; for (let i = 0; i < json.length; i++) { h ^= json.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  const code = `MOTO1.1.${Buffer.from(json).toString('base64url')}.${(h >>> 0).toString(16).padStart(8, '0')}`;
  await page.addInitScript((c) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('motoaddict.save', c); sessionStorage.setItem('seeded', '1'); } }, code);
  await boot(page, '2026-11-02T10:00:00-05:00');
  await expect(page.locator('#cash')).toHaveText('$12,345');
  await expect(page.locator('#capTxt')).toHaveText('0/4');
});
