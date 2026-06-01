import axios from 'axios';
import { getDeviceHeaders } from '../utils/deviceIdentity';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    ...getDeviceHeaders()
  },
  timeout: 10000,
});

// Add device headers to every request
api.interceptors.request.use(
  (config) => {
    const deviceHeaders = getDeviceHeaders();
    Object.assign(config.headers, deviceHeaders);
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.message);
    
    // Handle connection refused errors gracefully
    if (error.code === 'ERR_CONNECTION_REFUSED' || error.code === 'ECONNREFUSED') {
      console.warn('Backend server is not running. Please start the backend server.');
      return Promise.resolve({
        data: { 
          success: false, 
          message: 'Backend server is not running. Please start the server on port 5000.',
          isOffline: true 
        },
        status: 0,
      });
    }
    
    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
      console.warn('Network error. Please check your connection.');
      return Promise.resolve({
        data: { 
          success: false, 
          message: 'Network error. Please check your internet connection.',
          isOffline: true 
        },
        status: 0,
      });
    }
    
    // Return a safe error response instead of throwing
    return Promise.resolve({
      data: { success: false, message: error.message || 'Request failed' },
      status: error.response?.status || 500,
    });
  }
);

// Add offline mode detection
export const isOffline = () => {
  return !navigator.onLine || localStorage.getItem('offlineMode') === 'true';
};

// No authentication - no token handling

export const chatAPI = {
  getConversations: () => isOffline() ? Promise.resolve({ data: { success: false, conversations: [], isOffline: true } }) : api.get('/chat/conversations').catch(() => ({ data: { success: false, conversations: [], isOffline: true } })),
  getConversation: (id) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.get(`/chat/conversations/${id}`).catch(() => ({ data: { success: false, isOffline: true } })),
  getOrCreateConversation: (userId) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.post('/chat/conversation', { userId }).catch(() => ({ data: { success: false, isOffline: true } })),
  createGroup: (data) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.post('/chat/groups', data).catch(() => ({ data: { success: false, isOffline: true } })),
  addParticipant: (id, userId) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.post(`/chat/groups/${id}/participants`, { userId }).catch(() => ({ data: { success: false, isOffline: true } })),
  removeParticipant: (id, userId) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.delete(`/chat/groups/${id}/participants/${userId}`).catch(() => ({ data: { success: false, isOffline: true } })),
  makeAdmin: (id, userId) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.put(`/chat/groups/${id}/admins/${userId}`).catch(() => ({ data: { success: false, isOffline: true } })),
  leaveGroup: (id) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.delete(`/chat/groups/${id}/leave`).catch(() => ({ data: { success: false, isOffline: true } })),
  getMessages: (id, page = 1) => isOffline() ? Promise.resolve({ data: { success: false, messages: [], isOffline: true } }) : api.get(`/chat/conversations/${id}/messages?page=${page}`).catch(() => ({ data: { success: false, messages: [], isOffline: true } })),
  sendMessage: (data) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - message not sent', isOffline: true } }) : api.post('/chat/messages', data).catch(() => ({ data: { success: false, isOffline: true } })),
  editMessage: (id, content) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.put(`/chat/messages/${id}`, { content }).catch(() => ({ data: { success: false, isOffline: true } })),
  deleteMessage: (id, forEveryone = false) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.delete(forEveryone ? `/chat/messages/${id}/delete-for-everyone` : `/chat/messages/${id}`).catch(() => ({ data: { success: false, isOffline: true } })),
  markAsRead: (id) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.put(`/chat/messages/${id}/read`).catch(() => ({ data: { success: false, isOffline: true } })),
  addReaction: (id, emoji) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.post(`/chat/messages/${id}/reactions`, { emoji }).catch(() => ({ data: { success: false, isOffline: true } })),
  removeReaction: (id) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.delete(`/chat/messages/${id}/reactions`).catch(() => ({ data: { success: false, isOffline: true } })),
  searchUsers: (query) => isOffline() ? Promise.resolve({ data: { success: false, users: [], isOffline: true } }) : api.get(`/chat/users/search?query=${query}`).catch(() => ({ data: { success: false, users: [], isOffline: true } })),
  addContact: (userId) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.post('/chat/contacts', { userId }).catch(() => ({ data: { success: false, isOffline: true } })),
  getContacts: () => isOffline() ? Promise.resolve({ data: { success: false, contacts: [], isOffline: true } }) : api.get('/chat/contacts').catch(() => ({ data: { success: false, contacts: [], isOffline: true } })),
  blockUser: (id) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.post(`/chat/users/${id}/block`).catch(() => ({ data: { success: false, isOffline: true } })),
  unblockUser: (id) => isOffline() ? Promise.resolve({ data: { success: false, isOffline: true } }) : api.delete(`/chat/users/${id}/block`).catch(() => ({ data: { success: false, isOffline: true } })),
};

export const mediaAPI = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - file upload not available', isOffline: true } }) : api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMultipleFiles: (files) => {
    const formData = new FormData();
    (files || []).forEach(file => formData.append('files', file));
    return isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - file upload not available', isOffline: true } }) : api.post('/media/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const advancedAPI = {
  aiAssistant: (data) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - AI assistant not available', isOffline: true } }) : api.post('/advanced/ai-assistant', data),
  translateMessage: (data) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - translation not available', isOffline: true } }) : api.post('/advanced/translate', data),
  scheduleMessage: (data) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - message scheduling not available', isOffline: true } }) : api.post('/advanced/schedule-message', data),
  getScheduledMessages: () => isOffline() ? Promise.resolve({ data: { success: false, messages: [], isOffline: true } }) : api.get('/advanced/scheduled-messages'),
  cancelScheduledMessage: (id) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - cannot cancel scheduled message', isOffline: true } }) : api.delete(`/advanced/scheduled-messages/${id}`),
  createStatus: (data) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - status creation not available', isOffline: true } }) : api.post('/advanced/status', data),
  getStatuses: () => isOffline() ? Promise.resolve({ data: { success: false, statuses: [], isOffline: true } }) : api.get('/advanced/status'),
  viewStatus: (id) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - cannot view status', isOffline: true } }) : api.post(`/advanced/status/${id}/view`),
  deleteStatus: (id) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - cannot delete status', isOffline: true } }) : api.delete(`/advanced/status/${id}`),
  replyToStatus: (id, reply) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - cannot reply to status', isOffline: true } }) : api.post(`/advanced/status/reply/${id}`, { reply }),
  createBroadcast: (data) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - broadcast creation not available', isOffline: true } }) : api.post('/advanced/broadcast', data),
  getBroadcasts: () => isOffline() ? Promise.resolve({ data: { success: false, broadcasts: [], isOffline: true } }) : api.get('/advanced/broadcast'),
  updateBroadcast: (id, data) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - broadcast update not available', isOffline: true } }) : api.put(`/advanced/broadcast/${id}`, data),
  deleteBroadcast: (id) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - cannot delete broadcast', isOffline: true } }) : api.delete(`/advanced/broadcast/${id}`),
  sendBroadcastMessage: (id, message) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - cannot send broadcast message', isOffline: true } }) : api.post(`/advanced/broadcast/${id}/send`, { message }),
  setDisappearingMessages: (id, data) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - cannot set disappearing messages', isOffline: true } }) : api.put(`/advanced/conversations/${id}/disappearing-messages`, data),
  searchMessages: (query, conversationId) => isOffline() ? Promise.resolve({ data: { success: false, messages: [], isOffline: true } }) : api.get(`/advanced/search-messages?query=${query}${conversationId ? `&conversationId=${conversationId}` : ''}`),
};

export const genzModsAPI = {
  getSettings: () => isOffline() ? Promise.resolve({ data: { success: false, settings: {}, isOffline: true } }) : api.get('/genz-mods/settings'),
  updateSettings: (mods) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - settings update not available', isOffline: true } }) : api.put('/genz-mods/settings', { mods }),
  getDeletedMessages: () => isOffline() ? Promise.resolve({ data: { success: false, messages: [], isOffline: true } }) : api.get('/genz-mods/deleted-messages'),
  restoreMessage: (id) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - message restore not available', isOffline: true } }) : api.post(`/genz-mods/restore-message/${id}`),
  setAutoReply: (data) => isOffline() ? Promise.resolve({ data: { success: false, message: 'Offline mode - auto-reply update not available', isOffline: true } }) : api.post('/genz-mods/auto-reply', data),
  getUserStatus: (userId) => isOffline() ? Promise.resolve({ data: { success: false, status: {}, isOffline: true } }) : api.get(`/genz-mods/user-status/${userId}`),
};

export default api;
