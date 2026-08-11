/**
 * Playwright global setup.
 *
 * TEST-DB LEAK GUARD: the backend connects to MONGODB_URI (config/db.js),
 * while the e2e specs / prep scripts accept MONGO_URI (and MONGODB_URI). If
 * both variables are set to DIFFERENT databases, every spec that registers
 * users would write to the backend's database while the specs believe they
 * are using another one — exactly how test users ended up in a real database
 * once. Fail fast here instead of leaking test data.
 */
function normalizedDb(uri) {
  if (!uri) return null;
  try {
    const url = new URL(uri.replace('mongodb+srv://', 'mongodb://'));
    const host = url.hostname === 'localhost' ? '127.0.0.1' : url.hostname;
    return `${host}:${url.port || 27017}${url.pathname}`;
  } catch {
    return uri; // unparseable — compare raw so the guard still triggers on difference
  }
}

export default async function globalSetup() {
  const a = normalizedDb(process.env.MONGODB_URI);
  const b = normalizedDb(process.env.MONGO_URI);
  if (a && b && a !== b) {
    throw new Error(
      `[e2e guard] MONGODB_URI and MONGO_URI point at DIFFERENT databases ` +
      `(${a} vs ${b}). The backend (MONGODB_URI) would write to a different ` +
      `database than the specs/prep use (MONGO_URI) — test data could leak. ` +
      `Point both at the same isolated MongoDB (or unset one).`
    );
  }
  if (!a && !b) {
    // Smoke specs only render pages; the specs that register users (and the
    // admin prep) fail fast on their own if the DB env is missing. Warn, don't
    // block, so `npx playwright test e2e/smoke.spec.js` stays runnable.
    console.warn('[e2e guard] Neither MONGODB_URI nor MONGO_URI is set — DB-backed specs will fail; smoke specs will still run.');
  }
}
