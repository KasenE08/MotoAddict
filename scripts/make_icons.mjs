// Renders the app icons (PNG) from scripts/icon.html.
import { chromium } from '@playwright/test';
import { start } from './serve.js';
const server = await start(4175);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 600, height: 600 } });
for (const [s, name, mask] of [[180, 'apple-touch-icon', false], [192, 'icon-192', false], [512, 'icon-512', false], [512, 'icon-maskable-512', true], [32, 'favicon-32', false]]) {
  await p.goto(`http://localhost:4175/scripts/icon.html?s=${s}${mask ? '&mask' : ''}`);
  await p.waitForSelector('body[data-ready]');
  await p.locator('#c').screenshot({ path: `assets/icons/${name}.png` });
}
await b.close(); server.close(); console.log('icons written');
