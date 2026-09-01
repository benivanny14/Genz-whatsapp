/**
 * performanceMonitor.js — Lightweight performance tracking for Genz Messenger.
 *
 * Measures render times, tracks slow operations, and logs to console in dev.
 * No external dependencies — pure Performance API.
 *
 * Usage:
 *   import { measureRender, trackSlowRenders } from '../utils/performanceMonitor';
 *
 *   // Wrap a render
 *   const data = measureRender('ChatList', () => renderChatList(conversations));
 *
 *   // Auto-track slow renders (> 16ms = dropped frame)
 *   const tracker = trackSlowRenders('MessageBubble');
 *   tracker.start();
 *   // ... render
 *   tracker.end();
 */

const SLOW_THRESHOLD_MS = 16; // 1 frame at 60fps
const WARN_THRESHOLD_MS = 100; // Very slow — likely jank

const slowRenders = new Map();

/**
 * Measure execution time of a synchronous function.
 * @param {string} label — Human-readable name (e.g. "ChatList render")
 * @param {Function} fn — The function to measure
 * @returns {*} The return value of fn
 */
export const measureRender = (label, fn) => {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (duration > WARN_THRESHOLD_MS) {
    console.warn(`[Perf] ⚠️ SLOW: ${label} took ${duration.toFixed(1)}ms`);
  } else if (duration > SLOW_THRESHOLD_MS && import.meta?.env?.DEV) {
    console.info(`[Perf] ${label}: ${duration.toFixed(1)}ms`);
  }

  return result;
};

/**
 * Create a start/end tracker for async or multi-step operations.
 * @param {string} label
 * @returns {{ start: () => void, end: () => number }}
 */
export const trackSlowRenders = (label) => {
  let startTime = 0;

  return {
    start: () => {
      startTime = performance.now();
    },
    end: () => {
      const duration = performance.now() - startTime;

      // Track frequency of slow renders
      const count = (slowRenders.get(label) || 0) + 1;
      slowRenders.set(label, count);

      if (duration > WARN_THRESHOLD_MS) {
        console.warn(
          `[Perf] ⚠️ ${label}: ${duration.toFixed(1)}ms (slow #${count})`
        );
      } else if (duration > SLOW_THRESHOLD_MS && import.meta?.env?.DEV) {
        console.info(`[Perf] ${label}: ${duration.toFixed(1)}ms`);
      }

      return duration;
    },
  };
};

/**
 * Get summary of slow renders (for debugging).
 * @returns {Object} Map of label → count
 */
export const getSlowRenderSummary = () => {
  return Object.fromEntries(slowRenders);
};

/**
 * React hook version — wraps a component render with timing.
 * Usage:
 *   useRenderTimer('ChatArea');
 *
 * Call at the top of the component. It will log render time after each render.
 */
export const useRenderTimer = (componentName) => {
  if (import.meta?.env?.DEV) {
    const start = performance.now();
    // Use a microtask to measure after the render commit
    Promise.resolve().then(() => {
      const duration = performance.now() - start;
      if (duration > SLOW_THRESHOLD_MS) {
        console.info(`[Perf] ${componentName} render: ${duration.toFixed(1)}ms`);
      }
    });
  }
};
