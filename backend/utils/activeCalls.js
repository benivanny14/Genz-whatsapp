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
