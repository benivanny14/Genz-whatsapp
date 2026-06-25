import axios from 'axios';
import { getDeviceHeaders } from '../utils/deviceIdentity';
import { resolveApiBase } from '../utils/resolveApiBase';

let API_URL = resolveApiBase() || '/api';
if (API_URL !== '/api' && !API_URL.endsWith('/api')) {
  API_URL = `${API_URL}/api`;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', ...getDeviceHeaders() },
  timeout: 15000,
});

// ── Request interceptor: attach Bearer token on every request ─────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    Object.assign(config.headers, getDeviceHeaders());
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401, network errors ──────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If 401 Unauthorized, clear auth and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const offline = error.code === 'ERR_CONNECTION_REFUSED' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'ERR_NETWORK';

    if (offline) {
      return Promise.resolve({
        data: { success: false, message: 'Network error. Please check your connection.', isOffline: true },
        status: 0,
      });
    }

    return Promise.resolve({
      data: { success: false, message: error.message || 'Request failed' },
      status: error.response?.status || 500,
    });
  }
);

export const isOffline = () => !navigator.onLine || localStorage.getItem('offlineMode') === 'true';

const safe = (fallback) => (fn) => isOffline() ? Promise.resolve({ data: { success: false, ...fallback, isOffline: true } }) : fn().catch(() => ({ data: { success: false, ...fallback, isOffline: true } }));

export const chatAPI = {
  getConversations: () => safe({ conversations: [] })(() => api.get('/chat/conversations')),
  getConversation: (id) => safe({})(() => api.get(`/chat/conversations/${id}`)),
  getOrCreateConversation: (userId) => safe({})(() => api.post('/chat/conversation', { userId })),
  createGroup: (data) => safe({})(() => api.post('/chat/groups', data)),
  addParticipant: (id, userId) => safe({})(() => api.post(`/chat/groups/${id}/participants`, { userId })),
  removeParticipant: (id, userId) => safe({})(() => api.delete(`/chat/groups/${id}/participants/${userId}`)),
  makeAdmin: (id, userId) => safe({})(() => api.put(`/chat/groups/${id}/admins/${userId}`)),
  leaveGroup: (id) => safe({})(() => api.delete(`/chat/groups/${id}/leave`)),
  getMessages: (id, page = 1) => safe({ messages: [] })(() => api.get(`/chat/conversations/${id}/messages?page=${page}`)),
  sendMessage: (data) => safe({})(() => api.post('/chat/messages', data)),
  editMessage: (id, content) => safe({})(() => api.put(`/chat/messages/${id}`, { content })),
  deleteMessage: (id, forEveryone = false) => safe({})(() => api.delete(forEveryone ? `/chat/messages/${id}/delete-for-everyone` : `/chat/messages/${id}`)),
  markAsRead: (id) => safe({})(() => api.put(`/chat/messages/${id}/read`)),
  addReaction: (id, emoji) => safe({})(() => api.post(`/chat/messages/${id}/reactions`, { emoji })),
  removeReaction: (id) => safe({})(() => api.delete(`/chat/messages/${id}/reactions`)),
  searchUsers: (query) => safe({ users: [] })(() => api.get(`/chat/users/search?query=${encodeURIComponent(query)}`)),
  addContact: (userId) => safe({})(() => api.post('/chat/contacts', { userId })),
  getContacts: () => safe({ contacts: [] })(() => api.get('/chat/contacts')),
  blockUser: (id) => safe({})(() => api.post(`/chat/users/${id}/block`)),
  unblockUser: (id) => safe({})(() => api.delete(`/chat/users/${id}/block`)),
};

export const mediaAPI = {
  uploadFile: (file) => {
    if (isOffline()) return Promise.resolve({ data: { success: false, isOffline: true } });
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .catch(() => ({ data: { success: false, isOffline: true } }));
  },
  uploadStatus: (file) => {
    if (isOffline()) return Promise.resolve({ data: { success: false, isOffline: true } });
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/media/upload-status', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .catch(() => ({ data: { success: false, isOffline: true } }));
  },
  getSignedUrl: (key) => safe({})(() => api.get(`/media/signed-url?key=${encodeURIComponent(key)}`)),
};

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
};

export default api;
