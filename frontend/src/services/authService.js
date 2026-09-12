import { getAuthToken, setAuthTokens, clearAuthTokens } from '../utils/tokenStore';
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

  // Light cleanup: clear auth tokens only (used during login to discard old session).
  // Full data cleanup (localStorage.clear, IndexedDB delete) happens on explicit logout.
  clearTokens: () => {
    clearAuthTokens();
    localStorage.removeItem('user');
  },

  login: async (payload) => {
    try {
      const response = await api.post('/auth/login', payload);
      const data = response.data;

      if (!data.requiresTwoFactor) {
        // Only clear old tokens, NOT all user data (localStorage, IndexedDB)
        // during login. Full data cleanup happens on explicit logout/session switch.
        clearTokens();
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
      // Light token cleanup only (not destructive clearAllUserData)
      clearTokens();
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
      await clearAllUserData();
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

  verifyPhoneOTP: async ({ phoneNumber, otp }) => {
    try {
      const response = await api.post('/auth/verify-phone-otp', { phoneNumber, otp });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed. Please try again.';
      const err = new Error(message);
      err.status = error.response?.status;
      throw err;
    }
  },

  resendPhoneOTP: async ({ phoneNumber }) => {
    try {
      const response = await api.post('/auth/resend-phone-otp', { phoneNumber });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend OTP. Please try again.';
      const err = new Error(message);
      err.status = error.response?.status;
      throw err;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = getAuthToken();
    return token && token !== 'null' && token !== 'undefined';
  }
};

export default authService;
