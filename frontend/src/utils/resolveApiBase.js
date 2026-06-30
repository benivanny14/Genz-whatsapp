// resolveApiBase - always use env var, never hardcode deployment URLs
// Falls back to '/api' for single-service deployments (backend serves frontend)
export const resolveApiBase = () => {
  const url = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (!url) return '/api';
  // Ensure the URL ends with /api
  return url.endsWith('/api') ? url : `${url}/api`;
};

// resolveSocketOrigin - returns the base origin for socket.io connections
// Falls back to '' (empty = current page origin) for single-service deployments
export const resolveSocketOrigin = () => {
  const socketUrl = (import.meta.env.VITE_SOCKET_URL || '').replace(/\/$/, '');
  if (socketUrl) return socketUrl;
  // Try to derive from VITE_API_URL by stripping /api suffix
  const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (apiUrl) return apiUrl.replace(/\/api$/, '');
  // Empty string = socket.io connects to current page origin (same-service deployment)
  return '';
};

export default resolveApiBase;
