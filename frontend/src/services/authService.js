import api from '../utils/axios';
import { clearAllUserData } from '../utils/authSession';

const authService = {
  // Save tokens to localStorage with consistent key names
  saveTokens: (data) => {
    if (data?.token) localStorage.setItem('token', data.token);
    if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    if (data?.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  },

  // Clear all auth data from localStorage
  clearTokens: () => {
    clearAllUserData();
  },

  login: async (payload) => {
    try {
      const response = await api.post('/auth/login', payload);
      const data = response.data;

      if (!data.requiresTwoFactor) {
        // Clear previous session data before saving new tokens
        await clearAllUserData();
        authService.saveTokens(data);
      }

      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      const status = error.response?.status;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
  },

  register: async (payload) => {
    try {
      const response = await api.post('/auth/register', payload);
      const data = response.data;
      // Clear previous session data before saving new tokens
      await clearAllUserData();
      authService.saveTokens(data);
      return data;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      const status = error.response?.status;
      const err = new Error(message);
      err.status = status;
      throw err;
    }
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('[AuthService] Logout error:', error);
    } finally {
      authService.clearTokens();
    }
  },

  // Restore session from localStorage
  restoreSession: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        return { token, user };
      } catch (error) {
        console.error('[AuthService] Failed to parse stored user:', error);
        return null;
      }
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return token && token !== 'null' && token !== 'undefined';
  }
};

export default authService;
