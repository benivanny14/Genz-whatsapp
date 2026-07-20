const applyPrivacyFilter = (user, requesterId) => {
  if (!user) return user;
  
  // If requester is the user themselves, no filtering needed
  if (requesterId && user._id && requesterId.toString() === user._id.toString()) {
    return user;
  }

  // Need plain object to delete/modify fields safely
  const filteredUser = user.toObject ? user.toObject() : { ...user };
  const privacySettings = filteredUser.settings?.privacy || {};
  const privacyExceptions = filteredUser.privacyExceptions || {};

  // Helper to determine if requester is a contact
  const isContact = () => {
    if (!requesterId || !filteredUser.contacts) return false;
    return filteredUser.contacts.some(c => c.toString() === requesterId.toString());
  };

  // Helper to check if requester is in exceptions list
  const isInExceptions = (exceptionsKey) => {
    if (!requesterId || !privacyExceptions[exceptionsKey]) return false;
    return privacyExceptions[exceptionsKey].some(id => id.toString() === requesterId.toString());
  };

  const isAllowed = (settingValue, exceptionsKey) => {
    if (settingValue === 'everyone') return true;
    if (settingValue === 'contacts') return isContact();
    if (settingValue === 'contacts_except') {
      // Allow all contacts except those in exceptions
      if (!isContact()) return false;
      return !isInExceptions(exceptionsKey);
    }
    if (settingValue === 'nobody') return false;
    if (settingValue === 'only_share_with') {
      // Only allow users in exceptions list
      return isInExceptions(exceptionsKey);
    }
    return true; // Default to allowed
  };

  // Filter Last Seen
  if (!isAllowed(privacySettings.lastSeen, 'lastSeenExceptions')) {
    delete filteredUser.lastSeen;
  }

  // Filter Online Status
  // If online setting is 'same_as_last_seen', use lastSeen's setting
  const onlineSetting = privacySettings.online === 'same_as_last_seen' 
    ? privacySettings.lastSeen 
    : privacySettings.online;
  
  if (!isAllowed(onlineSetting, 'lastSeenExceptions')) {
    delete filteredUser.isOnline;
  }

  // Filter Profile Photo
  if (!isAllowed(privacySettings.profilePhoto, 'profilePhotoExceptions')) {
    delete filteredUser.profilePicture;
  }

  // Filter About
  if (!isAllowed(privacySettings.about, 'aboutExceptions')) {
    delete filteredUser.about;
    delete filteredUser.bio;
  }

  // Filter Status - Status privacy is handled at Status model level
  // with excludedViewers and includedViewers arrays

  // Filter Groups - Who can add user to groups
  // This is checked when someone tries to add user to a group
  // We'll add this to the filtered user for reference
  filteredUser.canAddToGroups = isAllowed(privacySettings.groups, 'groupsExceptions');

  return filteredUser;
};

module.exports = {
  applyPrivacyFilter
};
