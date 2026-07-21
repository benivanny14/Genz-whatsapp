const USER_SETTINGS_KEY = 'genz_user_settings';
const GENZ_SETTINGS_KEY = 'genz_settings_comprehensive';
const NOTIFICATION_SETTINGS_KEY = 'genz_notification_settings';

const readJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getEffectiveNotificationPreferences = (kind = 'message') => {
  const userSettings = readJson(USER_SETTINGS_KEY);
  const genzSettings = readJson(GENZ_SETTINGS_KEY);
  const legacySettings = readJson(NOTIFICATION_SETTINGS_KEY);
  const notifications = userSettings?.notifications || {};
  const legacyVibration = typeof legacySettings?.vibration === 'boolean'
    ? (legacySettings.vibration ? 'default' : 'off')
    : legacySettings?.vibration;

  const enabled = kind === 'call'
    ? (notifications.calls ?? true)
    : (notifications.messages ?? true);

  const vibrationMode = notifications.vibration ?? legacyVibration ?? 'default';
  const vibrationEnabled = String(vibrationMode).toLowerCase() !== 'off';
  const soundEnabled = notifications.sounds ?? legacySettings?.sound ?? true;
  const showPreview = notifications.showPreview ?? legacySettings?.showPreview ?? true;
  const highPriority = notifications.highPriority ?? true;

  return {
    enabled: Boolean(enabled),
    vibration: vibrationEnabled,
    sound: Boolean(soundEnabled),
    showPreview: Boolean(showPreview),
    highPriority: Boolean(highPriority),
    vibrationMode,
    isDnd: Boolean(genzSettings?.isDNDMode || genzSettings?.mods?.dndMode),
    kind
  };
};
