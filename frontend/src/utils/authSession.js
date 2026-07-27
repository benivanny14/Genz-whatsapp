import { getDeviceHeaders } from './deviceIdentity';
import { resolveApiBase } from './resolveApiBase';
import db from './indexedDB';
import { DB } from '../services/db';

export const API_URL = resolveApiBase() || '/api';

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

export const clearAllUserData = async () => {
  const keysToKeep = [
    'genz_saved_accounts',
    'genz_device_id',
    'genz_device_info',
    'device-id',
    'genz_theme',
    'tempUsername',
    'tempPassword'
  ];

  // Get current user ID before clearing to delete user-specific keys
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?._id;

  const preserved = {};
  keysToKeep.forEach(k => {
    const val = localStorage.getItem(k);
    if (val !== null) preserved[k] = val;
  });

  localStorage.clear();

  Object.keys(preserved).forEach(k => {
    localStorage.setItem(k, preserved[k]);
  });

  // FIX: Clear user-specific localStorage keys
  if (userId) {
    const userSpecificKeys = [
      `genz_settings_comprehensive:${userId}`,
      `genz_mods:${userId}`,
      `selectedConversationId:${userId}`,
      `unlockedSessionChats:${userId}`
    ];
    userSpecificKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('[Auth] Failed to remove user-specific key:', key);
      }
    });
  }

  try {
    // FIX: Delete the entire user-specific databases instead of just clearing stores
    // This ensures complete data isolation between accounts
    await db.deleteDatabase();
    await DB.deleteDatabase();
  } catch (err) {
    console.error('Failed to delete IndexedDB:', err);
  }
};

export const clearSessionAndRedirect = async () => {
  await clearAllUserData();
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
  // FIX: bare fetch() has no default timeout — on a slow/unstable mobile
  // connection this could hang indefinitely, which upstream callers
  // (AuthContext session restore, axios 401 retry) were awaiting before
  // they could ever clear their own loading state. An AbortController
  // guarantees this always settles.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getDeviceHeaders() },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal
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
  } finally {
    clearTimeout(timeoutId);
  }
};
