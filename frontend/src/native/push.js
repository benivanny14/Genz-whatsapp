import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { isNative } from './platform';
import { applyDeepLink } from './deepLinks';
import { authFetch } from '../utils/authFetch';
import { API_URL } from '../utils/authSession';

const CHANNELS = [
  { id: 'genz_messages', name: 'Messages', description: 'Direct messages', importance: 5 },
  { id: 'genz_groups', name: 'Groups', description: 'Group messages', importance: 4 },
  { id: 'genz_status', name: 'Status', description: 'Status updates', importance: 3 },
  { id: 'genz_silent', name: 'Silent', description: 'Silent updates', importance: 2 }
];

let registered = false;

export async function registerNativePush({ navigate, selectConversation } = {}) {
  if (!isNative() || !Capacitor.isPluginAvailable('PushNotifications') || registered) return;
  registered = true;
  try {
    for (const channel of CHANNELS) {
      await PushNotifications.createChannel({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        visibility: 1,
        vibration: channel.id !== 'genz_silent',
        sound: channel.id === 'genz_silent' ? undefined : 'default'
      }).catch(() => {});
    }

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      registered = false;
      return;
    }
    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      try {
        await authFetch(`${API_URL}/notifications/fcm/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.value })
        });
      } catch (error) {
        console.warn('[push] token register failed', error);
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.warn('[push] registration error', error);
    });

    PushNotifications.addListener('pushNotificationReceived', () => {
      // Foreground: in-app UI already handles socket events. Avoid duplicate system banners.
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action?.notification?.data || {};
      applyDeepLink({
        type: data.groupId && !data.conversationId ? 'group' : (data.type === 'status' ? 'status' : 'chat'),
        conversationId: data.conversationId,
        groupId: data.groupId,
        code: data.inviteCode || data.code
      }, { navigate, selectConversation });
      if (data.conversationId) {
        window.dispatchEvent(new CustomEvent('open-chat', { detail: { conversationId: data.conversationId } }));
      }
    });
  } catch (error) {
    registered = false;
    console.warn('[push] native setup failed', error);
  }
}
