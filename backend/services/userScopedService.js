/**
 * userScopedService.js
 * --------------------
 * Shared helpers extracted from ~33 controllers that each duplicated the
 * same user-scoped scaffolding (REFACTOR_PLAN.md step 5):
 *
 *   getUser(req, res)            — load the authenticated user, 401 if missing
 *   mergeSettings(defaults, s)   — shallow-merge a user settings object over defaults
 *   createSettingsMerger(d)      — closure: (settings) => mergeSettings(d, settings)
 *
 * `createSettingsMerger` lets existing controllers keep their
 * `mergeSettings(user.xxxSettings)` call sites untouched (they just swap
 * the local definition for `createSettingsMerger(defaultSettings)`).
 */

const User = require('../models/User');

/**
 * Load the current user from the DB.
 * Answers 401 (and returns null) when no user is authenticated or found.
 */
const getUser = async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return user;
};

/**
 * Shallow-merge settings over a defaults object (unknown keys are dropped
 * because they are not part of defaults).
 */
const mergeSettings = (defaults, settings = {}) => ({
  ...defaults,
  ...settings
});

/**
 * Return a settings-merge function bound to a fixed defaults object —
 * drop-in replacement for the old `const mergeSettings = (settings = {}) =>
 * ({ ...defaultSettings, ...settings })` pattern.
 */
const createSettingsMerger = (defaults) => (settings = {}) => mergeSettings(defaults, settings);

module.exports = {
  getUser,
  mergeSettings,
  createSettingsMerger
};
