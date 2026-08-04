import { getAuthToken, clearAuthTokens } from '../utils/tokenStore';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';

const API_URL = resolveApiBase();

const securityService = {
  // 2FA Setup
  setupTwoFactor: async () => {
    try {
      const token = getAuthToken();
      const response = await authFetch(`${API_URL}/security/2fa/setup`, {
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
      console.error('Error setting up 2FA:', error);
      throw error;
    }
  },

  // Verify 2FA during setup
  verifyTwoFactorSetup: async (token, secret) => {
    try {
      const authToken = getAuthToken();
      const response = await authFetch(`${API_URL}/security/2fa/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, secret })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying 2FA setup:', error);
      throw error;
    }
  },

  // Verify 2FA during login
  verifyTwoFactorLogin: async (token) => {
    try {
      const response = await authFetch(`${API_URL}/security/2fa/login-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying 2FA login:', error);
      throw error;
    }
  },

  // Disable 2FA
  disableTwoFactor: async (token) => {
    try {
      const authToken = getAuthToken();
      const response = await authFetch(`${API_URL}/security/2fa/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  },

  // Get 2FA status
  checkTwoFactorStatus: async () => {
    try {
      const token = getAuthToken();
      const response = await authFetch(`${API_URL}/security/2fa/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        enabled: Boolean(data.twoFactorEnabled),
        verified: Boolean(data.twoFactorVerified)
      };
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
      throw error;
    }
  },

  // Get current security settings
  getSecuritySettings: async () => {
    try {
      const token = getAuthToken();
      const response = await authFetch(`${API_URL}/security/settings`, {
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
      console.error('Error fetching security settings:', error);
      throw error;
    }
  },

  // Update security settings
  updateSecuritySettings: async (settings) => {
    try {
      const token = getAuthToken();
      const response = await authFetch(`${API_URL}/security/settings`, {
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
      console.error('Error updating security settings:', error);
      throw error;
    }
  }
};

export default securityService;
