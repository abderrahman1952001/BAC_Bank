import { defineConfig } from '@playwright/test';

const fullStack = process.env.PLAYWRIGHT_FULL_STACK === 'true';
const fullStackDatabaseUrl =
  process.env.PLAYWRIGHT_DATABASE_URL ??
  'postgresql://bac_user:bac_password@127.0.0.1:5433/bac_bank?schema=public';
const shellEnv = (name: string, value: string) =>
  `${name}=${JSON.stringify(value)}`;
const fullStackDatabaseEnv = shellEnv('DATABASE_URL', fullStackDatabaseUrl);

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
  webServer: fullStack
    ? [
        {
          command:
            `docker compose up -d postgres redis && ${fullStackDatabaseEnv} npm exec -w @bac-bank/api -- prisma migrate deploy --schema prisma/schema.prisma && ${fullStackDatabaseEnv} PLAYWRIGHT_TEST_AUTH=true npm run dev -w @bac-bank/api`,
          url: 'http://127.0.0.1:3001/api/v1/health/live',
          reuseExistingServer: !process.env.CI,
          timeout: 300_000,
        },
        {
          command:
            'PLAYWRIGHT_TEST_AUTH=true PLAYWRIGHT_FIXTURE_DATA=false API_UPSTREAM_URL=http://127.0.0.1:3001/api/v1 NEXT_PUBLIC_API_BASE_URL=/api/v1 npm run build -w @bac-bank/web && PLAYWRIGHT_TEST_AUTH=true PLAYWRIGHT_FIXTURE_DATA=false API_UPSTREAM_URL=http://127.0.0.1:3001/api/v1 NEXT_PUBLIC_API_BASE_URL=/api/v1 npm run start -w @bac-bank/web',
          url: 'http://127.0.0.1:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 300_000,
        },
      ]
    : {
        command:
          'PLAYWRIGHT_TEST_AUTH=true npm run build -w @bac-bank/web && PLAYWRIGHT_TEST_AUTH=true npm run start -w @bac-bank/web',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
