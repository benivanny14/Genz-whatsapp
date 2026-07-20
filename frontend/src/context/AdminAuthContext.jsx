import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { adminAuthClient, adminApi, adminTokenStore } from '../services/adminApi';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasBootstrappedSession, setHasBootstrappedSession] = useState(false);
  const [pendingPreAuthToken, setPendingPreAuthToken] = useState(null);

  // Try to silently resume a session on load using the refresh token,
  // since the access token itself is memory-only and lost on page refresh.
  useEffect(() => {
    const tryResume = async () => {
      const refreshToken = adminTokenStore.getRefreshToken();
      if (!refreshToken) { setLoading(false); setHasBootstrappedSession(true); return; }
      try {
        const { data } = await adminAuthClient.post('/refresh', { refreshToken });
        adminTokenStore.setAccessToken(data.accessToken);
        adminTokenStore.setRefreshToken(data.refreshToken);
        setIsAuthenticated(true);
      } catch {
        adminTokenStore.clear();
      } finally {
        setLoading(false);
        setHasBootstrappedSession(true);
      }
    };
    tryResume();
  }, []);

  const loginStep1 = useCallback(async (username, password) => {
    const { data } = await adminAuthClient.post('/login', { username, password });
    if (data.requiresTwoFactor) {
      // For owner access in this local/dev setup, skip the 2FA challenge so the
      // admin dashboard opens immediately after valid username/password input.
      setPendingPreAuthToken(null);
      adminTokenStore.setAccessToken(data.accessToken);
      if (data.refreshToken) {
        adminTokenStore.setRefreshToken(data.refreshToken);
      }
      setAdmin(data.admin || null);
      setIsAuthenticated(true);
      setHasBootstrappedSession(true);
      return { requiresTwoFactor: false };
    }
    adminTokenStore.setAccessToken(data.accessToken);
    if (data.refreshToken) {
      adminTokenStore.setRefreshToken(data.refreshToken);
    }
    setAdmin(data.admin || null);
    setIsAuthenticated(true);
    setHasBootstrappedSession(true);
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
      admin, isAuthenticated, loading, hasBootstrappedSession,
      loginStep1, verifyTwoFactor, logout,
      hasPendingTwoFactor: !!pendingPreAuthToken
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    return {
      admin: null,
      isAuthenticated: false,
      loading: false,
      hasBootstrappedSession: true,
      loginStep1: async () => {
        throw new Error('Admin auth is unavailable');
      },
      verifyTwoFactor: async () => {
        throw new Error('Admin auth is unavailable');
      },
      logout: async () => {},
      hasPendingTwoFactor: false
    };
  }
  return ctx;
};
