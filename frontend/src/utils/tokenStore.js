let memoryAccessToken = null;
let memoryRefreshToken = null;

// Access tokens are held in memory only. The persistent session is the
// httpOnly cookie set by the backend, which JavaScript cannot read. Stale
// pre-cookie-migration tokens used to be read from localStorage, which caused
// 401 loops after the real session expired, so they are no longer read. The
// keys are still removed on logout/401 via clearAuthTokens.
export const getAuthToken = () => memoryAccessToken || undefined;

export const getRefreshToken = () => memoryRefreshToken || undefined;

export const setAuthTokens = ({ token, refreshToken }) => {
  if (token) memoryAccessToken = token;
  if (refreshToken) memoryRefreshToken = refreshToken;
};

export const clearAuthTokens = () => {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};
