// Shared chat display helpers — mirror of frontend/src/utils/chatDisplay.js so
// the RN prototype renders conversations the same way the web app does.
//
// Mock data uses plain strings (name/lastMessage), but real conversations
// derive the name from participants and carry a lastMessage OBJECT — these
// helpers handle both so wiring the RN app to the backend later stays safe.

export const getChatName = (chat, currentUserId = '') => {
  if (!chat) return 'Unknown';
  if (chat.name) return chat.name;
  if (chat.isGroup) return chat.groupName || 'Group';
  const otherUser = (chat.participants || []).find(
    (p) => String(p?._id || p) !== String(currentUserId)
  );
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
