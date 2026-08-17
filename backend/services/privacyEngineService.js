/**
 * privacyEngineService.js
 * -----------------------
 * Single source of truth for privacy permission decisions, shared by:
 *   - the permission engine       (utils/privacyHelper.js)
 *   - the privacy middleware      (middleware/privacy.js)
 *   - realtime socket paths       (socket/index.js, socket/handlers/*)
 *   - HTTP controllers            (authController.getUserOnlineHistory, ...)
 *
 * Previously every caller re-implemented isContact / isAllowed with subtly
 * different (and sometimes wrong) behavior: one compared c.toString() on
 * { user, savedName } subdocs (always "[object Object]"), another read
 * snake_case settings keys that are actually stored camelCase, and socket
 * paths treated 'contacts_except' exactly like 'contacts' (ignoring the
 * exclusion list). This module is the one place those rules live now.
 */

const PrivacyExcludedContact = require('../models/PrivacyExcludedContact');
const PrivacyAllowedContact = require('../models/PrivacyAllowedContact');

/**
 * Contacts are stored as { user, savedName } subdocuments — the id may live on
 * c.user (populated doc or ObjectId) or directly on the subdoc itself.
 * Returns the ObjectId (or string id) for a contact entry, or null.
 */
const getContactId = (contact) => {
  if (!contact) return null;
  if (contact.user) return contact.user;
  return contact.userId || contact;
};

/**
 * Is `requesterId` in `user`'s contact list? Subdoc-aware.
 */
const isContact = (user, requesterId) => {
  if (!user || !requesterId || !Array.isArray(user.contacts)) return false;
  const target = String(requesterId);
  return user.contacts.some((c) => {
    const id = getContactId(c);
    return id && id.toString && String(id) === target;
  });
};

/**
 * Is `requesterId` in the owner's excluded list for a privacy record type?
 */
const isExcluded = async (ownerUserId, privacyType, requesterId) => {
  try {
    const excluded = await PrivacyExcludedContact.findOne({
      ownerUserId,
      privacyType,
      excludedContactId: requesterId
    });
    return Boolean(excluded);
  } catch (error) {
    return false;
  }
};

/**
 * Is `requesterId` in the owner's allowed list for a privacy record type?
 */
const isAllowedContact = async (ownerUserId, privacyType, requesterId) => {
  try {
    const allowed = await PrivacyAllowedContact.findOne({
      ownerUserId,
      privacyType,
      allowedContactId: requesterId
    });
    return Boolean(allowed);
  } catch (error) {
    return false;
  }
};

/**
 * Full permission decision for one privacy field.
 *
 * @param user          the content owner (must expose _id, settings, contacts)
 * @param requesterId   the viewer
 * @param settingValue  the owner's setting for this field (everyone / contacts
 *                      / contacts_except / nobody / only_share_with)
 * @param privacyType   snake_case record type (last_seen / profile_photo /
 *                      about / status / groups / calls)
 */
const isAllowed = async (user, requesterId, settingValue, privacyType) => {
  if (settingValue === 'everyone') return true;
  if (settingValue === 'contacts') return isContact(user, requesterId);
  if (settingValue === 'contacts_except') {
    if (!isContact(user, requesterId)) return false;
    const excluded = await isExcluded(user?._id, privacyType, requesterId);
    return !excluded;
  }
  if (settingValue === 'nobody') return false;
  if (settingValue === 'only_share_with') {
    return isAllowedContact(user?._id, privacyType, requesterId);
  }
  return true; // unknown/undefined value → allow (matches legacy behavior)
};

/**
 * Settings are stored with camelCase keys (lastSeen/profilePhoto/about) while
 * exclusion records and some callers use snake_case (last_seen/profile_photo).
 * Map a snake_case record type to its settings key (or return it unchanged for
 * keys that are already camelCase).
 */
const SETTINGS_KEY_BY_RECORD = {
  last_seen: 'lastSeen',
  profile_photo: 'profilePhoto',
  about: 'about',
  status: 'status',
  groups: 'groups',
  calls: 'calls'
};

const getSettingValue = (privacySettings, recordType) => {
  const settings = privacySettings || {};
  const settingsKey = SETTINGS_KEY_BY_RECORD[recordType] || recordType;
  return settings[settingsKey] !== undefined
    ? settings[settingsKey]
    : settings[recordType];
};

/**
 * The online setting follows last-seen when set to 'same_as_last_seen', so
 * presence exclusions live under the 'last_seen' record type.
 */
const resolveOnlineSetting = (privacySettings = {}) =>
  privacySettings.online === 'same_as_last_seen'
    ? privacySettings.lastSeen
    : privacySettings.online;

/**
 * One-stop presence (online/offline) decision — used by the HTTP engine and by
 * every socket online/offline broadcast so both paths enforce the same rules.
 */
const canSeePresence = async (user, requesterId) => {
  const privacySettings = user?.settings?.privacy || {};
  return isAllowed(
    user,
    requesterId,
    resolveOnlineSetting(privacySettings),
    'last_seen'
  );
};

/**
 * Status-visibility decision used by socket status:create broadcasts and
 * status:view recording. `ownerUser` (with contacts) is required only for the
 * 'contacts' / 'contacts_except' modes.
 */
const canViewStatus = (status, viewerId, ownerUser) => {
  if (!status) return false;
  const viewer = String(viewerId);
  const ownerId = status.userId ? String(status.userId) : '';
  // The owner can always see their own status (they are not in their own
  // contact list, so the contacts-mode check below would otherwise deny them).
  if (ownerId && viewer === ownerId) return true;
  const privacy = status.privacy || 'contacts';

  if (privacy === 'everyone') return true;
  if (privacy === 'nobody' || privacy === 'only_me') {
    return viewer === ownerId;
  }
  if ((status.excludedViewers || []).some((id) => String(id) === viewer)) {
    return false;
  }
  if (privacy === 'only_share_with') {
    return (status.includedViewers || []).some((id) => String(id) === viewer);
  }
  // contacts / contacts_except — must be a contact of the owner.
  return isContact(ownerUser, viewer);
};

module.exports = {
  getContactId,
  isContact,
  isExcluded,
  isAllowedContact,
  isAllowed,
  getSettingValue,
  resolveOnlineSetting,
  canSeePresence,
  canViewStatus
};
