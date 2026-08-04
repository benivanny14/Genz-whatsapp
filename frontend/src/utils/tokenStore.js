let memoryAccessToken = null;
let memoryRefreshToken = null;

// Access tokens are held in memory only. The persistent session is the
// httpOnly cookie set by the backend, which JavaScript cannot read. We keep a
// localStorage fallback ONLY for sessions created before the cookie migration
// so existing users are not logged out; those tokens are not written going
// forward.
export const getAuthToken = () => memoryAccessToken || localStorage.getItem('token') || undefined;

export const getRefreshToken = () => memoryRefreshToken || localStorage.getItem('refreshToken') || undefined;

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
