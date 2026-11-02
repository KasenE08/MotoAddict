import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });
const DAY = '2026-11-02T11:00:00-05:00', NIGHT = '2026-11-02T20:00:00-05:00';
async function boot(page, time = DAY, cash = 0) {
  await page.clock.install({ time: new Date(time) });
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
  if (cash) await page.evaluate((c) => { window.__game.state.cash = c; }, cash);
}
const S = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__game.state)));

test('staff: hire, see wages, upgrade the role, fire', async ({ page }) => {
  await boot(page, DAY, 50000);
  await page.locator('#btnStaff').click();
  const role = page.locator('.role', { hasText: 'Salesman' });
  await expect(role).toContainText('0/2 hired');
  await role.getByRole('button', { name: 'Hire' }).click();
  await expect(role).toContainText('1/2 hired');
  await expect(page.locator('.staff .sup-top')).toContainText('Daily wages here $180');
  await role.getByRole('button', { name: /Upgrade/ }).click();
  await expect(role).toContainText('level 2/5');
  let st = await S(page);
  expect(st.locations[0].staff.salesman).toBe(1);
  expect([46100, 47100]).toContain(st.cash); // fee + upgrade (+ First Hire reward once the tick runs)
  await role.getByRole('button', { name: 'Fire' }).click();
  st = await S(page);
  expect(st.locations[0].staff.salesman).toBe(0);
});

test('achievements: First Hire unlocks with a toast and shows in the list', async ({ page }) => {
  await boot(page, DAY, 50000);
  await page.locator('#btnStaff').click();
  await page.locator('.role', { hasText: 'Janitor' }).getByRole('button', { name: 'Hire' }).click();
  await page.locator('.m-x').click();
  await page.clock.runFor(600);
  await expect(page.getByText('Achievement: First Hire! +$1,000')).toBeVisible({ timeout: 8000 });
  await page.locator('#btnAch').click();
  await expect(page.locator('.ach.got')).toContainText('First Hire');
  await expect(page.locator('.m-head')).toContainText(/Achievements \d+\/\d+/);
});

test('material upgrades only after hours; company upgrades any time', async ({ page }) => {
  await boot(page, DAY, 100000);
  await page.locator('#btnUpgrades').click();
  await expect(page.locator('.upg .hint')).toContainText('after hours');
  await expect(page.locator('button[data-buy="flooring"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Company-wide' }).click();
  await page.locator('button[data-glob="negotiation"]').click();
  expect((await S(page)).glob.negotiation).toBe(1);
  await page.locator('.m-x').click();

  await page.clock.setFixedTime(new Date(NIGHT));
  await page.waitForTimeout(400);
  await page.locator('#btnUpgrades').click();
  await page.locator('button[data-buy="flooring"]').click();
  await page.locator('.chip[data-cat="Functional"]').click();
  await page.locator('button[data-buy="storage"]').click();
  const st = await S(page);
  expect(st.locations[0].mat).toMatchObject({ flooring: 1, storage: 1 });
  await page.locator('.m-x').click();
  await expect(page.locator('#capTxt')).toHaveText('0/6');
});

test('locations: buy Location 2, it becomes active with its own look; switch back', async ({ page }) => {
  await boot(page, DAY, 200000);
  const w1 = await page.evaluate(() => document.getElementById('world').width);
  await page.locator('#btnMap').click();
  page.once('dialog', (d) => d.accept());
  await page.locator('button[data-buy="1"]').click();
  await expect(page.locator('#locName')).toHaveText('Millbrook');
  await expect(page.locator('#capTxt')).toHaveText('0/6');
  const w2 = await page.evaluate(() => document.getElementById('world').width);
  expect(w2).toBeGreaterThan(w1); // bigger lot
  await page.locator('#btnMap').click();
  await page.locator('button[data-go="0"]').click();
  await expect(page.locator('#locName')).toHaveText('Rust Row');
  const st = await S(page);
  expect(st.locations[1].owned).toBe(true);
  expect(st.activeLoc).toBe(0);
});

test('daily challenges: three per day, claim the reward', async ({ page }) => {
  await boot(page, DAY, 50000);
  await page.evaluate(() => {
    const g = window.__game.state;
    g.challenges.list[0] = { type: 'hire', goal: 1, reward: 1234, claimed: false };
  });
  await page.locator('#btnChallenges').click();
  await expect(page.locator('.chal')).toHaveCount(3);
  await expect(page.locator('.chal').first()).toContainText('Hire an employee');
  await page.locator('.m-x').click();
  await page.evaluate(() => window.__game.G.state.locations[0].staff.janitor = 1);
  await page.evaluate(() => { window.__game.state.stats.hires++; });
  await page.clock.runFor(400);
  await expect(page.locator('#chBadge')).toHaveText('1');
  await page.locator('#btnChallenges').click();
  const cash = (await S(page)).cash;
  await page.getByRole('button', { name: 'Claim $1,234' }).click();
  expect((await S(page)).cash).toBeGreaterThanOrEqual(cash + 1234);
});

test('staff and trash show up in the world', async ({ page }) => {
  await boot(page, DAY, 50000);
  await page.evaluate(() => {
    const g = window.__game.state;
    Object.assign(g.locations[0].staff, { salesman: 2, janitor: 1, mechanic: 1, receptionist: 1 });
    g.locations[0].sim = { ...(g.locations[0].sim || {}), customers: [], piles: 3, nextArrival: Date.now() + 9e6, nextTradeIn: Date.now() + 9e6, nextId: 1 };
  });
  await page.clock.runFor(1000);
  const painted = await page.evaluate(() => { const c = document.getElementById('peopleIn'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
  expect(painted).toBeGreaterThan(600);
});

test('sound: files load, toggle in settings', async ({ page }) => {
  await boot(page);
  const ok = await page.evaluate(async () => (await Promise.all(['click', 'cash1', 'engine-rev', 'truck', 'ui-achievement'].map((f) => fetch(`assets/sfx/${f}.mp3`).then((r) => r.ok && r.headers.get('content-type') === 'audio/mpeg')))).every(Boolean));
  expect(ok).toBe(true);
  await page.locator('#btnSettings').click();
  await page.locator('#sndBtn').click();
  expect((await S(page)).settings.sound).toBe(false);
  await expect(page.locator('#sndBtn')).toContainText('Off');
});

test('first launch shows brief tips once', async ({ page }) => {
  await page.goto('/?tips');
  await page.waitForSelector('body[data-ready]');
  await expect(page.locator('.tips')).toContainText('Welcome to MotoAddict!');
  await page.getByRole('button', { name: "Let's go!" }).click();
  await page.reload();
  await page.waitForSelector('body[data-ready]');
  await expect(page.locator('.tips')).toHaveCount(0);
});

test('installable PWA that plays offline', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForSelector('body[data-ready]');
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  expect(manifest).toMatchObject({ display: 'fullscreen', orientation: 'landscape' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('body[data-ready]', { timeout: 15000 });
  await expect(page.locator('#cash')).toBeVisible();
  await context.setOffline(false);
});
