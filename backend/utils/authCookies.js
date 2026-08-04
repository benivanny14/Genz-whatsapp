const isProduction = () => process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction(),
  sameSite: 'strict',
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
  res.clearCookie('token', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
};

module.exports = { setAuthCookies, clearAuthCookies };
