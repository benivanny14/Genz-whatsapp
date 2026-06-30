import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4174',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: process.env.CI ? 'npm run preview -- --host 127.0.0.1 --port 4174' : 'npm run dev',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
