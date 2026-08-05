import { getAuthToken, setAuthTokens } from '../utils/tokenStore';
import api from '../utils/axios';
import { clearAllUserData } from '../utils/authSession';

const authService = {
  // Tokens are held in memory only (the httpOnly cookie is the persistent
  // session). The public user profile is cached in localStorage.
  saveTokens: (data) => {
    if (data?.token || data?.refreshToken) {
      setAuthTokens({ token: data.token, refreshToken: data.refreshToken });
    }
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
      if (error.response?.data?.warning) err.warning = error.response.data.warning;
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

  // Restore session (token from memory/cookie with localStorage fallback)
  restoreSession: () => {
    const token = getAuthToken();
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
    const token = getAuthToken();
    return token && token !== 'null' && token !== 'undefined';
  }
};

export default authService;
