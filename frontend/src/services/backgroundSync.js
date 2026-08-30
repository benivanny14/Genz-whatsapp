/**
 * backgroundSync.js — Push notifications + app lifecycle for Capacitor APK.
 *
 * Handles: push registration, notification display, app state changes,
 * deep link routing, and unread badge management.
 */
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { getSocket } from './socket';
import { resolveApiBase } from '../utils/resolveApiBase';
import { getAuthToken } from '../utils/tokenStore';

let isInitialized = false;

/**
 * Initialize background sync for native platform.
 * Safe to call multiple times — only runs once.
 */
export const initBackgroundSync = async () => {
  if (!Capacitor.isNativePlatform() || isInitialized) return;

  try {
    // Request push notification permissions
    const permStatus = await PushNotifications.requestPermissions();

    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
    }

    // Push received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: notification.title || 'Genz Messenger',
            body: notification.body || '',
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            smallIcon: 'ic_stat_icon',
            largeIcon: 'ic_launcher_foreground',
            data: notification.data,
          },
        ],
      });
    });

    // Notification tapped
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data;
      if (data?.type === 'message' && data?.conversationId) {
        window.location.href = `/chat/${data.conversationId}`;
      } else if (data?.type === 'status') {
        window.location.href = '/status';
      }
    });

    // App state changes (foreground / background)
    App.addListener('appStateChange', async ({ isActive }) => {
      const socket = getSocket();
      if (isActive) {
        if (socket && !socket.connected) socket.connect();
        await fetchUnreadData();
      }
    });

    // Deep link handling
    App.addListener('appUrlOpen', (data) => {
      try {
        const url = new URL(data.url);
        if (url.pathname.startsWith('/status/')) {
          const statusId = url.pathname.split('/')[2];
          const shareToken = url.searchParams.get('share');
          window.location.href = `/status/${statusId}${shareToken ? `?share=${shareToken}` : ''}`;
        } else if (url.pathname.startsWith('/chat/')) {
          const chatId = url.pathname.split('/')[2];
          window.location.href = `/chat/${chatId}`;
        }
      } catch {}
    });

    isInitialized = true;
  } catch (err) {
    console.error('Background sync init error:', err);
  }
};

/**
 * Fetch unread message count and show local notification if > 0.
 */
const fetchUnreadData = async () => {
  try {
    const token = getAuthToken();
    if (!token) return;

    const res = await fetch(`${resolveApiBase()}/chat/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.count > 0) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: 'Messages mpya',
              body: `Una meseji ${data.count} ambazo hazijasomwa`,
              id: 99999,
              schedule: { at: new Date(Date.now() + 1000) },
              smallIcon: 'ic_stat_icon',
            },
          ],
        });
      }
    }
  } catch {}
};
