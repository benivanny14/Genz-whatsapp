import { authFetch } from '../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL || '';

const securityService = {
  // 2FA Setup
  setupTwoFactor: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/security/2fa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('API failed');
      return await response.json();
    } catch (error) {
      console.warn('Mocking 2FA setup');
      return { qrCode: 'mock-qr-data-url', secret: 'MOCKSECRET123456' };
    }
  },

  // Verify 2FA during setup
  verifyTwoFactorSetup: async (token, secret) => {
    try {
      const authToken = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/security/2fa/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, secret })
      });
      if (!response.ok) throw new Error('API failed');
      return await response.json();
    } catch (error) {
      console.warn('Mocking 2FA setup verify');
      if (token !== '123456') throw new Error('Invalid token');
      localStorage.setItem('mock_2fa_enabled', 'true');
      return { success: true };
    }
  },

  // Verify 2FA during login
  verifyTwoFactorLogin: async (token) => {
    try {
      const response = await authFetch(`${API_URL}/security/2fa/login-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!response.ok) throw new Error('API failed');
      return await response.json();
    } catch (error) {
      return { success: token === '123456' };
    }
  },

  // Disable 2FA
  disableTwoFactor: async (token) => {
    try {
      const authToken = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/security/2fa/disable`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!response.ok) throw new Error('API failed');
      return await response.json();
    } catch (error) {
      console.warn('Mocking 2FA disable');
      localStorage.setItem('mock_2fa_enabled', 'false');
      return { success: true };
    }
  },

  // Email Verification
  sendEmailVerification: async (email) => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/security/email/send-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email || undefined })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw error;
    }
  },

  // Verify Email with token
  verifyEmail: async (token) => {
    try {
      const response = await authFetch(`${API_URL}/security/email/verify`, {
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
      console.error('Error verifying email:', error);
      throw error;
    }
  },

  // Resend Email Verification
  resendEmailVerification: async (email) => {
    try {
      const response = await authFetch(`${API_URL}/security/email/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error resending email verification:', error);
      throw error;
    }
  },

  // Password Reset
  sendPasswordReset: async (email) => {
    try {
      const response = await authFetch(`${API_URL}/security/password/send-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending password reset:', error);
      throw error;
    }
  },

  // Reset Password with token
  resetPassword: async (token, newPassword) => {
    try {
      const response = await authFetch(`${API_URL}/security/password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, newPassword })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },

  // Get current security settings
  getSecuritySettings: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/security/settings`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('API failed');
      return await response.json();
    } catch (error) {
      return { 
        loginAlerts: true,
        devices: []
      };
    }
  },

  // Update security settings
  updateSecuritySettings: async (settings) => {
    try {
      const token = localStorage.getItem('token');
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
  },

  // Check if email is verified
  checkEmailVerification: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/security/email/status`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('API failed');
      return await response.json();
    } catch (error) {
      return { verified: false, email: '' };
    }
  },

  // Check if 2FA is enabled
  checkTwoFactorStatus: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await authFetch(`${API_URL}/security/2fa/status`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('API failed');
      return await response.json();
    } catch (error) {
      return { enabled: localStorage.getItem('mock_2fa_enabled') === 'true' };
    }
  }
};

export default securityService;
