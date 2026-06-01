import { getDeviceHeaders } from './deviceIdentity';

export const API_URL = import.meta.env.VITE_API_URL || '';

export const persistTokens = (data) => {
  if (data?.token) localStorage.setItem('token', data.token);
  if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
  if (data?.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
    try {
      localStorage.setItem(
        'genz_user_profile',
        JSON.stringify({
          username: data.user.username,
          phoneNumber: data.user.phoneNumber,
          profilePicture: data.user.profilePicture || '',
          bio: data.user.about || ''
        })
      );
    } catch (e) {
      console.warn('[Auth] Could not persist profile sidebar copy:', e);
    }
  }
};

export const clearSessionAndRedirect = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  const path = window.location.pathname;
  if (path !== '/login' && path !== '/register') {
    window.location.href = '/login';
  }
};

export const readAccessToken = () => {
  const token = localStorage.getItem('token');
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
};

/**
 * Refreshes access token using stored refresh token. Does not clear session on failure.
 * @returns {Promise<string|null>} New access JWT or null
 */
export const tryRefreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken || refreshToken === 'null') {
    console.warn('[Auth] No refresh token; cannot renew access');
    return null;
  }
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getDeviceHeaders() },
      credentials: 'include',
      body: JSON.stringify({ refreshToken })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[Auth] Refresh HTTP error:', { status: res.status, data });
      return null;
    }
    if (data?.success && data.token) {
      persistTokens(data);
      return data.token;
    }
    console.error('[Auth] Refresh response missing token:', data);
    return null;
  } catch (e) {
    console.error('[Auth] Refresh network error:', e);
    return null;
  }
};
