let memoryAccessToken = null;
let memoryRefreshToken = null;

const STORAGE_TOKEN_KEY = 'token';
const STORAGE_REFRESH_KEY = 'refreshToken';

const isNative = () => {
  try {
    // Lazy import to avoid bundling issues when Capacitor not present
    const { Capacitor } = require('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    try { return window?.Capacitor?.isNativePlatform?.() || false; } catch { return false; }
  }
};

// Preload from Preferences on native (async, populates memory cache)
try {
  if (typeof window !== 'undefined') {
    import('@capacitor/preferences').then(({ Preferences }) => {
      if (!isNative()) return;
      Preferences.get({ key: STORAGE_TOKEN_KEY }).then(({ value }) => {
        if (value && value !== 'null' && value !== 'undefined') memoryAccessToken = value;
      }).catch(() => {});
      Preferences.get({ key: STORAGE_REFRESH_KEY }).then(({ value }) => {
        if (value && value !== 'null' && value !== 'undefined') memoryRefreshToken = value;
      }).catch(() => {});
    }).catch(() => {});
  }
} catch {}

export const getAuthToken = () => {
  if (memoryAccessToken) return memoryAccessToken;
  if (isNative()) {
    // On native, memory is preloaded from Preferences async; fallback to localStorage sync for compat
    try {
      const stored = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (stored && stored !== 'null' && stored !== 'undefined') {
        memoryAccessToken = stored;
        return stored;
      }
    } catch {}
    return undefined;
  }
  try {
    const stored = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (stored && stored !== 'null' && stored !== 'undefined') {
      memoryAccessToken = stored;
      return stored;
    }
  } catch (_) {}
  return undefined;
};

export const getRefreshToken = () => {
  if (memoryRefreshToken) return memoryRefreshToken;
  if (isNative()) {
    try {
      const stored = localStorage.getItem(STORAGE_REFRESH_KEY);
      if (stored && stored !== 'null' && stored !== 'undefined') {
        memoryRefreshToken = stored;
        return stored;
      }
    } catch {}
    return undefined;
  }
  try {
    const stored = localStorage.getItem(STORAGE_REFRESH_KEY);
    if (stored && stored !== 'null' && stored !== 'undefined') {
      memoryRefreshToken = stored;
      return stored;
    }
  } catch (_) {}
  return undefined;
};

export const setAuthTokens = async ({ token, refreshToken }) => {
  if (token) {
    memoryAccessToken = token;
    if (isNative()) {
      try { const { Preferences } = await import('@capacitor/preferences'); await Preferences.set({ key: STORAGE_TOKEN_KEY, value: token }); } catch {}
    }
    try { localStorage.setItem(STORAGE_TOKEN_KEY, token); } catch (_) {}
  }
  if (refreshToken) {
    memoryRefreshToken = refreshToken;
    if (isNative()) {
      try { const { Preferences } = await import('@capacitor/preferences'); await Preferences.set({ key: STORAGE_REFRESH_KEY, value: refreshToken }); } catch {}
    }
    try { localStorage.setItem(STORAGE_REFRESH_KEY, refreshToken); } catch (_) {}
  }
};

export const clearAuthTokens = async () => {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  if (isNative()) {
    try { const { Preferences } = await import('@capacitor/preferences'); await Preferences.remove({ key: STORAGE_TOKEN_KEY }); await Preferences.remove({ key: STORAGE_REFRESH_KEY }); } catch {}
  }
  try {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_REFRESH_KEY);
  } catch (_) {}
};

// Async variants for new code that wants to await Preferences
export const getAuthTokenAsync = async () => {
  if (memoryAccessToken) return memoryAccessToken;
  if (isNative()) {
    try { const { Preferences } = await import('@capacitor/preferences'); const { value } = await Preferences.get({ key: STORAGE_TOKEN_KEY }); if (value) { memoryAccessToken = value; return value; } } catch {}
  }
  return getAuthToken();
};
