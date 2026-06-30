import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';

const broadcastService = {
  // Get all broadcast lists
  getBroadcasts: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/advanced/broadcast`, {
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
      const response = await authFetch(`${API_URL}/advanced/broadcast`, {
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
      const response = await authFetch(`${API_URL}/advanced/broadcast/${id}`, {
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
      const response = await authFetch(`${API_URL}/advanced/broadcast/${id}`, {
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
      const response = await authFetch(`${API_URL}/advanced/broadcast/${id}/send`, {
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

  // Note: getBroadcastDetails, addRecipients, removeRecipients, getBroadcastStats,
  // getBroadcastMessages, scheduleBroadcastMessage, cancelScheduledBroadcast,
  // getScheduledBroadcasts, uploadBroadcastMedia, and searchRecipients were removed
  // here because they had no corresponding backend routes in routes/advancedRoutes.js
  // and were not called anywhere in the UI. If these features are built later, add
  // the matching backend routes/controllers first, then re-add the service methods.
};

export default broadcastService;
