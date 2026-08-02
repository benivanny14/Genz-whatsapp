const {
  DEFAULT_WHATSAPP_SETTINGS,
  createDefaultWhatsAppSettings,
  mergeWhatsAppSettings
} = require('../utils/whatsappSettings');

describe('mergeWhatsAppSettings (unit)', () => {
  it('should create deep-cloned defaults (no shared references)', () => {
    const a = createDefaultWhatsAppSettings();
    const b = createDefaultWhatsAppSettings();
    expect(a).toEqual(DEFAULT_WHATSAPP_SETTINGS);
    expect(a).not.toBe(b);
    expect(a.privacy).not.toBe(b.privacy);
  });

  it('should return defaults for empty input', () => {
    expect(mergeWhatsAppSettings({})).toEqual(DEFAULT_WHATSAPP_SETTINGS);
    expect(mergeWhatsAppSettings(null)).toEqual(DEFAULT_WHATSAPP_SETTINGS);
    expect(mergeWhatsAppSettings()).toEqual(DEFAULT_WHATSAPP_SETTINGS);
  });

  it('should deep-merge partial nested updates', () => {
    const merged = mergeWhatsAppSettings({}, {
      privacy: { lastSeen: 'nobody' },
      notifications: { messages: false }
    });
    expect(merged.privacy.lastSeen).toBe('nobody');
    expect(merged.privacy.online).toBe(DEFAULT_WHATSAPP_SETTINGS.privacy.online);
    expect(merged.notifications.messages).toBe(false);
    expect(merged.notifications.groups).toBe(true);
  });

  it('should reject unknown top-level and nested keys', () => {
    const merged = mergeWhatsAppSettings({}, {
      evilKey: 'x',
      privacy: { hacked: true, lastSeen: 'contacts' },
      account: { notAField: 123 }
    });
    expect(merged.evilKey).toBeUndefined();
    expect(merged.privacy.hacked).toBeUndefined();
    expect(merged.account.notAField).toBeUndefined();
    expect(merged.privacy.lastSeen).toBe('contacts');
  });

  it('should be immune to prototype pollution attempts', () => {
    const payload = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted2":true}},"privacy":{"lastSeen":"contacts"}}');
    const merged = mergeWhatsAppSettings({}, payload);
    expect(merged.polluted).toBeUndefined();
    expect({}.polluted).toBeUndefined();
    expect({}.polluted2).toBeUndefined();
    expect(merged.privacy.lastSeen).toBe('contacts');
  });

  it('should validate option values and fall back to defaults', () => {
    const merged = mergeWhatsAppSettings({}, {
      privacy: { lastSeen: 'not-a-real-option', status: 'invalid' },
      chats: { theme: 'neon', fontSize: 'huge' },
      app: { language: 'klingon' }
    });
    expect(merged.privacy.lastSeen).toBe(DEFAULT_WHATSAPP_SETTINGS.privacy.lastSeen);
    expect(merged.privacy.status).toBe(DEFAULT_WHATSAPP_SETTINGS.privacy.status);
    expect(merged.chats.theme).toBe(DEFAULT_WHATSAPP_SETTINGS.chats.theme);
    expect(merged.chats.fontSize).toBe(DEFAULT_WHATSAPP_SETTINGS.chats.fontSize);
    expect(merged.app.language).toBe(DEFAULT_WHATSAPP_SETTINGS.app.language);
  });

  it('should keep valid option values', () => {
    const merged = mergeWhatsAppSettings({}, {
      privacy: { status: 'only_share_with', defaultMessageTimer: '7d' },
      chats: { backup: { frequency: 'daily' } }
    });
    expect(merged.privacy.status).toBe('only_share_with');
    expect(merged.privacy.defaultMessageTimer).toBe('7d');
    expect(merged.chats.backup.frequency).toBe('daily');
  });

  it('should coerce booleans from strings', () => {
    const merged = mergeWhatsAppSettings({}, {
      privacy: { readReceipts: 'false' },
      notifications: { showPreview: 'true' }
    });
    expect(merged.privacy.readReceipts).toBe(false);
    expect(merged.notifications.showPreview).toBe(true);
  });

  it('should coerce numbers and clamp wallpaperDimming', () => {
    const merged = mergeWhatsAppSettings({}, {
      chats: { wallpaperDimming: 150 }
    });
    expect(merged.chats.wallpaperDimming).toBe(100);

    const mergedNeg = mergeWhatsAppSettings({}, {
      chats: { wallpaperDimming: -5 }
    });
    expect(mergedNeg.chats.wallpaperDimming).toBe(0);
  });

  it('should validate media auto-download arrays', () => {
    const merged = mergeWhatsAppSettings({}, {
      storageData: {
        mobileAutoDownload: ['photos', 'hacked', 'videos'],
        wifiAutoDownload: ['documents', 'audio', 'photos', 'videos', 'videos', 'bogus']
      }
    });
    expect(merged.storageData.mobileAutoDownload).toEqual(['photos', 'videos']);
    expect(merged.storageData.wifiAutoDownload).toEqual(['documents', 'audio', 'photos', 'videos']);
  });

  it('should reject arrays where objects are expected and vice versa', () => {
    const merged = mergeWhatsAppSettings({}, {
      privacy: [],
      notifications: 'not-an-object'
    });
    expect(merged.privacy).toEqual(DEFAULT_WHATSAPP_SETTINGS.privacy);
    expect(merged.notifications).toEqual(DEFAULT_WHATSAPP_SETTINGS.notifications);
  });

  it('should normalize legacy theme/statusPrivacy/pinLock shapes', () => {
    const merged = mergeWhatsAppSettings({}, {
      theme: { mode: 'dark', wallpaper: 'x', chatColor: '#ff0000' },
      privacy: { statusPrivacy: 'nobody' },
      security: { pinLock: { enabled: true, lockAfter: '1h' } }
    });
    expect(merged.chats.theme).toBe('dark');
    expect(merged.chats.wallpaper).toBe('x');
    expect(merged.chats.chatColor).toBe('#ff0000');
    expect(merged.privacy.status).toBe('nobody');
    expect(merged.privacy.appLock.enabled).toBe(true);
    expect(merged.privacy.appLock.lockAfter).toBe('1h');
  });

  it('should merge multiple sources in order (later wins)', () => {
    const merged = mergeWhatsAppSettings(
      { privacy: { lastSeen: 'nobody' } },
      { privacy: { lastSeen: 'contacts', about: 'contacts' } },
      { privacy: { about: 'nobody' } }
    );
    expect(merged.privacy.lastSeen).toBe('contacts');
    expect(merged.privacy.about).toBe('nobody');
  });
});
