/**
 * MongoDB Map fields may deserialize as plain objects when loaded from DB.
 * Always normalize before calling .get() / .set().
 */
const ensureUnreadMap = (conversation) => {
  if (!conversation) return new Map();
  const uc = conversation.unreadCount;
  if (uc && typeof uc.get === 'function' && typeof uc.set === 'function') {
    return uc;
  }
  const raw = uc && typeof uc === 'object' ? uc : {};
  const entries = raw instanceof Map ? [...raw.entries()] : Object.entries(raw);
  conversation.unreadCount = new Map(entries);
  return conversation.unreadCount;
};

const getUnreadCount = (conversation, userId) => {
  const map = ensureUnreadMap(conversation);
  return map.get(String(userId)) || 0;
};

const setUnreadCount = (conversation, userId, count) => {
  ensureUnreadMap(conversation).set(String(userId), count);
};

module.exports = { ensureUnreadMap, getUnreadCount, setUnreadCount };
