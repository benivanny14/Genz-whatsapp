/**
 * Redis Response Cache middleware.
 *
 * Caches successful JSON responses keyed by (userId + URL + query).
 * Only caches authenticated requests (req.user must exist).
 * TTL is configurable per-route via cache(seconds) or defaults to 60s.
 *
 * Env: REDIS_URL (falls back to no-op if Redis is unavailable)
 *
 * Usage:
 *   const { cache } = require('./middleware/redisCache');
 *   router.get('/conversations', auth, cache(60), getConversations);
 *   router.get('/profile', auth, cache(30), getProfile);
 */
function getRedis() {
  return (typeof global !== 'undefined' ? global.redisClient : null) || null;
}

/**
 * Create a cache middleware with the given TTL in seconds.
 * @param {number} duration - cache TTL in seconds (default 60)
 */
const cache = (duration = 60) => async (req, res, next) => {
  // Only cache for authenticated users with GET requests
  if (!req.user || !req.user._id || req.method !== 'GET') {
    return next();
  }

  const rc = getRedis();
  if (!rc || !rc.isOpen) return next(); // no Redis → pass through

  const key = `cache:${req.user._id}:${req.originalUrl}`;

  try {
    const cached = await rc.get(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }
  } catch {
    // Redis read error → pass through
  }

  // Override res.json to intercept and cache the response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300 && body) {
      rc.setEx(key, duration, JSON.stringify(body)).catch(() => {});
    }
    res.setHeader('X-Cache', 'MISS');
    return originalJson(body);
  };

  next();
};

/**
 * Invalidate all cached responses for a user.
 * Call after mutations (create/update/delete) to avoid stale data.
 * @param {string} userId
 * @param {string} [pattern] - optional URL pattern to match (e.g. '/api/chat')
 */
const invalidateCache = async (userId, pattern = '') => {
  const rc = getRedis();
  if (!rc || !rc.isOpen) return;

  try {
    const searchPattern = `cache:${userId}:${pattern}*`;
    const keys = [];
    let cursor = 0;

    do {
      const result = await rc.scan(cursor, { MATCH: searchPattern, COUNT: 100 });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    if (keys.length > 0) {
      await Promise.all(keys.map((k) => rc.del(k)));
    }
  } catch {
    // Best-effort invalidation
  }
};

module.exports = { cache, invalidateCache };
