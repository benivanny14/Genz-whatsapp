import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { adminAuthClient, adminApi, adminTokenStore } from '../services/adminApi';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingPreAuthToken, setPendingPreAuthToken] = useState(null);

  // Try to silently resume a session on load using the refresh token,
  // since the access token itself is memory-only and lost on page refresh.
  useEffect(() => {
    const tryResume = async () => {
      const refreshToken = adminTokenStore.getRefreshToken();
      if (!refreshToken) { setLoading(false); return; }
      try {
        const { data } = await adminAuthClient.post('/refresh', { refreshToken });
        adminTokenStore.setAccessToken(data.accessToken);
        adminTokenStore.setRefreshToken(data.refreshToken);
        setIsAuthenticated(true);
      } catch {
        adminTokenStore.clear();
      } finally {
        setLoading(false);
      }
    };
    tryResume();
  }, []);

  const loginStep1 = useCallback(async (username, password) => {
    const { data } = await adminAuthClient.post('/login', { username, password });
    if (data.requiresTwoFactor) {
      setPendingPreAuthToken(data.preAuthToken);
      return { requiresTwoFactor: true };
    }
    // Should not normally happen (2FA is mandatory), handled just in case
    adminTokenStore.setAccessToken(data.accessToken);
    setIsAuthenticated(true);
    return { requiresTwoFactor: false };
  }, []);

  const verifyTwoFactor = useCallback(async (code) => {
    if (!pendingPreAuthToken) throw new Error('No pending login. Please start again.');
    const { data } = await adminAuthClient.post('/verify-2fa', {
      preAuthToken: pendingPreAuthToken,
      code
    });
    adminTokenStore.setAccessToken(data.accessToken);
    adminTokenStore.setRefreshToken(data.refreshToken);
    setAdmin(data.admin);
    setIsAuthenticated(true);
    setPendingPreAuthToken(null);
  }, [pendingPreAuthToken]);

  const logout = useCallback(async () => {
    try { await adminAuthClient.post('/logout'); } catch { /* best effort */ }
    adminTokenStore.clear();
    setIsAuthenticated(false);
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{
      admin, isAuthenticated, loading,
      loginStep1, verifyTwoFactor, logout,
      hasPendingTwoFactor: !!pendingPreAuthToken
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};
