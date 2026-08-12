/**
 * Render deploy verification.
 *
 * Checks that the production service is healthy AFTER a deploy:
 *   1. (optional, needs RENDER_API_KEY) query the Render API for the service's
 *      latest deploy + instance state
 *   2. always: fetch the public /api/health endpoint and assert mongo is
 *      connected + mediaStorage is cloudinary (not local)
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
 *
 * Exit code 0 = all checks passed, 1 = something failed.
 */
const https = require('https');

const SERVICE_URL = process.argv[2] || 'https://genz-whatsapp-1.onrender.com';
const API_KEY = process.env.RENDER_API_KEY || '';
const SERVICE_ID = process.env.RENDER_SERVICE_ID || '';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const getJson = (url, headers = {}, timeoutMs = 20000) =>
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

async function main() {
  console.log(`\n=== Render deploy verify: ${SERVICE_URL} ===\n`);

  // ── 1. Render API (only when a key is provided) ──────────────────────────
  if (API_KEY) {
    if (!SERVICE_ID) {
      check('RENDER_SERVICE_ID is set', false, 'set it to use the API layer');
    } else {
      try {
        const res = await getJson(
          `https://api.render.com/v1/services/${SERVICE_ID}`,
          { Authorization: `Bearer ${API_KEY}` }
        );
        if (res.status === 200 && res.body) {
          check('Render API: service found', true, res.body.service?.name || SERVICE_ID);
          const deploys = await getJson(
            `https://api.render.com/v1/services/${SERVICE_ID}/deploys?limit=1`,
            { Authorization: `Bearer ${API_KEY}` }
          );
          const latest = deploys.body?.[0];
          if (latest) {
            check('Render API: latest deploy', latest.status === 'live', `${latest.status} (${latest.commit?.id?.slice(0, 7) || 'n/a'})`);
          } else {
            check('Render API: latest deploy', false, 'no deploy returned');
          }
          const instances = await getJson(
            `https://api.render.com/v1/services/${SERVICE_ID}/instances`,
            { Authorization: `Bearer ${API_KEY}` }
          );
          const inst = instances.body?.[0];
          if (inst) {
            check('Render API: instance running', true, `${inst.id || ''}`);
          } else {
            check('Render API: instance running', false, 'no instance returned');
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
    const res = await getJson(`${SERVICE_URL}/api/health`);
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
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
