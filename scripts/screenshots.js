// Captures review screenshots into ./shots (latest phase).
import { chromium } from '@playwright/test';
import { start } from './serve.js';
import fs from 'node:fs';

fs.rmSync('shots', { recursive: true, force: true });
fs.mkdirSync('shots', { recursive: true });
const server = await start(4174);
const URL = 'http://localhost:4174';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, timezoneId: 'America/New_York', hasTouch: true });
const shot = (p, name) => p.screenshot({ path: `shots/${name}.png`, animations: 'disabled' });
const stock = () => {
  const g = window.__game.state;
  ['ninja-125', 'yzf-r3', 'ninja-500'].forEach((m, k) => g.locations[0].bikes.push({ uid: 100 + k, model: m, spot: ['F', 'B2', 'B3', 'B1'][k], condition: 100, detailed: false, paid: 3000, at: 0, source: 'supplier', reserved: null }));
  g.rng = 2024;
  return window.__game.refreshWorld();
};

const p = await ctx.newPage();
await p.clock.install({ time: new Date('2026-11-02T11:20:00-05:00') });
await p.goto(URL + '/');
await p.waitForSelector('body[data-ready]');
await p.evaluate(stock);
// a busy moment: someone browsing with you, one waiting, one walking in, one haggling
await p.evaluate(() => {
  const g = window.__game.state, now = Date.now(), s = (g.locations[0].sim = { nextArrival: now + 3600e3, nextTradeIn: now + 3600e3, customers: [], nextId: 10 });
  const r3 = g.locations[0].bikes.find((b) => b.model === 'yzf-r3');
  r3.reserved = 1;
  s.customers.push({ id: 1, budget: 9000, brand: null, arrivedAt: now - 90000, servedAt: now - 60000, phase: 'haggle', bikeUid: r3.uid, offer: 4900, list: 5499, deadline: now + 22000, round: 1, look: 1234567 });
  s.customers.push({ id: 2, budget: 6000, brand: null, arrivedAt: now - 70000, servedAt: now - 40000, decideAt: now + 9e5, phase: 'browse', look: 7654321 });
  s.customers.push({ id: 3, budget: 7000, brand: null, arrivedAt: now - 20000, phase: 'queue', giveUpAt: now + 3e5, look: 42424242 });
  s.customers.push({ id: 4, budget: 7000, brand: null, arrivedAt: now - 1200, phase: 'queue', giveUpAt: now + 3e5, look: 99887766 });
  g.today.earned = 6850; g.today.key = '2026-11-02';
  g.tradeIn = { loc: 0, model: 'yzf-r7', condition: 72, cost: 4280, at: now, expiresAt: now + 161000 };
});
await p.clock.runFor(2500);
await shot(p, 'p4-1-customers-haggle');
await p.evaluate(() => window.__cam.zoomTo(3));
await p.clock.runFor(300);
await shot(p, 'p4-2-zoomed-customers');
await p.evaluate(() => window.__cam.zoomTo(2));
await p.getByRole('button', { name: /Counter/ }).click();
await p.clock.runFor(300);
await shot(p, 'p4-3-after-counter');
await p.locator('#tradein').click();
await p.clock.runFor(300);
await shot(p, 'p4-4-tradein-offer');
await p.getByRole('button', { name: /Buy for/ }).click();
await p.clock.runFor(400);
await p.locator('#btnShowroom').click();
await p.clock.runFor(300);
await shot(p, 'p4-5-showroom-with-tradein');
await p.locator('.m-x').click();
await p.evaluate(() => window.__game.save());
await p.close();

// welcome back after a day away
const q = await ctx.newPage();
await q.clock.install({ time: new Date('2026-11-03T13:30:00-05:00') });
await q.goto(URL + '/');
await q.waitForSelector('body[data-ready]');
await q.clock.runFor(300);
await shot(q, 'p4-6-welcome-back');
await browser.close();
server.close();
console.log('saved to shots/');
