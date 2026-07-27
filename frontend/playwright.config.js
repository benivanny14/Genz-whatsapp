import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || (isCI ? 'http://127.0.0.1:4174' : 'http://127.0.0.1:5174');

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: isCI ? 1 : 0,
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: isCI ? 'npm run preview -- --host 127.0.0.1 --port 4174' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000
  }
});
