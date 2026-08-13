/**
 * render-deploy-status.js — inspect a Render service's deploys via the API.
 *
 * Useful when the dashboard isn't reachable: shows the last N deploys with
 * their status (created → building → update_in_progress → live / failed),
 * which commit each one built, and the current instance state.
 *
 * Usage (from repo root):
 *   RENDER_API_KEY=rnd_xxx RENDER_SERVICE_ID=srv-xxx \
 *     node scripts/render-deploy-status.js [--limit 5] [--service srv-xxx]
 *
 * Env:
 *   RENDER_API_KEY     dashboard.render.com → Account Settings → API Keys
 *   RENDER_SERVICE_ID  the srv-xxxx part of the service URL
 *
 * Also wired into .github/workflows/render-status.yml (workflow_dispatch) so
 * it can run with the repo's own secrets from the Actions tab.
 */
const https = require('https');

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const LIMIT = Number(getArg('--limit') || process.env.RENDER_DEPLOY_LIMIT || 5);
const SERVICE_ID = getArg('--service') || process.env.RENDER_SERVICE_ID || '';
const API_KEY = process.env.RENDER_API_KEY || '';

if (!SERVICE_ID || !API_KEY) {
  console.error('RENDER_SERVICE_ID and RENDER_API_KEY are required (env or --service).');
  process.exit(1);
}

const getJson = (url) =>
  new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${API_KEY}` }, timeout: 20000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { reject(new Error(`Bad JSON (${res.statusCode}): ${body.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
  });

const STATUS_LABEL = {
  created: 'queued',
  building: 'building',
  update_in_progress: 'updating',
  live: 'live',
  deactivated: 'deactivated',
  failed: 'FAILED',
  cancelled: 'cancelled'
};

async function main() {
  // Service info + current instance state
  const svc = await getJson(`https://api.render.com/v1/services/${SERVICE_ID}`);
  if (svc.status !== 200) {
    console.error(`Service query failed (${svc.status}): ${JSON.stringify(svc.body).slice(0, 300)}`);
    process.exit(1);
  }
  const s = svc.body;
  console.log(`Service: ${s.name || SERVICE_ID} — ${s.type || '?'}`);
  console.log(`  URL: ${s.serviceDetails?.url || s.url || '?'}`);
  console.log(`  repo: ${s.repo || '?'}  branch: ${s.branch || '?'}`);
  console.log(`  suspended: ${s.suspended || false}`);
  if (s.serviceDetails?.envSpecificDetails?.instance?.state) {
    console.log(`  instance: ${s.serviceDetails.envSpecificDetails.instance.state}`);
  }

  // Deploy history (newest first)
  const deploys = await getJson(`https://api.render.com/v1/services/${SERVICE_ID}/deploys?limit=${LIMIT}`);
  if (deploys.status !== 200) {
    console.error(`Deploys query failed (${deploys.status}): ${JSON.stringify(deploys.body).slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`\nLast ${LIMIT} deploys (newest first):`);
  for (const d of deploys.body || []) {
    const status = STATUS_LABEL[d.status] || d.status;
    const commit = (d.commit && d.commit.slice(0, 8)) || '?';
    const created = d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 19) : '?';
    const finished = d.finishedAt ? new Date(d.finishedAt).toISOString().slice(0, 19) : '';
    console.log(`  ${created}  ${status.padEnd(10)}  commit ${commit}  ${d.trigger || ''} ${finished ? '→ ' + finished : ''}`);
  }

  // Exit nonzero if the latest deploy failed
  const latest = (deploys.body || [])[0];
  if (latest && latest.status === 'failed') {
    console.error('\n⚠️  Latest deploy FAILED — check the Render dashboard build logs.');
    process.exit(1);
  }
  console.log(latest ? `\nLatest deploy: ${STATUS_LABEL[latest.status] || latest.status}` : '\nNo deploys found.');
}

main().catch((err) => {
  console.error('render-deploy-status FAILED:', err.message);
  process.exit(1);
});
