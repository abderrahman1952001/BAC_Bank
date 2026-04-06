import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: {
    timeout: 30_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'PLAYWRIGHT_TEST_AUTH=true npm run build -w @bac-bank/web && PLAYWRIGHT_TEST_AUTH=true npm run start -w @bac-bank/web',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
