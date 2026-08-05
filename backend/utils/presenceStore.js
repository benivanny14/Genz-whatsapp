// Distributed presence store (P2-3).
//
// Socket.io already uses the Redis adapter so rooms/emits are shared across
// instances; this store adds cross-instance PRESENCE visibility (online/away
// state), which the per-instance onlineUsers/socketToUser Maps cannot see.
//
// - Local instance state stays in the in-memory Maps (socket IDs are
//   instance-local and must not be shared).
// - Presence events are published to a Redis channel and replayed into
//   `sharedPresence`, so any instance can answer "is this user online?"
//   correctly even if their socket lives on another instance.
// - Without Redis configured, the store is a no-op (single-instance mode).

const EVENT_CHANNEL = 'genz:presence';

const instanceId = `genz_${process.pid}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

let pub = null;
let sub = null;
let subscribed = false;

const sharedPresence = new Map(); // userId -> { online, away, updatedAt }
const listeners = new Set(); // (data) => void

const handleMessage = (message) => {
  try {
    const data = JSON.parse(message);
    if (!data || !data.userId) return;
    if (data.instanceId && data.instanceId === instanceId) return; // ignore own echo
    sharedPresence.set(data.userId, {
      online: Boolean(data.online),
      away: Boolean(data.away),
      updatedAt: Date.now()
    });
    listeners.forEach((cb) => {
      try { cb(data); } catch (e) { /* listener errors must not break presence */ }
    });
  } catch (e) {
    // Ignore malformed presence messages
  }
};

// Wire the store to the Redis pub/sub clients (called once at startup).
// Passing null/undefined keeps the store in single-instance no-op mode.
const init = ({ pubClient, subClient } = {}) => {
  pub = pubClient || null;
  sub = subClient || null;
  if (!sub) return;
  try {
    sub.subscribe(EVENT_CHANNEL).catch(() => {});
    if (!subscribed) {
      sub.on('message', (channel, message) => {
        if (channel === EVENT_CHANNEL) handleMessage(message);
      });
      subscribed = true;
    }
  } catch (e) {
    // Redis unavailable — presence stays single-instance
  }
};

// Publish this instance's presence state to all other instances.
const publish = ({ userId, online, away = false }) => {
  if (!pub || !pub.isOpen || !userId) return;
  pub.publish(EVENT_CHANNEL, JSON.stringify({ instanceId, userId, online, away })).catch(() => {});
};

// Local instance bookkeeping + cross-instance broadcast in one call.
const setLocalPresence = (userId, { online, away = false }) => {
  sharedPresence.set(userId, { online, away, updatedAt: Date.now() });
  publish({ userId, online, away });
};

const removeLocalPresence = (userId) => {
  sharedPresence.delete(userId);
  publish({ userId, online: false, away: false });
};

const isOnline = (userId) => {
  if (!userId) return false;
  return Boolean(sharedPresence.get(String(userId))?.online);
};

const isAway = (userId) => {
  if (!userId) return false;
  return Boolean(sharedPresence.get(String(userId))?.away);
};

const onPresenceChange = (cb) => {
  if (typeof cb === 'function') listeners.add(cb);
  return () => listeners.delete(cb);
};

module.exports = {
  init,
  setLocalPresence,
  removeLocalPresence,
  publish,
  isOnline,
  isAway,
  onPresenceChange,
  EVENT_CHANNEL
};
