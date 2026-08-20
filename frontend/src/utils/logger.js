/**
 * Secure Logger - Only logs in development mode
 * 
 * In production, sensitive information like tokens, user data, and session
 * details should never be logged to the console.
 */

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/**
 * Development-only logger
 * Logs only in development mode, completely silenced in production
 */
export const devLog = (...args) => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Development-only warning
 * Logs only in development mode
 */
export const devWarn = (...args) => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * Development-only error
 * Logs errors in development, uses generic messages in production
 */
export const devError = (...args) => {
  if (isDev) {
    console.error(...args);
  }
};

/**
 * Production-safe error logger
 * Logs a generic message in production, full details in development
 */
export const secureError = (message, error) => {
  if (isDev) {
    console.error(`[Error] ${message}:`, error);
  } else {
    // In production, only log non-sensitive error info
    console.error(`[Error] ${message}`);
  }
};

/**
 * Check if running in development mode
 */
export const isDevelopment = () => isDev;

export default {
  devLog,
  devWarn,
  devError,
  secureError,
  isDevelopment
};
