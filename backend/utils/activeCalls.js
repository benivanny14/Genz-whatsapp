/** In-memory active call sessions (per socket user) */
const activeCalls = new Map();

const callKey = (userId, conversationId) => `${userId}:${conversationId || 'direct'}`;

exports.startCall = (userId, data = {}) => {
  const key = callKey(userId, data.conversationId);
  activeCalls.set(key, {
    userId,
    conversationId: data.conversationId,
    callType: data.callType || 'voice',
    calleeId: data.calleeId || data.targetUserId,
    startedAt: Date.now()
  });
  return activeCalls.get(key);
};

exports.endCall = (userId, conversationId) => {
  const key = callKey(userId, conversationId);
  const session = activeCalls.get(key);
  activeCalls.delete(key);
  if (!session) return null;
  const duration = Math.floor((Date.now() - session.startedAt) / 1000);
  return { ...session, duration };
};

exports.getCall = (userId, conversationId) => activeCalls.get(callKey(userId, conversationId));

exports.endCallsForUser = (userId) => {
  if (!userId) return [];
  const ended = [];
  for (const [key, session] of activeCalls.entries()) {
    if (session.userId?.toString() === userId?.toString() || session.calleeId?.toString() === userId?.toString()) {
      activeCalls.delete(key);
      ended.push(session);
    }
  }
  return ended;
};

exports.cleanupExpired = (maxAgeMs = 2 * 60 * 60 * 1000) => {
  const now = Date.now();
  let removed = 0;
  for (const [key, session] of activeCalls.entries()) {
    if (!session.startedAt || now - session.startedAt > maxAgeMs) {
      activeCalls.delete(key);
      removed += 1;
    }
  }
  return removed;
};

exports.size = () => activeCalls.size;
