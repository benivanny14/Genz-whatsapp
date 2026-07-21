// Professional API Service Layer with Deduplication, Caching, and Error Handling
import api from '../utils/axios';

// Cache for API responses
const cache = new Map();
const pendingRequests = new Map();

// Optimized request deduplication and caching with proper auth handling
const apiCall = async (endpoint, options = {}) => {
  const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
  
  // Return cached response if available and not expired (only for GET requests)
  if (cache.has(cacheKey) && (!options.method || options.method === 'GET')) {
    const cached = cache.get(cacheKey);
    if (Date.now() - cached.timestamp < 30000) { // 30 second cache
      console.log(`[API Cache Hit] ${endpoint}`);
      return cached.data;
    }
  }

  // Return existing promise if same request is pending
  if (pendingRequests.has(cacheKey)) {
    console.log(`[API Dedupe] Reusing pending request: ${endpoint}`);
    return pendingRequests.get(cacheKey);
  }

  const requestPromise = (async () => {
    try {
      console.log(`[API Request] ${endpoint}`);
      
      const response = await api({
        url: endpoint,
        ...options
      });
      
      const data = response.data;
      
      // Cache successful GET responses
      if (!options.method || options.method === 'GET') {
        cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }
      
      console.log(`[API Success] ${endpoint}`);
      return data;
      
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error.message);
      if (error.response?.data) {
        console.error(`[API Error Data] ${endpoint}:`, error.response.data);
      }
      
      if (error.response?.status === 401) {
        // 401 errors are handled by axios interceptor
        throw error;
      }
      
      throw error;
    }
  })();

  // Store pending request
  pendingRequests.set(cacheKey, requestPromise);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Clean up pending request
    pendingRequests.delete(cacheKey);
  }
};

// Specific API endpoints with proper error handling
export const apiService = {
  // Device management
  getDevices: () => apiCall('/device'),
  generateQR: (deviceInfo) => apiCall('/device/generate-qr', {
    method: 'POST',
    data: deviceInfo
  }),
  pairDevice: (pairingToken) => apiCall('/device/pair', {
    method: 'POST',
    data: { pairingToken }
  }),
  
  // Settings management
  getGENZSettings: () => apiCall('/genz-mods/settings'),
  
  // Content management
  getBroadcasts: () => apiCall('/advanced/broadcast'),
  getStatuses: () => apiCall('/advanced/status'),
  getCallLogs: (limit = 50) => apiCall(`/calls?limit=${limit}`),
  getStickerPacks: () => apiCall('/stickers/packs'),
  getMyStickers: () => apiCall('/stickers/me'),
  downloadStickerPack: (packId) => apiCall(`/stickers/packs/${packId}/download`, { method: 'POST' }),
  removeStickerPack: (packId) => apiCall(`/stickers/packs/${packId}`, { method: 'DELETE' }),
  toggleFavoriteSticker: (stickerId, url) => apiCall(`/stickers/favorites/${encodeURIComponent(stickerId)}`, { method: 'POST', data: { url } }),
  // FIX: always include archived chats in the main fetch. Previously this
  // called '/chat/conversations' without includeArchived, so the backend
  // silently dropped every archived chat from the response. ChatContext's
  // "stale conversation" pruning logic then treated those missing archived
  // chats as deleted-elsewhere and wiped them from local state/IndexedDB —
  // so a chat that was archived then unarchived would vanish completely
  // instead of reappearing in the main list. Fetching everything here and
  // letting the UI filter by isArchived (like Sidebar already does) keeps
  // archive/unarchive purely a client-side flag flip, matching WhatsApp.
  getConversations: () => apiCall('/chat/conversations?includeArchived=true'),
  // FIX: the frontend's `blockedUsers` list previously only ever got
  // populated in-session (when blockUser()/unblockUser() was called, or via
  // a live socket event) — a block from a *previous* session was never
  // loaded back in on refresh/login. That let someone who had a chat
  // blocked type and send a message with no client-side warning, only to
  // have the server silently reject it, which looked like sending had
  // become "unstable" right after a block/unblock cycle.
  getBlockedUsers: () => apiCall('/auth/blocked'),
  getScheduledMessages: (conversationId = null) => {
    const url = conversationId 
      ? `/scheduled-messages?conversationId=${conversationId}`
      : '/scheduled-messages';
    return apiCall(url);
  },
  getMessages: (conversationId, page = 1, limit = 50) => apiCall(
    `/chat/conversations/${encodeURIComponent(conversationId)}/messages?page=${page}&limit=${limit}`
  ),
  getStarredMessages: () => apiCall('/chat/messages/starred'),
  sendMessage: (conversationId, content, messageType = 'text', extra = {}) => apiCall('/chat/messages', {
    method: 'POST',
    data: { conversationId, content, messageType, ...extra }
  }),
  toggleStarMessage: (messageId, isStarred) => apiCall(`/chat/messages/${encodeURIComponent(messageId)}/star`, {
    method: 'PUT',
    data: typeof isStarred === 'boolean' ? { isStarred } : {}
  }),
  toggleMessageLock: (messageId, isLocked) => apiCall(`/chat/messages/${encodeURIComponent(messageId)}/lock`, {
    method: 'PUT',
    data: typeof isLocked === 'boolean' ? { isLocked } : {}
  }),
  clearChat: (conversationId) => apiCall(`/chat/conversations/${encodeURIComponent(conversationId)}/clear`, {
    method: 'DELETE'
  }),
  deleteChat: (conversationId) => apiCall(`/chat/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE'
  }),
  logoutDevice: (deviceId) => apiCall(`/device/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE'
  }),
  logoutAllDevices: (currentDeviceId) => apiCall('/device/logout-all', {
    method: 'POST',
    data: currentDeviceId ? { currentDeviceId } : {}
  }),
  updateDeviceCapabilities: (deviceId, capabilities) => apiCall(`/device/${encodeURIComponent(deviceId)}/capabilities`, {
    method: 'PUT',
    data: capabilities
  }),
  
  // Utility functions
  clearCache: () => {
    cache.clear();
    console.log('[API Cache] Cleared all cache entries');
  },
  
  getCacheInfo: () => ({
    size: cache.size,
    pending: pendingRequests.size,
    keys: Array.from(cache.keys())
  }),
  
  // Cancel specific request
  cancelRequest: (endpoint, options = {}) => {
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    if (pendingRequests.has(cacheKey)) {
      console.log(`[API Cancel] Cancelling request: ${endpoint}`);
      return true;
    }
    return false;
  }
};

export default apiService;
