/**
 * Idempotency middleware — prevents duplicate processing of the same request.
 *
 * Clients send an `Idempotency-Key` header (UUID recommended). The server
 * stores the response for that key in Redis for 24 hours. If the same key
 * is seen again, the stored response is returned without re-executing the
 * handler. Essential for payment endpoints and any write that must not
 * double-execute (e.g. subscription upgrades, broadcast sends).
 *
 * Env: REDIS_URL (falls back to in-memory Map for single-instance dev)
 *
 * Usage:
 *   const { idempotency } = require('./middleware/idempotency');
 *   router.post('/payment', auth, idempotency(), createPayment);
 *   router.post('/broadcast', auth, idempotency(300), sendBroadcast); // 5min window
 */
const PREFIX = 'idemp:';
const DEFAULT_TTL = 86400; // 24 hours

const memoryStore = new Map(); // fallback for no-Redis dev

function getRedis() {
  return (typeof global !== 'undefined' ? global.redisClient : null) || null;
}

/**
 * Create an idempotency middleware.
 * @param {number} [ttlSeconds] - how long to remember the key (default 24h)
 */
function idempotency(ttlSeconds = DEFAULT_TTL) {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!key || typeof key !== 'string' || key.length < 8 || key.length > 256) {
      return next(); // no key → no idempotency check
    }

    const storeKey = `${PREFIX}${req.user?._id || 'anon'}:${key}`;
    const rc = getRedis();

    // 1. Check if we've seen this key before
    let stored = null;
    try {
      if (rc && rc.isOpen) {
        const raw = await rc.get(storeKey);
        stored = raw ? JSON.parse(raw) : null;
      } else {
        const entry = memoryStore.get(storeKey);
        if (entry && Date.now() - entry.ts < ttlSeconds * 1000) {
          stored = entry.body;
        } else {
          memoryStore.delete(storeKey);
        }
      }
    } catch {
      // Redis error → proceed without idempotency
    }

    if (stored) {
      // Replay the stored response
      res.setHeader('X-Idempotent-Replay', 'true');
      return res.status(stored.status).json(stored.body);
    }

    // 2. Intercept res.json to capture the response for storage
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const payload = { status: res.statusCode, body };
        const serialized = JSON.stringify(payload);

        if (rc && rc.isOpen) {
          rc.setEx(storeKey, ttlSeconds, serialized).catch(() => {});
        } else {
          memoryStore.set(storeKey, { body: payload, ts: Date.now() });
        }
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = { idempotency };
