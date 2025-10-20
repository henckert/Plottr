import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for Plottr
 * Separates UI and API tests to target correct ports
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run sequentially to avoid DB conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid concurrent DB operations
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'ui-e2e',
      testMatch: '**/ui.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3000',
      },
    },
    {
      name: 'api-e2e',
      testMatch: ['**/smoke.spec.ts', '**/workflow.spec.ts', '**/pagination.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3001',
        extraHTTPHeaders: {
          'Authorization': 'Bearer dev-token',
          'X-Test-Bypass-RateLimit': '1',
        },
      },
    },
  ],
  // No webServer - run backend and frontend manually before testing
});
