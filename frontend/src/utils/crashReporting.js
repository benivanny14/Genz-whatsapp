// Crash-reporting helpers used by the ErrorBoundary. Kept as plain JS with
// lazily-read globals so the node --test runner can exercise them with fake
// localStorage/fetch without a DOM.
//
// The reporting is OPT-IN (`genz_crash_reporting === '1'`, toggled in
// GENZSettings → Privacy → Crash Reporting) and DEDUPED per route+message so
// a recurring render crash cannot hammer the telemetry endpoint into a loop.

const REPORTING_KEY = 'genz_crash_reporting';
const DEDUPE_KEY = 'genz_crash_reported';
const DEDUPE_WINDOW_MS = 10 * 60 * 1000; // same route+message: at most once per 10 min
const MAX_DEDUPE_ENTRIES = 50;
const MAX_MESSAGE_LEN = 2000;

const readJson = (storage, key, fallback) => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

/** Is crash reporting enabled for this browser? (opt-in, default off.) */
export const isCrashReportingEnabled = () => {
  try {
    return globalThis.localStorage?.getItem(REPORTING_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Dedupe gate. Records the (route, message) pair and returns true only if it
 * has not been reported within the window — a recurring crash therefore sends
 * at most one report per 10 minutes. The map is capped so it cannot grow
 * without bound in a long-lived session.
 */
export const shouldReportCrash = (route, message) => {
  const storage = globalThis.localStorage;
  if (!storage) return false;

  const key = `${route}|${String(message || '').slice(0, MAX_MESSAGE_LEN)}`;
  const now = Date.now();
  const reported = readJson(storage, DEDUPE_KEY, {});
  const last = reported[key];
  if (last && now - last < DEDUPE_WINDOW_MS) return false;

  reported[key] = now;
  const entries = Object.entries(reported).sort((a, b) => a[1] - b[1]);
  const overflow = Math.max(0, entries.length - MAX_DEDUPE_ENTRIES);
  for (const [k] of entries.slice(0, overflow)) delete reported[k];
  try {
    storage.setItem(DEDUPE_KEY, JSON.stringify(reported));
  } catch {
    // Storage full/unavailable — analytics stay best-effort.
  }
  return true;
};

/**
 * Fire-and-forget POST of a crash report. The caller passes the user's access
 * token (from tokenStore) so the telemetry route's `protect` middleware can
 * attribute the report; without a token (anonymous) nothing is sent.
 */
export const reportCrashToServer = (route, message, { token, base } = {}) => {
  if (!token) return;
  const apiBase = String(base || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api').replace(/\/$/, '');
  let payload;
  try {
    payload = JSON.stringify({
      route: String(route || '/').slice(0, 500),
      message: String(message || '').slice(0, MAX_MESSAGE_LEN)
    });
  } catch {
    return;
  }
  try {
    fetch(`${apiBase}/telemetry/crashes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: payload,
      keepalive: true // fire-and-forget even if the page is being replaced
    }).catch(() => {});
  } catch {
    // A crash report must never crash the app again.
  }
};
