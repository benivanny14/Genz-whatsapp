// Shared helpers for rendering conversations in chat-list modals.
//
// Real conversations have no `name` field (it is derived from participants
// client-side) and `lastMessage` is a message OBJECT ({ content, messageType,
// timestamp, ... }) — never call string methods on either directly, or you
// get "chat.lastMessage?.toLowerCase is not a function".

export const getChatName = (chat, currentUserId = '') => {
  if (!chat) return 'Unknown';
  if (chat.name) return chat.name;
  if (chat.isGroup) return chat.groupName || 'Group';
  const otherUser = (chat.participants || []).find((p) => String(p._id) !== String(currentUserId));
  if (!otherUser && (chat.participants?.length || 0) > 0) return 'You';
  return otherUser?.username || chat.groupName || 'Unknown';
};

export const getLastMessageText = (chat) => {
  const lm = chat?.lastMessage;
  if (!lm) return 'No messages yet';
  if (typeof lm === 'string') return lm;
  if (lm.isConsumed) return lm.isSelfDestruct ? '💥 Message self-destructed' : '👁️ Opened';
  if (lm.isViewOnce) return '🤫 View once message';
  if (lm.messageType === 'image') return '📷 Photo' + (lm.caption ? `: ${lm.caption}` : '');
  if (lm.messageType === 'video') return '🎥 Video' + (lm.caption ? `: ${lm.caption}` : '');
  if (lm.messageType === 'audio') return '🎵 Voice note';
  if (lm.messageType === 'sticker') return '🖼️ Sticker';
  if (lm.messageType === 'contact') return '👤 Contact';
  if (lm.messageType === 'location') return '📍 Location';
  if (lm.messageType === 'gif') return '🎞️ GIF';
  if (typeof lm.content === 'string') return lm.content;
  if (lm.content && typeof lm.content === 'object') return '🔒 E2EE';
  return String(lm.message || lm.text || '');
};

// Timestamp for a conversation's last message — never renders "Invalid Date".
export const getLastMessageTime = (chat) => {
  const lm = chat?.lastMessage;
  if (lm && typeof lm === 'object' && lm.timestamp) return lm.timestamp;
  return chat?.lastMessageTime || null;
};
