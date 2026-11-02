// Captures review screenshots of the finished game into ./shots
import { chromium } from '@playwright/test';
import { start } from './serve.js';
import fs from 'node:fs';

fs.rmSync('shots', { recursive: true, force: true });
fs.mkdirSync('shots', { recursive: true });
const server = await start(4174);
const URL = 'http://localhost:4174';
const browser = await chromium.launch();
const shot = (p, name) => p.screenshot({ path: `shots/${name}.png`, animations: 'disabled' });

// A populated location: bikes on every spot, staff, a few customers, some upgrades.
function setup([loc, matLevel, bikes]) {
  const g = window.__game.state, L = window.__game.layout;
  for (let i = 0; i <= loc; i++) g.locations[i].owned = true;
  g.activeLoc = loc;
  const l = g.locations[loc];
  const mat = {};
  for (const id of ['flooring', 'lighting', 'stands', 'art', 'windows', 'signage', 'couch', 'coffee', 'tv', 'kids', 'ac', 'restrooms', 'parking', 'landscaping', 'outdoor', 'fountain', 'chandelier', 'vip', 'sculpture', 'valet', 'champagne', 'rooftop', 'storage', 'serviceBay', 'detailBay', 'shelves', 'cameras', 'office']) mat[id] = matLevel;
  l.mat = mat;
  l.staff = { salesman: 2 + loc, receptionist: 1, marketing: 1, janitor: 1 + (loc > 1 ? 1 : 0), finance: 1, mechanic: 1 + (loc > 1 ? 1 : 0), detailer: 1, clerk: 1, guard: 1 };
  const now = Date.now();
  l.bikes = [];
  return window.__game.refreshWorld().then(() => {
    const spots = window.__game.layout().spots;
    const cap = Math.min(spots.length, [4, 6, 8, 10, 12][loc] + 2 * (mat.storage || 0));
    spots.slice(0, cap).forEach((s, k) => l.bikes.push({ uid: 1000 + k, model: bikes[k % bikes.length], spot: s.id, condition: 100, detailed: k % 2 === 0, paid: 1, at: 0, source: 'supplier', reserved: null }));
    l.sim = { nextArrival: now + 9e6, nextTradeIn: now + 9e6, customers: [], nextId: 50, piles: 1 };
    for (let k = 0; k < 4 + loc; k++) l.sim.customers.push({ id: 10 + k, budget: 1e6, brand: null, arrivedAt: now - 60000 - k * 5000, servedAt: k < 2 + loc ? now - 30000 : undefined, decideAt: now + 9e6, phase: k < 2 + loc ? 'browse' : 'queue', giveUpAt: now + 9e6, look: 1234567 * (k + 3) });
    return window.__game.refreshWorld();
  });
}

const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, timezoneId: 'America/New_York', hasTouch: true });
const sets = [
  [0, 0, ['ninja-125', 'yzf-r3', 'ninja-500', 'g310rr', 'rs457', 'cbr300r']],
  [1, 2, ['ninja-650', 'yzf-r7', 'cbr650r', 'zx-4rr', 'cbr500r', 'ninja-500', 'yzf-r3']],
  [2, 3, ['zx-6r', 'yzf-r9', 'cbr600rr', 'rs660', 'panigale-v2', 'yzf-r6', 'supersport-950']],
  [3, 4, ['yzf-r1', 'zx-10r', 's1000rr', 'rsv4-rr', 'panigale-v2s', 'zx-6r', 'cbr600rr']],
  [4, 6, ['ninja-h2', 'panigale-v4r', 'm1000rr', 'cbr1000rr-r', 'yzf-r1m', 'ninja-h2r', 's1000rr', 'yzf-r1']],
];
for (const set of sets) {
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date('2026-11-02T14:47:00-05:00') });
  await p.goto(URL + '/');
  await p.waitForSelector('body[data-ready]');
  await p.evaluate(setup, set);
  await p.evaluate(() => { const f = window.__game.layout().focus; window.__cam.lookAt(...[0, 0]); });
  await p.evaluate(() => { const L = window.__game.layout(); const [sx, sy] = window.__game.screenOf(...L.focus); const c = window.__cam.pos; window.__cam.lookAt((sx - c.x) / c.s, (sy - c.y) / c.s); });
  await p.clock.runFor(4000);
  await shot(p, `final-loc${set[0] + 1}`);
  if (set[0] === 4) {
    await p.evaluate(() => window.__cam.zoomTo(1));
    await p.clock.runFor(500);
    await shot(p, 'final-loc5-zoomed-out');
    await p.evaluate(() => window.__cam.zoomTo(3));
    await p.clock.runFor(500);
    await shot(p, 'final-loc5-zoomed-in');
  }
  await p.close();
}

// panels (fresh storage so there's no welcome-back popup)
const ctx2 = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, timezoneId: 'America/New_York', hasTouch: true });
const p = await ctx2.newPage();
await p.clock.install({ time: new Date('2026-11-02T20:10:00-05:00') });
await p.goto(URL + '/');
await p.waitForSelector('body[data-ready]');
await p.evaluate(() => { window.__game.state.cash = 180000; });
for (const [sel, name, after] of [['#btnStaff', 'staff'], ['#btnUpgrades', 'upgrades'], ['#btnMap', 'locations'], ['#btnChallenges', 'challenges'], ['#btnAch', 'achievements'], ['#btnSupplier', 'supplier']]) {
  await p.locator(sel).click();
  await p.clock.runFor(300);
  await shot(p, `final-${name}`);
  await p.locator('.m-x').click();
}
await p.clock.runFor(2500);
await shot(p, 'final-night');
// app icon on a home screen
const h = await browser.newPage({ viewport: { width: 420, height: 260 }, deviceScaleFactor: 2 });
await h.setContent(`<body style="margin:0;background:linear-gradient(135deg,#3b4b8f,#9b4fa8 60%,#e98a6a);display:flex;gap:28px;padding:40px;font:500 13px -apple-system,sans-serif;color:#fff">
  <div style="text-align:center"><img src="${URL}/assets/icons/icon-512.png" style="width:120px;border-radius:27px;box-shadow:0 8px 24px rgba(0,0,0,.35);image-rendering:pixelated"><div style="margin-top:8px">MotoAddict</div></div>
  <div style="text-align:center"><img src="${URL}/assets/icons/apple-touch-icon.png" style="width:60px;border-radius:13px;image-rendering:pixelated"><div style="margin-top:6px">MotoAddict</div></div></body>`);
await h.waitForTimeout(400);
await h.screenshot({ path: 'shots/final-app-icon.png' });
await browser.close();
server.close();
console.log('saved to shots/');
