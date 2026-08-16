const { isAllowed, canSeePresence } = require('../services/privacyEngineService');

const applyPrivacyFilter = async (user, requesterId) => {
  if (!user) return user;
  
  // If requester is the user themselves, no filtering needed
  if (requesterId && user._id && requesterId.toString() === user._id.toString()) {
    return user;
  }

  // Need plain object to delete/modify fields safely
  const filteredUser = user.toObject ? user.toObject() : { ...user };
  const privacySettings = filteredUser.settings?.privacy || {};

  // All permission decisions (isContact / isExcluded / isAllowedContact /
  // isAllowed) live in services/privacyEngineService.js — the single source of
  // truth shared with the middleware and the socket paths.

  // Filter Last Seen
  if (!(await isAllowed(filteredUser, requesterId, privacySettings.lastSeen, 'last_seen'))) {
    delete filteredUser.lastSeen;
  }

  // Filter Online Status (same_as_last_seen follows last-seen's rules AND its
  // exclusion list — presence exclusions are stored under 'last_seen').
  if (!(await canSeePresence(filteredUser, requesterId))) {
    delete filteredUser.isOnline;
  }

  // Filter Profile Photo
  if (!(await isAllowed(filteredUser, requesterId, privacySettings.profilePhoto, 'profile_photo'))) {
    delete filteredUser.profilePicture;
  }

  // Filter About
  if (!(await isAllowed(filteredUser, requesterId, privacySettings.about, 'about'))) {
    delete filteredUser.about;
    delete filteredUser.bio;
  }

  // PII: contacts (address book) na settings (blockedUsers, appLock, defaultMessageTimer,
  // privacy config, n.k.) SIZI za kuonekana na watu wengine — hata kama wako kwenye conversation.
  delete filteredUser.contacts;
  delete filteredUser.settings;

  delete filteredUser.publicKey;

  return filteredUser;
};

module.exports = {
  applyPrivacyFilter
};
