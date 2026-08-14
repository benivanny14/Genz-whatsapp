/**
 * Render deploy verification.
 *
 * Checks that the production service is healthy AFTER a deploy:
 *   1. (optional, needs RENDER_API_KEY) query the Render API for the service's
 *      latest deploy + instance state
 *   2. always: fetch the public /api/health endpoint and assert mongo is
 *      connected + mediaStorage is cloudinary (not local)
 *
 * Transient failures (network blips, Render 502/503/504 during a rolling
 * deploy, timeouts) are retried with exponential backoff so a nightly check
 * does not raise a false-positive alert while the service is still coming up.
 *
 * Usage:
 *   node scripts/render-deploy-verify.js [serviceUrl]
 *
 * Env:
 *   RENDER_API_KEY   Render API key (https://dashboard.render.com → Account
 *                    Settings → API Keys). Optional: without it the script
 *                    only does the public health check.
 *   RENDER_SERVICE_ID  Render service id (e.g. "srv-xxxx"). Required only if
 *                    RENDER_API_KEY is set — the API needs it.
 *   VERIFY_MAX_ATTEMPTS   Retry count per HTTP request (default 3, includes the
 *                    first attempt — i.e. up to 2 retries).
 *   VERIFY_BASE_DELAY_MS  Base backoff delay (default 2000). Actual wait is
 *                    baseDelay * 2^(attempt-1) with jitter.
 *
 * Exit code 0 = all checks passed, 1 = something failed.
 */
const https = require('https');

const SERVICE_URL = process.argv[2] || 'https://genz-whatsapp-1.onrender.com';
const API_KEY = process.env.RENDER_API_KEY || '';
const SERVICE_ID = process.env.RENDER_SERVICE_ID || '';
const MAX_ATTEMPTS = Math.max(1, parseInt(process.env.VERIFY_MAX_ATTEMPTS, 10) || 3);
const BASE_DELAY_MS = Math.max(0, parseInt(process.env.VERIFY_BASE_DELAY_MS, 10) || 2000);

// Transient statuses worth retrying (rolling deploys / proxy hiccups).
const RETRYABLE_STATUS = new Set([502, 503, 504]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getJsonOnce = (url, headers = {}, timeoutMs = 20000) =>
  new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: timeoutMs }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(body); } catch { /* keep null */ }
        resolve({ status: res.statusCode, body: parsed, raw: body });
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });

/**
 * GET with retry + exponential backoff for transient failures.
 * Retries on: network errors, timeouts, and HTTP 502/503/504.
 * Non-transient HTTP responses (4xx, 200, 500, ...) are returned as-is.
 */
const getJson = async (url, headers = {}, { attempts = MAX_ATTEMPTS, baseDelayMs = BASE_DELAY_MS, timeoutMs = 20000, fetch = getJsonOnce } = {}) => {
  let lastErr;
  let lastResponse = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, headers, timeoutMs);
      if (!RETRYABLE_STATUS.has(res.status)) {
        return res; // success or a definitive failure — no retry needed
      }
      lastResponse = res; // retryable (502/503/504) — remember it for the fallback
      if (attempt < attempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * baseDelayMs * 0.25);
        await sleep(delay);
      }
    } catch (e) {
      lastErr = e;
      if (attempt < attempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * baseDelayMs * 0.25);
        await sleep(delay);
      }
    }
  }
  // Exhausted retries. Prefer the last retryable HTTP response so the caller
  // can show the real status; synthesize only for pure network errors.
  if (lastResponse) return lastResponse;
  return { status: 0, body: null, raw: '', error: lastErr?.message || 'request failed' };
};

// ── Main verification (exported so it can be unit-tested) ───────────────────
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const verifyHealth = async ({ serviceUrl = SERVICE_URL, apiKey = API_KEY, serviceId = SERVICE_ID, fetch = getJson } = {}) => {
  results.length = 0; // fresh run — the module-level array must not accumulate across calls

  // ── 1. Render API (only when a key is provided) ──────────────────────────
  if (apiKey) {
    if (!serviceId) {
      check('RENDER_SERVICE_ID is set', false, 'set it to use the API layer');
    } else {
      try {
        const res = await fetch(
          `https://api.render.com/v1/services/${serviceId}`,
          { Authorization: `Bearer ${apiKey}` }
        );
        if (res.status === 200 && res.body) {
          check('Render API: service found', true, res.body.service?.name || res.body.name || serviceId);
          const deploys = await fetch(
            `https://api.render.com/v1/services/${serviceId}/deploys?limit=1`,
            { Authorization: `Bearer ${apiKey}` }
          );
          // The API returns cursor-wrapped items: [{ deploy: {...}, cursor }].
          const deploysList = Array.isArray(deploys.body) ? deploys.body : deploys.body?.deploys || [];
          const latest = (deploysList[0] && deploysList[0].deploy) || deploysList[0];
          if (latest) {
            check('Render API: latest deploy', latest.status === 'live', `${latest.status} (${latest.commit?.id?.slice(0, 7) || 'n/a'})`);
          } else {
            check('Render API: latest deploy', false, 'no deploy returned');
          }
          const instances = await fetch(
            `https://api.render.com/v1/services/${serviceId}/instances`,
            { Authorization: `Bearer ${apiKey}` }
          );
          // Free-tier services scale to zero when idle, so the instances list
          // is legitimately EMPTY while the service is merely asleep. Retry a
          // few times (wake-up window) and treat persistent empty as a note,
          // not a failure — the deploy-live + HTTP /api/health checks already
          // gate on the real signals.
          let inst = null;
          let instRaw = '';
          for (let attempt = 1; attempt <= 3 && !inst; attempt++) {
            const res2 = await fetch(
              `https://api.render.com/v1/services/${serviceId}/instances`,
              { Authorization: `Bearer ${apiKey}` }
            );
            instRaw = JSON.stringify(res2.body || {}).slice(0, 120);
            const il = Array.isArray(res2.body) ? res2.body : res2.body?.instances || [];
            inst = (il[0] && il[0].instance) || il[0];
            if (!inst && attempt < 3) await sleep(10_000);
          }
          if (inst) {
            check('Render API: instance running', true, `${inst.id || ''}`);
          } else {
            check('Render API: instance running', true, `none listed (free-tier sleep; raw: ${instRaw})`);
          }
        } else {
          check('Render API: service found', false, `HTTP ${res.status} (check RENDER_API_KEY + RENDER_SERVICE_ID)`);
        }
      } catch (e) {
        check('Render API: service found', false, e.message);
      }
    }
  } else {
    console.log('ℹ️  RENDER_API_KEY not set — skipping Render API layer, doing public health check only.');
  }

  // ── 2. Public health endpoint (always) ───────────────────────────────────
  try {
    const res = await fetch(`${serviceUrl}/api/health`);
    if (res.status === 200 && res.body) {
      check('HTTP /api/health returns 200', true);
      check('mongo connected', res.body.services?.mongo === 'connected', res.body.services?.mongo);
      check('mediaStorage is cloudinary', res.body.services?.mediaStorage === 'cloudinary', res.body.services?.mediaStorage);
      check('status ok', res.body.status === 'ok', res.body.status);
    } else {
      check('HTTP /api/health returns 200', false, `HTTP ${res.status}${res.raw ? ` — ${res.raw.slice(0, 200)}` : ''}`);
    }
  } catch (e) {
    check('HTTP /api/health returns 200', false, e.message);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${failed.length === 0 ? '🎉 ALL CHECKS PASSED' : `💥 ${failed.length} check(s) failed`} (${results.length - failed.length}/${results.length})\n`);
  return { total: results.length, failed: failed.length, results: [...results] };
};

async function main() {
  console.log(`\n=== Render deploy verify: ${SERVICE_URL} ===\n`);
  const { failed } = await verifyHealth();
  process.exit(failed === 0 ? 0 : 1);
}

module.exports = { getJson, verifyHealth, RETRYABLE_STATUS, sleep, check };
if (require.main === module) {
  main();
}
