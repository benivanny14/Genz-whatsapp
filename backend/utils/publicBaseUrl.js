/**
 * Resolve the public base URL for signed media links and callbacks.
 * Prefer the live request host so stale PUBLIC_API_URL env values cannot break playback.
 */
const resolvePublicBaseUrl = (req) => {
  const fromEnv = (process.env.PUBLIC_API_URL || process.env.BACKEND_URL || '').replace(/\/$/, '');

  if (!req || typeof req.get !== 'function') {
    return fromEnv;
  }

  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) {
    return fromEnv;
  }

  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
  const fromRequest = `${proto}://${host}`.replace(/\/$/, '');

  if (!fromEnv) {
    return fromRequest;
  }

  if (process.env.NODE_ENV === 'production' && fromEnv !== fromRequest) {
    return fromRequest;
  }

  return fromEnv;
};

module.exports = { resolvePublicBaseUrl };
