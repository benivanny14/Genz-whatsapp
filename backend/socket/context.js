const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Status = require('../models/Status');
const Broadcast = require('../models/Broadcast');
const { resolveMessageMentions } = require('../utils/mentions');
const { scheduleHardDelete } = require('../utils/hardDelete');
const { logInfo, logError, logWarning, logDebug } = require('../config/winston');

const {
  sendMentionNotification,
  sendNewMessageNotification
} = require('../services/notificationService');
const { ensureUnreadMap, getUnreadCount, setUnreadCount } = require('../utils/unreadCount');
const { serializeOutgoingMessage } = require('../utils/messageSerializer');
const {
  normalizeReplyToId,
  getSelfDestructExpiry,
  isConversationBlocked,
  isEitherUserBlocked
} = require('../utils/messageSendHelpers');
const presenceStore = require('../utils/presenceStore');

// Use the shared onlineUsers map from server.js (global.onlineUsers)
// This ensures socket handlers and HTTP controllers share the same online users state
// Use shared map from server.js — always reference via global to catch late init
const getOnlineUsers = () => global.onlineUsers || new Map();
// Redis-backed onlineUsers (C.1 horizontal scaling). The in-memory Map stays as
// the fast-path for this process; every set/delete also mirrors into a Redis
// Hash (online_users) so OTHER instances can see presence. Reads fall back to
// the local Map when Redis is unavailable (single-instance mode).
const getPresenceRedis = () => (typeof global !== 'undefined' ? global.redisClient : null) || null;
const setOnlineUser = async (k, v) => {
  getOnlineUsers().set(k, v);
  const rc = getPresenceRedis();
  if (rc && rc.isOpen) {
    try { await rc.hSet('online_users', String(k), String(v)); } catch { /* local map is still the fallback */ }
  }
};
const deleteOnlineUser = async (k) => {
  getOnlineUsers().delete(k);
  const rc = getPresenceRedis();
  if (rc && rc.isOpen) {
    try { await rc.hDel('online_users', String(k)); } catch { /* local map is still the fallback */ }
  }
};
const onlineUsers = {
  get: (k) => getOnlineUsers().get(k),
  set: setOnlineUser,
  delete: deleteOnlineUser,
  has: (k) => getOnlineUsers().has(k),
  // Async cross-instance lookup: Redis first (shared presence), then local map.
  getAcrossInstances: async (k) => {
    const rc = getPresenceRedis();
    if (rc && rc.isOpen) {
      try {
        const sid = await rc.hGet('online_users', String(k));
        if (sid) return sid;
      } catch { /* fall through to local map */ }
    }
    return getOnlineUsers().get(k) || null;
  }
};
// Per-user "away" flag for the alwaysOnline mod / idle-presence feature.
// In-memory only (like onlineUsers) — resets on server restart, which is
// fine since it's re-established the moment the client reconnects and
// sends its current activity state.
const userAwayStatus = new Map();
const socketToUser = new Map();
const messageDeduplication = new Map(); // In-memory dedup fallback (Redis preferred, see below)

const MESSAGE_DEDUP_TTL = 60000; // 1 minute TTL for deduplication
const MESSAGE_DEDUP_MAX_SIZE = 10000; // Maximum size to prevent memory leaks

// SECURITY (3.12): deduplication is shared across instances via Redis when
// configured (server.js exposes it on global.redisClient). The in-memory Map
// remains only as a single-instance fallback.
const getRedisClient = () => (typeof global !== 'undefined' ? global.redisClient : null) || null;

const dedupHas = async (key) => {
  const rc = getRedisClient();
  if (rc && rc.isOpen) {
    try {
      return Boolean(await rc.get(`dedup:${key}`));
    } catch { /* fall back to in-memory on Redis error */ }
  }
  return messageDeduplication.has(key);
};

const dedupSet = async (key) => {
  const rc = getRedisClient();
  if (rc && rc.isOpen) {
    try {
      await rc.setEx(`dedup:${key}`, MESSAGE_DEDUP_TTL / 1000, '1');
      return;
    } catch { /* fall back to in-memory on Redis error */ }
  }
  messageDeduplication.set(key, Date.now());
};

const dedupDelete = (key) => {
  const rc = getRedisClient();
  if (rc && rc.isOpen) {
    rc.del(`dedup:${key}`).catch(() => {});
    return;
  }
  messageDeduplication.delete(key);
};

const isUserStillOnline = (userId) => {
  if (!userId) return false;
  const localOnline = [...socketToUser.values()].some((id) => id?.toString() === userId.toString());
  return localOnline || presenceStore.isOnline(userId);
};

// Periodic cleanup to prevent memory leaks. Only needed for the in-memory
// fallback — when Redis is connected its 60s TTL handles expiry, so the
// cleanup is skipped entirely (SECURITY 3.12).
const _dedupCleanupInterval = setInterval(() => {
  const rc = getRedisClient();
  if (rc && rc.isOpen) return; // Redis TTL handles expiry
  const now = Date.now();
  let deleted = 0;
  messageDeduplication.forEach((timestamp, key) => {
    if (now - timestamp > MESSAGE_DEDUP_TTL) {
      messageDeduplication.delete(key);
      deleted++;
    }
  });
  // Also limit size if growing too large
  if (messageDeduplication.size > MESSAGE_DEDUP_MAX_SIZE) {
    const entries = Array.from(messageDeduplication.entries())
      .sort((a, b) => a[1] - b[1]);
    const toDelete = entries.slice(0, entries.length - MESSAGE_DEDUP_MAX_SIZE);
    toDelete.forEach(([key]) => messageDeduplication.delete(key));
    deleted += toDelete.length;
  }
  if (deleted > 0) {
        logDebug('Cleaned up old deduplication entries', { deleted, currentSize: messageDeduplication.size });
  }
}, 30000); // Run every 30 seconds
_dedupCleanupInterval.unref?.();

const SOCKET_SETUP_FLAG = Symbol.for('genz.socket.setup');

const includesId = (items = [], id) => {
  if (!Array.isArray(items)) return false;
  const target = id?._id ? id._id.toString() : id?.toString();
  return items.some(item => (item?._id ? item._id.toString() : item?.toString()) === target);
};

const safeAsyncHandler = (socket, handler) => async (data) => {
  try {
    await handler(data);
  } catch (error) {
    logError('[Socket] Handler error:', error);
    socket.emit('error', { message: 'Internal server error' });
  }
};

const normalizeDisappearingMessages = ({ enabled, duration, timer } = {}) => {
  const raw = duration ?? timer ?? enabled;
  const text = String(raw ?? '').trim();
  if (!text || /^(false|off|none|0)$/i.test(text)) {
    return { enabled: false, duration: 'Off', timer: 0 };
  }

  if (/^\d+$/.test(text)) {
    const hours = Math.max(1, Number(text));
    return { enabled: true, duration: `${hours}h`, timer: hours };
  }

  const match = text.match(/^(\d+)\s*([hd])$/i);
  if (match) {
    const amount = Math.max(1, Number(match[1]));
    const unit = match[2].toLowerCase();
    return {
      enabled: true,
      duration: `${amount}${unit}`,
      timer: unit === 'd' ? amount * 24 : amount
    };
  }

  const hours = Number(timer) || 24;
  return { enabled: Boolean(enabled ?? true), duration: text || `${hours}h`, timer: hours };
};

const getConversationIfParticipant = async (conversationId, socket) => {
  if (!conversationId || !socket.userId) return null;
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !includesId(conversation.participants, socket.userId)) {
    socket.emit('error', { message: 'Not authorized for this conversation' });
    return null;
  }
  return conversation;
};

const getMessageIfParticipant = async (messageId, socket) => {
  if (!messageId || !socket.userId) return null;
  const message = await Message.findById(messageId);
  if (!message) return null;
  const conversation = await Conversation.findById(message.conversationId);
  if (!conversation || !includesId(conversation.participants, socket.userId)) {
    socket.emit('error', { message: 'Not authorized for this message' });
    return null;
  }
  return { message, conversation };
};

const getMapValue = (mapLike, key) => {
  if (!mapLike || !key) return undefined;
  if (typeof mapLike.get === 'function') return mapLike.get(String(key));
  return mapLike[String(key)];
};

const setMapValue = (doc, field, key, value) => {
  if (!doc[field]) doc[field] = new Map();
  if (typeof doc[field].set === 'function') {
    doc[field].set(String(key), value);
  } else {
    doc[field][String(key)] = value;
  }
  doc.markModified(field);
};

const deleteMapValue = (doc, field, key) => {
  if (!doc[field]) return;
  if (typeof doc[field].delete === 'function') {
    doc[field].delete(String(key));
  } else {
    delete doc[field][String(key)];
  }
  doc.markModified(field);
};

const notifyMentionedUsers = async ({ io, onlineUsers, mentionedUserIds = [], message, senderName, text, mentionerId }) => {
  if (!mentionedUserIds.length || !message?._id) return;

  mentionedUserIds.forEach((userId) => {
    const recipientSocketId = onlineUsers.get(userId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('notification:mention', {
        conversationId: message.conversationId?.toString(),
        message
      });
    }
  });

  await Promise.allSettled(
    mentionedUserIds.map((userId) =>
      sendMentionNotification(userId, {
        mentionerName: senderName || 'Someone',
        text,
        conversationId: message.conversationId?.toString(),
        messageId: message._id.toString(),
        mentionerId: mentionerId?.toString()
      })
    )
  );
};

/**
 * Build the per-connection context handed to every handler module.
 * Keeps all shared models, utils and helpers in one place so handler files
 * stay focused on wiring socket events.
 */
const createContext = (io, socket) => ({
  io,
  socket,
  mongoose,
  Message,
  Conversation,
  User,
  Status,
  Broadcast,
  resolveMessageMentions,
  sendMentionNotification,
  sendNewMessageNotification,
  ensureUnreadMap,
  getUnreadCount,
  setUnreadCount,
  serializeOutgoingMessage,
  normalizeReplyToId,
  getSelfDestructExpiry,
  isConversationBlocked,
  isEitherUserBlocked,
  presenceStore,
  scheduleHardDelete,
  getOnlineUsers,
  onlineUsers,
  userAwayStatus,
  socketToUser,
  isUserStillOnline,
  includesId,
  safeAsyncHandler,
  normalizeDisappearingMessages,
  getConversationIfParticipant,
  getMessageIfParticipant,
  getMapValue,
  setMapValue,
  deleteMapValue,
  notifyMentionedUsers,
  dedupHas,
  dedupSet,
  dedupDelete
});

// Cleanup intervals on process exit
process.on('SIGTERM', () => { clearInterval(_dedupCleanupInterval); });
process.on('SIGINT', () => { clearInterval(_dedupCleanupInterval); });

module.exports = {
  createContext,
  SOCKET_SETUP_FLAG,
  socketToUser,
  userAwayStatus,
  isUserStillOnline
};
