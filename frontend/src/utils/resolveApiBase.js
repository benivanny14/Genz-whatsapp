// resolveApiBase - always use env var, never hardcode deployment URLs
export const resolveApiBase = () => {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
};

export default resolveApiBase;
