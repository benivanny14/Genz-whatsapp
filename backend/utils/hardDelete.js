/**
 * SECURITY (1.6): schedule the hard delete of a deleted-for-everyone message
 * 30 days after it was deleted.
 *
 * Node's setTimeout clamps delays above 2^31-1 ms (~24.8 days) down to 1ms
 * (with a TimeoutOverflowWarning), so a naive `setTimeout(fn, 30 * 24 * 60 * 60 * 1000)`
 * would fire almost immediately and wipe the message — destroying the
 * deleted-messages mod's retention window right after a delete. This helper
 * walks the delay in sub-24-day chunks, keeping the timer accurate without
 * overflowing the 32-bit signed limit. The server-side sweep in server.js
 * (startExpiredMessageCleanup) remains the backstop for timers lost on restart.
 *
 * The 30-day purge only applies when the deleting user does NOT use the
 * anti-revoke ("deleted messages") mod: when the mod is enabled the message
 * document must survive so the viewer can still list/restore it (the per-user
 * deletedMessagesCache already expires on its own cacheRetentionDays).
 */
const Message = require('../models/Message');
const User = require('../models/User');

const MAX_TIMEOUT_MS = 2147483647; // 2^31 - 1 (~24.8 days)
const HARD_DELETE_DELAY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * @param {object} message  the deleted message document (needs _id)
 * @param {string} [deleterId] user who deleted the message — their anti-revoke
 *                             setting decides whether the 30-day purge runs
 */
// Pure decision helper (unit-testable): when the anti-revoke mod is enabled
// and caches deleted messages, the message document must survive the 30-day
// purge so the deleted-messages viewer + restore endpoint keep working.
const antiRevokeRetainsMessage = (settings) => Boolean(
  settings && settings.antiRevokeEnabled && settings.cacheDeletedMessages
);

const scheduleHardDelete = async (message, deleterId) => {
  if (!message?._id) return;

  if (deleterId) {
    try {
      const query = User.findById(deleterId);
      const user = query && typeof query.select === 'function'
        ? await query.select('antiRevokeSettings').lean()
        : await query;
      if (antiRevokeRetainsMessage(user?.antiRevokeSettings)) {
        // Anti-revoke mod on → keep the doc so the deleted-messages viewer
        // and restore endpoint keep working. No purge is scheduled.
        return;
      }
    } catch {
      // Fall through to the default 30-day purge if the lookup fails.
    }
  }

  let remaining = HARD_DELETE_DELAY_MS;
  const tick = () => {
    if (remaining <= 0) {
      Message.deleteOne({ _id: message._id, deletedForEveryone: true }).catch((cleanupErr) => {
        console.error('[HardDelete] cleanup failed:', cleanupErr?.message, { messageId: String(message._id) });
      });
      return;
    }
    const delay = Math.min(remaining, MAX_TIMEOUT_MS);
    remaining -= delay;
    setTimeout(tick, delay).unref?.();
  };
  tick();
};

module.exports = { scheduleHardDelete, antiRevokeRetainsMessage };
