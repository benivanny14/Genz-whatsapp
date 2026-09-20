const storageKey = (userId) => `genz_hidden_conversations:${userId || 'anonymous'}`;

export const getHiddenConversationIds = (userId) => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

export const addHiddenConversationId = (userId, conversationId) => {
  if (!conversationId) return;
  const id = String(conversationId);
  const next = new Set(getHiddenConversationIds(userId));
  next.add(id);
  localStorage.setItem(storageKey(userId), JSON.stringify(Array.from(next)));
};

export const removeHiddenConversationId = (userId, conversationId) => {
  if (!conversationId) return;
  const id = String(conversationId);
  const next = getHiddenConversationIds(userId).filter((entry) => entry !== id);
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
};

export const filterHiddenConversations = (conversations = [], userId) => {
  const hidden = new Set(getHiddenConversationIds(userId));
  if (!hidden.size) return conversations;
  return conversations.filter((conversation) => !hidden.has(String(conversation?._id)));
};
