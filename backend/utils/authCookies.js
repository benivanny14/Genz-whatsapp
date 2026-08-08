const isProduction = () => process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path: '/'
};

const ACCESS_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const setAuthCookies = (res, { token, refreshToken } = {}) => {
  if (token) {
    res.cookie('token', token, { ...COOKIE_OPTIONS, maxAge: ACCESS_MAX_AGE });
  }
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: REFRESH_MAX_AGE });
  }
};

const clearAuthCookies = (res) => {
  res.clearCookie('token', { path: '/', sameSite: COOKIE_OPTIONS.sameSite, secure: COOKIE_OPTIONS.secure });
  res.clearCookie('refreshToken', { path: '/', sameSite: COOKIE_OPTIONS.sameSite, secure: COOKIE_OPTIONS.secure });
};

module.exports = { setAuthCookies, clearAuthCookies };
