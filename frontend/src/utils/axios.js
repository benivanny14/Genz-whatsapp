import axios from 'axios';
import { getDeviceHeaders } from './deviceIdentity';
import {
  API_URL,
  readAccessToken,
  clearSessionAndRedirect,
  tryRefreshAccessToken
} from './authSession';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...getDeviceHeaders()
  },
  withCredentials: true,
  // FIX: without a timeout, a request on a slow/unstable mobile network
  // (or a sleeping/cold-starting backend) never resolves or rejects — it
  // just hangs forever. Since this instance is used for login, getMe(),
  // and session restore, that hang left the UI stuck on "Checking
  // authentication..." / a login spinner indefinitely, with no error ever
  // surfacing. 20s is generous enough for slow mobile data while still
  // guaranteeing the UI always recovers.
  timeout: 20000
});

api.interceptors.request.use(
  (config) => {
    const token = readAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[Axios Request Error]:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Only log errors that aren't 401 or 409 on auth endpoints (handled by components)
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
                          originalRequest?.url?.includes('/auth/register') ||
                          originalRequest?.url?.includes('/auth/forgot-password');
    
    if (status !== 401 && !(status === 409 && isAuthEndpoint)) {
      console.error('[Axios Response Error]:', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        status,
        message: error.message,
        data: error.response?.data
      });
    }

    if (status === 401 && originalRequest?._authRetry) {
      // Silent clear and redirect after failed refresh retry
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    if (status === 401 && originalRequest && !originalRequest._authRetry) {
      originalRequest._authRetry = true;

      // Don't attempt refresh for auth endpoints
      if (originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/register') ||
          originalRequest.url?.includes('/auth/forgot-password')) {
        return Promise.reject(error);
      }

      if (originalRequest.url?.includes('/auth/refresh')) {
        // Silent clear and redirect on refresh failure
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken || refreshToken === 'null') {
        // Silent clear and redirect when no refresh token
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      const newToken = await tryRefreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Silent clear and redirect on refresh failure
      clearSessionAndRedirect();
      return Promise.reject(error);
    }

    if (status === 403) {
      console.error('[Auth] Access forbidden:', error.response?.data?.message);
    }

    if (status === 429 && originalRequest && !originalRequest._rateLimitRetry) {
      originalRequest._rateLimitRetry = true;
      const retryAfter = parseInt(error.response?.headers?.['retry-after'], 10) || 2;
      const delayMs = Math.min(Math.max(retryAfter, 1), 30) * 1000;
      console.warn(`[API] Rate limited; single retry after ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
