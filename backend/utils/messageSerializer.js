/**
 * Serialize a message document for socket/API emission (avoids circular refs & stack overflows).
 */
const serializeOutgoingMessage = (msgObj = {}, extras = {}) => {
  const serializeSender = (sender) => {
    if (!sender) return null;
    if (typeof sender === 'string') return sender;
    if (typeof sender !== 'object') return String(sender);
    return {
      _id: sender._id?.toString?.() || String(sender._id || ''),
      username: sender.username,
      profilePicture: sender.profilePicture || null
    };
  };

  const serializeReplyTo = (replyTo) => {
    if (!replyTo) return null;
    if (typeof replyTo === 'string') return replyTo;
    if (typeof replyTo === 'object' && replyTo._id) {
      return {
        _id: replyTo._id.toString(),
        content: typeof replyTo.content === 'string'
          ? replyTo.content.slice(0, 500)  // limit urefu
          : '',
        messageType: replyTo.messageType,
        sender: serializeSender(replyTo.sender)
        // ❌ Usiweke replyTo.replyTo hapa - hii inasababisha mzunguko
      };
    }
    return null;
  };

  let base = msgObj;
  if (msgObj && typeof msgObj.toObject === 'function') {
    try {
      base = msgObj.toObject({ depopulate: true, virtuals: false });
    } catch {
      base = msgObj;
    }
  }

  return {
    _id: base._id ? base._id.toString() : null,
    conversationId: base.conversationId?.toString?.() || String(base.conversationId || ''),
    sender: serializeSender(base.sender),
    content: base.content,
    caption: base.caption || '',
    messageType: base.messageType || 'text',
    mediaUrl: base.mediaUrl || '',
    fileName: base.fileName || '',
    fileSize: base.fileSize || 0,
    duration: base.duration || 0,
    replyTo: serializeReplyTo(base.replyTo),
    // Location message fields — must be forwarded or the "live" pin never
    // shows and the client has no coordinates to open in Maps.
    latitude: typeof base.latitude === 'number' ? base.latitude : null,
    longitude: typeof base.longitude === 'number' ? base.longitude : null,
    isLiveLocation: Boolean(base.isLiveLocation),
    liveLocationExpiresAt: base.liveLocationExpiresAt || null,
    liveLocationStoppedAt: base.liveLocationStoppedAt || null,
    isViewOnce: Boolean(base.isViewOnce),
    isVideoNote: Boolean(base.isVideoNote),
    isSelfDestruct: Boolean(base.isSelfDestruct),
    isConsumed: Boolean(base.isConsumed),
    disappearAt: base.disappearAt || null,
    mentions: Array.isArray(base.mentions)
      ? base.mentions.map((m) => ({
          user: typeof m.user === 'object' && m.user
            ? m.user._id?.toString?.() || String(m.user._id || '')
            : (m.user ? String(m.user) : null),
          username: m.username,
          displayName: m.displayName
        }))
      : [],
    status: base.status || 'sent',
    createdAt: base.createdAt,
    isClientE2EE: Boolean(base.isClientE2EE),
    // E2EE key stamp — fingerprint + current/old status of the key that
    // encrypted the message, so clients render the key badge from the record.
    e2eeKeyFingerprint: base.e2eeKeyFingerprint || null,
    e2eeKeyStatus: base.e2eeKeyStatus || null,
    // FIX: quotedStatus (the "replying to @user's status" quote) was not
    // part of this shared whitelist, so every place that serializes a
    // message for chat history (GET /messages, conversation fetch, etc.)
    // silently dropped it even after it started being saved on the Message
    // document — only the one call site that manually re-attached it as an
    // `extra` after calling this function kept it. Returning it here means
    // any endpoint using this serializer preserves the status-reply link.
    quotedStatus: base.quotedStatus && base.quotedStatus.statusId ? {
      statusId: base.quotedStatus.statusId,
      ownerName: base.quotedStatus.ownerName || null,
      preview: base.quotedStatus.preview || null,
      type: base.quotedStatus.type || 'text',
      mediaUrl: base.quotedStatus.mediaUrl || null
    } : null,
    ...extras
  };
};

module.exports = { serializeOutgoingMessage };
