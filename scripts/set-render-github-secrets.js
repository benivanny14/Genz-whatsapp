/**
 * Set RENDER_API_KEY and RENDER_SERVICE_ID as GitHub repository secrets.
 *
 * Usage (from repo root):
 *   node scripts/set-render-github-secrets.js \
 *     --repo benivanny14/Genz-whatsapp \
 *     --api-key rnd_xxxxxxxxxxxxxxxx \
 *     --service-id srv-xxxxxxxxxxxx
 *
 * The API key comes from dashboard.render.com → Account Settings → API Keys.
 * The service id is the srv-xxxx part of the service URL:
 *   dashboard.render.com/web/srv-xxxxxxxxxxxx
 *
 * Requires: a GitHub token with `repo` scope (git credential helper is used),
 * and `libsodium-wrappers` (install with: npm install --no-save libsodium-wrappers).
 */
const { execSync } = require('child_process');
const sodium = require('libsodium-wrappers');

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

const repo = getArg('--repo') || 'benivanny14/Genz-whatsapp';
const apiKey = getArg('--api-key');
const serviceId = getArg('--service-id');

if (!apiKey || !serviceId) {
  console.error('Usage: node scripts/set-render-github-secrets.js --repo OWNER/REPO --api-key rnd_xxx --service-id srv-xxx');
  process.exit(1);
}

const input = 'protocol=https\nhost=github.com\n\n';
const TOKEN = execSync('git credential fill', { input, encoding: 'utf8' }).match(/password=(.*)/)[1].trim();
const H = { 'Authorization': 'Bearer ' + TOKEN, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' };

async function setSecret(name, value) {
  // 1. Get repo public key
  const keyRes = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, { headers: H });
  if (!keyRes.ok) throw new Error(`Failed to get public key (${keyRes.status}): ${(await keyRes.text()).slice(0, 200)}`);
  const { key_id, key } = await keyRes.json();

  // 2. Encrypt value with libsodium sealed box
  await sodium.ready;
  const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  const encBytes = sodium.crypto_box_seal(sodium.from_string(value), binKey);
  const encryptedValue = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

  // 3. PUT the secret
  const putRes = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${name}`, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify({ encrypted_value: encryptedValue, key_id })
  });
  if (putRes.status !== 201 && putRes.status !== 204) {
    throw new Error(`Failed to set ${name} (${putRes.status}): ${(await putRes.text()).slice(0, 200)}`);
  }
  console.log(`✅ Secret ${name} set (HTTP ${putRes.status})`);
}

(async () => {
  await setSecret('RENDER_API_KEY', apiKey);
  await setSecret('RENDER_SERVICE_ID', serviceId);
  console.log('\nDone. Verify at: https://github.com/' + repo + '/settings/secrets/actions');
})();
