/**
 * render-deploy-status.js — inspect a Render service's deploys via the API.
 *
 * Useful when the dashboard isn't reachable: shows the last N deploys with
 * their status (created → building → update_in_progress → live / failed),
 * which commit each one built, the current instance state, recent service
 * events, and the tail of the runtime logs (which often shows why a service
 * is failing to boot — e.g. a MongoDB connection error).
 *
 * Usage (from repo root):
 *   RENDER_API_KEY=rnd_xxx RENDER_SERVICE_ID=srv-xxx \
 *     node scripts/render-deploy-status.js [--limit 5] [--service srv-xxx] [--logs 30]
 *
 * Without --service / RENDER_SERVICE_ID it lists every service the API key
 * can see (handy for the repo's genz-whatsapp + genz-whatsapp-1 pair).
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
const LOG_LINES = Number(getArg('--logs') || process.env.RENDER_DEPLOY_LOGS || 30);
const SERVICE_ID = getArg('--service') || process.env.RENDER_SERVICE_ID || '';
const API_KEY = process.env.RENDER_API_KEY || '';

if (!API_KEY) {
  console.error('RENDER_API_KEY is required (env or --service).');
  process.exit(1);
}

const getJson = (url) =>
  new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Authorization: `Bearer ${API_KEY}` }, timeout: 25000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { reject(new Error(`Bad JSON (${res.statusCode}): ${body.slice(0, 300)}`)); }
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

const stamp = (iso) => (iso ? new Date(iso).toISOString().slice(0, 19) : '?');

// The API returns cursor-wrapped items: [{ deploy: {...}, cursor }, ...] and
// [{ event: {...}, cursor }, ...] — unwrap to the inner object. topKey is
// the wrapper key on the body itself (if any), innerKey the per-item key.
const unwrap = (body, topKey, innerKey) => {
  const arr = Array.isArray(body) ? body : (body && body[topKey]) || [];
  return arr.map((x) => (x && x[innerKey] ? x[innerKey] : x));
};

async function inspectService(id) {
  const svc = await getJson(`https://api.render.com/v1/services/${id}`);
  if (svc.status !== 200) {
    console.error(`\nService ${id} query failed (${svc.status}): ${JSON.stringify(svc.body).slice(0, 300)}`);
    return;
  }
  const s = svc.body;
  console.log(`\nService: ${s.name || id} — ${s.type || '?'}`);
  console.log(`  URL: ${s.serviceDetails?.url || s.url || '?'}`);
  console.log(`  repo: ${s.repo || '?'}  branch: ${s.branch || '?'}`);
  console.log(`  suspended: ${s.suspended || false}`);
  console.log(`  ownerId: ${s.ownerId || '?'}`);
  const inst = s.serviceDetails?.envSpecificDetails?.instance?.state;
  if (inst) console.log(`  instance: ${inst}`);

  // Deploy history (newest first)
  const deploys = await getJson(`https://api.render.com/v1/services/${id}/deploys?limit=${LIMIT}`);
  if (deploys.status !== 200) {
    console.error(`  Deploys query failed (${deploys.status}): ${JSON.stringify(deploys.body).slice(0, 300)}`);
  } else {
    const list = unwrap(deploys.body, 'deploys', 'deploy');
    console.log(`\n  Last ${LIMIT} deploys (newest first):`);
    for (const d of list) {
      const status = STATUS_LABEL[d.status] || d.status || 'unknown';
      const commit = (d.commit?.id || d.commit || '').toString().slice(0, 8) || '?';
      const trigger = d.trigger || d.triggerDetails?.type || '';
      const finished = d.finishedAt ? ' → ' + stamp(d.finishedAt) : '';
      console.log(`    ${stamp(d.createdAt)}  ${String(status).padEnd(10)}  commit ${commit}  ${trigger}${finished}`);
    }
    const latest = list[0];
    if (latest) {
      console.log(`  Latest deploy: ${STATUS_LABEL[latest.status] || latest.status}`);
      if (latest.status === 'failed') console.log('  ⚠️  Latest deploy FAILED — check logs below.');
    } else {
      console.log('  No deploys found.');
    }
  }

  // Service events (instance crashes, deploy triggers, etc.)
  try {
    const ev = await getJson(`https://api.render.com/v1/services/${id}/events?limit=12`);
    if (ev.status === 200) {
      const events = unwrap(ev.body, 'events', 'event');
      if (events.length) {
        console.log(`\n  Recent events (last ${events.length}):`);
        for (const e of events) {
          const det = e.details || {};
          const extra = det.deployStatus
            ? ` deployStatus=${det.deployStatus}`
            : det.message
              ? ` ${det.message.toString().slice(0, 100)}`
              : det.reason && det.reason.message
                ? ` ${det.reason.message.toString().slice(0, 100)}`
                : '';
          console.log(`    ${stamp(e.timestamp)}  ${e.type || '?'}${extra}`);
        }
      }
    }
  } catch (e) {
    console.log(`  (events query failed: ${e.message})`);
  }

  // Runtime log tail — often shows the boot failure (e.g. Mongo connect error).
  // The /v1/logs endpoint requires ownerId + resource (= raw service id).
  try {
    let ownerId = s.ownerId || '';
    if (!ownerId) {
      try {
        const owners = await getJson('https://api.render.com/v1/owners');
        if (owners.status === 200) {
          const list = Array.isArray(owners.body) ? owners.body : owners.body?.owners || [];
          if (list[0]) ownerId = list[0].id || '';
          else console.log(`  (owners response: ${JSON.stringify(owners.body).slice(0, 200)})`);
        } else {
          console.log(`  (owners query failed (${owners.status}): ${JSON.stringify(owners.body).slice(0, 200)})`);
        }
      } catch (e) { /* ignore */ }
    }
    if (!ownerId) {
      console.log('  (logs query skipped — no ownerId)');
    } else {
      const startTime = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();
      const qs = `ownerId=${encodeURIComponent(ownerId)}&resource=${encodeURIComponent(id)}&limit=200&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&type=app&direction=backward`;
      const logs = await getJson(`https://api.render.com/v1/logs?${qs}`);
      if (logs.status !== 200) {
        console.log(`  (logs query failed (${logs.status}): ${JSON.stringify(logs.body).slice(0, 200)})`);
      } else {
        const entries = Array.isArray(logs.body) ? logs.body : logs.body?.logs || [];
        if (entries.length) {
          console.log(`\n  Runtime log tail (${entries.length} lines):`);
          for (const l of entries.slice(-LOG_LINES)) {
            const line = (l.message || l.body || '').toString().replace(/\n/g, ' ');
            console.log(`    ${stamp(l.timestamp)}  ${line.slice(0, 220)}`);
          }
        } else {
          console.log('  (no log entries returned — service may never have started)');
        }
      }
    }
  } catch (e) {
    console.log(`  (logs query failed: ${e.message})`);
  }
}

async function main() {
  if (SERVICE_ID && SERVICE_ID !== 'all') {
    await inspectService(SERVICE_ID);
  } else {
    // No service given — list everything the key can see.
    const all = await getJson('https://api.render.com/v1/services?limit=50');
    if (all.status !== 200) {
      console.error(`Services query failed (${all.status}): ${JSON.stringify(all.body).slice(0, 300)}`);
      process.exit(1);
    }
    const services = unwrap(all.body, 'services', 'service');
    console.log(`Found ${services.length} service(s) for this API key:`);
    for (const s of services) {
      console.log(`  - ${s.name || s.id}  (${s.type})  ${s.serviceDetails?.url || s.url || ''}  suspended=${s.suspended || false}`);
    }
    for (const s of services) {
      await inspectService(s.id);
    }
  }
}

main().catch((err) => {
  console.error('render-deploy-status FAILED:', err.message);
  process.exit(1);
});
