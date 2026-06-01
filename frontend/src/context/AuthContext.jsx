import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { tryRefreshAccessToken } from '../utils/authSession';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Restore session on app load
  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('[AuthContext] Restoring session...');

        // First, try to restore from localStorage
        const session = authService.restoreSession();

        if (session) {
          setToken(session.token);
          setUser(session.user);
          setIsAuthenticated(true);

          // Verify token is still valid by calling getMe
          try {
            const meData = await authService.getMe();
            if (meData.success && meData.user) {
              setUser(meData.user);
              console.log('[AuthContext] Session restored successfully');
            } else {
              // Token invalid, try to refresh
              console.warn('[AuthContext] Invalid token, attempting refresh...');
              const newToken = await tryRefreshAccessToken();
              if (newToken) {
                setToken(newToken);
                // Retry getMe with new token
                const retryMeData = await authService.getMe();
                if (retryMeData.success && retryMeData.user) {
                  setUser(retryMeData.user);
                  console.log('[AuthContext] Session restored after refresh');
                } else {
                  clearSession();
                }
              } else {
                // Refresh failed, clear session
                console.warn('[AuthContext] Refresh failed, clearing session');
                clearSession();
              }
            }
          } catch (verifyError) {
            console.error('[AuthContext] Token verification failed:', verifyError);
            const isNetworkError = !verifyError.response;
            const isServerError = verifyError.response && verifyError.response.status >= 500;
            if (isNetworkError || isServerError) {
              console.log('[AuthContext] Network or server error during token verification. Keeping local session.');
              return;
            }
            // Try to refresh token on 401
            if (verifyError.response?.status === 401) {
              const newToken = await tryRefreshAccessToken();
              if (newToken) {
                setToken(newToken);
                try {
                  const retryMeData = await authService.getMe();
                  if (retryMeData.success && retryMeData.user) {
                    setUser(retryMeData.user);
                    console.log('[AuthContext] Session restored after refresh');
                    return;
                  }
                } catch (retryError) {
                  console.error('[AuthContext] Retry failed:', retryError);
                }
              }
            }
            clearSession();
          }
        } else {
          console.log('[AuthContext] No session found');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('[AuthContext] Session restoration error:', error);
        setError(error.message);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
        setIsAuthReady(true); // Auth restoration is complete (success or failure)
      }
    };

    restoreSession();
  }, []);

  const clearSession = () => {
    authService.clearTokens();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const login = async (credentials) => {
    try {
      console.log('[AuthContext] Logging in...');
      const data = await authService.login(credentials);

      if (!data.requiresTwoFactor) {
        setToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        setError(null);
        console.log('[AuthContext] Login successful');
      }

      return data;
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      setError(error.message);
      throw error;
    }
  };

  const register = async (credentials) => {
    try {
      console.log('[AuthContext] Registering...');
      const data = await authService.register(credentials);

      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      setError(null);
      console.log('[AuthContext] Registration successful');

      return data;
    } catch (error) {
      console.error('[AuthContext] Registration error:', error);
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('[AuthContext] Logging out...');
      await authService.logout();
      clearSession();
      setError(null);
      console.log('[AuthContext] Logout successful');
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      // Clear session even if logout API call fails
      clearSession();
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        error,
        isAuthReady,
        login,
        register,
        logout,
        updateUser,
        clearSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
