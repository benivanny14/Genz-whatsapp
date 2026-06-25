// resolveApiBase - always use env var, never hardcode deployment URLs
export const resolveApiBase = () => {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
};

export const resolveSocketOrigin = () => {
  return (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || '').replace(/\/$/, '');
};

export default resolveApiBase;
