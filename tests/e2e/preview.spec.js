import { test, expect } from '@playwright/test';

test('art style preview renders all 5 styles without errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/preview/');
  await page.waitForSelector('body[data-ready]');
  await expect(page.locator('section.style')).toHaveCount(5);
  for (let i = 1; i <= 5; i++) {
    const sec = page.locator(`#style-${i}`);
    await expect(sec.locator('.phone .scene > *')).toHaveCount(1);
    await expect(sec.locator('.bc-specs')).toContainText('998');
    await expect(sec.locator('.bc-specs')).toContainText('228');
    await expect(sec.locator('.appicon.big > *')).toHaveCount(1);
    await expect(sec.locator('.haggle')).toBeVisible();
    await expect(sec.locator('.tab')).toHaveCount(5);
  }
  expect(errors).toEqual([]);
});

test('no horizontal scroll at phone width', async ({ page }) => {
  await page.goto('/preview/');
  await page.waitForSelector('body[data-ready]');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('landing page links to the preview', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /art styles/i }).click();
  await expect(page).toHaveURL(/preview/);
});
