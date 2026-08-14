import { setAuthTokens, clearAuthTokens, getAuthToken, getRefreshToken } from './tokenStore.js';
import { shouldSkipLoginRedirect } from './loginRedirect.js';
import { getDeviceHeaders } from './deviceIdentity.js';
import { resolveApiBase } from './resolveApiBase.js';
import db from './indexedDB.js';
import { DB } from '../services/db.js';

export const API_URL = resolveApiBase() || '/api';

export const persistTokens = (data) => {
  // Access/refresh tokens are held in memory only (the httpOnly cookie set by
  // the backend is the persistent session). The public user profile is still
  // cached in localStorage for offline display.
  if (data?.token || data?.refreshToken) {
    setAuthTokens({ token: data.token, refreshToken: data.refreshToken });
  }
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
  clearAuthTokens();

  const keysToKeep = [
    'genz_saved_accounts',
    'genz_device_id',
    'genz_device_info',
    'device-id',
    'genz_theme',
    'tempUsername',
    'tempPassword',
    // Device-level App Lock keys: the lock must SURVIVE logout / session
    // clear (like WhatsApp/TM WhatsApp), otherwise enabling App Lock then
    // logging out silently removes the protection.
    'genz_lock_type',
    'genz_fingerprint_lock',
    'genz_lock_pin',
    'genz_pin_hash',
    'genz_last_unlock',
    'genz_last_activity'
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

export const clearSessionAndRedirect = async (options = {}) => {
  // Don't redirect if we're already on auth pages (prevents loops)
  const currentPath = window.location.pathname;
  if (currentPath === '/login' || currentPath === '/register' || currentPath === '/verify-phone') {
    return;
  }

  // Fire-and-forget a backend logout so the httpOnly cookies are actually
  // cleared (JS cannot delete an httpOnly cookie). Without this, a stale
  // cookie survives 401/logout and the NEXT page load tries to restore it,
  // producing the "app keeps closing and reopening" loop.
  try {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getDeviceHeaders() },
      credentials: 'include'
    });
    if (!res.ok) {
      console.warn('[Auth] Backend logout during session clear failed:', res.status);
    }
  } catch (e) {
    console.warn('[Auth] Backend logout during session clear failed:', e);
  }

  await clearAllUserData();
  const path = window.location.pathname;
  if (!shouldSkipLoginRedirect(path)) {
    window.location.href = '/login';
  }
};

export const readAccessToken = () => {
  const token = getAuthToken();
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
};

/**
 * Refreshes access token using stored refresh token. Does not clear session on failure.
 * @returns {Promise<string|null>} New access JWT or null
 */
export const tryRefreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  const hasLocalRefresh = refreshToken && refreshToken !== 'null';
  if (!hasLocalRefresh) {
    // No locally-held refresh token. The httpOnly refresh cookie may still
    // be valid (fresh page load after the 7-day access cookie expired but
    // within the 30-day refresh window) — the backend accepts a
    // cookie-supplied refresh token, so keep trying instead of giving up.
    console.warn('[Auth] No local refresh token; attempting cookie-based refresh');
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
      body: hasLocalRefresh ? JSON.stringify({ refreshToken }) : JSON.stringify({}),
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
