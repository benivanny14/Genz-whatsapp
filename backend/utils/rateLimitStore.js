/**
 * Shared Redis-backed rate limit store.
 *
 * express-rate-limit defaults to an in-memory store which resets on restart
 * and is not shared across multiple instances (e.g. Render scale-to-zero
 * restarts, multi-process deployments). Wrapping it with RedisSyncStore
 * makes rate limit counters persist across restarts and shared across
 * all running instances behind the same Redis.
 *
 * Falls back gracefully to in-memory when Redis is unavailable.
 */
const { RedisStore } = require('rate-limit-redis');

let storeInstance = null;

/**
 * Get or create a singleton RedisSyncStore for express-rate-limit.
 * @param {object} redisClient - an open `redis` v4 client (or null)
 * @returns {object|null} A RedisSyncStore instance, or null if Redis is unavailable
 */
function getRedisStore(redisClient) {
  if (storeInstance) return storeInstance;
  if (!redisClient) return null;

  try {
    storeInstance = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: 'rl:',       // namespace so keys don't collide with other Redis users
      resetExpiryOnChange: false,
    });
    return storeInstance;
  } catch (err) {
    console.warn('[RateLimitStore] Failed to create Redis store, falling back to memory:', err.message);
    return null;
  }
}

module.exports = { getRedisStore };
