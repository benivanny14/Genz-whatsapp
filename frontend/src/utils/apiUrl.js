// apiUrl - build API URLs from env var only
const rawBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const apiUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${rawBase}${cleanPath}`;
};

export { rawBase };
export default apiUrl;
