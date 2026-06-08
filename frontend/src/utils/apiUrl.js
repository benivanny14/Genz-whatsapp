/**
 * Build API URLs without duplicating /api when VITE_API_URL already includes it.
 */
const rawBase = (import.meta.env.VITE_API_URL || 'https://genz-whatsapp-2.onrender.com/api').replace(/\/$/, '');

export const API_BASE = rawBase;

export const apiUrl = (path = '') => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (rawBase.endsWith('/api')) {
    return `${rawBase}${normalized.replace(/^\/api/, '')}`;
  }
  return `${rawBase}/api${normalized}`;
};

export default apiUrl;
