import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  use: { baseURL: 'http://localhost:4173' },
  webServer: { command: 'node scripts/serve.js', url: 'http://localhost:4173/', reuseExistingServer: true },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 14'], browserName: 'chromium' } },
    { name: 'desktop', use: { viewport: { width: 1200, height: 900 } } },
  ],
});
