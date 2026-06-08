/**
 * Resolve API + socket origins so production never points at the wrong Render service.
 */
export const resolveApiBase = () => {
  const env = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (env) return env.endsWith('/api') ? env : `${env}/api`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'https://genz-whatsapp-2.onrender.com/api';
};

export const resolveSocketOrigin = () => {
  const socketEnv = (import.meta.env.VITE_SOCKET_URL || '').replace(/\/$/, '');
  if (socketEnv) return socketEnv.replace(/\/api\/?$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return resolveApiBase().replace(/\/api\/?$/, '');
};
