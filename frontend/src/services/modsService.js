import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';

const modsService = {
  // Get GENZ mods settings
  getModsSettings: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching mods settings:', error);
      throw error;
    }
  },

  // Update GENZ mods settings
  updateModsSettings: async (settings) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating mods settings:', error);
      throw error;
    }
  },

  // Get deleted messages (anti-delete)
  getDeletedMessages: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/deleted-messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching deleted messages:', error);
      throw error;
    }
  },

  // Restore deleted message
  restoreMessage: async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/restore-message/${messageId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error restoring message:', error);
      throw error;
    }
  },

  // Set auto reply
  setAutoReply: async (autoReplySettings) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/auto-reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(autoReplySettings)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error setting auto reply:', error);
      throw error;
    }
  },

  // Get auto reply settings
  getAutoReply: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/auto-reply`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching auto reply settings:', error);
      throw error;
    }
  },

  // Get user status with ghost mode
  getUserStatus: async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/user-status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user status:', error);
      throw error;
    }
  },

  // Update ghost mode settings
  updateGhostMode: async (ghostModeSettings) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/ghost-mode`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ghostModeSettings)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating ghost mode:', error);
      throw error;
    }
  },

  // Get message tracking info
  getMessageTracking: async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/message-tracking/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching message tracking:', error);
      throw error;
    }
  },

  // Enable/disable read receipts
  updateReadReceipts: async (enabled) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/read-receipts`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating read receipts:', error);
      throw error;
    }
  },

  // Enable/disable typing indicators
  updateTypingIndicators: async (enabled) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/typing-indicators`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating typing indicators:', error);
      throw error;
    }
  },

  // Update online status visibility
  updateOnlineStatus: async (visible) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/online-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ visible })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating online status:', error);
      throw error;
    }
  },

  // Freeze last seen timestamp
  freezeLastSeen: async (freeze) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/freeze-last-seen`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ freeze })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error freezing last seen:', error);
      throw error;
    }
  },

  // Get mod usage statistics
  getModStats: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching mod stats:', error);
      throw error;
    }
  },

  // Export mod settings
  exportModSettings: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error exporting mod settings:', error);
      throw error;
    }
  },

  // Import mod settings
  importModSettings: async (settings) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/genz-mods/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error importing mod settings:', error);
      throw error;
    }
  }
};

export default modsService;
