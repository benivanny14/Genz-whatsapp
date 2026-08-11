/**
 * SECURITY (1.6): schedule the hard delete of a deleted-for-everyone message
 * after its retention window.
 *
 * Node's setTimeout clamps delays above 2^31-1 ms (~24.8 days) down to 1ms
 * (with a TimeoutOverflowWarning), so a naive `setTimeout(fn, 30 * 24 * 60 * 60 * 1000)`
 * would fire almost immediately and wipe the message — destroying the
 * deleted-messages mod's retention window right after a delete. This helper
 * walks the delay in sub-24-day chunks, keeping the timer accurate without
 * overflowing the 32-bit signed limit. The server-side sweep in server.js
 * (startExpiredMessageCleanup) remains the backstop for timers lost on restart.
 *
 * Retention depends on the deleting user's anti-revoke ("deleted messages")
 * settings:
 *   - mod ON  → purge after cacheRetentionDays (default 7), so the deleted-messages
 *               viewer + restore endpoint keep working for that window
 *   - mod OFF → purge after 30 days
 */
const Message = require('../models/Message');
const User = require('../models/User');

const MAX_TIMEOUT_MS = 2147483647; // 2^31 - 1 (~24.8 days)
const HARD_DELETE_DELAY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CACHE_RETENTION_DAYS = 7;

// Pure decision helper (unit-testable): when the anti-revoke mod is enabled
// and caches deleted messages, the message document must survive the default
// 30-day purge so the deleted-messages viewer + restore endpoint keep working.
const antiRevokeRetainsMessage = (settings) => Boolean(
  settings && settings.antiRevokeEnabled && settings.cacheDeletedMessages
);

// How long the deleted document is retained before the hard purge, based on
// the deleter's anti-revoke settings.
const hardDeleteDelayFor = (settings) => {
  if (!antiRevokeRetainsMessage(settings)) return HARD_DELETE_DELAY_MS;
  const days = Number(settings.cacheRetentionDays);
  const safeDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_CACHE_RETENTION_DAYS;
  return safeDays * DAY_MS;
};

/**
 * @param {object} message  the deleted message document (needs _id)
 * @param {string} [deleterId] user who deleted the message — their anti-revoke
 *                             setting decides the retention window
 */
const scheduleHardDelete = async (message, deleterId) => {
  if (!message?._id) return;

  let delay = HARD_DELETE_DELAY_MS;
  if (deleterId) {
    try {
      const query = User.findById(deleterId);
      const user = query && typeof query.select === 'function'
        ? await query.select('antiRevokeSettings').lean()
        : await query;
      delay = hardDeleteDelayFor(user?.antiRevokeSettings);
    } catch {
      // Fall through to the default 30-day purge if the lookup fails.
    }
  }

  let remaining = delay;
  const tick = () => {
    if (remaining <= 0) {
      Message.deleteOne({ _id: message._id, deletedForEveryone: true }).catch((cleanupErr) => {
        console.error('[HardDelete] cleanup failed:', cleanupErr?.message, { messageId: String(message._id) });
      });
      return;
    }
    const chunk = Math.min(remaining, MAX_TIMEOUT_MS);
    remaining -= chunk;
    setTimeout(tick, chunk).unref?.();
  };
  tick();
};

module.exports = { scheduleHardDelete, antiRevokeRetainsMessage, hardDeleteDelayFor };
