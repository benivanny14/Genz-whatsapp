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
    messageType: base.messageType || 'text',
    mediaUrl: base.mediaUrl || '',
    fileName: base.fileName || '',
    fileSize: base.fileSize || 0,
    duration: base.duration || 0,
    replyTo: serializeReplyTo(base.replyTo),
    isViewOnce: Boolean(base.isViewOnce),
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
    ...extras
  };
};

module.exports = { serializeOutgoingMessage };
