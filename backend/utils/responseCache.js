/**
 * responseCache.js — tiny in-memory TTL cache for read-only API responses
 * (health, GIF search, link previews, ...).
 *
 * Bounded: MAX_ENTRIES cap with oldest-entry eviction + per-entry TTL so it
 * can never grow into a memory leak.
 */

const cache = new Map();

const DEFAULT_TTL_MS = 60000;
const MAX_ENTRIES = 200; // hard cap — evict oldest when exceeded

let hits = 0;
let misses = 0;

const get = (key) => {
  const entry = cache.get(key);
  if (!entry) {
    misses += 1;
    return undefined;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    misses += 1;
    return undefined;
  }
  hits += 1;
  return entry.value;
};

const set = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  // Keep the map bounded — evict oldest entries if we're over the cap.
  while (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined || oldestKey === key) break;
    cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

/**
 * Return the cached value for `key`, or compute it via `fn` and store it.
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => any | Promise<any>} fn
 */
async function cached(key, ttlMs, fn) {
  const existing = get(key);
  if (existing !== undefined) return existing;
  const value = await fn();
  set(key, value, ttlMs);
  return value;
}

const clear = () => cache.clear();

const stats = () => ({ size: cache.size, maxEntries: MAX_ENTRIES, hits, misses });

module.exports = { get, set, cached, clear, stats };
