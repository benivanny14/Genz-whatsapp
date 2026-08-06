// apiUrl - build API URLs from env var only
// Falls back to '/api' for single-service deployments (backend serves frontend),
// mirroring resolveApiBase() so services like statusService never silently hit the SPA.
let rawBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
if (rawBase) {
  rawBase = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
} else {
  rawBase = '/api';
}

const apiUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${rawBase}${cleanPath}`;
};

export { rawBase };
export default apiUrl;
