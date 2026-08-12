/**
 * permissionInheritanceService.js
 * -------------------------------
 * Shared helpers for contact-list changes (REFACTOR_PLAN / privacy
 * system): when a NEW contact is added, any privacy setting set to
 * 'contacts_except' automatically excludes the new contact (WhatsApp
 * behavior — new contacts are excluded by default), and every contact
 * mutation notifies the owner's sockets so the UI can live-refresh.
 *
 * Extracted from chatController.applyPermissionInheritance so the bulk
 * phone-contacts sync paths (phoneContactsController) inherit the same
 * rules.
 */

const User = require('../models/User');
const PrivacyExcludedContact = require('../models/PrivacyExcludedContact');

// [stored settings key, privacyType used in PrivacyExcludedContact records].
// Settings are stored camelCase (lastSeen/profilePhoto) while the permission
// engine + excluded-list records use snake_case (last_seen/profile_photo).
const PRIVACY_TYPES = [
  ['lastSeen', 'last_seen'],
  ['profilePhoto', 'profile_photo'],
  ['about', 'about'],
  ['status', 'status'],
  ['groups', 'groups'],
  ['calls', 'calls']
];

// Helper function to apply permission inheritance for new contacts
const applyPermissionInheritance = async (ownerUserId, newContactId, newContactName, newContactPhone) => {
  try {
    // Get owner's privacy settings
    const owner = await User.findById(ownerUserId).select('settings.privacy');
    if (!owner || !owner.settings?.privacy) return;

    const privacySettings = owner.settings.privacy;

    // For each privacy type that uses 'contacts_except', add the new contact to excluded list
    for (const [settingsKey, privacyType] of PRIVACY_TYPES) {
      const settingValue = privacySettings[settingsKey];

      if (settingValue === 'contacts_except') {
        // Check if there's an existing excluded list for this privacy type
        const existingExcluded = await PrivacyExcludedContact.findOne({
          ownerUserId,
          privacyType,
          excludedContactId: newContactId
        });

        if (!existingExcluded) {
          // Add new contact to excluded list (WhatsApp behavior: new contacts are excluded by default)
          await PrivacyExcludedContact.create({
            ownerUserId,
            privacyType,
            excludedContactId: newContactId,
            excludedContactName: newContactName,
            excludedContactPhone: newContactPhone
          });
        }
      }
    }

    // For status privacy with 'only_share_with', new contacts are NOT automatically added
    // User must manually add them to allowed list
  } catch (error) {
    console.error('Error applying permission inheritance:', error);
  }
};

/**
 * Notify the owner's connected sockets that their contact list changed, so
 * open contact selectors / contact managers can refresh live. Uses the same
 * io room convention as the rest of the app (user-id-named room).
 */
const notifyContactsUpdated = (req, userId) => {
  try {
    const io = req.app?.get?.('io');
    if (io) {
      io.to(String(userId)).emit('contacts:updated', { userId: String(userId) });
    }
  } catch (error) {
    console.error('Error notifying contacts:updated:', error);
  }
};

module.exports = {
  applyPermissionInheritance,
  notifyContactsUpdated
};
