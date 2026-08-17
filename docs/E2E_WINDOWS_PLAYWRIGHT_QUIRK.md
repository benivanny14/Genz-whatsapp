# Running e2e locally on Windows — Playwright webServer quirk

Short notes from running the WINGA e2e suite on a Windows machine (Git Bash,
Playwright 1.61.1). Two gotchas cost the most time; both have one-line
workarounds.

## 1. "No tests found" / `0 tests in 0 files` when a server is already running

**Symptom**

```bash
# backend already listening on the port PLAYWRIGHT_BASE_URL points at
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5056 npx playwright test winga.spec.js
# → Error: No tests found. / "Listing tests: Total: 0 tests in 0 files"
```

The exact same command works the moment the port is free (Playwright then
tries to start `webServer.command` and collects tests normally). Confirmed
reproducible on Windows: `--list` returns 0 tests while a server responds at
`webServer.url`, and 3 tests after it is stopped. This is the
`reuseExistingServer: true` path — on Linux CI the identical layout (backend
pre-started, `PLAYWRIGHT_BASE_URL` set) works fine, so treat this as a
Windows-specific quirk, not a spec bug.

**Workaround — let Playwright manage the backend itself**

Use a small throwaway config that boots the backend as the managed
`webServer` instead of pre-starting it (delete the file after the run):

```js
// frontend/playwright.winga.config.js (throwaway, not committed)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  globalSetup: './e2e/global-setup.js',
  use: { baseURL: 'http://127.0.0.1:5056', trace: 'on-first-retry', serviceWorkers: 'block' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node server.js',
    cwd: '../backend',
    url: 'http://127.0.0.1:5056/api/health',
    reuseExistingServer: false,   // do NOT reuse — that is the quirk path
    timeout: 120_000,
    env: {
      NODE_ENV: 'development',
      PORT: '5056',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/genz-e2e-runX', // fresh per run
      MONGO_URI: 'mongodb://127.0.0.1:27017/genz-e2e-runX',
      // ...JWT_SECRET / JWT_REFRESH_SECRET / ADMIN_JWT_SECRET /
      //     ADMIN_LOGIN_MAX / ADMIN_STRICT_MAX / AUTH_RATE_MAX /
      //     PHONE_VERIFICATION_REQUIRED=false (see ci.yml e2e job)
    }
  }
});
```

Run with:

```bash
cd frontend
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5056 \
  npx playwright test --config playwright.winga.config.js winga.spec.js
```

Notes:

- The spec files read `process.env.PLAYWRIGHT_BASE_URL` for API calls
  (`base()` helper) — setting it only in `use.baseURL` is NOT enough; the
  `registerUser`/API helpers will fall back to `:5174` and fail with
  `ECONNREFUSED`.
- Pick a port that is actually free. `:5000` is usually the user's own local
  backend — never point the e2e at it (the specs write users/listings and the
  global-setup guard is there precisely to stop test data leaking into a real
  database).
- Always kill the managed backend afterwards (find the PID via
  `netstat -ano | grep :<port>` and `taskkill //PID <pid> //F`).

## 2. Exact-count specs need a fresh database per run

Specs like `winga.spec.js` assert exact marketplace counts (`totalUnseen` ==
2, `nav-badge-winga` shows "2"). They self-clean their listings at the end,
but a spec that fails mid-run leaves data behind, and the *next* run then
sees 3 instead of 2. Use a **fresh database name per run** (e.g.
`genz-e2e-run1`, `run2`, …) and drop the leftovers afterwards:

```bash
cd backend && node -e "
const { MongoClient } = require('mongodb');
(async () => {
  const c = await MongoClient.connect('mongodb://127.0.0.1:27017');
  const dbs = (await c.db().admin().listDatabases()).databases.map(d => d.name);
  for (const n of dbs.filter(n => n.startsWith('genz-e2e-'))) await c.db(n).dropDatabase();
  await c.close();
})()"
```

## 3. mongodb-memory-server on Windows

The backend unit suite downloads a ~500 MB MongoDB binary on first run, and
the default 10 s `beforeAll` hook in `tests/setup.js` times out while it
downloads. If the download is slow/blocked, run the suite against the local
Mongo instead (works on any machine that has MongoDB running):

```bash
cd backend
USE_LOCAL_MONGO_FOR_TESTS=true npm test   # uses mongodb://127.0.0.1:27017/genz-jest
```
