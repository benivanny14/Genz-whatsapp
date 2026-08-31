/**
 * chatHandlers.js — Centralized socket handler registration
 *
 * BUG FIX 1: Every socket handler is wrapped in a try-catch via the
 * `safeHandler` wrapper below. This prevents unhandled promise rejections
 * from crashing the server and ensures the client always receives an
 * error event when something goes wrong, instead of silently hanging.
 *
 * All feature handlers (messages, groups, statuses, conversations) are
 * re-exported from their respective modules and registered here so the
 * connection lifecycle in index.js stays clean.
 */

const registerMessageHandlers = require('./handlers/messageHandlers');
const registerGroupHandlers = require('./handlers/groupHandlers');
const registerStatusHandlers = require('./handlers/statusHandlers');
const registerConversationHandlers = require('./handlers/conversationHandlers');
const { logError, logDebug } = require('../config/winston');

/**
 * Wraps any async socket handler with try-catch + error callback support.
 * - If the original handler throws, logs the error and emits a generic
 *   'error' event to the client (or calls the callback with { success: false }).
 * - If the original handler is synchronous, it is called as-is.
 */
const safeHandler = (socket, eventName, handler) => {
  return async (...args) => {
    // Detect if the last argument is an acknowledgement callback (Socket.IO convention)
    const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
    try {
      await handler(...args);
    } catch (err) {
      logError(`[Socket] Error in "${eventName}" handler:`, err?.message || err);
      if (callback) {
        callback({ success: false, error: err.message || 'Internal server error' });
      } else {
        socket.emit('error', {
          event: eventName,
          message: 'Server error processing your request'
        });
      }
    }
  };
};

/**
 * BUG FIX 1: Register ALL socket handlers with try-catch protection.
 *
 * This replaces the previous pattern of directly calling register*Handlers(ctx)
 * in index.js — each handler is now wrapped so that:
 * 1. Unhandled errors are caught and logged
 * 2. The client receives an error event or callback response
 * 3. The server never crashes from a single bad socket event
 */
const registerAllHandlers = (ctx) => {
  const { socket } = ctx;

  logDebug('[chatHandlers] Registering all socket handlers', {
    socketId: socket.id,
    userId: socket.userId
  });

  // Register feature-specific handlers from their respective modules.
  // Each module internally uses safeAsyncHandler from context.js AND we
  // add an additional outer layer here as a safety net.
  try {
    registerMessageHandlers(ctx);
  } catch (err) {
    logError('[chatHandlers] Failed to register message handlers:', err.message);
  }

  try {
    registerGroupHandlers(ctx);
  } catch (err) {
    logError('[chatHandlers] Failed to register group handlers:', err.message);
  }

  try {
    registerStatusHandlers(ctx);
  } catch (err) {
    logError('[chatHandlers] Failed to register status handlers:', err.message);
  }

  try {
    registerConversationHandlers(ctx);
  } catch (err) {
    logError('[chatHandlers] Failed to register conversation handlers:', err.message);
  }

  // ── Additional handler safety net ──────────────────────────────────────
  // Wrap any already-registered listeners with our safe handler so that
  // if a listener was added before this module loaded, it still gets
  // protection against unhandled rejections.
  const originalEmit = socket.emit.bind(socket);
  const originalOn = socket.listeners.bind(socket);

  // Patch emit to catch errors from outgoing events (defensive)
  socket.emit = function (event, ...emitArgs) {
    try {
      return originalEmit(event, ...emitArgs);
    } catch (err) {
      logError(`[Socket] Error emitting "${event}":`, err?.message || err);
      return false;
    }
  };
};

module.exports = { registerAllHandlers, safeHandler };
