let memoryAccessToken = null;
let memoryRefreshToken = null;

// Persistence strategy: tokens are held in memory (fast reads) AND
// localStorage (survives app restart on APK / WebView). The httpOnly cookie
// set by the backend is the fallback for web browsers, but on Android
// WebView sameSite=None cookies are often blocked as third-party, so the
// localStorage copy is the reliable restore path on native APKs. Stale
// tokens are caught by the getMe() verification in AuthContext — if the
// token is expired, a refresh is attempted before the user sees a login
// screen.
const STORAGE_TOKEN_KEY = 'token';
const STORAGE_REFRESH_KEY = 'refreshToken';

export const getAuthToken = () => {
  if (memoryAccessToken) return memoryAccessToken;
  // Fallback: read from localStorage (APK restart / WebView reload)
  try {
    const stored = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (stored && stored !== 'null' && stored !== 'undefined') {
      memoryAccessToken = stored; // cache back into memory
      return stored;
    }
  } catch (_) { /* localStorage unavailable */ }
  return undefined;
};

export const getRefreshToken = () => {
  if (memoryRefreshToken) return memoryRefreshToken;
  try {
    const stored = localStorage.getItem(STORAGE_REFRESH_KEY);
    if (stored && stored !== 'null' && stored !== 'undefined') {
      memoryRefreshToken = stored;
      return stored;
    }
  } catch (_) { /* localStorage unavailable */ }
  return undefined;
};

export const setAuthTokens = ({ token, refreshToken }) => {
  if (token) {
    memoryAccessToken = token;
    try { localStorage.setItem(STORAGE_TOKEN_KEY, token); } catch (_) {}
  }
  if (refreshToken) {
    memoryRefreshToken = refreshToken;
    try { localStorage.setItem(STORAGE_REFRESH_KEY, refreshToken); } catch (_) {}
  }
};

export const clearAuthTokens = () => {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  try {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_REFRESH_KEY);
  } catch (_) {}
};
