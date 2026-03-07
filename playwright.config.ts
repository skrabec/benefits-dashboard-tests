import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

// Trailing slash is required so that relative goto('Account/Login') resolves
// to /Prod/Account/Login rather than stripping the /Prod segment.
const BASE_URL = (process.env.BASE_URL ?? 'https://wmxrwq14uc.execute-api.us-east-1.amazonaws.com/Prod').replace(/\/?$/, '/');

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'api',
      testMatch: 'tests/api/**/*.spec.ts',
    },
    {
      name: 'ui-chromium',
      testMatch: 'tests/ui/**/*.spec.ts',
      // Single worker to prevent parallel UI tests interfering with shared test data
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        // Use installed system Chrome to avoid WAF detection of Playwright's headless shell.
        // headless: false required because the AWS API Gateway WAF blocks headless browser
        // TLS fingerprints when in headless mode.
        channel: 'chrome',
        headless: false,
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled'],
        },
      },
    },
  ],
});
