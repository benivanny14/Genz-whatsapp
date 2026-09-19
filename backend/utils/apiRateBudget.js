/**
 * Global /api rate-limit budget resolution.
 *
 * One IP can mean two very different things: a real user in production, or the
 * CI e2e job, where 29 Playwright specs plus three socket scripts, the smoke
 * test (137 checks) and the full verification (186 checks) all call the API
 * from a single runner IP inside one 15-minute window. The development default
 * (200) is far too small for the latter — 231 requests were rejected with 429
 * there, and because the limiter is mounted at /api/ it also throttled the
 * admin login path, so EVERY later step failed for a reason unrelated to what
 * it was testing.
 *
 * So the budget is overridable with API_RATE_MAX — the same escape hatch
 * AUTH_RATE_MAX already gives the auth budget. The override is set by whoever
 * runs the process (CI env, a local shell), never by a request, so the
 * production posture is unchanged: 5000/15min per IP unless an operator says
 * otherwise.
 */

// 5000/15min (~5.5/s) is deliberately generous: Render puts all traffic behind
// one IP, and the APK polls continuously, so a tighter budget would throttle
// real users before it ever slowed an attacker down.
const PRODUCTION_DEFAULT = 5000;
const TEST_DEFAULT = 100000;
const DEVELOPMENT_DEFAULT = 200;

function resolveApiRateMax(env = process.env) {
  const override = parseInt(env.API_RATE_MAX, 10);
  if (Number.isFinite(override) && override > 0) return override;
  if (env.NODE_ENV === 'production') return PRODUCTION_DEFAULT;
  if (env.NODE_ENV === 'test') return TEST_DEFAULT;
  return DEVELOPMENT_DEFAULT;
}

module.exports = {
  resolveApiRateMax,
  PRODUCTION_DEFAULT,
  TEST_DEFAULT,
  DEVELOPMENT_DEFAULT
};
