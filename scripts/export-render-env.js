#!/usr/bin/env node
/**
 * Export GENZ WhatsApp env as Render-ready KEY=VALUE lines (dashboard paste).
 * Uses the same tiered config + secret generation as setup-render-env.js.
 *
 * Output: scripts/render-env-export.txt (gitignored)
 * Generated secrets are also appended to backend/.env so you keep a copy.
 *
 * Usage:
 *   node scripts/export-render-env.js
 *   node scripts/export-render-env.js --override-mongodb-uri "mongodb+srv://..."
 */
const fs = require('fs');
const path = require('path');
const { buildEnv } = require('./render-env-config');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'backend', '.env');
const OUT_PATH = path.join(__dirname, 'render-env-export.txt');

function getArg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

function appendToEnvFile(filePath, entries) {
  const header = '\n# ── Auto-generated secrets (from scripts/export-render-env.js) ──\n';
  const block = entries.map(([k, v]) => `${k}=${v}`).join('\n');
  fs.appendFileSync(filePath, header + block + '\n');
}

const overrideMongodbUri = getArg('--override-mongodb-uri');
if (process.argv.includes('--override-mongodb-uri') && !overrideMongodbUri) {
  console.error('--override-mongodb-uri requires a value (your Atlas connection string).');
  process.exit(1);
}
const { env, generated, warnings, errors } = buildEnv(ENV_PATH, { overrideMongodbUri });

if (errors.length) {
  console.warn('Warnings/errors from build:');
  for (const e of errors) console.warn(`  ✗ ${e}`);
}
if (warnings.length) {
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
}

const lines = Object.entries(env)
  .map(([k, v]) => `${k}=${v}`);

fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');

if (generated.length) {
  appendToEnvFile(ENV_PATH, generated);
  console.log(`\n${generated.length} generated secrets appended to backend/.env — keep this file safe.`);
}

console.log(`\nExported ${lines.length} variables → ${OUT_PATH}`);
console.log('Paste each line in Render Dashboard → genz-whatsapp → Environment.');
console.log('NOTE: values in the file include generated secrets — delete the file after pasting, and never commit it.');
