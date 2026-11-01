// Captures review screenshots into ./shots
import { chromium } from '@playwright/test';
import { start } from './serve.js';
import fs from 'node:fs';

fs.rmSync('shots', { recursive: true, force: true });
fs.mkdirSync('shots', { recursive: true });
const server = await start(4174);
const URL = 'http://localhost:4174';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, timezoneId: 'America/New_York', hasTouch: true });
const p = await ctx.newPage();
await p.clock.install({ time: new Date('2026-11-02T10:00:00-05:00') });
await p.goto(URL + '/');
await p.waitForSelector('body[data-ready]');

// supplier: browse + order 4 entry-level bikes
await p.locator('#btnSupplier').click();
await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/p3-1-supplier.png' });
for (const id of ['g310rr', 'ninja-125', 'yzf-r3', 'ninja-500']) await p.locator(`button.order[data-id="${id}"]`).click();
await p.locator('.chip[data-brand="Kawasaki"]').click();
await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/p3-2-supplier-kawasaki-ordered.png' });
await p.locator('.m-x').click();
await p.waitForTimeout(200);
await p.screenshot({ path: 'shots/p3-3-hud-deliveries-pending.png' });
// overnight delivery
await p.clock.setFixedTime(new Date('2026-11-03T02:00:20-05:00'));
await p.waitForTimeout(2600);
await p.screenshot({ path: 'shots/p3-4-truck-arrived-night.png' });
// arrange while closed
await p.locator('#btnShowroom').click();
await p.locator('.spot').nth(1).click();
await p.waitForTimeout(200);
await p.screenshot({ path: 'shots/p3-5-arrange.png' });
await p.locator('.spot').nth(0).click();
await p.locator('.m-x').click();
// next morning, open for business
await p.clock.setFixedTime(new Date('2026-11-03T09:30:00-05:00'));
await p.waitForTimeout(2600);
await p.screenshot({ path: 'shots/p3-6-showroom-open.png' });
// zoomed in on the turntable
await p.evaluate(() => { window.__cam.zoomTo(4); window.__cam.lookAt(452 + 1.2 * 12, 144 + 11.2 * 6 - 8); });
await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/p3-7-zoomed-in.png' });
await p.evaluate(() => window.__cam.zoomTo(1));
await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/p3-8-zoomed-out.png' });
// bike details
await p.evaluate(() => window.__cam.zoomTo(2));
await p.evaluate(() => window.__cam.lookAt(452 + 1.2 * 12 + 40, 144 + 11.2 * 6));
const pos = await p.evaluate(() => window.__cam.pos);
await p.mouse.click(pos.x + (452 + 1.2 * 12) * pos.s, pos.y + (144 + 11.2 * 6 - 6) * pos.s);
await p.waitForTimeout(400);
await p.screenshot({ path: 'shots/p3-9-bike-card.png' });

// full roster page
const r = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await r.goto(URL + '/preview/roster.html');
await r.waitForSelector('body[data-ready]');
await r.screenshot({ path: 'shots/p3-0-roster.png', fullPage: true });
await browser.close();
server.close();
console.log('saved to shots/');
