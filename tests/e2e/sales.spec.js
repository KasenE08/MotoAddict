import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });
const T0 = '2026-11-02T10:00:00-05:00';

async function boot(page, time = T0) {
  await page.clock.install({ time: new Date(time) });
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
}
function stock() {
  const g = window.__game.state;
  ['ninja-125', 'yzf-r3', 'ninja-500', 'g310rr'].forEach((m, k) => g.locations[0].bikes.push({ uid: 100 + k, model: m, spot: ['F', 'B2', 'B3', 'B1'][k], condition: 100, detailed: false, paid: 3000, at: 0, source: 'supplier', reserved: null }));
  return window.__game.refreshWorld();
}
function haggler([offer, seed]) {
  const g = window.__game.state, now = Date.now();
  g.rng = seed;
  g.locations[0].sim = { nextArrival: now + 3600e3, nextTradeIn: null, customers: [], nextId: 50 };
  const b = g.locations[0].bikes.find((x) => x.model === 'yzf-r3');
  b.reserved = 7;
  g.locations[0].sim.customers.push({ id: 7, budget: 9000, brand: null, arrivedAt: now - 60000, servedAt: now - 30000, phase: 'haggle', bikeUid: b.uid, offer, list: 5499, deadline: now + 25000, round: 1, look: 3 });
}
const S = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__game.state)));

test('a served customer buys a bike live: cash, today total, freed spot', async ({ page }) => {
  await boot(page);
  await page.evaluate(stock);
  let sold = false;
  for (let seed = 1; seed < 60 && !sold; seed++) {
    await page.evaluate((sd) => {
      const g = window.__game.state, now = Date.now();
      g.rng = sd;
      g.locations[0].sim = { nextArrival: now + 3600e3, nextTradeIn: null, customers: [{ id: 1, budget: 8000, brand: null, arrivedAt: now - 30000, servedAt: now - 20000, decideAt: now + 300, phase: 'browse', look: 9, giveUpAt: now }], nextId: 2 };
    }, seed);
    await page.clock.runFor(800);
    sold = (await S(page)).stats.bikesSold > 0;
  }
  expect(sold).toBe(true);
  const st = await S(page);
  expect(st.locations[0].bikes).toHaveLength(3);
  expect(st.cash).toBeGreaterThan(20000 + 4000);
  await expect(page.locator('#rate')).toContainText('today +$');
  await expect(page.locator('#capTxt')).toHaveText('3/4');
});

test('haggle panel: accept sells at their offer', async ({ page }) => {
  await boot(page);
  await page.evaluate(stock);
  await page.evaluate(haggler, [4500, 1]);
  await page.clock.runFor(400);
  await expect(page.locator('#haggle')).toBeVisible();
  await expect(page.locator('#haggle')).toContainText('Customer offers $4,500 for the YZF-R3');
  await page.getByRole('button', { name: 'Accept $4,500' }).click();
  await expect(page.locator('.toast')).toHaveText('Sold for $4,500!');
  await expect(page.locator('#haggle')).toBeHidden();
  const st = await S(page);
  expect(st.locations[0].bikes.find((b) => b.model === 'yzf-r3')).toBeUndefined();
  expect(st.stats.bikesSold).toBe(1);
});

test('haggle panel: counter and refuse resolve (sold / last offer / walk out)', async ({ page }) => {
  await boot(page);
  await page.evaluate(stock);
  const outcomes = new Set();
  for (let seed = 1; seed < 25 && outcomes.size < 3; seed++) {
    await page.evaluate(() => { const b = window.__game.state.locations[0].bikes.find((x) => x.model === 'yzf-r3'); if (!b) window.__game.state.locations[0].bikes.push({ uid: 500 + Math.floor(Math.random() * 1e6), model: 'yzf-r3', spot: 'B2', condition: 100, detailed: false, paid: 1, at: 0, source: 'supplier', reserved: null }); });
    await page.evaluate(haggler, [4500, seed]);
    await page.clock.runFor(300);
    await page.getByRole('button', { name: /Counter \$5,000/ }).click();
    const msg = await page.locator('.toast').textContent();
    if (/Sold for \$5,000/.test(msg)) outcomes.add('sold');
    if (/came back with \$4,750/.test(msg)) {
      outcomes.add('last');
      await expect(page.locator('#haggle')).toContainText('Last offer!');
      await page.getByRole('button', { name: 'No deal' }).click();
      await expect(page.locator('.toast')).toHaveText('They walked out.');
    }
    if (/walked out/.test(msg)) outcomes.add('walked');
  }
  expect([...outcomes].sort()).toEqual(['last', 'sold', 'walked']);
});

test('ignoring a haggle: the customer walks out when the timer runs out', async ({ page }) => {
  await boot(page);
  await page.evaluate(stock);
  await page.evaluate(haggler, [4500, 1]);
  await page.clock.runFor(400);
  await expect(page.locator('#haggle')).toBeVisible();
  await page.clock.runFor(26000);
  await expect(page.locator('#haggle')).toBeHidden();
  const st = await S(page);
  expect(st.locations[0].bikes.find((b) => b.model === 'yzf-r3').reserved).toBeNull();
  expect(st.stats.walkouts).toBeGreaterThanOrEqual(1);
});

test('trade-in offer: card appears, buying puts a used bike on display', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { window.__game.state.tradeIn = { loc: 0, model: 'yzf-r7', condition: 72, cost: 4280, at: Date.now(), expiresAt: Date.now() + 180000 }; });
  await page.clock.runFor(400);
  await expect(page.locator('#tradein')).toBeVisible();
  await expect(page.locator('#tradein')).toContainText('YZF-R7 · 72%');
  await page.locator('#tradein').click();
  await expect(page.locator('.modal')).toContainText('Resale value now');
  await page.getByRole('button', { name: 'Buy for $4,280' }).click();
  await expect(page.locator('.toast')).toHaveText('YZF-R7 added to your showroom');
  const st = await S(page);
  expect(st.cash).toBeCloseTo(20000 - 4280, -1);
  expect(st.locations[0].bikes[0]).toMatchObject({ model: 'yzf-r7', source: 'tradein', condition: 72 });
  expect(st.stats.tradeIns).toBe(1);
  await expect(page.locator('#tradein')).toBeHidden();
  // shows as used with its resale price in the showroom
  await page.locator('#btnShowroom').click();
  await expect(page.locator('.spot .used')).toHaveText('used');
});

test('trade-in offers expire', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { window.__game.state.tradeIn = { loc: 0, model: 'yzf-r7', condition: 72, cost: 4280, at: Date.now(), expiresAt: Date.now() + 5000 }; });
  await page.clock.runFor(400);
  await expect(page.locator('#tradein')).toBeVisible();
  await page.clock.runFor(6000);
  await expect(page.locator('#tradein')).toBeHidden();
});

test('welcome back: summary of sales, gear and auto-accepted haggles while away', async ({ page, context }) => {
  await boot(page);
  await page.evaluate(stock);
  await page.evaluate(() => { window.__game.state.rng = 99; window.__game.save(); });
  await page.close();
  const p2 = await context.newPage();
  await p2.clock.install({ time: new Date('2026-11-02T17:00:00-05:00') });
  await p2.goto('/');
  await p2.waitForSelector('body[data-ready]');
  await expect(p2.locator('.welcome')).toBeVisible();
  await expect(p2.locator('.welcome')).toContainText(/Sold \d bikes?/);
  const st = await p2.evaluate(() => window.__game.state.stats);
  expect(st.bikesSold).toBeGreaterThan(0);
  expect(st.customers).toBeGreaterThan(5);
});

test('people are drawn in the showroom while customers are inside', async ({ page }) => {
  await boot(page);
  await page.evaluate(stock);
  await page.evaluate(() => {
    const g = window.__game.state, now = Date.now();
    g.locations[0].sim = { nextArrival: now + 3600e3, nextTradeIn: null, customers: [{ id: 1, budget: 8000, brand: null, arrivedAt: now - 30000, servedAt: now - 20000, decideAt: now + 600000, phase: 'browse', look: 9, giveUpAt: now }], nextId: 2 };
  });
  await page.clock.runFor(1000);
  const painted = await page.evaluate(() => {
    const c = document.getElementById('peopleIn'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
    return n;
  });
  expect(painted).toBeGreaterThan(100);
});
