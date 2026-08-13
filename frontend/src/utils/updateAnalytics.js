// Anonymous update-banner analytics. Fire-and-forget POSTs to
// /api/telemetry/events (backend AppEvent model) — no PII, just an event
// name, the app version involved and a per-device random id.
//
// Deliberately mirrors the crashReporting util: lazily-read globals so the
// node --test runner can exercise it with fake localStorage/fetch.
//
// Events: update_shown | update_dismissed | update_tapped | update_reload_tapped
// (keep in sync with backend/models/AppEvent.js + telemetryController.js)

const ANON_ID_KEY = 'genz_anon_id';
const SENT_KEY = 'genz_update_analytics_sent';
const MAX_SENT_ENTRIES = 100;

const readJson = (storage, key, fallback) => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

/** Stable per-device anonymous id (random, not linked to any account). */
export const getAnonId = () => {
  const storage = globalThis.localStorage;
  if (!storage) return '';
  try {
    const existing = storage.getItem(ANON_ID_KEY);
    if (existing) return existing.slice(0, 64);
    const id =
      (globalThis.crypto?.randomUUID && globalThis.crypto.randomUUID()) ||
      `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    storage.setItem(ANON_ID_KEY, id);
    return id;
  } catch {
    return '';
  }
};

/**
 * 'update_shown' is deduped per version so the metric is "how many devices
 * saw this update banner", not "how many page loads". Dismiss/action events
 * always send (they are rare and each one is meaningful).
 */
export const shouldSendEvent = (event, versionCode) => {
  if (event !== 'update_shown') return true;
  const storage = globalThis.localStorage;
  if (!storage) return true;
  const sent = readJson(storage, SENT_KEY, {});
  const key = `shown|${versionCode}`;
  if (sent[key]) return false;
  sent[key] = Date.now();
  const entries = Object.entries(sent);
  if (entries.length > MAX_SENT_ENTRIES) {
    const overflow = entries.sort((a, b) => a[1] - b[1]).slice(0, entries.length - MAX_SENT_ENTRIES);
    for (const [k] of overflow) delete sent[k];
  }
  try {
    storage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {
    // Storage unavailable — still send (best-effort).
  }
  return true;
};

/**
 * Fire-and-forget anonymous event. Never throws; never blocks the UI.
 * `platform` is 'apk' when running inside the Capacitor app, else 'web'.
 */
export const trackUpdateEvent = (event, { version = '', versionCode = 0, platform = 'unknown' } = {}) => {
  if (!['update_shown', 'update_dismissed', 'update_tapped', 'update_reload_tapped'].includes(event)) {
    return;
  }
  if (!shouldSendEvent(event, versionCode)) return;

  const apiBase = String(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api'
  ).replace(/\/$/, '');
  let payload;
  try {
    payload = JSON.stringify({
      event,
      version: String(version).slice(0, 20),
      versionCode: Number.isFinite(Number(versionCode)) ? Math.max(0, Number(versionCode)) : 0,
      platform,
      anonId: getAnonId()
    });
  } catch {
    return;
  }
  try {
    fetch(`${apiBase}/telemetry/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true // fire-and-forget even if the page is being replaced
    }).catch(() => {});
  } catch {
    // Analytics must never break the app.
  }
};

export default { trackUpdateEvent, getAnonId };
