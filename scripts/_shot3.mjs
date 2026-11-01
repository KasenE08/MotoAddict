import { chromium } from '@playwright/test';
const [,, url, out] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:4173/' + url); await p.waitForSelector('body[data-ready]'); await p.waitForTimeout(300);
await p.locator('.phone').screenshot({ path: out + '-phone.png' });
await p.locator('#card').screenshot({ path: out + '-card.png' });
await b.close();
