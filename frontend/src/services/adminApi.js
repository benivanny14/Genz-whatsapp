import axios from 'axios';

// The regular app uses VITE_API_URL (e.g. https://host/api).
// Admin login/auth uses the hidden gateway, while admin data endpoints are
// mounted under the normal /api namespace.
const API_URL = import.meta.env.VITE_API_URL || '';
const API_ROOT = API_URL.replace(/\/api\/?$/, '');
const ADMIN_BASE_PATH = (import.meta.env.VITE_ADMIN_BASE_PATH || '/api/x7f2-owner-gate-9k').replace(/\/$/, '');

// Data requests should hit the backend's /api/admin/* routes.
const ADMIN_API_URL = `${API_ROOT}/api`;

const ACCESS_TOKEN_KEY_MEM = { current: null }; // access token: memory only, never persisted
const REFRESH_TOKEN_KEY = 'genz_admin_refresh'; // refresh token: sessionStorage (cleared when tab closes)

export const adminTokenStore = {
  getAccessToken: () => ACCESS_TOKEN_KEY_MEM.current,
  setAccessToken: (token) => { ACCESS_TOKEN_KEY_MEM.current = token; },
  getRefreshToken: () => sessionStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token) => sessionStorage.setItem(REFRESH_TOKEN_KEY, token),
  clear: () => {
    ACCESS_TOKEN_KEY_MEM.current = null;
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

// Auth (login/2FA/refresh/logout) client — talks to the secret gateway path
// ADMIN_BASE_PATH already includes /api prefix, so we use it directly with API_ROOT
export const adminAuthClient = axios.create({ baseURL: `${API_ROOT}${ADMIN_BASE_PATH}/auth` });

// Data client — talks to the dedicated admin gateway so every request carries
// the admin-only access token and is verified by the correct backend layer.
export const adminApi = axios.create({ baseURL: ADMIN_API_URL });

adminApi.interceptors.request.use((config) => {
  const token = adminTokenStore.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshingPromise = null;

adminApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshingPromise) {
          refreshingPromise = adminAuthClient
            .post('/refresh', { refreshToken: adminTokenStore.getRefreshToken() })
            .finally(() => { refreshingPromise = null; });
        }
        const { data } = await refreshingPromise;
        adminTokenStore.setAccessToken(data.accessToken);
        adminTokenStore.setRefreshToken(data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return adminApi(original);
      } catch (refreshError) {
        adminTokenStore.clear();
        // Only redirect if we're not already on the login page to prevent redirect loops
        if (!window.location.pathname.includes('/system-gateway-x9k/login')) {
          window.location.href = '/system-gateway-x9k/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;
