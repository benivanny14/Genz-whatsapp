const applyPrivacyFilter = (user, requesterId) => {
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

  const isAllowed = (settingValue) => {
    if (settingValue === 'everyone') return true;
    if (settingValue === 'contacts' || settingValue === 'contacts_except') return isContact();
    if (settingValue === 'nobody') return false;
    return true; // Default to allowed
  };

  // Filter Last Seen
  if (!isAllowed(privacySettings.lastSeen)) {
    delete filteredUser.lastSeen;
  }

  // Filter Online Status
  // If online setting is 'same_as_last_seen', use lastSeen's setting
  const onlineSetting = privacySettings.online === 'same_as_last_seen' 
    ? privacySettings.lastSeen 
    : privacySettings.online;
  
  if (!isAllowed(onlineSetting)) {
    delete filteredUser.isOnline;
  }

  // Profile pictures are now visible to all users (removed privacy filter)
  // This allows users to see profile pictures when searching for contacts

  // Filter About
  if (!isAllowed(privacySettings.about)) {
    delete filteredUser.about;
    delete filteredUser.bio;
  }

  return filteredUser;
};

module.exports = {
  applyPrivacyFilter
};
