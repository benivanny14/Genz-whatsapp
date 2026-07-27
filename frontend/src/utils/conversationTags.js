const DEFAULT_TAGS = ['Work', 'Family', 'Favorites'];

export const getConversationTagsStorageKey = (userId = '') => `genz_conversation_tags:${userId}`;

const readStoredTags = (userId = '') => {
  try {
    const raw = globalThis.localStorage?.getItem(getConversationTagsStorageKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeStoredTags = (userId = '', value) => {
  globalThis.localStorage?.setItem(getConversationTagsStorageKey(userId), JSON.stringify(value));
};

export const loadConversationTags = (userId = '') => readStoredTags(userId);

export const saveConversationTags = (userId = '', tags = {}) => {
  writeStoredTags(userId, tags);
  return tags;
};

export const getAvailableTags = (userId = '') => {
  const stored = loadConversationTags(userId);
  const tags = new Set(DEFAULT_TAGS);
  Object.values(stored)
    .flat()
    .filter(Boolean)
    .forEach((tag) => tags.add(tag));
  return Array.from(tags);
};

export const addConversationTag = (userId = '', conversationId = '', tag = '') => {
  if (!conversationId || !tag) return loadConversationTags(userId);
  const next = { ...loadConversationTags(userId) };
  const existing = Array.isArray(next[conversationId]) ? next[conversationId] : [];
  if (existing.includes(tag)) {
    next[conversationId] = existing;
  } else {
    next[conversationId] = [...existing, tag];
  }
  saveConversationTags(userId, next);
  return next;
};

export const removeConversationTag = (userId = '', conversationId = '', tag = '') => {
  if (!conversationId) return loadConversationTags(userId);
  const next = { ...loadConversationTags(userId) };
  const existing = Array.isArray(next[conversationId]) ? next[conversationId] : [];
  next[conversationId] = existing.filter((item) => item !== tag);
  if (!next[conversationId].length) {
    delete next[conversationId];
  }
  saveConversationTags(userId, next);
  return next;
};
