// Live verification suite — drives the REAL app (bundled build served by the
// local backend on :5100) through the flows the user asked to verify:
// text/font, voice notes, image + view-once, statuses (photo/text/video/
// location/voice/music), WINGA products (photo + video), emoji/stickers,
// the update banner, and backend-outage resilience.
//
// Run: npx playwright test -c e2e-live/playwright.live.config.js
// Requires: backend on :5100 (PORT=5100, PUBLIC_API_URL/FRONTEND_URL=http://localhost:5100)
//           serving the built frontend, and test media in .livetest/.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 180_000,
  retries: 0,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5100',
    // Fake microphone (for voice notes) + fake video capture, so recording
    // works headlessly without real hardware.
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required'
      ]
    },
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
});