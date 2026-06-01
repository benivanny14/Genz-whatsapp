import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';

const broadcastService = {
  // Get all broadcast lists
  getBroadcasts: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast`, {
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
      console.error('Error fetching broadcasts:', error);
      throw error;
    }
  },

  // Create new broadcast list
  createBroadcast: async (broadcastData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(broadcastData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating broadcast:', error);
      throw error;
    }
  },

  // Update broadcast list
  updateBroadcast: async (id, broadcastData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(broadcastData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating broadcast:', error);
      throw error;
    }
  },

  // Delete broadcast list
  deleteBroadcast: async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}`, {
        method: 'DELETE',
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
      console.error('Error deleting broadcast:', error);
      throw error;
    }
  },

  // Send broadcast message
  sendBroadcastMessage: async (id, messageData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending broadcast message:', error);
      throw error;
    }
  },

  // Get broadcast details
  getBroadcastDetails: async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}`, {
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
      console.error('Error fetching broadcast details:', error);
      throw error;
    }
  },

  // Add recipients to broadcast
  addRecipients: async (id, recipients) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}/recipients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipients })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error adding recipients:', error);
      throw error;
    }
  },

  // Remove recipients from broadcast
  removeRecipients: async (id, recipients) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}/recipients`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipients })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error removing recipients:', error);
      throw error;
    }
  },

  // Get broadcast statistics
  getBroadcastStats: async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}/stats`, {
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
      console.error('Error fetching broadcast stats:', error);
      throw error;
    }
  },

  // Get broadcast message history
  getBroadcastMessages: async (id, page = 1, limit = 50) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}/messages?page=${page}&limit=${limit}`, {
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
      console.error('Error fetching broadcast messages:', error);
      throw error;
    }
  },

  // Schedule broadcast message
  scheduleBroadcastMessage: async (id, messageData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}/schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error scheduling broadcast message:', error);
      throw error;
    }
  },

  // Cancel scheduled broadcast
  cancelScheduledBroadcast: async (id, messageId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}/schedule/${messageId}`, {
        method: 'DELETE',
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
      console.error('Error canceling scheduled broadcast:', error);
      throw error;
    }
  },

  // Get scheduled broadcasts
  getScheduledBroadcasts: async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}/scheduled`, {
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
      console.error('Error fetching scheduled broadcasts:', error);
      throw error;
    }
  },

  // Upload media for broadcast
  uploadBroadcastMedia: async (id, file) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('broadcastId', id);

      const response = await authFetch(`${API_URL}/api/advanced/broadcast/${id}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error uploading broadcast media:', error);
      throw error;
    }
  },

  // Search recipients
  searchRecipients: async (query) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/api/advanced/broadcast/search-recipients?q=${encodeURIComponent(query)}`, {
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
      console.error('Error searching recipients:', error);
      throw error;
    }
  }
};

export default broadcastService;
