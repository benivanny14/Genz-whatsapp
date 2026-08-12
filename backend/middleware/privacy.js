const { applyPrivacyFilter } = require('../utils/privacyHelper');
const { isAllowed, getSettingValue } = require('../services/privacyEngineService');

/**
 * Privacy Middleware
 * Enforces privacy settings on user data returned from API endpoints
 * This ensures that sensitive user information is filtered based on the requester's permissions
 */

const privacyMiddleware = async (req, res, next) => {
  // Store the original json method
  const originalJson = res.json;

  // Override res.json to apply privacy filtering to user data
  res.json = async function(data) {
    // Only filter if the response contains user data and has a requester ID
    if (data && (data.user || data.users) && req.user && req.user._id) {
      const requesterId = req.user._id;
      
      // Filter single user
      if (data.user) {
        data.user = await applyPrivacyFilter(data.user, requesterId);
      }
      
      // Filter array of users
      if (data.users && Array.isArray(data.users)) {
        data.users = await Promise.all(data.users.map(user => applyPrivacyFilter(user, requesterId)));
      }
      
      // Filter participants in conversations
      if (data.participants && Array.isArray(data.participants)) {
        data.participants = await Promise.all(data.participants.map(user => applyPrivacyFilter(user, requesterId)));
      }
      
      // Filter members in groups
      if (data.members && Array.isArray(data.members)) {
        data.members = await Promise.all(data.members.map(user => applyPrivacyFilter(user, requesterId)));
      }
    }
    
    // Call the original json method with the potentially modified data
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Apply privacy filter to a specific user object
 * This can be used in controllers to manually filter user data
 */
const filterUserData = async (user, requesterId) => {
  return await applyPrivacyFilter(user, requesterId);
};

/**
 * Check if a requester has permission to view a specific privacy field.
 * `field` may be camelCase ('lastSeen') or snake_case ('last_seen'); the
 * decision (contact checks + excluded/allowed record lookups) is delegated to
 * services/privacyEngineService.js — the same rules the socket paths use.
 */
const checkPrivacyPermission = async (user, requesterId, field) => {
  if (!user || !requesterId) return false;
  
  // If requester is the user themselves, allow access
  if (user._id && requesterId.toString() === user._id.toString()) {
    return true;
  }
  
  const privacySettings = user.settings?.privacy || {};
  const settingValue = getSettingValue(privacySettings, field);
  return isAllowed(user, requesterId, settingValue, field);
};

module.exports = {
  privacyMiddleware,
  filterUserData,
  checkPrivacyPermission
};
