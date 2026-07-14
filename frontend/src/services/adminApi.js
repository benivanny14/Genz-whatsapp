import axios from 'axios';

// The regular app uses VITE_API_URL (e.g. https://host/api).
// The admin gateway lives at a secret, separate base path so it is never
// reachable via the normal, guessable /api/admin/* pattern for login.
const API_URL = import.meta.env.VITE_API_URL || '';
const API_ROOT = API_URL.replace(/\/api\/?$/, '');
const ADMIN_BASE_PATH = import.meta.env.VITE_ADMIN_BASE_PATH || '/api/system-gateway-x9k2';

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
export const adminAuthClient = axios.create({ baseURL: `${API_ROOT}${ADMIN_BASE_PATH}/auth` });

// Data client — talks to the normal /api/** admin-guarded routes (e.g.
// /admin/overview, /payment/admin/all-payments), but every request carries
// the admin-only access token and is rejected by the backend
// (superAdminAuth) unless that token is valid.
export const adminApi = axios.create({ baseURL: API_URL });

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
        window.location.href = '/system-control-x7k9/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;
