import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;
const UNAUTHENTICATED_FALLBACK_USER_ID = '60d5ecb8b392cb371c664c12';

function resolveSocketUserId(explicitId) {
  if (explicitId) return String(explicitId);
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (u?._id) return String(u._id);
  } catch (_) { /* ignore */ }
  return UNAUTHENTICATED_FALLBACK_USER_ID;
}

export const connectSocket = (userId) => {
  if (socket && socket.connected) {
    console.log('Socket already connected');
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  try {
    // Get token from localStorage if available (for future auth)
    const token = localStorage.getItem('token');
    
    const socketConfig = {
      reconnection: true,
      reconnectionAttempts: 5, // Reduced to prevent infinite retries
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      forceNew: false // Prevent creating new connections
    };
    
    // Add token if available
    if (token) {
      socketConfig.auth = { token };
    }
    
    socket = io(SOCKET_URL, socketConfig);

    socket.on('connect', () => {
      console.log('Connected to socket server');
      reconnectAttempts = 0;
      socket.emit('user:join', resolveSocketUserId(userId));
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      reconnectAttempts++;
      if (reconnectAttempts >= 5) {
        console.error('Max reconnection attempts reached, stopping retries');
        socket.disconnect();
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      reconnectAttempts = 0;
      socket.emit('user:join', resolveSocketUserId(userId));
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt:', attemptNumber);
    });

    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to socket server');
      socket.disconnect();
    });

    return socket;
  } catch (error) {
    console.error('Error creating socket connection:', error);
    return null;
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
  return socket;
};

export const joinConversation = (conversationId) => {
  if (socket) {
    socket.emit('join:conversation', conversationId);
  }
};

export const leaveConversation = (conversationId) => {
  if (socket) {
    socket.emit('leave:conversation', conversationId);
  }
};

export const sendMessage = (data) => {
  if (socket) {
    socket.emit('message:send', data);
  }
};

export const sendTyping = (conversationId, isTyping) => {
  if (socket) {
    socket.emit('message:typing', { conversationId, isTyping });
  }
};

export const markMessageAsRead = (messageId) => {
  if (socket) {
    socket.emit('message:read', { messageId });
  }
};

export const editMessage = (messageId, content) => {
  if (socket) {
    socket.emit('message:edit', { messageId, content });
  }
};

export const deleteMessage = (messageId, forEveryone) => {
  if (socket) {
    socket.emit('message:delete', { messageId, forEveryone });
  }
};

export const addReaction = (messageId, emoji) => {
  if (socket) {
    socket.emit('reaction:add', { messageId, emoji });
  }
};

export const removeReaction = (messageId) => {
  if (socket) {
    socket.emit('reaction:remove', { messageId });
  }
};

export const startCall = (conversationId, callType) => {
  if (socket) {
    socket.emit('call:start', { conversationId, callType });
  }
};

export const acceptCall = (conversationId, callerId) => {
  if (socket) {
    socket.emit('call:accept', { conversationId, callerId });
  }
};

export const rejectCall = (conversationId, callerId) => {
  if (socket) {
    socket.emit('call:reject', { conversationId, callerId });
  }
};

export const endCall = (conversationId) => {
  if (socket) {
    socket.emit('call:end', { conversationId });
  }
};
