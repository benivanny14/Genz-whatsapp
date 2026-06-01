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
  getDevices: () => apiCall('/api/device'),
  generateQR: (deviceInfo) => apiCall('/api/device/generate-qr', {
    method: 'POST',
    data: deviceInfo
  }),
  pairDevice: (pairingToken) => apiCall('/api/device/pair', {
    method: 'POST',
    data: { pairingToken }
  }),
  
  // Settings management
  getGENZSettings: () => apiCall('/api/genz-mods/settings'),
  
  // Content management
  getBroadcasts: () => apiCall('/api/advanced/broadcast'),
  getStatuses: () => apiCall('/api/advanced/status'),
  getCallLogs: (limit = 50) => apiCall(`/api/calls?limit=${limit}`),
  getConversations: () => apiCall('/api/chat/conversations'),
  getScheduledMessages: (conversationId = null) => {
    const url = conversationId 
      ? `/api/scheduled-messages?conversationId=${conversationId}`
      : '/api/scheduled-messages';
    return apiCall(url);
  },
  getMessages: (conversationId, page = 1, limit = 50) => apiCall(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages?page=${page}&limit=${limit}`
  ),
  getStarredMessages: () => apiCall('/api/chat/messages/starred'),
  sendMessage: (conversationId, content, messageType = 'text', extra = {}) => apiCall('/api/chat/messages', {
    method: 'POST',
    data: { conversationId, content, messageType, ...extra }
  }),
  toggleStarMessage: (messageId, isStarred) => apiCall(`/api/chat/messages/${encodeURIComponent(messageId)}/star`, {
    method: 'PUT',
    data: typeof isStarred === 'boolean' ? { isStarred } : {}
  }),
  toggleMessageLock: (messageId, isLocked) => apiCall(`/api/chat/messages/${encodeURIComponent(messageId)}/lock`, {
    method: 'PUT',
    data: typeof isLocked === 'boolean' ? { isLocked } : {}
  }),
  clearChat: (conversationId) => apiCall(`/api/chat/conversations/${encodeURIComponent(conversationId)}/clear`, {
    method: 'DELETE'
  }),
  deleteChat: (conversationId) => apiCall(`/api/chat/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE'
  }),
  logoutDevice: (deviceId) => apiCall(`/api/device/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE'
  }),
  logoutAllDevices: (currentDeviceId) => apiCall('/api/device/logout-all', {
    method: 'POST',
    data: currentDeviceId ? { currentDeviceId } : {}
  }),
  updateDeviceCapabilities: (deviceId, capabilities) => apiCall(`/api/device/${encodeURIComponent(deviceId)}/capabilities`, {
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
