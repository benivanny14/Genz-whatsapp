import { io } from 'socket.io-client';
import { resolveSocketOrigin } from '../utils/resolveApiBase';
import { adminTokenStore } from './adminApi';

const SOCKET_ORIGIN = resolveSocketOrigin();

let adminSocket = null;

export const connectAdminSocket = () => {
  const token = adminTokenStore.getAccessToken();
  if (!token) {
    console.warn('[AdminSocket] Cannot connect without admin access token');
    return null;
  }

  if (adminSocket && adminSocket.connected) {
    return adminSocket;
  }

  if (adminSocket) {
    adminSocket.disconnect();
    adminSocket = null;
  }

  try {
    adminSocket = io(SOCKET_ORIGIN, {
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      autoConnect: true,
      transports: ['polling', 'websocket'],
      auth: { token, isAdmin: true }
    });

    adminSocket.on('connect', () => {
      if (import.meta.env.DEV) console.log('[AdminSocket] Connected to:', SOCKET_ORIGIN);
      // Join admin rooms explicitly
      adminSocket.emit('admin:join');
    });

    adminSocket.on('connect_error', (error) => {
      if (import.meta.env.DEV) console.error('[AdminSocket] Connection error:', error?.message || error);
    });

    adminSocket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) console.log('[AdminSocket] Disconnected:', reason);
    });

    return adminSocket;
  } catch (error) {
    if (import.meta.env.DEV) console.error('[AdminSocket] Error creating connection:', error);
    return null;
  }
};

export const disconnectAdminSocket = () => {
  if (adminSocket) {
    adminSocket.disconnect();
    adminSocket = null;
  }
};

export const getAdminSocket = () => adminSocket;
