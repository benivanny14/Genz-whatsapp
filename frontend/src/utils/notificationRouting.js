export const getConversationIdFromUrl = (search = window.location.search) => {
  if (typeof search !== 'string') return null;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get('conversationId') || params.get('chatId') || params.get('chat') || null;
};
