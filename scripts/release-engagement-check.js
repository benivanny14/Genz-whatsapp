#!/usr/bin/env node
/**
 * release-engagement-check.js — detects a LOW-ENGAGEMENT release.
 *
 * A release that has been LIVE for more than 7 days but whose update banner
 * was barely shown (< 5 opt-in devices) — while the PREVIOUS release did have
 * uptake data — suggests users may not be opening the app at all (or the
 * update flow is broken before the banner even appears).
 *
 * The `previous release had data` guard is important: update analytics are
 * opt-in, so the CURRENT release can legitimately show ~0 counts for weeks
 * after launch while few people have enabled the toggle. Only when the system
 * demonstrably collects data (previous release shown >= 5) is a near-zero
 * current count meaningful.
 *
 * Uses only PUBLIC endpoints (the repo is public):
 *   - GitHub releases API (tag_name + published_at)
 *   - GET /api/telemetry/events/uptake?version=X&sinceHours=168
 *
 * Usage:
 *   node scripts/release-engagement-check.js 1.1.8
 *
 * Prints one JSON line. Exit 0.
 */

const REPO = 'benivanny14/Genz-whatsapp';
const SHOWN_MIN = 5;       // fewer opt-in devices seeing the banner → suspect
const LOW_AFTER_DAYS = 7;  // release considered stale after this many days
const UPTAKE_WINDOW_HOURS = 168; // 7 days

const fetchJson = async (url, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'genz-release-engagement' },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

// Pure decision logic — kept separate so it can be reasoned about / tested.
exports.compute = ({ currentVersion, releases = [], uptakes = {} }) => {
  const idx = releases.findIndex((r) => r.tag_name === `v${currentVersion}`);
  if (idx === -1) {
    return { lowEngagement: false, reason: `version ${currentVersion} not found in releases` };
  }
  const current = releases[idx];
  const previous = releases[idx + 1] || null;
  const ageDays = (Date.now() - new Date(current.published_at).getTime()) / 86400000;
  const currentShown = uptakes[currentVersion]?.shown ?? 0;
  const previousVersion = previous ? previous.tag_name.replace(/^v/, '') : null;
  const previousShown = previousVersion ? (uptakes[previousVersion]?.shown ?? 0) : 0;
  const lowEngagement = ageDays >= LOW_AFTER_DAYS && currentShown < SHOWN_MIN && previousShown >= SHOWN_MIN;
  return {
    currentVersion,
    currentShown,
    currentUpdated: uptakes[currentVersion]?.updated ?? 0,
    ageDays: Math.round(ageDays * 10) / 10,
    previousVersion,
    previousShown,
    lowEngagement,
    reason: lowEngagement
      ? `release live ${Math.round(ageDays)} days but only ${currentShown} device(s) saw the banner (previous release had ${previousShown})`
      : 'engagement OK (or no opt-in baseline yet)'
  };
};

async function main() {
  const currentVersion = process.argv[2];
  if (!currentVersion) {
    console.error('Usage: node scripts/release-engagement-check.js <version>');
    process.exit(1);
  }
  const releases = await fetchJson(`https://api.github.com/repos/${REPO}/releases?per_page=5`);
  const uptakes = {};
  const wanted = [currentVersion];
  const idx = releases.findIndex((r) => r.tag_name === `v${currentVersion}`);
  if (idx !== -1 && releases[idx + 1]) wanted.push(releases[idx + 1].tag_name.replace(/^v/, ''));
  for (const v of new Set(wanted)) {
    try {
      uptakes[v] = await fetchJson(
        `https://genz-whatsapp.onrender.com/api/telemetry/events/uptake?version=${encodeURIComponent(v)}&sinceHours=${UPTAKE_WINDOW_HOURS}`
      );
    } catch {
      uptakes[v] = { shown: 0, updated: 0, dismissed: 0 }; // endpoint down → treat as no data
    }
  }
  const result = exports.compute({ currentVersion, releases, uptakes });
  console.log(JSON.stringify(result));
}

if (require.main === module) main();
