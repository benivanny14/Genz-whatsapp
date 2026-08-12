#!/usr/bin/env node
/**
 * Sync GENZ WhatsApp environment variables to a Render web service.
 *
 * Features:
 *  - Tiered keys (REQUIRED / RECOMMENDED / OPTIONAL) from render-env-config.js
 *  - Auto-generates missing secrets (JWT, admin, encryption) and VAPID keys —
 *    generated values are APPENDED to backend/.env so you keep a copy locally
 *  - Refuses placeholder values (change-me / your-... / example.com)
 *  - Never derives JWT_REFRESH_SECRET from JWT_SECRET (they must differ in prod)
 *  - --dry-run previews what would be applied without touching Render
 *  - --override-mongodb-uri supplies the production Atlas URI when backend/.env
 *    still has a localhost MONGODB_URI (otherwise the plan refuses it)
 *
 * Usage:
 *   set RENDER_API_KEY=rnd_xxx
 *   node scripts/setup-render-env.js --service-id srv-xxx
 *   node scripts/setup-render-env.js --service-name genz-whatsapp
 *   node scripts/setup-render-env.js --service-id srv-xxx --dry-run
 *   node scripts/setup-render-env.js --service-name genz-whatsapp \
 *     --override-mongodb-uri "mongodb+srv://user:pass@cluster.mongodb.net/genz"
 */
const fs = require('fs');
const path = require('path');
const { buildEnv } = require('./render-env-config');

const API = 'https://api.render.com/v1';
const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'backend', '.env');

function appendToEnvFile(filePath, entries) {
  const header = '\n# ── Auto-generated secrets (from scripts/setup-render-env.js) ──\n';
  const block = entries.map(([k, v]) => `${k}=${v}`).join('\n');
  fs.appendFileSync(filePath, header + block + '\n');
}

function getArg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

async function api(pathname, { method = 'GET', body } = {}) {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error('Set RENDER_API_KEY (Render Dashboard → Account Settings → API Keys)');
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.message || `Render API ${res.status}: ${text}`);
  return data;
}

async function resolveServiceId() {
  const id = getArg('--service-id');
  if (id) return id;
  const name = getArg('--service-name') || 'genz-whatsapp';
  let cursor;
  do {
    const q = cursor ? `&cursor=${cursor}` : '';
    const page = await api(`/services?limit=100${q}`);
    const match = (page || []).find((s) => s.service?.name === name || s.name === name);
    if (match) return match.service?.id || match.id;
    cursor = page?.length ? page[page.length - 1]?.cursor : null;
  } while (cursor);
  throw new Error(`Service not found: ${name}`);
}

function printPlan(serviceId, { env, generated, warnings, errors }) {
  console.log(`\n=== Render env plan for service: ${serviceId} ===`);
  console.log(`Total variables: ${Object.keys(env).length} (${generated.length} auto-generated)`);
  if (generated.length) {
    console.log('\nAuto-generated (saved to backend/.env, NOT shown here):');
    for (const [key] of generated) console.log(`  + ${key}`);
  }
  if (warnings.length) {
    console.log('\nWarnings:');
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
  if (errors.length) {
    console.log('\nErrors (fix these before applying):');
    for (const e of errors) console.log(`  ✗ ${e}`);
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const overrideMongodbUri = getArg('--override-mongodb-uri');
  if (process.argv.includes('--override-mongodb-uri') && !overrideMongodbUri) {
    console.error('--override-mongodb-uri requires a value (your Atlas connection string).');
    process.exit(1);
  }
  const { env, generated, warnings, errors } = buildEnv(ENV_PATH, { overrideMongodbUri });

  if (!dryRun) {
    const missingRequired = errors.filter((e) => e.includes('REQUIRED'));
    if (missingRequired.length) {
      console.error('Cannot continue — required variables are missing:\n');
      for (const e of missingRequired) console.error(`  ✗ ${e}`);
      console.error('\nAdd them to backend/.env (see RENDER_DEPLOY_GUIDE.md) and re-run.');
      process.exit(1);
    }
  }

  if (dryRun) {
    printPlan('(dry-run)', { env, generated, warnings, errors });
    console.log('\nDry-run complete — nothing was sent to Render.');
    return;
  }

  const serviceId = await resolveServiceId();
  printPlan(serviceId, { env, generated, warnings, errors });

  console.log(`\nApplying ${Object.keys(env).length} env vars to ${serviceId}...`);
  for (const [key, value] of Object.entries(env)) {
    // Per-key upsert: PUT /services/{serviceId}/env-vars/{key} with { "value": ... }.
    // The old POST /env-vars shape is rejected by Render (405), and the replace-all
    // PUT would drop any vars not in this plan — per-key is the safe choice.
    await api(`/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { value }
    });
    console.log(`  ✓ ${key}`);
  }

  if (generated.length) {
    appendToEnvFile(ENV_PATH, generated);
    console.log(`\n${generated.length} generated secrets appended to backend/.env — keep this file safe.`);
  }

  console.log('\nDone. Trigger a redeploy from the Render dashboard (Manual Deploy → Deploy latest commit).');
  console.log('Then verify: curl https://YOUR-URL/api/health  → mongo connected, mediaStorage: cloudinary');
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
