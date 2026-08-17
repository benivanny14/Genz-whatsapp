// Helpers shared by the status feeds so "mute status updates" and "block from
// status" are enforced consistently wherever the feed is assembled
// (statusController.getStatuses and advancedController.getStatuses).

// Active mutes: an entry without expiresAt is permanent ("forever"); otherwise
// the mute only counts while its expiry is still in the future.
const getActiveMutedUserIds = (user = {}) => {
  const now = Date.now();
  return new Set(
    (user.mutedStatusUsers || [])
      .filter((m) => !m.expiresAt || new Date(m.expiresAt).getTime() > now)
      .map((m) => String(m.user))
  );
};

// Status blocks are permanent until removed (block entries have no expiresAt).
const getActiveStatusBlockedUserIds = (user = {}) =>
  new Set((user.blockedStatusUsers || []).map((b) => String(b.user)));

module.exports = { getActiveMutedUserIds, getActiveStatusBlockedUserIds };
