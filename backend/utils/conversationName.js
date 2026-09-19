/**
 * Conversation display-name resolution.
 *
 * The `Conversation` schema has no `name` path: groups are named `groupName`
 * (+ `groupDescription`), and a private chat is named after the other
 * participant. Code that read `.name` therefore produced empty labels for every
 * group — "Unknown", "Group chat", "" in analytics, searches, exports, the file
 * manager and the admin dashboards.
 *
 * `.name` is still honoured as a last resort because older raw-driver seed data
 * and some aggregate/transcript payloads carry it, but `groupName` always wins.
 * Private chats pass the other participant's username as `fallback`.
 */
const getConversationName = (conversation, fallback = '') => {
  if (!conversation) return fallback;

  const groupName = typeof conversation.groupName === 'string' ? conversation.groupName.trim() : '';
  if (groupName) return groupName;

  const legacyName = typeof conversation.name === 'string' ? conversation.name.trim() : '';
  return legacyName || fallback;
};

module.exports = { getConversationName };
