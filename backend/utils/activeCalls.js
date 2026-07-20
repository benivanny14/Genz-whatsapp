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

// FIX: the WebRTC signaling handlers ('call:offer' / 'webrtc:offer') used to
// treat every incoming SDP offer the same way, so a plain mid-call ICE
// restart (a normal, harmless reaction to a brief network hiccup) looked
// identical to a brand new call. That made the server re-emit 'call:incoming'
// and re-send the push notification for a call that was already answered and
// connected — the callee's screen would jump back to the ringing UI and
// force them to accept/decline again, over and over, exactly like the phone
// "hanging up and redialing itself". markOfferSent lets the signaling
// handlers tell a fresh offer (no session yet, or session hasn't sent an
// offer yet) from a renegotiation offer (session already marked) so only the
// first one triggers the ringing UI/notification.
exports.markOfferSent = (userId, conversationId) => {
  const key = callKey(userId, conversationId);
  const session = activeCalls.get(key);
  if (!session) return false; // No tracked session — treat as a fresh call.
  const wasAlreadySent = !!session.offerSent;
  session.offerSent = true;
  return wasAlreadySent; // true => this offer is a renegotiation, not a new call
};

// FIX: previously there was no way to look up a user's active call(s) without
// already knowing the conversationId, so an abrupt disconnect (network drop,
// tab closed, app killed) mid-call never cleaned up activeCalls and never
// told the other party the call had ended — their screen would just hang.
// Scans for any session where this user is either the caller or the callee.
exports.endAllCallsForUser = (userId) => {
  const ended = [];
  for (const [key, session] of activeCalls.entries()) {
    if (String(session.userId) === String(userId) || String(session.calleeId) === String(userId)) {
      activeCalls.delete(key);
      const duration = Math.floor((Date.now() - session.startedAt) / 1000);
      ended.push({ ...session, duration });
    }
  }
  return ended;
};
