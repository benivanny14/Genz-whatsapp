const DEVICE_ID_KEY = 'genz_device_id';
const DEVICE_INFO_KEY = 'genz_device_info';

// Get or generate device ID
export const getDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      // Fallback v4 UUID generator for insecure contexts (HTTP)
      deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
};

// Get device information
export const getDeviceInfo = () => {
  let deviceInfo = JSON.parse(localStorage.getItem(DEVICE_INFO_KEY) || '{}');
  
  if (!deviceInfo.createdAt) {
    deviceInfo = {
      id: getDeviceId(),
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    localStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(deviceInfo));
  }
  
  return deviceInfo;
};

// Reset device identity (for testing/debugging)
export const resetDeviceIdentity = () => {
  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem(DEVICE_INFO_KEY);
  return getDeviceId();
};

// Get device-specific headers for API calls
export const getDeviceHeaders = () => {
  return {
    'X-Device-ID': getDeviceId(),
    'X-Device-Platform': navigator.platform,
    'X-Device-Language': navigator.language
  };
};

// Check if device is premium
export const isDevicePremium = async () => {
  try {
    const db = (await import('./indexedDB')).default;
    const subscription = await db.getSubscription(getDeviceId());
    return subscription && subscription.active && subscription.expiresAt > new Date().toISOString();
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
};

// Save premium subscription
export const savePremiumSubscription = async (subscriptionData) => {
  try {
    const db = (await import('./indexedDB')).default;
    const subscription = {
      deviceId: getDeviceId(),
      ...subscriptionData,
      active: true,
      createdAt: new Date().toISOString()
    };
    await db.saveSubscription(subscription);
    return subscription;
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }
};

// Get all device settings
export const getDeviceSettings = async () => {
  try {
    const db = (await import('./indexedDB')).default;
    const settings = await db.getAllSettings();
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });
    return settingsObj;
  } catch (error) {
    console.error('Error getting device settings:', error);
    return {};
  }
};

// Save device setting
export const saveDeviceSetting = async (key, value) => {
  try {
    const db = (await import('./indexedDB')).default;
    await db.saveSetting(key, value);
    return true;
  } catch (error) {
    console.error('Error saving device setting:', error);
    return false;
  }
};

export default {
  getDeviceId,
  getDeviceInfo,
  resetDeviceIdentity,
  getDeviceHeaders,
  isDevicePremium,
  savePremiumSubscription,
  getDeviceSettings,
  saveDeviceSetting
};
