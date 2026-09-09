/**
 * UserSettings — extracted from User model's Mixed fields.
 *
 * PROBLEM: The original User model accumulated 50+ Mixed-typed settings fields
 * (antiBanSettings, chatFolders, storyHighlights, etc.) making the document
 * bloated and untyped. Every feature controller reads/writes these directly.
 *
 * MIGRATION PATH: This model is created for NEW features. Existing Mixed
 * fields on User remain for backward compat. Once all controllers are
 * migrated to use this model, the Mixed fields can be removed from User.
 *
 * Usage (after migration):
 *   const settings = await UserSettings.findOne({ userId: user._id });
 *   settings.chatFolders = [...];
 *   await settings.save();
 */
const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  // ── Chat mods ──
  antiBanSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  messageModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  chatListModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Privacy mods ──
  privacyModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  securityModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  antiRevokeSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  automationModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Media mods ──
  mediaModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  mediaCompressorSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  mediaEditorSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  editHistory: { type: mongoose.Schema.Types.Mixed, default: [] },

  // ── Customization ──
  customizationModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  themeEngineSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  groupModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Chat organization ──
  chatFolders: { type: mongoose.Schema.Types.Mixed, default: [] },
  chatFoldersSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  chatFilterSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  savedFilterPreferences: { type: mongoose.Schema.Types.Mixed, default: [] },
  chatSearchSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  searchHistory: { type: mongoose.Schema.Types.Mixed, default: [] },
  chatSortSettings: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Status / Stories ──
  collaborativeStatusSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  collaborativeStatuses: { type: mongoose.Schema.Types.Mixed, default: [] },
  storyHighlights: { type: mongoose.Schema.Types.Mixed, default: [] },
  storyHighlightsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  statusHighlights: { type: mongoose.Schema.Types.Mixed, default: [] },
  statusReelModeSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  viewedStatuses: { type: mongoose.Schema.Types.Mixed, default: [] },

  // ── Storage & Cache ──
  cacheCleanerSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  cacheData: { type: mongoose.Schema.Types.Mixed, default: {} },
  storageManagerSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  dataUsageSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  fileManagerSettings: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Tools ──
  bulkSenderSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  scheduledBulkMessages: { type: mongoose.Schema.Types.Mixed, default: [] },
  chatAnalyzerSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  messageCount: { type: mongoose.Schema.Types.Mixed, default: {} },
  fakeChatSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  textRepeaterSettings: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── GIFs / Stickers ──
  gifPlayerSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  savedGIFs: { type: mongoose.Schema.Types.Mixed, default: [] },

  // ── Group / Social ──
  groupFeaturesSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  liveReactionsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  quickActionsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Accounts & Sessions ──
  multiAccountsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  connectedDevices: { type: mongoose.Schema.Types.Mixed, default: [] },
  whatsappWebSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  whatsappWebSessions: { type: mongoose.Schema.Types.Mixed, default: [] },
  businessAccountSettings: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Security & Abuse ──
  suspiciousActivities: { type: mongoose.Schema.Types.Mixed, default: [] },
  blockAlerts: { type: mongoose.Schema.Types.Mixed, default: [] },
  deletedMessagesCache: { type: mongoose.Schema.Types.Mixed, default: [] },
  blockedCallHistory: { type: mongoose.Schema.Types.Mixed, default: [] },

  // ── Location ──
  locationSharingSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  liveLocations: { type: mongoose.Schema.Types.Mixed, default: [] },
  lastLocation: { type: mongoose.Schema.Types.Mixed, default: null },

  // ── Status blocked/muted ──
  blockedStatusUsers: { type: mongoose.Schema.Types.Mixed, default: [] },
  mutedStatusUsers: { type: mongoose.Schema.Types.Mixed, default: [] },
  savedStatuses: { type: mongoose.Schema.Types.Mixed, default: [] },
}, {
  timestamps: true,
});

// TTL: auto-delete settings for accounts deleted > 30 days ago
userSettingsSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('UserSettings', userSettingsSchema);
