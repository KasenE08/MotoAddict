// Captures review screenshots of the preview page into ./shots
import { chromium, devices } from '@playwright/test';
import { start } from './serve.js';
import fs from 'node:fs';

fs.mkdirSync('shots', { recursive: true });
const server = await start(4174);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:4174/preview/');
await page.waitForSelector('body[data-ready]');
await page.waitForTimeout(300);
for (let i = 1; i <= 5; i++) await page.locator(`#style-${i}`).screenshot({ path: `shots/style-${i}.png` });
const phone = await browser.newPage({ ...devices['iPhone 14'] });
await phone.goto('http://localhost:4174/preview/');
await phone.waitForSelector('body[data-ready]');
await phone.screenshot({ path: 'shots/iphone-top.png' });
await browser.close();
server.close();
console.log('saved to shots/');
