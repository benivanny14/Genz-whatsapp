import { defineConfig, devices } from '@playwright/test';

// Production smoke config — runs frontend/e2e/production-smoke.spec.js
// against the DEPLOYED web app (no local server, no local DB). Verifies the
// SPA boots and /api works through the UI host's vite proxy. The spec skips
// itself unless PROD_SMOKE=1, so this config can only target production.
//
//   PROD_SMOKE=1 npx playwright test --config=playwright.prod.config.js
const prodBase = process.env.PROD_BASE_URL || 'https://genz-whatsapp-1.onrender.com';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'production-smoke.spec.js',
  // Free-tier cold starts + render deploy windows need some patience, but
  // keep it bounded so a genuinely broken host fails in a few minutes
  // instead of hanging the workflow for half an hour.
  timeout: 120_000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: prodBase,
    // Same as the local suite: the PWA update banner overlaps the UI and can
    // make clicks flaky; also we never want the SW to answer for these checks.
    serviceWorkers: 'block',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'production',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
