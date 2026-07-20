const clone = (value) => JSON.parse(JSON.stringify(value));

const DEFAULT_WHATSAPP_SETTINGS = {
  account: {
    email: '',
    twoStepVerification: false,
    passkeys: false,
    securityNotifications: true,
    changeNumberGuard: true,
    requestAccountInfoAt: null,
    deleteAccountGuard: true
  },
  privacy: {
    lastSeen: 'everyone',
    online: 'same_as_last_seen',
    profilePhoto: 'everyone',
    about: 'everyone',
    status: 'contacts',
    readReceipts: true,
    defaultMessageTimer: 'off',
    groups: 'everyone',
    blockedUsers: [],
    lastSeenExceptions: [],
    profilePhotoExceptions: [],
    aboutExceptions: [],
    statusExceptions: [],
    groupsExceptions: [],
    silenceUnknownCallers: false,
    protectIpAddressInCalls: false,
    disableLinkPreviews: false,
    blockUnknownAccountMessages: false,
    appLock: {
      enabled: false,
      lockAfter: 'immediately',
      requireBiometric: false
    },
    chatLock: {
      enabled: false,
      secretCodeEnabled: false,
      hideLockedChats: false
    },
    advancedChatPrivacy: false,
    privacyCheckupCompleted: false,
    privacyCheckupCompletedAt: null
  },
  chats: {
    theme: 'system',
    wallpaper: '',
    wallpaperDimming: 0,
    chatColor: '#00a884',
    fontSize: 'medium',
    enterIsSend: false,
    mediaVisibility: true,
    keepChatsArchived: true,
    archiveMutedChats: true,
    backup: {
      enabled: false,
      frequency: 'manual',
      account: '',
      includeVideos: false,
      endToEndEncrypted: false,
      passkeyEncrypted: false,
      lastBackupAt: null
    },
    history: {
      exportFormat: 'json',
      clearCacheOnLogout: false
    }
  },
  notifications: {
    messages: true,
    groups: true,
    calls: true,
    sounds: true,
    conversationTones: true,
    showPreview: true,
    highPriority: true,
    reactionNotifications: true,
    reminders: true,
    messageTone: 'default',
    groupTone: 'default',
    callRingtone: 'default',
    vibration: 'default'
  },
  storageData: {
    mobileAutoDownload: ['photos'],
    wifiAutoDownload: ['photos', 'audio', 'videos', 'documents'],
    roamingAutoDownload: [],
    photoUploadQuality: 'standard',
    videoUploadQuality: 'standard',
    useLessDataForCalls: false,
    proxy: {
      enabled: false,
      host: '',
      port: ''
    },
    networkUsageResetAt: null
  },
  app: {
    language: 'system',
    inviteFriends: true
  },
  help: {
    diagnostics: false,
    contactSupportAllowed: true
  }
};

const OPTION_RULES = {
  'privacy.lastSeen': ['everyone', 'contacts', 'contacts_except', 'nobody'],
  'privacy.online': ['everyone', 'same_as_last_seen'],
  'privacy.profilePhoto': ['everyone', 'contacts', 'contacts_except', 'nobody'],
  'privacy.about': ['everyone', 'contacts', 'contacts_except', 'nobody'],
  'privacy.status': ['contacts', 'contacts_except', 'only_share_with', 'nobody'],
  'privacy.defaultMessageTimer': ['off', '24h', '7d', '90d'],
  'privacy.groups': ['everyone', 'contacts', 'contacts_except'],
  'privacy.appLock.lockAfter': ['immediately', '1m', '15m', '1h'],
  'chats.theme': ['system', 'light', 'dark'],
  'chats.fontSize': ['small', 'medium', 'large'],
  'chats.backup.frequency': ['manual', 'daily', 'weekly', 'monthly'],
  'chats.history.exportFormat': ['json', 'txt'],
  'notifications.messageTone': ['default', 'classic', 'bell', 'chime', 'silent'],
  'notifications.groupTone': ['default', 'classic', 'bell', 'chime', 'silent'],
  'notifications.callRingtone': ['default', 'classic', 'bell', 'chime', 'silent'],
  'notifications.vibration': ['off', 'default', 'short', 'long'],
  'storageData.photoUploadQuality': ['standard', 'hd'],
  'storageData.videoUploadQuality': ['standard', 'hd'],
  'app.language': ['system', 'en', 'sw', 'fr', 'es', 'ar', 'hi']
};

const MEDIA_TYPES = new Set(['photos', 'audio', 'videos', 'documents']);
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const createDefaultWhatsAppSettings = () => clone(DEFAULT_WHATSAPP_SETTINGS);

const normalizeLegacySettings = (value = {}) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized = clone(value);

  if (normalized.theme && typeof normalized.theme === 'object') {
    normalized.chats = {
      ...(normalized.chats || {}),
      theme: normalized.theme.mode,
      wallpaper: normalized.theme.wallpaper,
      chatColor: normalized.theme.chatColor
    };
    delete normalized.theme;
  }

  if (normalized.privacy?.statusPrivacy && !normalized.privacy.status) {
    normalized.privacy.status = normalized.privacy.statusPrivacy;
  }

  if (normalized.security?.pinLock && !normalized.privacy?.appLock) {
    normalized.privacy = normalized.privacy || {};
    normalized.privacy.appLock = normalized.security.pinLock;
  }

  return normalized;
};

const coerceByTemplate = (template, incoming) => {
  if (incoming === undefined) return clone(template);

  if (Array.isArray(template)) {
    if (!Array.isArray(incoming)) return clone(template);
    return incoming
      .filter((item) => typeof item === 'string' && MEDIA_TYPES.has(item))
      .slice(0, MEDIA_TYPES.size);
  }

  if (template && typeof template === 'object') {
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return clone(template);
    }

    const output = clone(template);
    Object.keys(template).forEach((key) => {
      if (DANGEROUS_KEYS.has(key)) return;
      if (Object.prototype.hasOwnProperty.call(incoming, key)) {
        output[key] = coerceByTemplate(template[key], incoming[key]);
      }
    });
    return output;
  }

  if (typeof template === 'boolean') return incoming === true || incoming === 'true';
  if (typeof template === 'number') {
    const numberValue = Number(incoming);
    return Number.isFinite(numberValue) ? numberValue : template;
  }
  if (typeof template === 'string') return typeof incoming === 'string' ? incoming.slice(0, 500) : template;
  if (template === null) {
    if (incoming === null) return null;
    if (typeof incoming === 'string') return incoming.slice(0, 500);
    return incoming instanceof Date ? incoming.toISOString() : template;
  }

  return clone(template);
};

const getByPath = (target, path) => path.split('.').reduce((acc, key) => acc?.[key], target);

const setByPath = (target, path, value) => {
  const keys = path.split('.');
  const last = keys.pop();
  const parent = keys.reduce((acc, key) => acc?.[key], target);
  if (parent && Object.prototype.hasOwnProperty.call(parent, last)) {
    parent[last] = value;
  }
};

const enforceOptions = (settings) => {
  Object.entries(OPTION_RULES).forEach(([path, allowed]) => {
    const fallback = getByPath(DEFAULT_WHATSAPP_SETTINGS, path);
    const value = getByPath(settings, path);
    if (!allowed.includes(value)) {
      setByPath(settings, path, fallback);
    }
  });

  settings.chats.wallpaperDimming = Math.min(100, Math.max(0, Number(settings.chats.wallpaperDimming) || 0));
  return settings;
};

const mergeWhatsAppSettings = (...sources) => {
  return enforceOptions(
    sources.reduce((acc, source) => {
      const normalized = normalizeLegacySettings(source);
      return coerceByTemplate(acc, normalized);
    }, createDefaultWhatsAppSettings())
  );
};

module.exports = {
  DEFAULT_WHATSAPP_SETTINGS,
  createDefaultWhatsAppSettings,
  mergeWhatsAppSettings
};
