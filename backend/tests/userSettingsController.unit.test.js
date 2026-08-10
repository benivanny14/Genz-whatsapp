jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');
const userSettings = require('../controllers/userSettingsController');

const makeRes = () => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
};

const makeReq = (overrides = {}) => ({
  body: {},
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  username: 'alice',
  settings: undefined,
  customizationModsSettings: undefined,
  themeEngineSettings: undefined,
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('userSettingsController — /api/settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getSettings returns 404 when the user cannot be found (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await userSettings.getSettings(makeReq(), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('User not found');
  });

  it('getSettings returns defaults when no settings stored (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await userSettings.getSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.privacy.lastSeen).toBeDefined();
    expect(res.body.settings.chats).toBeDefined();
  });

  it('getSettings returns stored settings (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ settings: { privacy: { lastSeen: 'nobody' } } }));
    const res = makeRes();
    await userSettings.getSettings(makeReq(), res);
    expect(res.body.settings.privacy.lastSeen).toBe('nobody');
  });

  it('updateSettings returns 404 when user missing', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await userSettings.updateSettings(makeReq({ body: { privacy: { lastSeen: 'contacts' } } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updateSettings merges incoming settings and saves (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.updateSettings(
      makeReq({ body: { privacy: { lastSeen: 'contacts' }, notifications: { messages: false } } }),
      res
    );
    expect(user.settings.privacy.lastSeen).toBe('contacts');
    expect(user.settings.notifications.messages).toBe(false);
    // untouched defaults preserved via deep merge
    expect(user.settings.notifications.groups).toBe(true);
    expect(user.markModified).toHaveBeenCalledWith('settings');
    expect(user.save).toHaveBeenCalled();
    expect(res.body.message).toBe('Settings updated successfully');
  });

  it('resetSettings returns 404 when user missing', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await userSettings.resetSettings(makeReq(), res);
    expect(res.statusCode).toBe(404);
  });

  it('resetSettings restores defaults (happy path)', async () => {
    const user = makeUser({ settings: { privacy: { lastSeen: 'nobody' } } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.resetSettings(makeReq(), res);
    expect(user.settings.privacy.lastSeen).toBeDefined();
    expect(user.markModified).toHaveBeenCalledWith('settings');
    expect(user.save).toHaveBeenCalled();
    expect(res.body.message).toBe('Settings reset to defaults');
  });
});

describe('userSettingsController — /api/customization-mods', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getCustomizationModsSettings returns 401 when user cannot be resolved', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await userSettings.getCustomizationModsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('getCustomizationModsSettings returns defaults merged with stored (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ customizationModsSettings: { customTicksEnabled: true } }));
    const res = makeRes();
    await userSettings.getCustomizationModsSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.customTicksEnabled).toBe(true);
    expect(res.body.settings.customFontsEnabled).toBe(false); // default
    expect(res.body.settings.themesStoreEnabled).toBe(false); // default
  });

  it('updateCustomizationModsSettings accepts body.settings wrapper (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.updateCustomizationModsSettings(makeReq({ body: { settings: { customFontsEnabled: true } } }), res);
    expect(user.customizationModsSettings.customFontsEnabled).toBe(true);
    expect(user.markModified).toHaveBeenCalledWith('customizationModsSettings');
    expect(user.save).toHaveBeenCalled();
  });

  it('updateCustomizationModsSettings accepts a raw body (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.updateCustomizationModsSettings(makeReq({ body: { customEmojisEnabled: true } }), res);
    expect(user.customizationModsSettings.customEmojisEnabled).toBe(true);
    expect(res.body.settings.customEmojisEnabled).toBe(true);
  });

  it('updateCustomizationModsSettings returns 401 when user missing', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await userSettings.updateCustomizationModsSettings(makeReq({ body: { settings: {} } }), res);
    expect(res.statusCode).toBe(401);
  });

  const toggleCases = [
    ['toggleCustomTicks', 'customTicksEnabled'],
    ['toggleCustomFonts', 'customFontsEnabled'],
    ['toggleCustomBubbleColors', 'customBubbleColorsEnabled'],
    ['toggleCustomHeader', 'customHeaderEnabled'],
    ['toggleCustomNavigation', 'customNavigationEnabled'],
    ['toggleCustomIcons', 'customIconsEnabled'],
    ['toggleCustomEmojis', 'customEmojisEnabled'],
    ['toggleThemesStore', 'themesStoreEnabled']
  ];

  toggleCases.forEach(([handler, field]) => {
    it(`${handler} flips ${field} false → true (happy path)`, async () => {
      const user = makeUser({ customizationModsSettings: { [field]: false } });
      User.findById.mockResolvedValue(user);
      const res = makeRes();
      await userSettings[handler](makeReq(), res);
      expect(res.body.success).toBe(true);
      expect(res.body[field]).toBe(true);
      expect(user.customizationModsSettings[field]).toBe(true);
      expect(user.save).toHaveBeenCalled();
    });

    it(`${handler} flips ${field} true → false`, async () => {
      const user = makeUser({ customizationModsSettings: { [field]: true } });
      User.findById.mockResolvedValue(user);
      const res = makeRes();
      await userSettings[handler](makeReq(), res);
      expect(res.body[field]).toBe(false);
    });
  });

  it('toggles return 401 when user cannot be resolved', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await userSettings.toggleCustomTicks(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });
});

describe('userSettingsController — /api/theme-engine', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getThemeEngineSettings returns 401 when user missing', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await userSettings.getThemeEngineSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('getThemeEngineSettings returns defaults merged with stored (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ themeEngineSettings: { themeMode: 'dark' } }));
    const res = makeRes();
    await userSettings.getThemeEngineSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.themeMode).toBe('dark');
    expect(res.body.settings.themeEngineEnabled).toBe(true); // default
    expect(res.body.settings.fontFamily).toBe('Inter'); // default
  });

  it('updateThemeEngineSettings merges body.settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.updateThemeEngineSettings(makeReq({ body: { settings: { themeMode: 'night' } } }), res);
    expect(user.themeEngineSettings.themeMode).toBe('night');
    expect(user.markModified).toHaveBeenCalledWith('themeEngineSettings');
    expect(user.save).toHaveBeenCalled();
  });

  it('updateFontSettings sets font fields while keeping defaults (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.updateFontSettings(
      makeReq({ body: { fontFamily: 'Poppins', fontSize: 'large', customFontSize: 16, customFontEnabled: true } }),
      res
    );
    expect(user.themeEngineSettings.fontFamily).toBe('Poppins');
    expect(user.themeEngineSettings.fontSize).toBe('large');
    expect(user.themeEngineSettings.customFontSize).toBe(16);
    expect(user.themeEngineSettings.customFontEnabled).toBe(true);
    expect(user.themeEngineSettings.availableFonts).toHaveLength(6); // defaults preserved
  });

  it('updateThemeMode sets mode and amoled (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.updateThemeMode(makeReq({ body: { themeMode: 'dark', amoledMode: true } }), res);
    expect(user.themeEngineSettings.themeMode).toBe('dark');
    expect(user.themeEngineSettings.amoledMode).toBe(true);
  });

  it('updateCustomColors sets colors and boolean toggles (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.updateCustomColors(
      makeReq({ body: { customThemeColor: '#ff0000', customBubbleColorEnabled: true } }),
      res
    );
    expect(user.themeEngineSettings.customThemeColor).toBe('#ff0000');
    expect(user.themeEngineSettings.customBubbleColorEnabled).toBe(true);
    expect(user.themeEngineSettings.customBubbleColor).toBe('#008069'); // default
  });

  it('updateUICustomization sets style fields (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.updateUICustomization(
      makeReq({ body: { chatBubbleStyle: 'rounded', tickStyle: 'colored', popupNotifications: false } }),
      res
    );
    expect(user.themeEngineSettings.chatBubbleStyle).toBe('rounded');
    expect(user.themeEngineSettings.tickStyle).toBe('colored');
    expect(user.themeEngineSettings.popupNotifications).toBe(false);
  });

  it('getAvailableOptions returns option lists (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await userSettings.getAvailableOptions(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.options.fonts).toContain('Inter');
    expect(res.body.options.bubbleStyles).toEqual(['default', 'rounded', 'square', 'modern']);
    expect(res.body.options.themeModes).toEqual(['dark', 'light', 'auto', 'night']);
    expect(res.body.options.fontSizes).toEqual(['small', 'medium', 'large', 'extra']);
  });

  it('toggleThemeEngine accepts an explicit enabled flag', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.toggleThemeEngine(makeReq({ body: { enabled: false } }), res);
    expect(user.themeEngineSettings.themeEngineEnabled).toBe(false);
  });

  it('toggleThemeEngine flips the current value when flag absent', async () => {
    const user = makeUser({ themeEngineSettings: { themeEngineEnabled: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.toggleThemeEngine(makeReq({ body: {} }), res);
    expect(user.themeEngineSettings.themeEngineEnabled).toBe(true);
  });

  it('toggleLegacy2014 sets the flag explicitly', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.toggleLegacy2014(makeReq({ body: { enabled: true } }), res);
    expect(res.body.legacy2014Mode).toBe(true);
    expect(user.themeEngineSettings.legacy2014Mode).toBe(true);
  });

  it('resetThemeEngineSettings restores defaults (happy path)', async () => {
    const user = makeUser({ themeEngineSettings: { themeMode: 'night', fontFamily: 'Poppins' } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await userSettings.resetThemeEngineSettings(makeReq(), res);
    expect(user.themeEngineSettings.themeMode).toBe('auto');
    expect(user.themeEngineSettings.fontFamily).toBe('Inter');
    expect(user.markModified).toHaveBeenCalledWith('themeEngineSettings');
    expect(user.save).toHaveBeenCalled();
  });
});
