import { io } from 'socket.io-client';
import { resolveSocketOrigin } from '../utils/resolveApiBase';

const SOCKET_ORIGIN = resolveSocketOrigin();

let socket = null;
let reconnectAttempts = 0;

/** Called by ChatContext so getSocket() returns the live connection */
export const setSocketInstance = (instance) => {
  socket = instance || null;
};

export const clearSocketInstance = () => {
  socket = null;
};

const MAX_RECONNECT_ATTEMPTS = 10;

function resolveSocketUserId(explicitId) {
  if (explicitId) return String(explicitId);
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (u?._id) return String(u._id);
  } catch (_) { /* ignore */ }
  return null;
}

export const connectSocket = (userId) => {
  const resolvedUserId = resolveSocketUserId(userId);
  if (!resolvedUserId) {
    console.warn('[Socket] Cannot connect without authenticated user');
    return null;
  }

  if (socket && socket.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  try {
    const token = localStorage.getItem('token');

    const socketConfig = {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
      transports: ['polling', 'websocket'],
      upgrade: true,
      forceNew: false,
      auth: { token, userId: resolvedUserId }
    };

    socket = io(SOCKET_ORIGIN, socketConfig);

    socket.on('connect', () => {
      console.log('[Socket] Connected to:', SOCKET_ORIGIN);
      reconnectAttempts = 0;
      socket.emit('user:join', resolvedUserId);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error?.message || error);
      reconnectAttempts++;
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        setTimeout(() => socket?.connect?.(), 1000);
      }
    });

    socket.on('error', (error) => {
      console.error('[Socket] Error event:', error);
    });

    socket.on('reconnect', () => {
      reconnectAttempts = 0;
      socket.emit('user:join', resolvedUserId);
    });

    return socket;
  } catch (error) {
    console.error('[Socket] Error creating connection:', error);
    return null;
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const joinConversation = (conversationId) => {
  socket?.emit('join:conversation', conversationId);
};

export const leaveConversation = (conversationId) => {
  socket?.emit('leave:conversation', conversationId);
};

export const sendMessage = (data) => {
  socket?.emit('message:send', data);
};

export const sendTyping = (conversationId, isTyping) => {
  socket?.emit('message:typing', { conversationId, isTyping });
};

export const markMessageAsRead = (messageId) => {
  socket?.emit('message:read', { messageId });
};

export const editMessage = (messageId, content) => {
  socket?.emit('message:edit', { messageId, content });
};

export const deleteMessage = (messageId, forEveryone) => {
  socket?.emit('message:delete', { messageId, forEveryone });
};

export const addReaction = (messageId, emoji) => {
  socket?.emit('reaction:add', { messageId, emoji });
};

export const removeReaction = (messageId) => {
  socket?.emit('reaction:remove', { messageId });
};

export const startCall = (conversationId, callType) => {
  socket?.emit('call:start', { conversationId, callType });
};

export const acceptCall = (conversationId, callerId) => {
  socket?.emit('call:accept', { conversationId, callerId });
};

export const rejectCall = (conversationId, callerId) => {
  socket?.emit('call:reject', { conversationId, callerId });
};

export const endCall = (conversationId) => {
  socket?.emit('call:end', { conversationId });
};
