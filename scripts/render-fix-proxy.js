/**
 * render-fix-proxy.js — point a Render web service's vite preview proxy at
 * the backend and trigger a fresh deploy.
 *
 * The frontend services (genz-whatsapp-1 / genz-whatsapp-2) serve the SPA
 * with `vite preview`. vite reads vite.config.js at startup, where the
 * /api, /uploads and /socket.io proxy target is
 * `process.env.GENZ_BACKEND_TARGET || 'http://localhost:5000'`. Without the
 * env var the proxy dials localhost:5000 inside the frontend container,
 * which has no backend → every API call fails with ECONNREFUSED (502).
 *
 * This script sets GENZ_BACKEND_TARGET to the backend URL (default
 * https://genz-whatsapp.onrender.com — the healthy backend service) and
 * triggers a deploy so the running container picks it up.
 *
 * Usage (from repo root):
 *   RENDER_API_KEY=rnd_xxx node scripts/render-fix-proxy.js --service srv-xxx
 *   RENDER_API_KEY=rnd_xxx node scripts/render-fix-proxy.js --service srv-xxx --target https://genz-whatsapp.onrender.com
 *
 * Wired into .github/workflows/render-fix.yml (workflow_dispatch) so it can
 * run with the repo's own secrets from the Actions tab.
 */
const https = require('https');

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const SERVICE_ID = getArg('--service') || '';
const TARGET = getArg('--target') || 'https://genz-whatsapp.onrender.com';
// --deploy-only: skip the env-var update, just trigger a fresh deploy.
// Useful for services that don't run the vite preview proxy (e.g. the
// static site genz-whatsapp-2) — they just need a rebuild from main.
const DEPLOY_ONLY = args.includes('--deploy-only');
const API_KEY = process.env.RENDER_API_KEY || '';

if (!SERVICE_ID || !API_KEY) {
  console.error('--service (srv-xxx) and RENDER_API_KEY are required.');
  process.exit(1);
}

const request = (method, url, body) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      url,
      {
        method,
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          ...(payload ? { 'Content-Type': 'application/json' } : {})
        },
        timeout: 25000
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    if (payload) req.write(payload);
    req.end();
  });

async function main() {
  console.log(`Service: ${SERVICE_ID}`);
  if (!DEPLOY_ONLY) {
    console.log(`Setting GENZ_BACKEND_TARGET=${TARGET} ...`);
    // Per-key endpoint — the bulk PUT /env-vars endpoint REPLACES all env
    // vars, so it must never be used for a single var (it would wipe
    // MONGODB_URI, JWT_SECRET etc.).
    const up = await request(
      'PUT',
      `https://api.render.com/v1/services/${SERVICE_ID}/env-vars/GENZ_BACKEND_TARGET`,
      { value: TARGET }
    );
    if (up.status !== 200 && up.status !== 201) {
      console.error(`env update failed (${up.status}): ${JSON.stringify(up.body).slice(0, 300)}`);
      process.exit(1);
    }
    console.log('env var updated ✓');
  } else {
    console.log('--deploy-only: skipping env update, deploying latest commit from main');
  }

  console.log('Triggering deploy of latest commit ...');
  const dep = await request('POST', `https://api.render.com/v1/services/${SERVICE_ID}/deploys`, {});
  if (dep.status !== 201 && dep.status !== 200) {
    console.error(`deploy trigger failed (${dep.status}): ${JSON.stringify(dep.body).slice(0, 300)}`);
    process.exit(1);
  }
  const d = dep.body?.deploy || dep.body || {};
  console.log(`deploy triggered: ${d.id || '?'} status=${d.status || '?'} commit=${(d.commit?.id || '').slice(0, 8) || '?'}`);
}

main().catch((err) => {
  console.error('render-fix-proxy FAILED:', err.message);
  process.exit(1);
});
