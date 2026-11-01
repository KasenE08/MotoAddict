// Captures review screenshots into ./shots
import { chromium, devices } from '@playwright/test';
import { start } from './serve.js';
import fs from 'node:fs';

fs.mkdirSync('shots', { recursive: true });
const server = await start(4174);
const URL = 'http://localhost:4174';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, timezoneId: 'America/New_York', hasTouch: true });

async function game(time, prep) {
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date(time) });
  if (prep) await prep(p);
  await p.goto(URL + '/');
  await p.waitForSelector('body[data-ready]');
  await p.waitForTimeout(400);
  return p;
}

// 1. open, mid-afternoon
let p = await game('2026-11-02T14:47:00-05:00');
await p.clock.runFor(30_000);
await p.screenshot({ path: 'shots/game-open.png' });
await p.evaluate(() => window.__game.save());
await p.close();
// 2. welcome back after 2 days (offline cap)
p = await game('2026-11-04T16:00:00-05:00');
await p.screenshot({ path: 'shots/game-welcome-back.png' });
await p.getByRole('button', { name: 'Collect' }).click();
// 3. settings / save code
await p.locator('#btnSettings').click();
await p.waitForTimeout(250);
await p.screenshot({ path: 'shots/game-settings.png' });
await p.close();
// 4. night, closed
p = await game('2026-11-04T21:30:00-05:00');
await p.getByRole('button', { name: /OK|Collect/ }).click().catch(() => {});
await p.waitForTimeout(2200);
await p.screenshot({ path: 'shots/game-night-closed.png' });
await p.close();
// 5. portrait
const pp = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await pp.goto(URL + '/'); await pp.waitForSelector('body[data-ready]');
await pp.screenshot({ path: 'shots/game-portrait.png' });

await browser.close();
server.close();
console.log('saved to shots/');
