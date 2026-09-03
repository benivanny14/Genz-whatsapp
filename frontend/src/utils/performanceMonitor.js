/**
 * performanceMonitor.js — Dev-only performance measurement utilities.
 *
 * All functions are NO-OPS in production builds (import.meta.env.PROD).
 * Safe to call from any component without performance overhead in release.
 */

const isDev = import.meta.env.DEV;

/**
 * Measure synchronous operation performance.
 * @param {string} label — name shown in console
 * @param {Function} fn — function to measure
 * @returns {*} fn's return value
 */
export const measurePerformance = (label, fn) => {
  if (!isDev) return fn();
  const start = performance.now();
  const result = fn();
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`[Perf] ${label}: ${elapsed}ms`);
  return result;
};

/**
 * Measure async operation performance.
 * @param {string} label — name shown in console
 * @param {Function} fn — async function to measure
 * @returns {Promise<*>} fn's return value
 */
export const measurePerformanceAsync = async (label, fn) => {
  if (!isDev) return fn();
  const start = performance.now();
  const result = await fn();
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`[Perf] ${label}: ${elapsed}ms`);
  return result;
};

/**
 * Track component render time (call on mount).
 * @param {string} componentName
 * @returns {Function} call on unmount to log total time
 */
export const trackRender = (componentName) => {
  if (!isDev) return () => {};
  const start = performance.now();
  return () => {
    const elapsed = (performance.now() - start).toFixed(2);
    console.log(`[Render] ${componentName} lived ${elapsed}ms`);
  };
};

export default { measurePerformance, measurePerformanceAsync, trackRender };
