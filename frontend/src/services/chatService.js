/**
 * chatService.js
 * Handles all chat/conversation/message API calls
 */
import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';

const chatService = {
  // ── Conversations ─────────────────────────────────────────────────
  getConversations: async () => {
    const res = await authFetch(`${API_URL}/chat/conversations`);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  getConversation: async (id) => {
    const res = await authFetch(`${API_URL}/chat/conversations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch conversation');
    return res.json();
  },

  createConversation: async (participantId) => {
    const res = await authFetch(`${API_URL}/chat/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  },

  createGroup: async (name, participants) => {
    const res = await authFetch(`${API_URL}/chat/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, participants }),
    });
    if (!res.ok) throw new Error('Failed to create group');
    return res.json();
  },

  archiveConversation: async (id) => {
    const res = await authFetch(`${API_URL}/chat/conversations/${id}/archive`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to archive conversation');
    return res.json();
  },

  deleteConversation: async (id) => {
    const res = await authFetch(`${API_URL}/chat/conversations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
  },

  // ── Messages ──────────────────────────────────────────────────────
  getMessages: async (conversationId, page = 1, limit = 50) => {
    const res = await authFetch(`${API_URL}/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  sendMessage: async (conversationId, content, type = 'text', extra = {}) => {
    const res = await authFetch(`${API_URL}/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, content, messageType: type, ...extra }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  sendMediaMessage: async (conversationId, file, caption = '') => {
    const form = new FormData();
    form.append('file', file);
    form.append('conversationId', conversationId);
    form.append('caption', caption);
    const res = await authFetch(`${API_URL}/chat/messages/media`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error('Failed to send media');
    return res.json();
  },

  deleteMessage: async (messageId) => {
    const res = await authFetch(`${API_URL}/chat/messages/${messageId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete message');
    return res.json();
  },

  reactToMessage: async (messageId, emoji) => {
    const res = await authFetch(`${API_URL}/chat/messages/${messageId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) throw new Error('Failed to react to message');
    return res.json();
  },

  pinMessage: async (messageId) => {
    const res = await authFetch(`${API_URL}/chat/messages/${messageId}/pin`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to pin message');
    return res.json();
  },

  // ── Starred Messages ──────────────────────────────────────────────
  starMessage: async (messageId) => {
    const res = await authFetch(`${API_URL}/chat/messages/${messageId}/star`, { method: 'PUT' });
    if (!res.ok) throw new Error('Failed to star message');
    return res.json();
  },

  getStarredMessages: async () => {
    const res = await authFetch(`${API_URL}/chat/messages/starred`);
    if (!res.ok) return [];
    return res.json();
  },

  // ── Search ────────────────────────────────────────────────────────
  searchMessages: async (query) => {
    const res = await authFetch(`${API_URL}/advanced/search-messages?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return res.json();
  },

  // ── Broadcast ─────────────────────────────────────────────────────
  getBroadcasts: async () => {
    const res = await authFetch(`${API_URL}/advanced/broadcast`);
    if (!res.ok) return [];
    return res.json();
  },

  createBroadcast: async (name, participants) => {
    const res = await authFetch(`${API_URL}/advanced/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, participants }),
    });
    if (!res.ok) throw new Error('Failed to create broadcast');
    return res.json();
  },

  // ── Disappearing Messages ─────────────────────────────────────────
  setDisappearingMessages: async (conversationId, duration) => {
    const res = await authFetch(`${API_URL}/advanced/conversations/${conversationId}/disappearing-messages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration }),
    });
    if (!res.ok) throw new Error('Failed to set disappearing messages');
    return res.json();
  },
  // ── Language Per Chat ────────────────────────────────────────────
  setConversationLanguage: async (conversationId, language) => {
    const res = await authFetch(`${API_URL}/chat/conversations/${conversationId}/language`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language }),
    });
    if (!res.ok) throw new Error('Failed to set conversation language');
    return res.json();
  },
};

export default chatService;
