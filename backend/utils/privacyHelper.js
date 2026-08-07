const PrivacyExcludedContact = require('../models/PrivacyExcludedContact');
const PrivacyAllowedContact = require('../models/PrivacyAllowedContact');

const applyPrivacyFilter = async (user, requesterId) => {
  if (!user) return user;
  
  // If requester is the user themselves, no filtering needed
  if (requesterId && user._id && requesterId.toString() === user._id.toString()) {
    return user;
  }

  // Need plain object to delete/modify fields safely
  const filteredUser = user.toObject ? user.toObject() : { ...user };
  const privacySettings = filteredUser.settings?.privacy || {};

  // Helper to determine if requester is a contact
  const isContact = () => {
    if (!requesterId || !filteredUser.contacts) return false;
    return filteredUser.contacts.some(c => c.toString() === requesterId.toString());
  };

  // Helper to check if requester is in excluded list
  const isExcluded = async (privacyType) => {
    try {
      const excluded = await PrivacyExcludedContact.findOne({
        ownerUserId: user._id,
        privacyType,
        excludedContactId: requesterId
      });
      return !!excluded;
    } catch (error) {
      console.error('Error checking excluded contacts:', error);
      return false;
    }
  };

  // Helper to check if requester is in allowed list
  const isAllowedContact = async (privacyType) => {
    try {
      const allowed = await PrivacyAllowedContact.findOne({
        ownerUserId: user._id,
        privacyType,
        allowedContactId: requesterId
      });
      return !!allowed;
    } catch (error) {
      console.error('Error checking allowed contacts:', error);
      return false;
    }
  };

  const isAllowed = async (settingValue, privacyType) => {
    if (settingValue === 'everyone') return true;
    if (settingValue === 'contacts') return isContact();
    if (settingValue === 'contacts_except') {
      if (!isContact()) return false;
      const excluded = await isExcluded(privacyType);
      return !excluded;
    }
    if (settingValue === 'nobody') return false;
    if (settingValue === 'only_share_with') {
      const allowed = await isAllowedContact(privacyType);
      return allowed;
    }
    return true; // Default to allowed
  };

  // Filter Last Seen
  if (!(await isAllowed(privacySettings.lastSeen, 'last_seen'))) {
    delete filteredUser.lastSeen;
  }

  // Filter Online Status
  // If online setting is 'same_as_last_seen', use lastSeen's setting
  const onlineSetting = privacySettings.online === 'same_as_last_seen' 
    ? privacySettings.lastSeen 
    : privacySettings.online;
  
  if (!(await isAllowed(onlineSetting, 'online'))) {
    delete filteredUser.isOnline;
  }

  // Filter Profile Photo
  if (!(await isAllowed(privacySettings.profilePhoto, 'profile_photo'))) {
    delete filteredUser.profilePicture;
  }

  // Filter About
  if (!(await isAllowed(privacySettings.about, 'about'))) {
    delete filteredUser.about;
    delete filteredUser.bio;
  }

  // PII: contacts (address book) na settings (blockedUsers, appLock, defaultMessageTimer,
  // privacy config, n.k.) SIZI za kuonekana na watu wengine — hata kama wako kwenye conversation.
  delete filteredUser.contacts;
  delete filteredUser.settings;

  // E2EE/public-key material haipaswi kuonekana na watu wengine
  delete filteredUser.encryptionKeys;
  delete filteredUser.publicKey;

  return filteredUser;
};

module.exports = {
  applyPrivacyFilter
};
